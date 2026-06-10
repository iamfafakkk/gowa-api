package auth

import (
	"context"
	"time"
)

// IAuthRepository defines persistence operations for console auth users.
// Implemented by the dedicated auth SQLite repository (separate DB from chatstorage).
type IAuthRepository interface {
	// User CRUD
	CreateUser(user *User) error
	GetUserByID(id int64) (*User, error)
	GetUserByUsername(username string) (*User, error)
	ListUsers() ([]*User, error)
	DeleteUser(id int64) error
	UpdatePasswordHash(id int64, newHash string) error
	UpdateLastLogin(id int64, t time.Time) error

	// Bootstrap / safety helpers
	CountUsers() (int64, error)

	// Schema initialization (called at startup, similar to chatstorage)
	InitializeSchema() error
}

// IAuthUsecase is the business contract consumed by REST handlers (and later MCP if needed).
type IAuthUsecase interface {
	// Login validates credentials (bcrypt), issues a JWT, updates last_login.
	Login(ctx context.Context, req LoginRequest) (LoginResponse, error)

	// CreateUser creates a console user. When no users exist yet this is allowed
	// without prior authentication (first-admin bootstrap). After that it requires
	// an authenticated admin caller.
	CreateUser(ctx context.Context, req CreateUserRequest, actor *User) (*User, error)

	ListUsers(ctx context.Context, actor *User) ([]*User, error)

	// ChangePassword updates the target user's password hash. Actor must be admin
	// (or the same user in future self-service scenarios).
	ChangePassword(ctx context.Context, userID int64, req UpdatePasswordRequest, actor *User) error

	DeleteUser(ctx context.Context, userID int64, actor *User) error

	// GetUserByID / GetMe helpers if needed by handlers
	GetUserByID(ctx context.Context, id int64) (*User, error)
}
