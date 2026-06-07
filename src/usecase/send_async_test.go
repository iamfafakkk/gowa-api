package usecase

import (
	"context"
	"errors"
	"testing"
	"time"

	domainSend "github.com/aldinokemal/go-whatsapp-web-multidevice/domains/send"
	"github.com/aldinokemal/go-whatsapp-web-multidevice/infrastructure/whatsapp"
)

type fakeAsyncTextSender struct {
	resp    domainSend.GenericResponse
	err     error
	started chan struct{}
	release chan struct{}
	calls   int
	gotCtx  context.Context
	gotReq  domainSend.MessageRequest
}

func (f *fakeAsyncTextSender) SendText(ctx context.Context, request domainSend.MessageRequest) (domainSend.GenericResponse, error) {
	f.calls++
	f.gotCtx = ctx
	f.gotReq = request
	if f.started != nil {
		close(f.started)
	}
	if f.release != nil {
		<-f.release
	}
	return f.resp, f.err
}

func TestAsyncSendServiceEnqueueTextRejectsInvalidPayload(t *testing.T) {
	sender := &fakeAsyncTextSender{}
	service := NewSendJobService(sender)

	_, err := service.EnqueueText(context.Background(), domainSend.MessageRequest{})
	if err == nil {
		t.Fatal("expected validation error")
	}
	if sender.calls != 0 {
		t.Fatalf("expected sender not to be called, got %d calls", sender.calls)
	}
}

func TestAsyncSendServiceProcessesSuccessfulJob(t *testing.T) {
	sender := &fakeAsyncTextSender{
		resp: domainSend.GenericResponse{
			MessageID: "wamid.success",
			Status:    "Message sent to 628123456789",
		},
		started: make(chan struct{}),
		release: make(chan struct{}),
	}
	service := NewSendJobService(sender)

	ctx := whatsapp.ContextWithDevice(context.Background(), whatsapp.NewDeviceInstance("device-a", nil, nil))
	accepted, err := service.EnqueueText(ctx, domainSend.MessageRequest{
		BaseRequest: domainSend.BaseRequest{Phone: "628123456789"},
		Message:     "hello async",
	})
	if err != nil {
		t.Fatalf("enqueue failed: %v", err)
	}
	if accepted.JobID == "" {
		t.Fatal("expected job ID to be generated")
	}
	if accepted.Status != domainSend.SendJobStatusQueued {
		t.Fatalf("expected accepted status queued, got %q", accepted.Status)
	}

	select {
	case <-sender.started:
	case <-time.After(2 * time.Second):
		t.Fatal("timed out waiting for background worker to start")
	}

	running, err := service.GetJob(accepted.JobID)
	if err != nil {
		t.Fatalf("get running job failed: %v", err)
	}
	if running.Status != domainSend.SendJobStatusRunning {
		t.Fatalf("expected running status, got %q", running.Status)
	}
	if running.DeviceID != "device-a" {
		t.Fatalf("expected device ID device-a, got %q", running.DeviceID)
	}
	if running.Phone != "628123456789" {
		t.Fatalf("expected phone 628123456789, got %q", running.Phone)
	}

	close(sender.release)

	completed := waitForJobStatus(t, service, accepted.JobID, domainSend.SendJobStatusCompleted)
	if completed.MessageID != "wamid.success" {
		t.Fatalf("expected message ID wamid.success, got %q", completed.MessageID)
	}
	if completed.Message != sender.resp.Status {
		t.Fatalf("expected message %q, got %q", sender.resp.Status, completed.Message)
	}
	if completed.CompletedAt == nil {
		t.Fatal("expected completed_at to be set")
	}
	if sender.calls != 1 {
		t.Fatalf("expected one send call, got %d", sender.calls)
	}
	if sender.gotReq.Message != "hello async" {
		t.Fatalf("expected worker request message to match, got %q", sender.gotReq.Message)
	}
	inst, ok := whatsapp.DeviceFromContext(sender.gotCtx)
	if !ok || inst == nil || inst.ID() != "device-a" {
		t.Fatal("expected detached worker context to preserve device context")
	}
}

func TestAsyncSendServiceMarksFailedJob(t *testing.T) {
	sender := &fakeAsyncTextSender{
		err: errors.New("send failed"),
	}
	service := NewSendJobService(sender)

	accepted, err := service.EnqueueText(context.Background(), domainSend.MessageRequest{
		BaseRequest: domainSend.BaseRequest{Phone: "628123456789"},
		Message:     "hello async",
	})
	if err != nil {
		t.Fatalf("enqueue failed: %v", err)
	}

	failed := waitForJobStatus(t, service, accepted.JobID, domainSend.SendJobStatusFailed)
	if failed.MessageID != "" {
		t.Fatalf("expected empty message ID, got %q", failed.MessageID)
	}
	if failed.Message != "send failed" {
		t.Fatalf("expected error message to be stored, got %q", failed.Message)
	}
	if failed.CompletedAt == nil {
		t.Fatal("expected completed_at to be set")
	}
}

func TestAsyncSendServiceWaitsForDelayBeforeSending(t *testing.T) {
	sender := &fakeAsyncTextSender{
		resp: domainSend.GenericResponse{
			MessageID: "wamid.delayed",
			Status:    "Message sent",
		},
	}
	service := NewSendJobService(sender).(*asyncSendJobService)
	sleepCalled := make(chan time.Duration, 1)
	releaseSleep := make(chan struct{})
	service.sleep = func(duration time.Duration) {
		sleepCalled <- duration
		<-releaseSleep
	}

	delay := 3
	accepted, err := service.EnqueueText(context.Background(), domainSend.MessageRequest{
		BaseRequest:  domainSend.BaseRequest{Phone: "628123456789"},
		Message:      "hello async",
		DelaySeconds: &delay,
	})
	if err != nil {
		t.Fatalf("enqueue failed: %v", err)
	}

	select {
	case duration := <-sleepCalled:
		if duration != 3*time.Second {
			t.Fatalf("expected 3s delay, got %v", duration)
		}
	case <-time.After(2 * time.Second):
		t.Fatal("timed out waiting for delay to be applied")
	}

	if sender.calls != 0 {
		t.Fatalf("expected sender not to run before delay completes, got %d calls", sender.calls)
	}

	close(releaseSleep)

	completed := waitForJobStatus(t, service, accepted.JobID, domainSend.SendJobStatusCompleted)
	if completed.MessageID != "wamid.delayed" {
		t.Fatalf("expected delayed message ID, got %q", completed.MessageID)
	}
	if sender.calls != 1 {
		t.Fatalf("expected sender to run once after delay, got %d", sender.calls)
	}
}

func TestAsyncSendServiceSkipsDelayWhenZeroOrEmpty(t *testing.T) {
	tests := []struct {
		name         string
		delaySeconds *int
	}{
		{name: "nil delay"},
		{name: "zero delay", delaySeconds: func() *int { v := 0; return &v }()},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			sender := &fakeAsyncTextSender{
				resp: domainSend.GenericResponse{
					MessageID: "wamid.fast",
					Status:    "Message sent",
				},
			}
			service := NewSendJobService(sender).(*asyncSendJobService)
			sleepCalls := 0
			service.sleep = func(duration time.Duration) {
				sleepCalls++
			}

			accepted, err := service.EnqueueText(context.Background(), domainSend.MessageRequest{
				BaseRequest:  domainSend.BaseRequest{Phone: "628123456789"},
				Message:      "hello async",
				DelaySeconds: tt.delaySeconds,
			})
			if err != nil {
				t.Fatalf("enqueue failed: %v", err)
			}

			waitForJobStatus(t, service, accepted.JobID, domainSend.SendJobStatusCompleted)
			if sleepCalls != 0 {
				t.Fatalf("expected no sleep calls, got %d", sleepCalls)
			}
		})
	}
}

func waitForJobStatus(t *testing.T, service domainSend.ISendJobUsecase, jobID string, want domainSend.SendJobStatus) domainSend.SendJobStatusResponse {
	t.Helper()

	deadline := time.Now().Add(2 * time.Second)
	for time.Now().Before(deadline) {
		job, err := service.GetJob(jobID)
		if err == nil && job.Status == want {
			return job
		}
		time.Sleep(10 * time.Millisecond)
	}

	job, err := service.GetJob(jobID)
	if err != nil {
		t.Fatalf("timed out waiting for status %q: %v", want, err)
	}
	t.Fatalf("timed out waiting for status %q, last status %q", want, job.Status)
	return domainSend.SendJobStatusResponse{}
}
