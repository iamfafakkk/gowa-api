# PRD: Send Message Delay Query

## Introduction

Add optional `delay` support in seconds to `POST /send/message` and the `web/src/pages/SendMessagesPage.tsx` flow so operators can intentionally wait before the actual WhatsApp send begins. The delay must apply both to direct sync sends and to accepted async jobs without changing the existing response shapes.

## Goals

- Allow callers to provide `delay=<integer seconds>` on `POST /send/message`.
- Keep `delay` optional so current send behavior remains unchanged when it is omitted.
- Ensure sync sends wait before the WhatsApp send call but still return the current success payload.
- Ensure async sends keep the current `202 ACCEPTED` response while delaying the background delivery start.
- Expose the same delay control in the tested web send page with clear helper copy.

## User Stories

### US-001: Accept delay on the send message API
**Description:** As an API consumer, I want to pass a delay in seconds so the system waits before sending the outbound text message.

**Acceptance Criteria:**
- [ ] `POST /send/message?delay=5` passes a delay value of `5` into the text send request contract.
- [ ] `POST /send/message?async=1&delay=5` passes the same delay value into the async enqueue request contract.
- [ ] Omitting `delay` preserves the current request behavior.
- [ ] Invalid `delay` values return `400 Bad Request`.

### US-002: Delay sync delivery without changing the response contract
**Description:** As an operator using sync send mode, I want the system to wait before sending so the current direct-send workflow can be timed intentionally.

**Acceptance Criteria:**
- [ ] Sync send validates the request before waiting.
- [ ] Sync send waits `delay` seconds after validation and device/client resolution, then performs the WhatsApp send.
- [ ] Sync success response shape remains unchanged.
- [ ] Zero delay does not add an observable wait.

### US-003: Delay async worker delivery after acceptance
**Description:** As an operator using async send mode, I want the job to be accepted immediately while the worker waits before starting background delivery.

**Acceptance Criteria:**
- [ ] Async submit still returns `202 ACCEPTED` immediately.
- [ ] The background worker waits `delay` seconds before calling the text sender.
- [ ] Zero or omitted delay does not block the worker.
- [ ] Existing async job status transitions still complete normally after the delay.

### US-004: Configure delay from the web send page
**Description:** As an operator using the web send page, I want to enter an optional delay in seconds so I can use the API feature without leaving the UI.

**Acceptance Criteria:**
- [ ] The page shows an optional numeric delay field.
- [ ] Empty delay keeps the old request URL shape.
- [ ] Sync submit with delay calls `/send/message?delay=N`.
- [ ] Async submit with delay calls `/send/message?async=1&delay=N`.
- [ ] Helper copy explains that delay happens before the actual send and that async delay applies after the job is accepted.
- [ ] Verify in browser using dev-browser skill

## Functional Requirements

1. `domainSend.MessageRequest` must expose an optional delay field in seconds.
2. The REST handler for `POST /send/message` must parse `delay` from the query string, reject non-integer or negative values, and place it on the request DTO before sync or async branching.
3. `validations.ValidateSendMessage()` must reject negative delay values.
4. `serviceSend.SendText()` must sleep for the requested delay before building/sending the WhatsApp message, after validation and client/recipient resolution are complete.
5. `asyncSendJobService.EnqueueText()` must preserve the same delay field on the queued request.
6. The async worker must wait for the requested delay before calling the real text sender.
7. `docs/openapi.yaml` must document the optional `delay` query parameter for `/send/message`.
8. `SendMessageInput` in `web/src/features/send/types.ts` must accept `delaySeconds?: number`.
9. `sendMessage()` in `web/src/features/send/api.ts` must build `/send/message`, `/send/message?delay=N`, or `/send/message?async=1&delay=N` as appropriate.
10. `SendMessagesPage` must allow entering delay seconds, pass the value through submit, and preserve the current sender selection, async toggle, and form-retention behavior.

## Non-Goals

- No delay support for other send endpoints such as image, file, or poll.
- No sub-second delays or duration strings; this feature is integer seconds only.
- No async job polling or scheduling UI beyond entering a delay value.
- No persistence of delayed jobs across process restarts.

## Design Considerations

- Keep the delay field visually close to the async mode control because both affect delivery timing.
- Use concise helper copy that distinguishes "accepted now" from "sent later" in async mode.
- Preserve current success and error messaging patterns on the page.

## Technical Considerations

- Backend tests should cover sync parsing, async parsing, invalid delay handling, and async worker timing behavior.
- Web Vitest coverage should cover endpoint selection and page submit behavior with and without delay.
- Sleep behavior should remain easy to test by injecting or overriding the wait function in the async service and, where practical, in the sync usecase path.

## Success Metrics

- Existing send flows continue to pass without requiring a delay value.
- Delay-enabled sync and async flows are covered by focused automated tests.
- Operators can use delayed send behavior from both the API and the web page without extra manual steps.

## Open Questions

- None for v1. The implementation plan fixes the scope to text send only, integer seconds, and unchanged accepted/success response shapes.
