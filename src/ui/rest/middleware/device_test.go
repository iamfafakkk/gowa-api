package middleware

import (
	"io"
	"net/http/httptest"
	"testing"

	"github.com/aldinokemal/go-whatsapp-web-multidevice/infrastructure/whatsapp"
	"github.com/gofiber/fiber/v2"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestDeviceMiddlewareSkipsFrontendBuildRoutes(t *testing.T) {
	app := fiber.New()
	app.Use(DeviceMiddleware(whatsapp.NewDeviceManager(nil, nil, nil)))
	app.Get("/console/devices", func(c *fiber.Ctx) error {
		return c.SendString("spa-shell")
	})
	app.Get("/console-assets/app.js", func(c *fiber.Ctx) error {
		return c.SendString("asset")
	})

	for _, tt := range []struct {
		path string
		want string
	}{
		{path: "/console/devices", want: "spa-shell"},
		{path: "/console-assets/app.js", want: "asset"},
	} {
		t.Run(tt.path, func(t *testing.T) {
			resp, err := app.Test(httptest.NewRequest(fiber.MethodGet, tt.path, nil))
			require.NoError(t, err)
			defer resp.Body.Close()

			body, err := io.ReadAll(resp.Body)
			require.NoError(t, err)

			assert.Equal(t, fiber.StatusOK, resp.StatusCode)
			assert.Equal(t, tt.want, string(body))
		})
	}
}
