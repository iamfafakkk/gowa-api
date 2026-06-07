package usecase

import (
	"context"
	"sync"
	"time"

	domainSend "github.com/aldinokemal/go-whatsapp-web-multidevice/domains/send"
	"github.com/aldinokemal/go-whatsapp-web-multidevice/validations"
	"github.com/google/uuid"
)

type asyncSendJobService struct {
	sender domainSend.ITextSender

	mu    sync.RWMutex
	jobs  map[string]domainSend.SendJobStatusResponse
	now   func() time.Time
	run   func(func())
	sleep func(time.Duration)
	newID func() string
}

func NewSendJobService(sender domainSend.ITextSender) domainSend.ISendJobUsecase {
	return &asyncSendJobService{
		sender: sender,
		jobs:   make(map[string]domainSend.SendJobStatusResponse),
		now:    time.Now,
		run: func(fn func()) {
			go fn()
		},
		sleep: time.Sleep,
		newID: uuid.NewString,
	}
}

func (s *asyncSendJobService) EnqueueText(ctx context.Context, request domainSend.MessageRequest) (domainSend.SendJobAcceptedResponse, error) {
	if err := validations.ValidateSendMessage(ctx, request); err != nil {
		return domainSend.SendJobAcceptedResponse{}, err
	}

	now := s.now().UTC()
	job := domainSend.SendJobStatusResponse{
		JobID:     s.newID(),
		Status:    domainSend.SendJobStatusQueued,
		DeviceID:  deviceIDFromContext(ctx),
		Phone:     request.Phone,
		Message:   "Message accepted for background delivery",
		StartedAt: &now,
	}

	s.mu.Lock()
	s.jobs[job.JobID] = job
	s.mu.Unlock()

	detachedCtx := context.WithoutCancel(ctx)
	s.run(func() {
		s.markRunning(job.JobID)
		s.waitForDelay(request.DelaySeconds)

		response, err := s.sender.SendText(detachedCtx, request)
		if err != nil {
			s.markFinished(job.JobID, "", err.Error(), domainSend.SendJobStatusFailed)
			return
		}

		s.markFinished(job.JobID, response.MessageID, response.Status, domainSend.SendJobStatusCompleted)
	})

	return domainSend.SendJobAcceptedResponse{
		JobID:     job.JobID,
		Status:    job.Status,
		DeviceID:  job.DeviceID,
		Phone:     job.Phone,
		Message:   job.Message,
		StartedAt: now,
	}, nil
}

func (s *asyncSendJobService) GetJob(jobID string) (domainSend.SendJobStatusResponse, error) {
	s.mu.RLock()
	job, ok := s.jobs[jobID]
	s.mu.RUnlock()
	if !ok {
		return domainSend.SendJobStatusResponse{}, domainSend.ErrSendJobNotFound
	}
	return job, nil
}

func (s *asyncSendJobService) markRunning(jobID string) {
	s.mu.Lock()
	defer s.mu.Unlock()

	job, ok := s.jobs[jobID]
	if !ok {
		return
	}
	job.Status = domainSend.SendJobStatusRunning
	job.Message = "Message is being delivered in background"
	s.jobs[jobID] = job
}

func (s *asyncSendJobService) waitForDelay(delaySeconds *int) {
	if delaySeconds == nil || *delaySeconds <= 0 {
		return
	}

	sleep := s.sleep
	if sleep == nil {
		sleep = time.Sleep
	}
	sleep(time.Duration(*delaySeconds) * time.Second)
}

func (s *asyncSendJobService) markFinished(jobID, messageID, message string, status domainSend.SendJobStatus) {
	s.mu.Lock()
	defer s.mu.Unlock()

	job, ok := s.jobs[jobID]
	if !ok {
		return
	}
	completedAt := s.now().UTC()
	job.Status = status
	job.MessageID = messageID
	job.Message = message
	job.CompletedAt = &completedAt
	s.jobs[jobID] = job
}
