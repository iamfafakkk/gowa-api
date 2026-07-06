# Design: App IP Whitelist

Date: 2026-07-06

## Summary

Add an optional application-level IP whitelist for the REST server. Operators configure allowed client IPs through env or CLI. When configured, every REST request must come from an allowed exact IP or CIDR range.

## Configuration

Add:

- `config.AppIPWhitelist []string`
- `APP_IP_WHITELIST=127.0.0.1,192.168.1.0/24,10.0.0.0/8`
- `--ip-whitelist="127.0.0.1,10.0.0.0/8"`

Empty value disables the middleware behavior and preserves current access.

## Middleware

Create REST middleware `IPWhitelist(allowed []string) (fiber.Handler, error)`.

Startup parses entries once:

- exact IP: `netip.ParseAddr`
- CIDR: `netip.ParsePrefix`

Invalid entries return an error so REST startup fails fast. This avoids silently exposing the app because of a typo.

Request-time behavior:

- If no whitelist entries exist, pass through.
- Resolve client IP with `c.IP()`.
- Parse it as `netip.Addr`.
- Allow if exact IP matches or CIDR contains it.
- Otherwise return HTTP 403 with:

```json
{
  "code": "IP_NOT_ALLOWED",
  "message": "IP is not allowed"
}
```

## Proxy Behavior

The middleware relies on Fiber `c.IP()`. Existing `APP_TRUSTED_PROXIES` and Fiber trusted proxy settings remain the single source of truth for whether forwarded headers are trusted.

## Registration

Register globally in `cmd/rest.go` after recovery/timeout middleware and before auth, CORS, and route setup. This protects all REST paths, including console, auth, API, websocket upgrade route, health, statics, and frontend assets served by the REST app.

## Tests

Add focused middleware tests:

- empty whitelist allows request
- exact IP allows request
- CIDR allows request
- non-matching IP returns 403 and `IP_NOT_ALLOWED`
- invalid config returns constructor error

## Non-goals

- No per-route rules.
- No runtime reload.
- No database storage.
- No new dependencies.
