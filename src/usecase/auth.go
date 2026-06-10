package usecase

import (
	"context"
	"errors"
	"time"

	"github.com/aldinokemal/go-whatsapp-web-multidevice/config"
	domainAuth "github.com/aldinokemal/go-whatsapp-web-multidevice/domains/auth"
	pkgError "github.com/aldinokemal/go-whatsapp-web-multidevice/pkg/error"
	"github.com/aldinokemal/go-whatsapp-web-multidevice/validations"
	"github.com/golang-jwt/jwt/v5"
	"github.com/sirupsen/logrus"
	"golang.org/x/crypto/bcrypt"
)

const (
	defaultJWTExpiry = 24 * time.Hour
	bcryptCost       = bcrypt.DefaultCost
)

type authService struct {
	repo domainAuth.IAuthRepository
}

func NewAuthService(repo domainAuth.IAuthRepository) domainAuth.IAuthUsecase {
	return &authService{repo: repo}
}

func (s *authService) Login(ctx context.Context, req domainAuth.LoginRequest) (domainAuth.LoginResponse, error) {
	if err := validations.ValidateAuthLogin(ctx, req); err != nil {
		return domainAuth.LoginResponse{}, err
	}

	user, err := s.repo.GetUserByUsername(req.Username)
	if err != nil {
		return domainAuth.LoginResponse{}, err
	}
	if user == nil {
		return domainAuth.LoginResponse{}, pkgError.AuthError("invalid username or password")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		return domainAuth.LoginResponse{}, pkgError.AuthError("invalid username or password")
	}

	token, err := s.generateToken(user)
	if err != nil {
		return domainAuth.LoginResponse{}, err
	}

	now := time.Now().UTC()
	_ = s.repo.UpdateLastLogin(user.ID, now) // best effort

	// Return a copy without the hash
	safeUser := *user
	safeUser.PasswordHash = ""
	resp := domainAuth.LoginResponse{
		Token: token,
		User:  safeUser,
	}
	return resp, nil
}

func (s *authService) CreateUser(ctx context.Context, req domainAuth.CreateUserRequest, actor *domainAuth.User) (*domainAuth.User, error) {
	if err := validations.ValidateAuthCreateUser(ctx, req); err != nil {
		return nil, err
	}

	count, err := s.repo.CountUsers()
	if err != nil {
		return nil, err
	}

	if count > 0 {
		// After bootstrap, require an admin actor
		if actor == nil || actor.Role != "admin" {
			return nil, pkgError.AuthError("unauthorized")
		}
	}

	// Hash password
	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcryptCost)
	if err != nil {
		return nil, err
	}

	role := req.Role
	if role == "" {
		role = "admin"
	}

	u := &domainAuth.User{
		Username:     req.Username,
		PasswordHash: string(hash),
		Role:         role,
	}

	if err := s.repo.CreateUser(u); err != nil {
		return nil, err
	}

	// Return without hash
	safe := *u
	safe.PasswordHash = ""
	return &safe, nil
}

func (s *authService) ListUsers(ctx context.Context, actor *domainAuth.User) ([]*domainAuth.User, error) {
	if actor == nil || actor.Role != "admin" {
		return nil, pkgError.AuthError("unauthorized")
	}

	users, err := s.repo.ListUsers()
	if err != nil {
		return nil, err
	}

	// Strip hashes
	for _, u := range users {
		u.PasswordHash = ""
	}
	return users, nil
}

func (s *authService) ChangePassword(ctx context.Context, userID int64, req domainAuth.UpdatePasswordRequest, actor *domainAuth.User) error {
	if err := validations.ValidateAuthUpdatePassword(ctx, req); err != nil {
		return err
	}
	if actor == nil || actor.Role != "admin" {
		return pkgError.AuthError("unauthorized")
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcryptCost)
	if err != nil {
		return err
	}

	return s.repo.UpdatePasswordHash(userID, string(hash))
}

func (s *authService) DeleteUser(ctx context.Context, userID int64, actor *domainAuth.User) error {
	if actor == nil || actor.Role != "admin" {
		return pkgError.AuthError("unauthorized")
	}

	// Prevent deleting the last admin user
	count, err := s.repo.CountUsers()
	if err != nil {
		return err
	}
	if count <= 1 {
		return errors.New("cannot delete the last user")
	}

	// Optional: also prevent self-delete of the only remaining admin, but count<=1 already covers
	return s.repo.DeleteUser(userID)
}

func (s *authService) GetUserByID(ctx context.Context, id int64) (*domainAuth.User, error) {
	u, err := s.repo.GetUserByID(id)
	if err != nil || u == nil {
		return u, err
	}
	u.PasswordHash = ""
	return u, nil
}

// generateToken creates a signed HS256 JWT containing minimal identity claims.
func (s *authService) generateToken(user *domainAuth.User) (string, error) {
	secret := config.AuthJWTSecret
	if secret == "" {
		secret = "dev-insecure-change-me"
		logrus.Warn("AUTH_JWT_SECRET is empty; using dev fallback token secret (do not use in production)")
	}

	now := time.Now().UTC()
	claims := jwt.MapClaims{
		"sub":      user.ID,
		"username": user.Username,
		"role":     user.Role,
		"iat":      now.Unix(),
		"exp":      now.Add(defaultJWTExpiry).Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(secret))
}
