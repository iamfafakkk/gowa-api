package config

import (
	"time"

	"go.mau.fi/whatsmeow/proto/waCompanionReg"
)

var (
	AppVersion             = "v8.6.0"
	AppPort                = "3000"
	AppHost                = "0.0.0.0"
	AppDebug               = false
	AppOs                  = "GOWA"
	AppPlatform            = waCompanionReg.DeviceProps_PlatformType(1)
	AppBasicAuthCredential []string
	AppBasePath            = ""
	AppTrustedProxies      []string // Trusted proxy IP ranges (e.g., "0.0.0.0/0" for all, or specific CIDRs)

	McpPort = "8080"
	McpHost = "localhost"

	PathQrCode    = "statics/qrcode"
	PathSendItems = "statics/senditems"
	PathMedia     = "statics/media"
	PathStorages  = "storages"

	DBURI     = "file:storages/whatsapp.db"
	DBKeysURI = ""

	WhatsappAutoReplyMessage          string
	WhatsappAutoMarkRead              = false // Auto-mark incoming messages as read
	WhatsappAutoDownloadMedia         = true  // Auto-download media from incoming messages
	WhatsappWebhook                   []string
	WhatsappWebhookSecret             = "secret"
	WhatsappWebhookInsecureSkipVerify = false          // Skip TLS certificate verification for webhooks (insecure)
	WhatsappWebhookEvents             []string         // Whitelist of events to forward to webhook (empty = all events)
	WhatsappAutoRejectCall                     = false // Auto-reject incoming calls
	WhatsappLogLevel                           = "ERROR"
	WhatsappSettingMaxImageSize       int64    = 20000000  // 20MB
	WhatsappSettingMaxFileSize        int64    = 50000000  // 50MB
	WhatsappSettingMaxVideoSize       int64    = 100000000 // 100MB
	WhatsappSettingMaxDownloadSize    int64    = 500000000 // 500MB
	WhatsappTypeUser                           = "@s.whatsapp.net"
	WhatsappTypeGroup                          = "@g.us"
	WhatsappTypeLid                            = "@lid"
	WhatsappAccountValidation                  = true
	WhatsappPresenceOnConnect                  = "unavailable" // Presence to send on connect: "available", "unavailable", or "none"
	WhatsappPresencePulseEnabled               = true          // Periodically pulse presence available, then unavailable
	WhatsappPresencePulseInterval              = 24 * time.Hour
	WhatsappPresencePulseDuration              = 5 * time.Minute

	ChatStorageURI               = "file:storages/chatstorage.db"
	ChatStorageEnableForeignKeys = true
	ChatStorageEnableWAL         = true

	// AuthStorageURI points to the dedicated SQLite used exclusively for console/web UI
	// user authentication (login) and the user management panel. It is intentionally
	// separate from chatstorage.db and the per-device WhatsApp session DBs.
	AuthStorageURI               = "file:storages/auth.db"
	AuthStorageEnableForeignKeys = true
	AuthStorageEnableWAL         = true
	AuthJWTSecret                = "" // Set via --auth-jwt-secret / AUTH_JWT_SECRET. If empty at startup a dev fallback is used with a warning.

	// AuthSeedUsername / AuthSeedPassword: if set and no users exist in the auth DB
	// at startup, a default admin user will be created automatically (seeded).
	// This is intended only for initial deployment. It is strongly recommended to
	// remove or unset these values after the first successful run.
	AuthSeedUsername string
	AuthSeedPassword string

	ChatwootEnabled   = false
	ChatwootURL       = ""
	ChatwootAPIToken  = ""
	ChatwootAccountID = 0
	ChatwootInboxID   = 0
	ChatwootDeviceID  = "" // Device ID for outbound messages (required for multi-device)

	// Chatwoot History Sync settings
	ChatwootImportMessages          = false // Enable message history import to Chatwoot
	ChatwootDaysLimitImportMessages = 3     // Days of history to import (default: 3)
)
