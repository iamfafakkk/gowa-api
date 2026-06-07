package send

import (
	"errors"
	"time"
)

var ErrSendJobNotFound = errors.New("send job not found")

type SendJobStatus string

const (
	SendJobStatusQueued    SendJobStatus = "queued"
	SendJobStatusRunning   SendJobStatus = "running"
	SendJobStatusCompleted SendJobStatus = "completed"
	SendJobStatusFailed    SendJobStatus = "failed"
)

type SendJobAcceptedResponse struct {
	JobID     string        `json:"job_id"`
	Status    SendJobStatus `json:"status"`
	DeviceID  string        `json:"device_id,omitempty"`
	Phone     string        `json:"phone"`
	Message   string        `json:"message"`
	StartedAt time.Time     `json:"started_at"`
}

type SendJobStatusResponse struct {
	JobID       string        `json:"job_id"`
	Status      SendJobStatus `json:"status"`
	DeviceID    string        `json:"device_id,omitempty"`
	Phone       string        `json:"phone"`
	MessageID   string        `json:"message_id,omitempty"`
	Message     string        `json:"message"`
	StartedAt   *time.Time    `json:"started_at,omitempty"`
	CompletedAt *time.Time    `json:"completed_at,omitempty"`
}
