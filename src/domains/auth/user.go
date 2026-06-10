package auth

import "time"

// User represents a console / web UI administrative user stored in the dedicated auth DB.
type User struct {
	ID           int64      `json:"id" db:"id"`
	Username     string     `json:"username" db:"username"`
	PasswordHash string     `json:"-" db:"password_hash"` // never expose
	Role         string     `json:"role" db:"role"`
	CreatedAt    time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt    time.Time  `json:"updated_at" db:"updated_at"`
	LastLoginAt  *time.Time `json:"last_login_at,omitempty" db:"last_login_at"`
}

// LoginRequest is the payload for POST /auth/login
type LoginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

// LoginResponse returns a JWT + safe user info (no hash)
type LoginResponse struct {
	Token string `json:"token"`
	User  User   `json:"user"`
}

// CreateUserRequest for creating a new console user (from management panel or bootstrap)
type CreateUserRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
	Role     string `json:"role"` // e.g. "admin"
}

// UpdatePasswordRequest for password reset / change
type UpdatePasswordRequest struct {
	Password string `json:"password"`
}
