# PRD: App IP Whitelist

Date: 2026-07-06

## Goal

Allow operators to restrict access to the REST server by client IP using environment configuration.

## Scope

- Add `APP_IP_WHITELIST` environment variable.
- Add matching CLI flag.
- Apply whitelist to all REST routes.
- Support exact IPs and CIDR ranges.
- Keep empty whitelist as disabled/backward-compatible behavior.
- Respect existing Fiber trusted proxy configuration when resolving client IP.

## Out of Scope

- Per-route whitelist rules.
- Per-user or JWT-based IP policies.
- Dynamic reload without restart.
- MCP server IP whitelist.

## User Stories

- As an operator, I can set `APP_IP_WHITELIST=127.0.0.1,10.0.0.0/8` so only those clients can access the REST server.
- As an operator behind a reverse proxy, I can use existing `APP_TRUSTED_PROXIES` so `c.IP()` resolves the real client IP.
- As an operator, I can leave `APP_IP_WHITELIST` empty to preserve current open behavior.

## Acceptance Criteria

- Empty `APP_IP_WHITELIST` allows all requests.
- Exact IP entry allows matching client IP.
- CIDR entry allows IP inside range.
- Non-matching client IP gets HTTP 403.
- Block response uses code `IP_NOT_ALLOWED` and message `IP is not allowed`.
- Invalid whitelist entries fail at startup instead of silently weakening access control.
- `.env.example` documents the setting.
- Focused tests cover allow, deny, CIDR, and disabled mode.

## Technical Considerations

- Register middleware globally in REST startup after recovery/timeout and before route registration.
- Parse whitelist once when middleware is created.
- Use `net/netip` from Go stdlib for IP and CIDR parsing.
- Use Fiber `c.IP()` so existing trusted proxy settings govern forwarded client IP handling.
