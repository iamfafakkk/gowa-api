package rest

import (
	"strconv"

	domainAuth "github.com/aldinokemal/go-whatsapp-web-multidevice/domains/auth"
	"github.com/aldinokemal/go-whatsapp-web-multidevice/pkg/utils"
	"github.com/gofiber/fiber/v2"
)

type Auth struct {
	Service domainAuth.IAuthUsecase
}

func InitRestAuth(app fiber.Router, service domainAuth.IAuthUsecase) {
	h := &Auth{Service: service}

	// Public
	app.Post("/auth/login", h.Login)

	// Protected management (RequireAuth middleware must be applied by caller on the group or per-route)
	app.Get("/auth/users", h.ListUsers)
	app.Post("/auth/users", h.CreateUser)
	app.Put("/auth/users/:id/password", h.ChangePassword)
	app.Delete("/auth/users/:id", h.DeleteUser)

	// Convenience
	app.Get("/auth/me", h.Me)
}

func (h *Auth) Login(c *fiber.Ctx) error {
	var req domainAuth.LoginRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(utils.ResponseData{
			Status:  fiber.StatusBadRequest,
			Code:    "BAD_REQUEST",
			Message: "invalid request body",
		})
	}

	resp, err := h.Service.Login(c.UserContext(), req)
	if err != nil {
		// Let recovery + existing error types produce proper status (AuthError -> 401)
		utils.PanicIfNeeded(err)
		return err
	}

	return c.JSON(utils.ResponseData{
		Status:  200,
		Code:    "SUCCESS",
		Message: "Login successful",
		Results: resp,
	})
}

func (h *Auth) ListUsers(c *fiber.Ctx) error {
	actor := getAuthUser(c)
	users, err := h.Service.ListUsers(c.UserContext(), actor)
	utils.PanicIfNeeded(err)

	return c.JSON(utils.ResponseData{
		Status:  200,
		Code:    "SUCCESS",
		Message: "Users retrieved",
		Results: users,
	})
}

func (h *Auth) CreateUser(c *fiber.Ctx) error {
	var req domainAuth.CreateUserRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(utils.ResponseData{
			Status:  fiber.StatusBadRequest,
			Code:    "BAD_REQUEST",
			Message: "invalid request body",
		})
	}

	actor := getAuthUser(c)
	created, err := h.Service.CreateUser(c.UserContext(), req, actor)
	utils.PanicIfNeeded(err)

	return c.JSON(utils.ResponseData{
		Status:  201,
		Code:    "SUCCESS",
		Message: "User created",
		Results: created,
	})
}

func (h *Auth) ChangePassword(c *fiber.Ctx) error {
	idStr := c.Params("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(utils.ResponseData{
			Status:  fiber.StatusBadRequest,
			Code:    "BAD_REQUEST",
			Message: "invalid user id",
		})
	}

	var req domainAuth.UpdatePasswordRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(utils.ResponseData{
			Status:  fiber.StatusBadRequest,
			Code:    "BAD_REQUEST",
			Message: "invalid request body",
		})
	}

	actor := getAuthUser(c)
	if err := h.Service.ChangePassword(c.UserContext(), id, req, actor); err != nil {
		utils.PanicIfNeeded(err)
		return err
	}

	return c.JSON(utils.ResponseData{
		Status:  200,
		Code:    "SUCCESS",
		Message: "Password updated",
	})
}

func (h *Auth) DeleteUser(c *fiber.Ctx) error {
	idStr := c.Params("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(utils.ResponseData{
			Status:  fiber.StatusBadRequest,
			Code:    "BAD_REQUEST",
			Message: "invalid user id",
		})
	}

	actor := getAuthUser(c)
	if err := h.Service.DeleteUser(c.UserContext(), id, actor); err != nil {
		utils.PanicIfNeeded(err)
		return err
	}

	return c.JSON(utils.ResponseData{
		Status:  200,
		Code:    "SUCCESS",
		Message: "User deleted",
	})
}

func (h *Auth) Me(c *fiber.Ctx) error {
	actor := getAuthUser(c)
	if actor == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(utils.ResponseData{
			Status:  fiber.StatusUnauthorized,
			Code:    "AUTHENTICATION_ERROR",
			Message: "unauthorized",
		})
	}

	// Return a safe copy (no hash)
	safe := *actor
	safe.PasswordHash = ""

	return c.JSON(utils.ResponseData{
		Status:  200,
		Code:    "SUCCESS",
		Message: "Current user",
		Results: safe,
	})
}

func getAuthUser(c *fiber.Ctx) *domainAuth.User {
	if c == nil {
		return nil
	}
	if v := c.Locals("auth_user"); v != nil {
		if u, ok := v.(*domainAuth.User); ok {
			return u
		}
	}
	return nil
}
