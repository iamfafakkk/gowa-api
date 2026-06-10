package auth

import (
	"database/sql"
	"fmt"
	"time"

	domainAuth "github.com/aldinokemal/go-whatsapp-web-multidevice/domains/auth"
	"github.com/aldinokemal/go-whatsapp-web-multidevice/pkg/sqlite"
)

// SQLiteAuthRepository implements domainAuth.IAuthRepository using a dedicated SQLite DB.
type SQLiteAuthRepository struct {
	db *sql.DB
}

// NewSQLiteAuthRepository creates the repository. The caller is responsible for
// calling InitializeSchema() after construction (usually once at startup).
func NewSQLiteAuthRepository(db *sql.DB) domainAuth.IAuthRepository {
	return &SQLiteAuthRepository{db: db}
}

// InitializeSchema creates the schema (if needed) and runs any pending migrations.
func (r *SQLiteAuthRepository) InitializeSchema() error {
	version, err := r.getSchemaVersion()
	if err != nil {
		return err
	}

	migrations := r.getMigrations()
	for i := version; i < len(migrations); i++ {
		if err := r.runMigration(migrations[i], i+1); err != nil {
			return fmt.Errorf("failed to run auth migration %d: %w", i+1, err)
		}
	}
	return nil
}

func (r *SQLiteAuthRepository) getSchemaVersion() (int, error) {
	_, err := r.db.Exec(`
		CREATE TABLE IF NOT EXISTS schema_info (
			version INTEGER PRIMARY KEY,
			updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)
	`)
	if err != nil {
		return 0, err
	}

	var version int
	err = r.db.QueryRow("SELECT COALESCE(MAX(version), 0) FROM schema_info").Scan(&version)
	if err != nil {
		return 0, err
	}
	return version, nil
}

func (r *SQLiteAuthRepository) runMigration(migration string, version int) error {
	tx, err := r.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	if _, err := tx.Exec(migration); err != nil {
		return err
	}

	_, _ = tx.Exec("DELETE FROM schema_info WHERE version = ?", version)
	if _, err := tx.Exec("INSERT INTO schema_info (version) VALUES (?)", version); err != nil {
		return err
	}

	return tx.Commit()
}

// getMigrations returns the append-only list of schema migrations for the auth DB.
// Add new migrations only at the end.
func (r *SQLiteAuthRepository) getMigrations() []string {
	return []string{
		// Migration 1: users table for console/web auth
		`CREATE TABLE IF NOT EXISTS users (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			username TEXT NOT NULL UNIQUE,
			password_hash TEXT NOT NULL,
			role TEXT NOT NULL DEFAULT 'admin',
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			last_login_at TIMESTAMP
		)`,
		// Migration 2: index on username for fast login lookups
		`CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)`,
	}
}

// --- IAuthRepository implementation ---

func (r *SQLiteAuthRepository) CreateUser(user *domainAuth.User) error {
	now := time.Now()
	user.CreatedAt = now
	user.UpdatedAt = now

	_, err := r.db.Exec(`
		INSERT INTO users (username, password_hash, role, created_at, updated_at, last_login_at)
		VALUES (?, ?, ?, ?, ?, ?)
	`, user.Username, user.PasswordHash, user.Role, user.CreatedAt, user.UpdatedAt, user.LastLoginAt)
	return err
}

func (r *SQLiteAuthRepository) GetUserByID(id int64) (*domainAuth.User, error) {
	row := r.db.QueryRow(`
		SELECT id, username, password_hash, role, created_at, updated_at, last_login_at
		FROM users WHERE id = ?
	`, id)

	u := &domainAuth.User{}
	var lastLogin sql.NullTime
	if err := row.Scan(&u.ID, &u.Username, &u.PasswordHash, &u.Role, &u.CreatedAt, &u.UpdatedAt, &lastLogin); err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	if lastLogin.Valid {
		u.LastLoginAt = &lastLogin.Time
	}
	return u, nil
}

func (r *SQLiteAuthRepository) GetUserByUsername(username string) (*domainAuth.User, error) {
	row := r.db.QueryRow(`
		SELECT id, username, password_hash, role, created_at, updated_at, last_login_at
		FROM users WHERE username = ?
	`, username)

	u := &domainAuth.User{}
	var lastLogin sql.NullTime
	if err := row.Scan(&u.ID, &u.Username, &u.PasswordHash, &u.Role, &u.CreatedAt, &u.UpdatedAt, &lastLogin); err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	if lastLogin.Valid {
		u.LastLoginAt = &lastLogin.Time
	}
	return u, nil
}

func (r *SQLiteAuthRepository) ListUsers() ([]*domainAuth.User, error) {
	rows, err := r.db.Query(`
		SELECT id, username, password_hash, role, created_at, updated_at, last_login_at
		FROM users
		ORDER BY id ASC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var users []*domainAuth.User
	for rows.Next() {
		u := &domainAuth.User{}
		var lastLogin sql.NullTime
		if err := rows.Scan(&u.ID, &u.Username, &u.PasswordHash, &u.Role, &u.CreatedAt, &u.UpdatedAt, &lastLogin); err != nil {
			return nil, err
		}
		if lastLogin.Valid {
			u.LastLoginAt = &lastLogin.Time
		}
		users = append(users, u)
	}
	return users, rows.Err()
}

func (r *SQLiteAuthRepository) DeleteUser(id int64) error {
	_, err := r.db.Exec(`DELETE FROM users WHERE id = ?`, id)
	return err
}

func (r *SQLiteAuthRepository) UpdatePasswordHash(id int64, newHash string) error {
	now := time.Now()
	_, err := r.db.Exec(`
		UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?
	`, newHash, now, id)
	return err
}

func (r *SQLiteAuthRepository) UpdateLastLogin(id int64, t time.Time) error {
	_, err := r.db.Exec(`
		UPDATE users SET last_login_at = ?, updated_at = ? WHERE id = ?
	`, t, t, id)
	return err
}

func (r *SQLiteAuthRepository) CountUsers() (int64, error) {
	var count int64
	err := r.db.QueryRow(`SELECT COUNT(*) FROM users`).Scan(&count)
	return count, err
}

// OpenAuthDB is a small helper used by cmd/root.go (mirrors chat storage open pattern).
// It applies WAL + FK pragmas when requested using the shared sqlite formatter.
func OpenAuthDB(uri string, enableWAL, enableFK bool) (*sql.DB, error) {
	connStr := sqlite.FormatChatStorageURI(uri, enableWAL, enableFK)

	db, err := sql.Open(sqlite.DriverName, connStr)
	if err != nil {
		return nil, err
	}

	db.SetMaxOpenConns(1)
	db.SetMaxIdleConns(1)

	if err := db.Ping(); err != nil {
		db.Close()
		return nil, fmt.Errorf("failed to ping auth database: %w", err)
	}
	return db, nil
}
