# App IP Whitelist Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add optional env/CLI IP whitelist that protects all REST routes.

**Architecture:** Store whitelist entries in `config.AppIPWhitelist`, parse them once in REST middleware constructor, then check each request with Fiber `c.IP()`. Empty whitelist is disabled for backward compatibility.

**Tech Stack:** Go stdlib `net/netip`, Fiber middleware, Cobra/Viper config, table-driven Go tests with `testify`.

---

## Files

- Modify: `src/config/settings.go` — add `AppIPWhitelist []string` config global.
- Modify: `src/cmd/root.go` — bind env `APP_IP_WHITELIST` and CLI flag `--ip-whitelist`.
- Modify: `src/cmd/rest.go` — register whitelist middleware globally and fail fast on invalid config.
- Create: `src/ui/rest/middleware/ip_whitelist.go` — parse and enforce whitelist.
- Create: `src/ui/rest/middleware/ip_whitelist_test.go` — focused middleware tests.
- Modify: `src/.env.example` — document env.

No commit step unless user explicitly asks, per developer instruction.

---

### Task 1: Middleware tests

**Files:**
- Create: `src/ui/rest/middleware/ip_whitelist_test.go`

- [ ] **Step 1: Write failing tests**

Create `src/ui/rest/middleware/ip_whitelist_test.go`:

```go
package middleware

import (
	"io"
	"net/http/httptest"
	"testing"

	"github.com/gofiber/fiber/v2"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func newIPWhitelistTestApp(t *testing.T, allowed []string) *fiber.App {
	t.Helper()

	handler, err := IPWhitelist(allowed)
	require.NoError(t, err)

	app := fiber.New(fiber.Config{ProxyHeader: fiber.HeaderXForwardedFor})
	app.Use(handler)
	app.Get("/health", func(c *fiber.Ctx) error {
		return c.SendString("ok")
	})
	return app
}

func doIPWhitelistRequest(t *testing.T, app *fiber.App, ip string) (int, string) {
	t.Helper()

	req := httptest.NewRequest(fiber.MethodGet, "/health", nil)
	if ip != "" {
		req.Header.Set(fiber.HeaderXForwardedFor, ip)
	}

	resp, err := app.Test(req)
	require.NoError(t, err)
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	require.NoError(t, err)
	return resp.StatusCode, string(body)
}

func TestIPWhitelistAllowsAllWhenEmpty(t *testing.T) {
	app := newIPWhitelistTestApp(t, nil)

	status, body := doIPWhitelistRequest(t, app, "203.0.113.10")

	assert.Equal(t, fiber.StatusOK, status)
	assert.Equal(t, "ok", body)
}

func TestIPWhitelistAllowsExactIP(t *testing.T) {
	app := newIPWhitelistTestApp(t, []string{"203.0.113.10"})

	status, body := doIPWhitelistRequest(t, app, "203.0.113.10")

	assert.Equal(t, fiber.StatusOK, status)
	assert.Equal(t, "ok", body)
}

func TestIPWhitelistAllowsCIDR(t *testing.T) {
	app := newIPWhitelistTestApp(t, []string{"10.0.0.0/8"})

	status, body := doIPWhitelistRequest(t, app, "10.1.2.3")

	assert.Equal(t, fiber.StatusOK, status)
	assert.Equal(t, "ok", body)
}

func TestIPWhitelistBlocksUnknownIP(t *testing.T) {
	app := newIPWhitelistTestApp(t, []string{"203.0.113.10", "10.0.0.0/8"})

	status, body := doIPWhitelistRequest(t, app, "198.51.100.20")

	assert.Equal(t, fiber.StatusForbidden, status)
	assert.Contains(t, body, `"code":"IP_NOT_ALLOWED"`)
	assert.Contains(t, body, `"message":"IP is not allowed"`)
}

func TestIPWhitelistRejectsInvalidConfig(t *testing.T) {
	_, err := IPWhitelist([]string{"not-an-ip"})

	require.Error(t, err)
	assert.Contains(t, err.Error(), "invalid IP whitelist entry")
}
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
cd /Users/iamfafakkk/Desktop/GOLANG/gowa-api/src && go test ./ui/rest/middleware -run TestIPWhitelist -count=1
```

Expected: FAIL because `IPWhitelist` is undefined.

---

### Task 2: Middleware implementation

**Files:**
- Create: `src/ui/rest/middleware/ip_whitelist.go`

- [ ] **Step 1: Implement minimal middleware**

Create `src/ui/rest/middleware/ip_whitelist.go`:

```go
package middleware

import (
	"fmt"
	"net/netip"
	"strings"

	"github.com/aldinokemal/go-whatsapp-web-multidevice/pkg/utils"
	"github.com/gofiber/fiber/v2"
)

type ipWhitelist struct {
	ips      map[netip.Addr]struct{}
	prefixes []netip.Prefix
}

func IPWhitelist(allowed []string) (fiber.Handler, error) {
	list, err := parseIPWhitelist(allowed)
	if err != nil {
		return nil, err
	}

	return func(c *fiber.Ctx) error {
		if len(list.ips) == 0 && len(list.prefixes) == 0 {
			return c.Next()
		}

		addr, err := netip.ParseAddr(strings.TrimSpace(c.IP()))
		if err != nil || !list.allowed(addr) {
			return c.Status(fiber.StatusForbidden).JSON(utils.ResponseData{
				Status:  fiber.StatusForbidden,
				Code:    "IP_NOT_ALLOWED",
				Message: "IP is not allowed",
				Results: nil,
			})
		}

		return c.Next()
	}, nil
}

func parseIPWhitelist(entries []string) (ipWhitelist, error) {
	list := ipWhitelist{ips: make(map[netip.Addr]struct{})}
	for _, entry := range entries {
		entry = strings.TrimSpace(entry)
		if entry == "" {
			continue
		}

		if strings.Contains(entry, "/") {
			prefix, err := netip.ParsePrefix(entry)
			if err != nil {
				return ipWhitelist{}, fmt.Errorf("invalid IP whitelist entry %q: %w", entry, err)
			}
			list.prefixes = append(list.prefixes, prefix)
			continue
		}

		addr, err := netip.ParseAddr(entry)
		if err != nil {
			return ipWhitelist{}, fmt.Errorf("invalid IP whitelist entry %q: %w", entry, err)
		}
		list.ips[addr] = struct{}{}
	}
	return list, nil
}

func (w ipWhitelist) allowed(addr netip.Addr) bool {
	if _, ok := w.ips[addr]; ok {
		return true
	}
	for _, prefix := range w.prefixes {
		if prefix.Contains(addr) {
			return true
		}
	}
	return false
}
```

- [ ] **Step 2: Format and run focused tests**

Run:

```bash
cd /Users/iamfafakkk/Desktop/GOLANG/gowa-api/src && gofmt -w ui/rest/middleware/ip_whitelist.go ui/rest/middleware/ip_whitelist_test.go && go test ./ui/rest/middleware -run TestIPWhitelist -count=1
```

Expected: PASS.

---

### Task 3: Config binding

**Files:**
- Modify: `src/config/settings.go`
- Modify: `src/cmd/root.go`
- Modify: `src/.env.example`

- [ ] **Step 1: Add config global**

In `src/config/settings.go`, add beside `AppTrustedProxies`:

```go
AppIPWhitelist []string // Allowed client IPs/CIDRs for REST access. Empty = disabled.
```

- [ ] **Step 2: Bind env**

In `src/cmd/root.go`, after `app_trusted_proxies` handling in `initEnvConfig`, add:

```go
	if envIPWhitelist := viper.GetString("app_ip_whitelist"); envIPWhitelist != "" {
		config.AppIPWhitelist = strings.Split(envIPWhitelist, ",")
	}
```

- [ ] **Step 3: Add CLI flag**

In `src/cmd/root.go`, after `trusted-proxies` flag, add:

```go
	rootCmd.PersistentFlags().StringSliceVarP(
		&config.AppIPWhitelist,
		"ip-whitelist", "",
		config.AppIPWhitelist,
		`allowed client IPs/CIDRs for REST access --ip-whitelist <string> | example: --ip-whitelist="127.0.0.1,10.0.0.0/8"`,
	)
```

- [ ] **Step 4: Update env example**

In `src/.env.example`, after `APP_TRUSTED_PROXIES=0.0.0.0/0`, add:

```dotenv
# Comma-separated client IPs/CIDRs allowed to access REST. Empty = disabled.
APP_IP_WHITELIST=
```

- [ ] **Step 5: Run formatting**

Run:

```bash
cd /Users/iamfafakkk/Desktop/GOLANG/gowa-api/src && gofmt -w config/settings.go cmd/root.go
```

Expected: no output.

---

### Task 4: REST registration

**Files:**
- Modify: `src/cmd/rest.go`

- [ ] **Step 1: Register middleware globally**

In `src/cmd/rest.go`, after:

```go
	app.Use(middleware.Recovery())
	app.Use(middleware.RequestTimeout(middleware.DefaultRequestTimeout))
```

add:

```go
	ipWhitelistMiddleware, err := middleware.IPWhitelist(config.AppIPWhitelist)
	if err != nil {
		logrus.Fatalln(err)
	}
	app.Use(ipWhitelistMiddleware)
```

- [ ] **Step 2: Format and run compile tests**

Run:

```bash
cd /Users/iamfafakkk/Desktop/GOLANG/gowa-api/src && gofmt -w cmd/rest.go && go test ./cmd ./ui/rest/middleware
```

Expected: PASS.

---

### Task 5: Final verification

**Files:**
- All changed files

- [ ] **Step 1: Run focused tests**

Run:

```bash
cd /Users/iamfafakkk/Desktop/GOLANG/gowa-api/src && go test ./cmd ./ui/rest/middleware
```

Expected: PASS.

- [ ] **Step 2: Run full tests if time allows**

Run:

```bash
cd /Users/iamfafakkk/Desktop/GOLANG/gowa-api/src && go test ./...
```

Expected: PASS. If unrelated existing failures appear, record package and failure text.

---

## Self-review

Spec coverage:

- Env/CLI config: Task 3.
- Exact IP and CIDR support: Tasks 1-2.
- Empty whitelist disabled: Tasks 1-2.
- All REST routes: Task 4 registers global middleware.
- Trusted proxy behavior: middleware uses `c.IP()` and tests use Fiber proxy header path.
- Invalid entries fail fast: Tasks 1-2 and Task 4.
- `.env.example`: Task 3.

Placeholder scan: no TBD/TODO placeholders.

Type consistency: `IPWhitelist(allowed []string) (fiber.Handler, error)` used consistently.
