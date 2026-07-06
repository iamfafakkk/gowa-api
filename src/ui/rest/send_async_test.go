package rest

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"

	domainSend "github.com/aldinokemal/go-whatsapp-web-multidevice/domains/send"
	"github.com/gofiber/fiber/v2"
)

type fakeSendUsecase struct {
	sendTextResp  domainSend.GenericResponse
	sendTextErr   error
	sendTextCalls int
	gotCtx        context.Context
	gotReq        domainSend.MessageRequest
}

func (f *fakeSendUsecase) SendText(ctx context.Context, request domainSend.MessageRequest) (domainSend.GenericResponse, error) {
	f.sendTextCalls++
	f.gotCtx = ctx
	f.gotReq = request
	return f.sendTextResp, f.sendTextErr
}

func (f *fakeSendUsecase) SendImage(context.Context, domainSend.ImageRequest) (domainSend.GenericResponse, error) {
	return domainSend.GenericResponse{}, nil
}

func (f *fakeSendUsecase) SendFile(context.Context, domainSend.FileRequest) (domainSend.GenericResponse, error) {
	return domainSend.GenericResponse{}, nil
}

func (f *fakeSendUsecase) SendVideo(context.Context, domainSend.VideoRequest) (domainSend.GenericResponse, error) {
	return domainSend.GenericResponse{}, nil
}

func (f *fakeSendUsecase) SendAudio(context.Context, domainSend.AudioRequest) (domainSend.GenericResponse, error) {
	return domainSend.GenericResponse{}, nil
}

func (f *fakeSendUsecase) SendSticker(context.Context, domainSend.StickerRequest) (domainSend.GenericResponse, error) {
	return domainSend.GenericResponse{}, nil
}

func (f *fakeSendUsecase) SendContact(context.Context, domainSend.ContactRequest) (domainSend.GenericResponse, error) {
	return domainSend.GenericResponse{}, nil
}

func (f *fakeSendUsecase) SendLink(context.Context, domainSend.LinkRequest) (domainSend.GenericResponse, error) {
	return domainSend.GenericResponse{}, nil
}

func (f *fakeSendUsecase) SendLocation(context.Context, domainSend.LocationRequest) (domainSend.GenericResponse, error) {
	return domainSend.GenericResponse{}, nil
}

func (f *fakeSendUsecase) SendPoll(context.Context, domainSend.PollRequest) (domainSend.GenericResponse, error) {
	return domainSend.GenericResponse{}, nil
}

func (f *fakeSendUsecase) SendPresence(context.Context, domainSend.PresenceRequest) (domainSend.GenericResponse, error) {
	return domainSend.GenericResponse{}, nil
}

func (f *fakeSendUsecase) SendChatPresence(context.Context, domainSend.ChatPresenceRequest) (domainSend.GenericResponse, error) {
	return domainSend.GenericResponse{}, nil
}

func (f *fakeSendUsecase) SendForward(context.Context, domainSend.ForwardRequest) (domainSend.GenericResponse, error) {
	return domainSend.GenericResponse{}, nil
}

type fakeSendJobUsecase struct {
	enqueueResp  domainSend.SendJobAcceptedResponse
	enqueueErr   error
	enqueueCalls int
	getResp      domainSend.SendJobStatusResponse
	getErr       error
	getCalls     int
	gotReq       domainSend.MessageRequest
	gotJobID     string
}

func (f *fakeSendJobUsecase) EnqueueText(_ context.Context, request domainSend.MessageRequest) (domainSend.SendJobAcceptedResponse, error) {
	f.enqueueCalls++
	f.gotReq = request
	return f.enqueueResp, f.enqueueErr
}

func (f *fakeSendJobUsecase) GetJob(jobID string) (domainSend.SendJobStatusResponse, error) {
	f.getCalls++
	f.gotJobID = jobID
	return f.getResp, f.getErr
}

func TestSendTextSyncPathKeepsExistingBehavior(t *testing.T) {
	sendUsecase := &fakeSendUsecase{
		sendTextResp: domainSend.GenericResponse{
			MessageID: "wamid.sync",
			Status:    "Message sent",
		},
	}
	jobUsecase := &fakeSendJobUsecase{}
	app := newSendTestApp(sendUsecase, jobUsecase)

	resp := doJSONRequest(t, app, http.MethodPost, "/send/message", map[string]any{
		"phone":   "628123456789",
		"message": "hello sync",
	})

	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected 200, got %d", resp.StatusCode)
	}

	body := decodeResponseData(t, resp)
	if body.Message != "Message sent" {
		t.Fatalf("expected sync response message, got %q", body.Message)
	}
	if sendUsecase.sendTextCalls != 1 {
		t.Fatalf("expected sync send to be called once, got %d", sendUsecase.sendTextCalls)
	}
	if jobUsecase.enqueueCalls != 0 {
		t.Fatalf("expected async enqueue not to be called, got %d", jobUsecase.enqueueCalls)
	}
	if sendUsecase.gotReq.DelaySeconds != nil {
		t.Fatalf("expected no delay to be passed, got %#v", sendUsecase.gotReq.DelaySeconds)
	}
}

func TestSendTextSyncPathParsesDelayQuery(t *testing.T) {
	sendUsecase := &fakeSendUsecase{
		sendTextResp: domainSend.GenericResponse{
			MessageID: "wamid.sync",
			Status:    "Message sent",
		},
	}
	jobUsecase := &fakeSendJobUsecase{}
	app := newSendTestApp(sendUsecase, jobUsecase)

	resp := doJSONRequest(t, app, http.MethodPost, "/send/message?delay=5", map[string]any{
		"phone":   "628123456789",
		"message": "hello sync",
	})

	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected 200, got %d", resp.StatusCode)
	}
	if sendUsecase.gotReq.DelaySeconds == nil || *sendUsecase.gotReq.DelaySeconds != 5 {
		t.Fatalf("expected delay 5 to be passed, got %#v", sendUsecase.gotReq.DelaySeconds)
	}
}

func TestSendTextAsyncPathReturnsAcceptedJob(t *testing.T) {
	sendUsecase := &fakeSendUsecase{}
	jobUsecase := &fakeSendJobUsecase{
		enqueueResp: domainSend.SendJobAcceptedResponse{
			JobID:    "job-123",
			Status:   domainSend.SendJobStatusQueued,
			DeviceID: "device-a",
			Phone:    "628123456789",
			Message:  "Message accepted for background delivery",
		},
	}
	app := newSendTestApp(sendUsecase, jobUsecase)

	resp := doJSONRequest(t, app, http.MethodPost, "/send/message?async=1", map[string]any{
		"phone":   "628123456789",
		"message": "hello async",
	})

	if resp.StatusCode != http.StatusAccepted {
		t.Fatalf("expected 202, got %d", resp.StatusCode)
	}

	body := decodeResponseData(t, resp)
	if body.Code != "ACCEPTED" {
		t.Fatalf("expected ACCEPTED code, got %q", body.Code)
	}
	results := body.Results
	if results["job_id"] != "job-123" {
		t.Fatalf("expected job_id job-123, got %#v", results["job_id"])
	}
	if sendUsecase.sendTextCalls != 0 {
		t.Fatalf("expected sync send not to be called, got %d", sendUsecase.sendTextCalls)
	}
	if jobUsecase.enqueueCalls != 1 {
		t.Fatalf("expected enqueue to be called once, got %d", jobUsecase.enqueueCalls)
	}
}

func TestSendTextAsyncPathParsesDelayQuery(t *testing.T) {
	sendUsecase := &fakeSendUsecase{}
	jobUsecase := &fakeSendJobUsecase{
		enqueueResp: domainSend.SendJobAcceptedResponse{
			JobID:    "job-123",
			Status:   domainSend.SendJobStatusQueued,
			DeviceID: "device-a",
			Phone:    "628123456789",
			Message:  "Message accepted for background delivery",
		},
	}
	app := newSendTestApp(sendUsecase, jobUsecase)

	resp := doJSONRequest(t, app, http.MethodPost, "/send/message?async=1&delay=5", map[string]any{
		"phone":   "628123456789",
		"message": "hello async",
	})

	if resp.StatusCode != http.StatusAccepted {
		t.Fatalf("expected 202, got %d", resp.StatusCode)
	}
	if jobUsecase.gotReq.DelaySeconds == nil || *jobUsecase.gotReq.DelaySeconds != 5 {
		t.Fatalf("expected delay 5 to be passed, got %#v", jobUsecase.gotReq.DelaySeconds)
	}
}

func TestSendTextRejectsInvalidDelayQuery(t *testing.T) {
	sendUsecase := &fakeSendUsecase{}
	jobUsecase := &fakeSendJobUsecase{}
	app := newSendTestApp(sendUsecase, jobUsecase)

	resp := doJSONRequest(t, app, http.MethodPost, "/send/message?delay=-1", map[string]any{
		"phone":   "628123456789",
		"message": "hello sync",
	})

	if resp.StatusCode != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", resp.StatusCode)
	}
	body := decodeResponseData(t, resp)
	if body.Code != "INVALID_REQUEST" {
		t.Fatalf("expected INVALID_REQUEST code, got %q", body.Code)
	}
	if sendUsecase.sendTextCalls != 0 {
		t.Fatalf("expected sync send not to be called, got %d", sendUsecase.sendTextCalls)
	}
	if jobUsecase.enqueueCalls != 0 {
		t.Fatalf("expected async enqueue not to be called, got %d", jobUsecase.enqueueCalls)
	}
}

func TestSendTextStatusReturnsJobStatus(t *testing.T) {
	sendUsecase := &fakeSendUsecase{}
	jobUsecase := &fakeSendJobUsecase{
		getResp: domainSend.SendJobStatusResponse{
			JobID:     "job-123",
			Status:    domainSend.SendJobStatusCompleted,
			DeviceID:  "device-a",
			Phone:     "628123456789",
			MessageID: "wamid.async",
			Message:   "Message sent",
		},
	}
	app := newSendTestApp(sendUsecase, jobUsecase)

	req := httptest.NewRequest(http.MethodGet, "/send/message/status?job_id=job-123", nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test failed: %v", err)
	}

	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected 200, got %d", resp.StatusCode)
	}
	body := decodeResponseData(t, resp)
	if body.Message != "Send job status retrieved" {
		t.Fatalf("expected status message, got %q", body.Message)
	}
	if jobUsecase.getCalls != 1 || jobUsecase.gotJobID != "job-123" {
		t.Fatalf("expected status lookup for job-123, got calls=%d job=%q", jobUsecase.getCalls, jobUsecase.gotJobID)
	}
}

func TestSendTextStatusReturnsNotFoundForMissingJob(t *testing.T) {
	sendUsecase := &fakeSendUsecase{}
	jobUsecase := &fakeSendJobUsecase{
		getErr: domainSend.ErrSendJobNotFound,
	}
	app := newSendTestApp(sendUsecase, jobUsecase)

	req := httptest.NewRequest(http.MethodGet, "/send/message/status?job_id=missing", nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test failed: %v", err)
	}

	if resp.StatusCode != http.StatusNotFound {
		t.Fatalf("expected 404, got %d", resp.StatusCode)
	}
	body := decodeResponseData(t, resp)
	if body.Code != "SEND_JOB_NOT_FOUND" {
		t.Fatalf("expected SEND_JOB_NOT_FOUND code, got %q", body.Code)
	}
}

func newSendTestApp(sendUsecase domainSend.ISendUsecase, jobUsecase domainSend.ISendJobUsecase) *fiber.App {
	app := fiber.New()
	controller := Send{
		Service:      sendUsecase,
		AsyncService: jobUsecase,
	}
	app.Post("/send/message", controller.SendText)
	app.Get("/send/message/status", controller.SendTextStatus)
	return app
}

func doJSONRequest(t *testing.T, app *fiber.App, method, path string, payload map[string]any) *http.Response {
	t.Helper()

	body, err := json.Marshal(payload)
	if err != nil {
		t.Fatalf("marshal payload failed: %v", err)
	}

	req := httptest.NewRequest(method, path, bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test failed: %v", err)
	}
	return resp
}

func decodeResponseData(t *testing.T, resp *http.Response) responseDataForTest {
	t.Helper()
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		t.Fatalf("read response failed: %v", err)
	}

	var result responseDataForTest
	if err := json.Unmarshal(body, &result); err != nil {
		t.Fatalf("unmarshal response failed: %v; body=%s", err, string(body))
	}
	return result
}

type responseDataForTest struct {
	Code    string         `json:"code"`
	Message string         `json:"message"`
	Results map[string]any `json:"results"`
}
