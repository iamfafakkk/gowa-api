package cmd

import (
	"net/http"

	"github.com/aldinokemal/go-whatsapp-web-multidevice/config"
	"github.com/aldinokemal/go-whatsapp-web-multidevice/infrastructure/whatsapp"
	"github.com/aldinokemal/go-whatsapp-web-multidevice/ui/rest"
	"github.com/aldinokemal/go-whatsapp-web-multidevice/ui/rest/helpers"
	"github.com/aldinokemal/go-whatsapp-web-multidevice/ui/rest/middleware"
	"github.com/aldinokemal/go-whatsapp-web-multidevice/ui/websocket"
	"github.com/gofiber/fiber/v2"

	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/filesystem"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/sirupsen/logrus"
	"github.com/spf13/cobra"
)

// rootCmd represents the base command when called without any subcommands
var restCmd = &cobra.Command{
	Use:   "rest",
	Short: "Send whatsapp API over http",
	Long:  `This application is from clone https://github.com/aldinokemal/go-whatsapp-web-multidevice`,
	Run:   restServer,
}

func init() {
	rootCmd.AddCommand(restCmd)
}
func restServer(_ *cobra.Command, _ []string) {
	fiberConfig := fiber.Config{
		EnableTrustedProxyCheck: true,
		BodyLimit:               int(config.WhatsappSettingMaxVideoSize),
		Network:                 "tcp",
	}

	// Configure proxy settings if trusted proxies are specified
	if len(config.AppTrustedProxies) > 0 {
		fiberConfig.TrustedProxies = config.AppTrustedProxies
		fiberConfig.ProxyHeader = fiber.HeaderXForwardedHost
	}

	app := fiber.New(fiberConfig)

	app.Static(config.AppBasePath+"/statics", "./statics")
	app.Use(config.AppBasePath+"/components", filesystem.New(filesystem.Config{
		Root:       http.FS(EmbedViews),
		PathPrefix: "views/components",
		Browse:     true,
	}))
	app.Use(config.AppBasePath+"/assets", filesystem.New(filesystem.Config{
		Root:       http.FS(EmbedViews),
		PathPrefix: "views/assets",
		Browse:     true,
	}))

	app.Use(middleware.Recovery())
	app.Use(middleware.RequestTimeout(middleware.DefaultRequestTimeout))
	// Legacy Basic Auth capture + enforcement removed per user request ("basic auth hapus total").
	// All protection now goes through the new JWT-based auth (RequireAuth middleware).
	app.Use(middleware.JWTMiddleware()) // JWT capture (non-blocking) for web console sessions
	if config.AppDebug {
		app.Use(logger.New())
	}
	app.Use(cors.New(cors.Config{
		AllowOrigins: "*",
		AllowHeaders: "Origin, Content-Type, Accept",
	}))

	// Device manager - needed for chatwoot webhook and health check
	dm := whatsapp.GetDeviceManager()

	// Health check endpoint (public, no auth)
	// Registered at root path (ignoring AppBasePath) to ensure fixed availability
	// for infrastructure health probes (Kubernetes liveness/readiness, Docker healthcheck, etc.)
	app.Get("/health", func(c *fiber.Ctx) error {
		if dm != nil && dm.IsHealthy() {
			return c.SendString("OK")
		}
		return c.Status(http.StatusServiceUnavailable).SendString("Service Unavailable")
	})

	// Chatwoot webhook - registered BEFORE basic auth middleware
	// This allows Chatwoot to send webhooks without authentication
	if config.ChatwootEnabled {
		chatwootHandler := rest.NewChatwootHandler(appUsecase, sendUsecase, dm, chatStorageRepo)
		webhookPath := "/chatwoot/webhook"
		if config.AppBasePath != "" {
			webhookPath = config.AppBasePath + webhookPath
		}
		app.Post(webhookPath, chatwootHandler.HandleWebhook)
	}

	// Legacy APP_BASIC_AUTH / basicauth.New has been removed ("basic auth hapus total").
	// If you still need it for pure API clients, it can be re-enabled, but it is no longer applied by default
	// so that the custom Web Console login (JWT or simple form) works without triggering the browser's Basic Auth dialog.

	// Create base path group or use app directly
	var apiGroup fiber.Router = app
	if config.AppBasePath != "" {
		apiGroup = app.Group(config.AppBasePath)
	}

	registerDeviceScopedRoutes := func(r fiber.Router) {
		rest.InitRestApp(r, appUsecase)
		rest.InitRestChat(r, chatUsecase)
		rest.InitRestSend(r, sendUsecase, sendJobUsecase)
		rest.InitRestUser(r, userUsecase)
		rest.InitRestMessage(r, messageUsecase)
		rest.InitRestGroup(r, groupUsecase)
		rest.InitRestNewsletter(r, newsletterUsecase)
		websocket.RegisterRoutes(r, appUsecase)
	}

	// Device management routes (no device_id required) - now protected (JWT or legacy basic)
	rest.InitRestDevice(apiGroup, deviceUsecase)
	if authUsecase != nil {
		rest.InitRestAuth(apiGroup, authUsecase) // /auth/login is public inside; management endpoints check auth
	}

	// Device-scoped operations (header-based)
	// Note: Auth is handled client-side in the web console (JWT from /auth/login).
	// Direct API calls do not require the new auth (use APP_BASIC_AUTH if you want legacy protection for API).
	headerDeviceGroup := apiGroup.Group("", middleware.DeviceMiddleware(dm))
	registerDeviceScopedRoutes(headerDeviceGroup)

	// Chatwoot sync routes - require authentication (webhook is registered earlier without auth)
	if config.ChatwootEnabled {
		chatwootHandler := rest.NewChatwootHandler(appUsecase, sendUsecase, dm, chatStorageRepo)
		apiGroup.Post("/chatwoot/sync", chatwootHandler.SyncHistory)
		apiGroup.Get("/chatwoot/sync/status", chatwootHandler.SyncStatus)
	}

	if err := registerFrontendBuild(app, config.AppBasePath, frontendBuildDir()); err != nil {
		logrus.Fatalln(err)
	}

	go websocket.RunHub()

	// Set auto reconnect to whatsapp server after booting
	go helpers.SetAutoConnectAfterBooting(appUsecase)

	// Set auto reconnect checking with a guaranteed client instance
	startAutoReconnectCheckerIfClientAvailable()

	// Set daily presence pulse scheduler when enabled
	startPresencePulseSchedulerIfEnabled()

	if err := app.Listen(config.AppHost + ":" + config.AppPort); err != nil {
		logrus.Fatalln("Failed to start: ", err.Error())
	}
}
