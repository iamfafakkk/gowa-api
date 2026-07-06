package cmd

import (
	"context"
	"database/sql"
	"embed"
	"fmt"
	"os"
	"strings"
	"time"

	"go.mau.fi/whatsmeow/store/sqlstore"

	"github.com/aldinokemal/go-whatsapp-web-multidevice/config"
	domainApp "github.com/aldinokemal/go-whatsapp-web-multidevice/domains/app"
	domainAuth "github.com/aldinokemal/go-whatsapp-web-multidevice/domains/auth"
	domainCall "github.com/aldinokemal/go-whatsapp-web-multidevice/domains/call"
	domainChat "github.com/aldinokemal/go-whatsapp-web-multidevice/domains/chat"
	domainChatStorage "github.com/aldinokemal/go-whatsapp-web-multidevice/domains/chatstorage"
	domainDevice "github.com/aldinokemal/go-whatsapp-web-multidevice/domains/device"
	domainGroup "github.com/aldinokemal/go-whatsapp-web-multidevice/domains/group"
	domainMessage "github.com/aldinokemal/go-whatsapp-web-multidevice/domains/message"
	domainNewsletter "github.com/aldinokemal/go-whatsapp-web-multidevice/domains/newsletter"
	domainSend "github.com/aldinokemal/go-whatsapp-web-multidevice/domains/send"
	domainUser "github.com/aldinokemal/go-whatsapp-web-multidevice/domains/user"
	"github.com/aldinokemal/go-whatsapp-web-multidevice/infrastructure/auth"
	"github.com/aldinokemal/go-whatsapp-web-multidevice/infrastructure/chatstorage"
	"github.com/aldinokemal/go-whatsapp-web-multidevice/infrastructure/whatsapp"
	"github.com/aldinokemal/go-whatsapp-web-multidevice/pkg/sqlite"
	"github.com/aldinokemal/go-whatsapp-web-multidevice/pkg/utils"
	"github.com/aldinokemal/go-whatsapp-web-multidevice/usecase"
	_ "github.com/lib/pq"
	"github.com/sirupsen/logrus"
	"github.com/spf13/cobra"
	"github.com/spf13/viper"
	"go.mau.fi/whatsmeow"
)

var (
	EmbedIndex embed.FS
	EmbedViews embed.FS

	// Whatsapp
	whatsappCli *whatsmeow.Client

	// Chat Storage
	chatStorageDB   *sql.DB
	chatStorageRepo domainChatStorage.IChatStorageRepository

	// Auth Storage (dedicated SQLite for console/web UI users + management panel)
	authStorageDB  *sql.DB
	authRepo       domainAuth.IAuthRepository
	authUsecase    domainAuth.IAuthUsecase


	// Usecase
	appUsecase        domainApp.IAppUsecase
	callUsecase       domainCall.ICallUsecase
	chatUsecase       domainChat.IChatUsecase
	sendUsecase       domainSend.ISendUsecase
	sendJobUsecase    domainSend.ISendJobUsecase
	userUsecase       domainUser.IUserUsecase
	messageUsecase    domainMessage.IMessageUsecase
	groupUsecase      domainGroup.IGroupUsecase
	newsletterUsecase domainNewsletter.INewsletterUsecase
	deviceUsecase     domainDevice.IDeviceUsecase
)

// rootCmd represents the base command when called without any subcommands
var rootCmd = &cobra.Command{
	Short: "Send free whatsapp API",
	Long: `This application is from clone https://github.com/aldinokemal/go-whatsapp-web-multidevice, 
you can send whatsapp over http api but your whatsapp account have to be multi device version`,
}

func init() {
	// Load environment variables first
	utils.LoadConfig(".")

	time.Local = time.UTC

	rootCmd.CompletionOptions.DisableDefaultCmd = true

	// Initialize flags first, before any subcommands are added
	initFlags()

	// Then initialize other components
	cobra.OnInitialize(initEnvConfig, initApp)
}

// initEnvConfig loads configuration from environment variables
func initEnvConfig() {
	fmt.Println(viper.AllSettings())
	// Application settings
	if envPort := viper.GetString("app_port"); envPort != "" {
		config.AppPort = envPort
	}
	if envHost := viper.GetString("app_host"); envHost != "" {
		config.AppHost = envHost
	}
	if envDebug := viper.GetBool("app_debug"); envDebug {
		config.AppDebug = envDebug
	}
	if envOs := viper.GetString("app_os"); envOs != "" {
		config.AppOs = envOs
	}
	if envBasicAuth := viper.GetString("app_basic_auth"); envBasicAuth != "" {
		credential := strings.Split(envBasicAuth, ",")
		config.AppBasicAuthCredential = credential
	}
	if envBasePath := viper.GetString("app_base_path"); envBasePath != "" {
		config.AppBasePath = envBasePath
	}
	if envTrustedProxies := viper.GetString("app_trusted_proxies"); envTrustedProxies != "" {
		proxies := strings.Split(envTrustedProxies, ",")
		config.AppTrustedProxies = proxies
	}

	// Database settings
	if envDBURI := viper.GetString("db_uri"); envDBURI != "" {
		config.DBURI = envDBURI
	}
	if envDBKEYSURI := viper.GetString("db_keys_uri"); envDBKEYSURI != "" {
		config.DBKeysURI = envDBKEYSURI
	}
	if viper.IsSet("chat_storage_max_open_conns") {
		if n := viper.GetInt("chat_storage_max_open_conns"); n > 0 {
			config.ChatStorageMaxOpenConns = n
		}
	}

	// Auth / console user storage (dedicated DB for web login + management panel)
	if envAuthDBURI := viper.GetString("auth_db_uri"); envAuthDBURI != "" {
		config.AuthStorageURI = envAuthDBURI
	}
	if envAuthJWTSecret := viper.GetString("auth_jwt_secret"); envAuthJWTSecret != "" {
		config.AuthJWTSecret = envAuthJWTSecret
	}
	// Auth seed for initial admin user (only used if no users exist)
	if env := viper.GetString("auth_seed_username"); env != "" {
		config.AuthSeedUsername = env
	}
	if env := viper.GetString("auth_seed_password"); env != "" {
		config.AuthSeedPassword = env
	}

	// WhatsApp settings
	if envAutoReply := viper.GetString("whatsapp_auto_reply"); envAutoReply != "" {
		config.WhatsappAutoReplyMessage = envAutoReply
	}
	if viper.IsSet("whatsapp_auto_mark_read") {
		config.WhatsappAutoMarkRead = viper.GetBool("whatsapp_auto_mark_read")
	}
	if viper.IsSet("whatsapp_auto_download_media") {
		config.WhatsappAutoDownloadMedia = viper.GetBool("whatsapp_auto_download_media")
	}
	if envWebhook := viper.GetString("whatsapp_webhook"); envWebhook != "" {
		webhook := strings.Split(envWebhook, ",")
		config.WhatsappWebhook = webhook
	}
	if envWebhookSecret := viper.GetString("whatsapp_webhook_secret"); envWebhookSecret != "" {
		config.WhatsappWebhookSecret = envWebhookSecret
	}
	if viper.IsSet("whatsapp_webhook_insecure_skip_verify") {
		config.WhatsappWebhookInsecureSkipVerify = viper.GetBool("whatsapp_webhook_insecure_skip_verify")
	}
	if envWebhookEvents := viper.GetString("whatsapp_webhook_events"); envWebhookEvents != "" {
		events := strings.Split(envWebhookEvents, ",")
		config.WhatsappWebhookEvents = events
	}
	if envWebhookIgnoreJids := viper.GetString("whatsapp_webhook_ignore_jids"); envWebhookIgnoreJids != "" {
		parts := strings.Split(envWebhookIgnoreJids, ",")
		jids := make([]string, 0, len(parts))
		for _, p := range parts {
			if trimmed := strings.TrimSpace(p); trimmed != "" {
				jids = append(jids, trimmed)
			}
		}
		config.WhatsappWebhookIgnoreJids = jids
	}
	if viper.IsSet("whatsapp_account_validation") {
		config.WhatsappAccountValidation = viper.GetBool("whatsapp_account_validation")
	}
	if viper.IsSet("whatsapp_auto_reject_call") {
		config.WhatsappAutoRejectCall = viper.GetBool("whatsapp_auto_reject_call")
	}
	if envPresenceOnConnect := viper.GetString("whatsapp_presence_on_connect"); envPresenceOnConnect != "" {
		config.WhatsappPresenceOnConnect = envPresenceOnConnect
	}
	// Outbound proxy for whatsmeow WebSocket. Standard HTTP_PROXY env does not
	// apply to the underlying ws dialer; this binding plumbs the address into
	// (*whatsmeow.Client).SetProxyAddress before Connect. See issue #581.
	if envProxy := viper.GetString("whatsapp_proxy"); envProxy != "" {
		config.WhatsappProxy = envProxy
	}
	if viper.IsSet("whatsapp_presence_pulse_enabled") {
		config.WhatsappPresencePulseEnabled = viper.GetBool("whatsapp_presence_pulse_enabled")
	}
	if viper.IsSet("whatsapp_presence_pulse_interval") {
		if interval := viper.GetDuration("whatsapp_presence_pulse_interval"); interval > 0 {
			config.WhatsappPresencePulseInterval = interval
		}
	}
	if viper.IsSet("whatsapp_presence_pulse_duration") {
		if duration := viper.GetDuration("whatsapp_presence_pulse_duration"); duration > 0 {
			config.WhatsappPresencePulseDuration = duration
		}
	}

	// Chatwoot settings
	if viper.IsSet("chatwoot_enabled") {
		config.ChatwootEnabled = viper.GetBool("chatwoot_enabled")
	}
	if envChatwootURL := viper.GetString("chatwoot_url"); envChatwootURL != "" {
		config.ChatwootURL = envChatwootURL
	}
	if envChatwootAPIToken := viper.GetString("chatwoot_api_token"); envChatwootAPIToken != "" {
		config.ChatwootAPIToken = envChatwootAPIToken
	}
	if viper.IsSet("chatwoot_account_id") {
		config.ChatwootAccountID = viper.GetInt("chatwoot_account_id")
	}
	if viper.IsSet("chatwoot_inbox_id") {
		config.ChatwootInboxID = viper.GetInt("chatwoot_inbox_id")
	}
	if envChatwootDeviceID := viper.GetString("chatwoot_device_id"); envChatwootDeviceID != "" {
		config.ChatwootDeviceID = envChatwootDeviceID
	}
	// Chatwoot History Sync settings
	if viper.IsSet("chatwoot_import_messages") {
		config.ChatwootImportMessages = viper.GetBool("chatwoot_import_messages")
	}
	if viper.IsSet("chatwoot_days_limit_import_messages") {
		config.ChatwootDaysLimitImportMessages = viper.GetInt("chatwoot_days_limit_import_messages")
	}
}

func initFlags() {
	// Application flags
	rootCmd.PersistentFlags().StringVarP(
		&config.AppPort,
		"port", "p",
		config.AppPort,
		"change port number with --port <number> | example: --port=8080",
	)

	rootCmd.PersistentFlags().StringVarP(
		&config.AppHost,
		"host", "H",
		config.AppHost,
		`host to bind the server --host <string> | example: --host="127.0.0.1"`,
	)

	rootCmd.PersistentFlags().BoolVarP(
		&config.AppDebug,
		"debug", "d",
		config.AppDebug,
		"hide or displaying log with --debug <true/false> | example: --debug=true",
	)
	rootCmd.PersistentFlags().StringVarP(
		&config.AppOs,
		"os", "",
		config.AppOs,
		`os name --os <string> | example: --os="Chrome"`,
	)
	rootCmd.PersistentFlags().StringSliceVarP(
		&config.AppBasicAuthCredential,
		"basic-auth", "b",
		config.AppBasicAuthCredential,
		"basic auth credential | -b=yourUsername:yourPassword",
	)
	rootCmd.PersistentFlags().StringVarP(
		&config.AppBasePath,
		"base-path", "",
		config.AppBasePath,
		`base path for subpath deployment --base-path <string> | example: --base-path="/gowa"`,
	)
	rootCmd.PersistentFlags().StringSliceVarP(
		&config.AppTrustedProxies,
		"trusted-proxies", "",
		config.AppTrustedProxies,
		`trusted proxy IP ranges for reverse proxy deployments --trusted-proxies <string> | example: --trusted-proxies="0.0.0.0/0" or --trusted-proxies="10.0.0.0/8,172.16.0.0/12"`,
	)

	// Database flags
	rootCmd.PersistentFlags().StringVarP(
		&config.DBURI,
		"db-uri", "",
		config.DBURI,
		`the database uri to store the connection data database uri (by default, we'll use sqlite3 under storages/whatsapp.db). database uri --db-uri <string> | example: --db-uri="file:storages/whatsapp.db?_foreign_keys=on or postgres://user:password@localhost:5432/whatsapp"`,
	)
	rootCmd.PersistentFlags().StringVarP(
		&config.DBKeysURI,
		"db-keys-uri", "",
		config.DBKeysURI,
		`the database uri to store the optional keys cache (by default, we'll use the same database uri). avoid in-memory storage in production. database uri --db-keys-uri <string> | example: --db-keys-uri="file:storages/whatsapp-keys.db?_foreign_keys=on"`,
	)

	// Auth / web console user database flags (dedicated SQLite, separate from chat storage and WhatsApp DBs)
	rootCmd.PersistentFlags().StringVarP(
		&config.AuthStorageURI,
		"auth-db-uri", "",
		config.AuthStorageURI,
		`dedicated sqlite db for web console authentication users (login + management panel) --auth-db-uri <string> | example: --auth-db-uri="file:storages/auth.db?_foreign_keys=on"`,
	)
	rootCmd.PersistentFlags().StringVarP(
		&config.AuthJWTSecret,
		"auth-jwt-secret", "",
		config.AuthJWTSecret,
		`secret used to sign JWT tokens for web console sessions (required in production) --auth-jwt-secret <string>`,
	)
	rootCmd.PersistentFlags().StringVarP(
		&config.AuthSeedUsername,
		"auth-seed-username", "",
		config.AuthSeedUsername,
		`if no users exist, seed a default admin with this username on startup (pair with --auth-seed-password)`,
	)
	rootCmd.PersistentFlags().StringVarP(
		&config.AuthSeedPassword,
		"auth-seed-password", "",
		config.AuthSeedPassword,
		`if no users exist, seed a default admin with this password on startup`,
	)

	// WhatsApp flags
	rootCmd.PersistentFlags().StringVarP(
		&config.WhatsappAutoReplyMessage,
		"autoreply", "",
		config.WhatsappAutoReplyMessage,
		`auto reply when received message --autoreply <string> | example: --autoreply="Don't reply this message"`,
	)
	rootCmd.PersistentFlags().BoolVarP(
		&config.WhatsappAutoMarkRead,
		"auto-mark-read", "",
		config.WhatsappAutoMarkRead,
		`auto mark incoming messages as read --auto-mark-read <true/false> | example: --auto-mark-read=true`,
	)
	rootCmd.PersistentFlags().BoolVarP(
		&config.WhatsappAutoDownloadMedia,
		"auto-download-media", "",
		config.WhatsappAutoDownloadMedia,
		`auto download media from incoming messages --auto-download-media <true/false> | example: --auto-download-media=false`,
	)
	rootCmd.PersistentFlags().StringSliceVarP(
		&config.WhatsappWebhook,
		"webhook", "w",
		config.WhatsappWebhook,
		`forward event to webhook --webhook <string> | example: --webhook="https://yourcallback.com/callback"`,
	)
	rootCmd.PersistentFlags().StringVarP(
		&config.WhatsappWebhookSecret,
		"webhook-secret", "",
		config.WhatsappWebhookSecret,
		`secure webhook request --webhook-secret <string> | example: --webhook-secret="super-secret-key"`,
	)
	rootCmd.PersistentFlags().BoolVarP(
		&config.WhatsappWebhookInsecureSkipVerify,
		"webhook-insecure-skip-verify", "",
		config.WhatsappWebhookInsecureSkipVerify,
		`skip TLS certificate verification for webhooks (INSECURE - use only for development/self-signed certs) --webhook-insecure-skip-verify <true/false> | example: --webhook-insecure-skip-verify=true`,
	)
	rootCmd.PersistentFlags().StringSliceVarP(
		&config.WhatsappWebhookEvents,
		"webhook-events", "",
		config.WhatsappWebhookEvents,
		`whitelist of events to forward to webhook (empty = all events) --webhook-events <string> | example: --webhook-events="message,message.ack,group.participants"`,
	)
	rootCmd.PersistentFlags().StringSliceVarP(
		&config.WhatsappWebhookIgnoreJids,
		"webhook-ignore-jids", "",
		config.WhatsappWebhookIgnoreJids,
		`comma-separated WhatsApp JIDs (or "@g.us"/"@s.whatsapp.net"/"@lid" wildcards) to skip when forwarding to webhooks --webhook-ignore-jids <list> | example: --webhook-ignore-jids="@g.us,628123456789@s.whatsapp.net"`,
	)
	rootCmd.PersistentFlags().BoolVarP(
		&config.WhatsappAccountValidation,
		"account-validation", "",
		config.WhatsappAccountValidation,
		`enable or disable account validation --account-validation <true/false> | example: --account-validation=true`,
	)
	rootCmd.PersistentFlags().BoolVarP(
		&config.WhatsappAutoRejectCall,
		"auto-reject-call", "",
		config.WhatsappAutoRejectCall,
		`auto reject incoming calls --auto-reject-call <true/false> | example: --auto-reject-call=true`,
	)
	rootCmd.PersistentFlags().StringVarP(
		&config.WhatsappPresenceOnConnect,
		"presence-on-connect", "",
		config.WhatsappPresenceOnConnect,
		`presence to send on connect: "available", "unavailable", or "none" --presence-on-connect <string> | example: --presence-on-connect="unavailable"`,
	)
	rootCmd.PersistentFlags().StringVarP(
		&config.WhatsappProxy,
		"whatsapp-proxy", "",
		config.WhatsappProxy,
		`outbound proxy for the WhatsApp WebSocket dialer --whatsapp-proxy <string> | example: --whatsapp-proxy="socks5://user:pass@host:1080"`,
	)
	rootCmd.PersistentFlags().BoolVarP(
		&config.WhatsappPresencePulseEnabled,
		"presence-pulse-enabled", "",
		config.WhatsappPresencePulseEnabled,
		`enable daily presence pulse --presence-pulse-enabled <true/false> | example: --presence-pulse-enabled=true`,
	)
	rootCmd.PersistentFlags().DurationVarP(
		&config.WhatsappPresencePulseInterval,
		"presence-pulse-interval", "",
		config.WhatsappPresencePulseInterval,
		`presence pulse interval --presence-pulse-interval <duration> | example: --presence-pulse-interval=24h`,
	)
	rootCmd.PersistentFlags().DurationVarP(
		&config.WhatsappPresencePulseDuration,
		"presence-pulse-duration", "",
		config.WhatsappPresencePulseDuration,
		`duration to stay available during a presence pulse --presence-pulse-duration <duration> | example: --presence-pulse-duration=5m`,
	)

	// Chatwoot flags
	rootCmd.PersistentFlags().BoolVarP(
		&config.ChatwootEnabled,
		"chatwoot-enabled", "",
		config.ChatwootEnabled,
		`enable Chatwoot integration --chatwoot-enabled <true/false> | example: --chatwoot-enabled=true`,
	)
	rootCmd.PersistentFlags().StringVarP(
		&config.ChatwootDeviceID,
		"chatwoot-device-id", "",
		config.ChatwootDeviceID,
		`device ID for Chatwoot outbound messages --chatwoot-device-id <string> | example: --chatwoot-device-id="my-device"`,
	)
	rootCmd.PersistentFlags().BoolVarP(
		&config.ChatwootImportMessages,
		"chatwoot-import-messages", "",
		config.ChatwootImportMessages,
		`enable message history import to Chatwoot --chatwoot-import-messages <true/false> | example: --chatwoot-import-messages=true`,
	)
	rootCmd.PersistentFlags().IntVarP(
		&config.ChatwootDaysLimitImportMessages,
		"chatwoot-days-limit-import-messages", "",
		config.ChatwootDaysLimitImportMessages,
		`days of message history to import to Chatwoot --chatwoot-days-limit-import-messages <int> | example: --chatwoot-days-limit-import-messages=7`,
	)
}

func initChatStorage() (*sql.DB, error) {
	connStr := sqlite.FormatChatStorageURI(config.ChatStorageURI, config.ChatStorageEnableWAL, config.ChatStorageEnableForeignKeys)

	db, err := sql.Open(sqlite.DriverName, connStr)
	if err != nil {
		return nil, err
	}

	// Configure connection pool
	maxConns := config.ChatStorageMaxOpenConns
	if maxConns < 1 {
		maxConns = 1
	}
	db.SetMaxOpenConns(maxConns)
	db.SetMaxIdleConns(maxConns)

	// Test connection
	if err := db.Ping(); err != nil {
		db.Close()
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	return db, nil
}

func initAuthStorage() (*sql.DB, domainAuth.IAuthRepository, error) {
	connStr := sqlite.FormatChatStorageURI(config.AuthStorageURI, config.AuthStorageEnableWAL, config.AuthStorageEnableForeignKeys)

	db, err := sql.Open(sqlite.DriverName, connStr)
	if err != nil {
		return nil, nil, err
	}

	db.SetMaxOpenConns(1)
	db.SetMaxIdleConns(1)

	if err := db.Ping(); err != nil {
		db.Close()
		return nil, nil, fmt.Errorf("failed to ping auth database: %w", err)
	}

	repo := auth.NewSQLiteAuthRepository(db)
	if err := repo.InitializeSchema(); err != nil {
		db.Close()
		return nil, nil, fmt.Errorf("failed to initialize auth schema: %w", err)
	}

	return db, repo, nil
}

// seedInitialAdminUserIfNeeded creates a default admin user on startup
// only if no users exist in the auth database and AUTH_SEED_USERNAME +
// AUTH_SEED_PASSWORD are provided via env/flag.
func seedInitialAdminUserIfNeeded() {
	if authUsecase == nil {
		return
	}
	if config.AuthSeedUsername == "" || config.AuthSeedPassword == "" {
		return
	}

	// Check if any users already exist
	count, err := authRepo.CountUsers()
	if err != nil {
		logrus.Warnf("auth seed: failed to count users: %v", err)
		return
	}
	if count > 0 {
		// Users already exist, skip seeding
		return
	}

	ctx := context.Background()
	_, err = authUsecase.CreateUser(ctx, domainAuth.CreateUserRequest{
		Username: config.AuthSeedUsername,
		Password: config.AuthSeedPassword,
		Role:     "admin",
	}, nil) // nil actor is allowed for bootstrap when count==0

	if err != nil {
		logrus.Warnf("auth seed: failed to create initial admin user %q: %v", config.AuthSeedUsername, err)
	} else {
		logrus.Infof("auth seed: created initial admin user %q (remove AUTH_SEED_* after first run)", config.AuthSeedUsername)
	}
}

func initApp() {
	if config.AppDebug {
		config.WhatsappLogLevel = "DEBUG"
		logrus.SetLevel(logrus.DebugLevel)
	}

	//preparing folder if not exist
	err := utils.CreateFolder(config.PathQrCode, config.PathSendItems, config.PathStorages, config.PathMedia)
	if err != nil {
		logrus.Errorln(err)
	}

	ctx := context.Background()

	chatStorageDB, err = initChatStorage()
	if err != nil {
		// Terminate the application if chat storage fails to initialize to avoid nil pointer panics later.
		logrus.Fatalf("failed to initialize chat storage: %v", err)
	}

	chatStorageRepo = chatstorage.NewStorageRepository(chatStorageDB)
	chatStorageRepo.InitializeSchema()

	// Dedicated auth storage for web console users (login + management panel)
	authStorageDB, authRepo, err = initAuthStorage()
	if err != nil {
		logrus.Fatalf("failed to initialize auth storage: %v", err)
	}

	whatsappDB := whatsapp.InitWaDB(ctx, config.DBURI)
	var keysDB *sqlstore.Container
	if config.DBKeysURI != "" {
		keysDB = whatsapp.InitWaDB(ctx, config.DBKeysURI)
	}

	whatsappCli = whatsapp.InitWaCLI(ctx, whatsappDB, keysDB, chatStorageRepo)

	// Initialize device manager and usecase for multi-device support
	dm := whatsapp.GetDeviceManager()
	if dm != nil {
		_ = dm.LoadExistingDevices(ctx)
	}

	// Usecase
	appUsecase = usecase.NewAppService(chatStorageRepo, dm)
	callUsecase = usecase.NewCallService()
	chatUsecase = usecase.NewChatService(chatStorageRepo)
	sendUsecase = usecase.NewSendService(appUsecase, chatStorageRepo)
	sendJobUsecase = usecase.NewSendJobService(sendUsecase)
	userUsecase = usecase.NewUserService(chatStorageRepo)
	messageUsecase = usecase.NewMessageService(chatStorageRepo)
	groupUsecase = usecase.NewGroupService()
	newsletterUsecase = usecase.NewNewsletterService()
	deviceUsecase = usecase.NewDeviceService(dm, appUsecase)

	// Console / web auth usecase (uses its own dedicated repo + DB)
	if authRepo != nil {
		authUsecase = usecase.NewAuthService(authRepo)
		seedInitialAdminUserIfNeeded()
	}
}

// Execute adds all child commands to the root command and sets flags appropriately.
func Execute(embedIndex embed.FS, embedViews embed.FS) {
	EmbedIndex = embedIndex
	EmbedViews = embedViews
	if err := rootCmd.Execute(); err != nil {
		os.Exit(1)
	}
}
