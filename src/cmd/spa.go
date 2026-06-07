package cmd

import (
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/filesystem"
)

const (
	frontendConsoleRoute = "/console"
	frontendBuildRelPath = "../web/dist"
)

var reservedBackendPrefixes = []string{
	"/app",
	"/assets",
	"/chat",
	"/chatwoot",
	"/chats",
	"/components",
	"/devices",
	"/group",
	"/health",
	"/message",
	"/newsletter",
	"/send",
	"/statics",
	"/user",
	"/ws",
}

type frontendBuild struct {
	distDir   string
	indexHTML []byte
}

func frontendBuildDir() string {
	return filepath.Clean(frontendBuildRelPath)
}

func registerFrontendBuild(app *fiber.App, basePath string, distDir string) error {
	build, err := loadFrontendBuild(basePath, distDir)
	if err != nil {
		return err
	}

	mountPath := normalizeBasePath(basePath)
	app.Use(mountPath, filesystem.New(filesystem.Config{
		Root: http.Dir(build.distDir),
		Next: func(c *fiber.Ctx) bool {
			path := c.Path()
			return isReservedBackendRoute(path, basePath) || isSPAIndexRoute(path, basePath)
		},
	}))

	rootPath := joinBasePath(basePath, "/")
	consolePath := joinBasePath(basePath, frontendConsoleRoute)

	app.Get(rootPath, build.sendIndex)
	app.Get(consolePath, build.sendIndex)
	app.Get(consolePath+"/*", build.sendIndex)

	return nil
}

func loadFrontendBuild(basePath string, distDir string) (*frontendBuild, error) {
	indexPath := filepath.Join(distDir, "index.html")
	indexHTML, err := os.ReadFile(indexPath)
	if err != nil {
		return nil, fmt.Errorf(
			"frontend build not found at %s: missing index.html; run `cd web && npm run build` before `go run . rest`: %w",
			frontendBuildRelPath,
			err,
		)
	}

	return &frontendBuild{
		distDir:   distDir,
		indexHTML: rewriteFrontendIndex(indexHTML, basePath),
	}, nil
}

func (b *frontendBuild) sendIndex(c *fiber.Ctx) error {
	c.Type("html", "utf-8")
	return c.Send(b.indexHTML)
}

func rewriteFrontendIndex(indexHTML []byte, basePath string) []byte {
	normalizedBasePath := normalizeBasePath(basePath)
	if normalizedBasePath == "/" {
		return indexHTML
	}

	baseTag := fmt.Sprintf(`<meta name="gowa-base-path" content="%s">`, normalizedBasePath)
	updated := strings.Replace(string(indexHTML), "<head>", "<head>\n    "+baseTag, 1)
	updated = strings.ReplaceAll(updated, `="/`, `="`+normalizedBasePath+`/`)
	updated = strings.ReplaceAll(updated, `='/`, `='`+normalizedBasePath+`/`)
	return []byte(updated)
}

func isSPAIndexRoute(requestPath string, basePath string) bool {
	trimmedPath, ok := trimBasePath(requestPath, basePath)
	if !ok {
		return false
	}

	return trimmedPath == "/" || trimmedPath == frontendConsoleRoute || strings.HasPrefix(trimmedPath, frontendConsoleRoute+"/")
}

func isReservedBackendRoute(requestPath string, basePath string) bool {
	trimmedPath, ok := trimBasePath(requestPath, basePath)
	if !ok {
		return false
	}

	for _, prefix := range reservedBackendPrefixes {
		if trimmedPath == prefix || strings.HasPrefix(trimmedPath, prefix+"/") {
			return true
		}
	}

	return false
}

func trimBasePath(requestPath string, basePath string) (string, bool) {
	normalizedBasePath := normalizeBasePath(basePath)
	normalizedRequestPath := ensureLeadingSlash(requestPath)

	if normalizedBasePath == "/" {
		return normalizedRequestPath, true
	}

	if normalizedRequestPath == normalizedBasePath {
		return "/", true
	}

	if !strings.HasPrefix(normalizedRequestPath, normalizedBasePath+"/") {
		return "", false
	}

	return normalizedRequestPath[len(normalizedBasePath):], true
}

func joinBasePath(basePath string, routePath string) string {
	normalizedBasePath := normalizeBasePath(basePath)
	normalizedRoutePath := ensureLeadingSlash(routePath)

	if normalizedBasePath == "/" {
		return normalizedRoutePath
	}

	if normalizedRoutePath == "/" {
		return normalizedBasePath + "/"
	}

	return normalizedBasePath + normalizedRoutePath
}

func normalizeBasePath(basePath string) string {
	if basePath == "" || basePath == "/" {
		return "/"
	}

	path := ensureLeadingSlash(strings.TrimSpace(basePath))
	return strings.TrimRight(path, "/")
}

func ensureLeadingSlash(path string) string {
	if path == "" {
		return "/"
	}

	if strings.HasPrefix(path, "/") {
		return path
	}

	return "/" + path
}
