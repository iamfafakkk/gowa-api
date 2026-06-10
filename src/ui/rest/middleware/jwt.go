package middleware

import (
	"strings"

	"github.com/aldinokemal/go-whatsapp-web-multidevice/config"
	domainAuth "github.com/aldinokemal/go-whatsapp-web-multidevice/domains/auth"
	"github.com/aldinokemal/go-whatsapp-web-multidevice/pkg/utils"
	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"github.com/sirupsen/logrus"
)

// JWTMiddleware parses Authorization: Bearer <token> (if present) and, when valid,
// injects the authenticated user into c.Locals("auth_user"). It is intentionally
// non-blocking so that legacy basic-auth or public routes can still proceed.
func JWTMiddleware() fiber.Handler {
	return func(c *fiber.Ctx) error {
		authHeader := string(c.Request().Header.Peek("Authorization"))
		if authHeader == "" {
			return c.Next()
		}

		const bearerPrefix = "Bearer "
		if !strings.HasPrefix(authHeader, bearerPrefix) {
			return c.Next()
		}

		tokenStr := strings.TrimPrefix(authHeader, bearerPrefix)
		tokenStr = strings.TrimSpace(tokenStr)
		if tokenStr == "" {
			return c.Next()
		}

		secret := config.AuthJWTSecret
		if secret == "" {
			secret = "dev-insecure-change-me"
		}

		token, err := jwt.Parse(tokenStr, func(t *jwt.Token) (interface{}, error) {
			if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fiber.ErrUnauthorized
			}
			return []byte(secret), nil
		})
		if err != nil || !token.Valid {
			// Do not block; other auth mechanisms (basic) may still apply
			logrus.Debugf("JWT parse failed (non-fatal for middleware): %v", err)
			return c.Next()
		}

		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			return c.Next()
		}

		uidFloat, _ := claims["sub"].(float64)
		username, _ := claims["username"].(string)
		role, _ := claims["role"].(string)

		if username == "" {
			return c.Next()
		}

		user := &domainAuth.User{
			ID:       int64(uidFloat),
			Username: username,
			Role:     role,
		}
		c.Locals("auth_user", user)
		// Also expose username for the legacy basic-auth compatibility path in RequireAuth
		if c.Locals("username") == nil {
			c.Locals("username", username)
		}
		return c.Next()
	}
}

// RequireAuth enforces that the request has a valid JWT user (from JWTMiddleware).
// The old Basic Auth support has been removed completely ("basic auth hapus total").
// Public endpoints (health, chatwoot webhook, /auth/login, the login page itself) must not be wrapped.
func RequireAuth() fiber.Handler {
	return func(c *fiber.Ctx) error {
		if u := c.Locals("auth_user"); u != nil {
			if _, ok := u.(*domainAuth.User); ok {
				return c.Next()
			}
		}

		return c.Status(fiber.StatusUnauthorized).JSON(utils.ResponseData{
			Status:  fiber.StatusUnauthorized,
			Code:    "AUTHENTICATION_ERROR",
			Message: "unauthorized",
		})
	}
}
