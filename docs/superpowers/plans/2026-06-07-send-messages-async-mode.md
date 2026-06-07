# PRD: Send Messages Async Mode

## Introduction

Add an async send option to `web/src/pages/SendMessagesPage.tsx` so operators can choose between waiting for a direct send result or enqueueing the outbound message through `POST /send/message?async=1`. The backend already supports async mode, but the embedded web UI currently exposes sync-only behavior.

## Goals

- Let users choose sync or async send mode from the existing send message page.
- Preserve the current sync flow and request shape for existing behavior.
- Surface async acceptance results clearly, including `job_id`, without implying delivery is complete.
- Keep the first frontend release limited to enqueue-only UX with no polling or status viewer.

## User Stories

### US-001: Choose send mode before submit
**Description:** As an operator, I want to choose whether a message is sent synchronously or queued asynchronously so I can control whether the UI waits for direct delivery feedback.

**Acceptance Criteria:**
- [ ] The page shows a labeled control for enabling async send mode.
- [ ] The control includes helper text that explains async mode only queues the job.
- [ ] The control is disabled consistently with the rest of the form while submit is in progress.
- [ ] Verify in browser using dev-browser skill

### US-002: Preserve sync send behavior
**Description:** As an operator, I want sync mode to keep the existing direct send behavior so current usage does not regress.

**Acceptance Criteria:**
- [ ] Sync submit still calls `/send/message` without the `async=1` query parameter.
- [ ] Sync success still shows the direct send result text returned by the frontend helper.
- [ ] Sender auto-select and no-logged-in-device behavior remain unchanged.

### US-003: Support async accepted responses
**Description:** As an operator, I want accepted async jobs to show a compact summary with the queued job id so I can record the background delivery reference.

**Acceptance Criteria:**
- [ ] Async submit calls `/send/message?async=1`.
- [ ] Frontend parsing accepts `202 ACCEPTED` responses and maps `job_id`, `status`, `device_id`, and `phone` when present.
- [ ] Async success UI shows that the job was accepted and includes the `job_id`.
- [ ] The page does not add polling, manual status checks, or final delivery assumptions.
- [ ] Verify in browser using dev-browser skill

### US-004: Keep submit error handling aligned across modes
**Description:** As an operator, I want backend validation or request failures to appear consistently whether sync or async mode is selected so retry decisions stay clear.

**Acceptance Criteria:**
- [ ] Failed sync submit still shows the backend error message.
- [ ] Failed async submit also shows the backend error message.
- [ ] Form values remain populated after submit attempts, matching current page behavior.

## Functional Requirements

1. `SendMessageInput` must accept `async?: boolean`.
2. `sendMessage()` must request `/send/message?async=1` only when `async` is true.
3. `sendMessage()` must continue to send the existing JSON body and `X-Device-Id` header in both modes.
4. `sendMessage()` must support both sync success payloads and async accepted payloads.
5. `SendMessageResult` must expose async-oriented fields needed by the page, including optional `jobId`, `deviceId`, and `phone`.
6. `SendMessagesPage` must provide a clear async mode toggle with explanatory helper copy.
7. `SendMessagesPage` must keep the existing sender selection and form retention flow after submit.
8. Async success messaging on the page must show acceptance details only and must not suggest delivery completion.

## Non-Goals

- No automatic polling for async job status.
- No manual "check status" button or job history viewer on this page.
- No new frontend routes or dedicated async status screens.
- No backend API changes beyond consuming the already-supported `?async=1` query parameter.

## Design Considerations

- Keep the new control simple and visually aligned with the current Material UI form.
- Clarify the difference between sync and async in concise copy near the hero or form.
- Reuse the current success/error alert pattern instead of introducing a new summary component.

## Technical Considerations

- API helper tests should cover both endpoint selection and async accepted result mapping.
- Page tests should cover sync success, async success, and submit errors.
- The existing `sendMessage()` consumers should remain compatible with the sync response shape.

## Success Metrics

- Operators can choose async mode from the page without leaving the current workflow.
- Sync behavior remains unchanged in automated tests.
- Async accepted responses display a usable `job_id` reference with no added status-management UI.

## Open Questions

- None for v1. The provided implementation plan already fixes the scope: enqueue-only frontend support with no polling or manual status lookup.
