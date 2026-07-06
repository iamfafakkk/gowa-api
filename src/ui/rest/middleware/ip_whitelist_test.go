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

	app := fiber.New(fiber.Config{
		EnableTrustedProxyCheck: true,
		TrustedProxies:          []string{"0.0.0.0/0"},
		ProxyHeader:             fiber.HeaderXForwardedFor,
		EnableIPValidation:      true,
	})
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

func TestIPWhitelistAllowsFirstValidForwardedIP(t *testing.T) {
	app := newIPWhitelistTestApp(t, []string{"203.0.113.10"})

	status, body := doIPWhitelistRequest(t, app, "invalid, 203.0.113.10, 198.51.100.20")

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
