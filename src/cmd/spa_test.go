package cmd

import (
	"io"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/gofiber/fiber/v2"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestRegisterFrontendBuildRequiresIndexFile(t *testing.T) {
	t.Parallel()

	distDir := t.TempDir()
	app := fiber.New()

	err := registerFrontendBuild(app, "", distDir)

	require.Error(t, err)
	assert.Contains(t, err.Error(), "web/dist")
	assert.Contains(t, err.Error(), "index.html")
}

func TestIsSPAIndexRoute(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name     string
		path     string
		basePath string
		want     bool
	}{
		{name: "root path", path: "/", want: true},
		{name: "console root", path: "/console", want: true},
		{name: "console nested", path: "/console/devices", want: true},
		{name: "console docs", path: "/console/api-docs", want: true},
		{name: "devices api", path: "/devices", want: false},
		{name: "app status api", path: "/app/status", want: false},
		{name: "health endpoint", path: "/health", want: false},
		{name: "websocket endpoint", path: "/ws", want: false},
		{name: "frontend asset", path: "/console-assets/index.js", want: false},
		{name: "embedded asset", path: "/assets/app.css", want: false},
		{name: "base path root", path: "/gowa/", basePath: "/gowa", want: true},
		{name: "base path console", path: "/gowa/console/devices", basePath: "/gowa", want: true},
		{name: "base path api", path: "/gowa/devices", basePath: "/gowa", want: false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			assert.Equal(t, tt.want, isSPAIndexRoute(tt.path, tt.basePath))
		})
	}
}

func TestRegisterFrontendBuildServesSPAAndPreservesAPI(t *testing.T) {
	t.Parallel()

	distDir := t.TempDir()
	require.NoError(t, os.WriteFile(filepath.Join(distDir, "index.html"), []byte("<html>spa-shell</html>"), 0o644))
	require.NoError(t, os.MkdirAll(filepath.Join(distDir, "console-assets"), 0o755))
	require.NoError(t, os.WriteFile(filepath.Join(distDir, "console-assets", "app.js"), []byte("console.log('ok');"), 0o644))

	app := fiber.New()
	app.Get("/devices", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"kind": "api"})
	})

	err := registerFrontendBuild(app, "", distDir)
	require.NoError(t, err)

	tests := []struct {
		name        string
		path        string
		wantStatus  int
		wantContain string
	}{
		{name: "spa root", path: "/", wantStatus: fiber.StatusOK, wantContain: "spa-shell"},
		{name: "spa console route", path: "/console/devices", wantStatus: fiber.StatusOK, wantContain: "spa-shell"},
		{name: "spa asset", path: "/console-assets/app.js", wantStatus: fiber.StatusOK, wantContain: "console.log('ok');"},
		{name: "api route stays json", path: "/devices", wantStatus: fiber.StatusOK, wantContain: "\"kind\":\"api\""},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			req := httptest.NewRequest("GET", tt.path, nil)
			resp, err := app.Test(req)
			require.NoError(t, err)
			defer resp.Body.Close()

			body, err := io.ReadAll(resp.Body)
			require.NoError(t, err)

			assert.Equal(t, tt.wantStatus, resp.StatusCode)
			assert.True(t, strings.Contains(string(body), tt.wantContain), "body: %s", string(body))
		})
	}
}
