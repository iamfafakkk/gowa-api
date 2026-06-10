# PRD: Web Console Authentication (Dedicated SQLite Users) + User Management Panel

**Generated:** 2026-06-08 (via prd skill invocation)  
**Source plan:** See detailed implementation plan at `/Users/imf/.grok/sessions/%2FUsers%2Fimf%2FDesktop%2FGOLANG%2Fgowa-api/019eb0c7-276f-7fd2-b000-aed3925e8730/plan.md` (and the approved plan content).  
**Related:** docs/superpowers/plans/2026-06-07-web-frontend.md (the React `/web` console this protects).

---

## Goals

- Provide a proper username + password login experience **specifically for the new standalone React web console** (`/web`, served under `/` and `/console`).
- Use a **dedicated SQLite database** (`storages/auth.db` or equivalent) isolated from `chatstorage.db` and per-device WhatsApp DBs.
- Add a **user management panel** inside the web console (list, create, password reset, delete users) so admins can manage console access without editing env/flags or the DB manually.
- Replace reliance on static `APP_BASIC_AUTH` (HTTP Basic) for the interactive web UI while keeping backward compatibility for existing API clients.
- Follow all project conventions (AGENTS.md): prd first, domains for contracts, chatstorage-like dedicated repo + append migrations, usecase validation, Fiber middleware scoping, `web/src/features/*` mirroring for frontend.

## Non-Goals / Out of Scope (this iteration)

- Replacing or removing `APP_BASIC_AUTH` entirely (legacy API / curl / integrations must continue to work via Basic when configured).
- Implementing the old embedded Vue UI (`src/views`) auth (only the new `/web` React console).
- Full RBAC matrix, refresh tokens, SSO/OIDC, password reset email flows, or viewer vs admin permission differences beyond basic role.
- Protecting static HTML delivery at the server (SPA always serves index for console paths; client-side route guard + 401 on API calls).
- Changes to WhatsApp multi-device, device scoping (`X-Device-Id`), or chat/message storage.

## User Stories

1. As a first-time operator, I can create the initial admin user (no prior auth required) so I can bootstrap the system securely.
2. As a console user, I can log in with username + password via a dedicated login screen and then access the full Web Console (Dashboard, Devices, Send, API Docs, and the new Users panel).
3. As a logged-in admin, I can manage other console users (create with role, reset passwords, delete) from within the UI, with safeguards (e.g. cannot delete the last admin).
4. As an API integrator using legacy tools, I can continue using HTTP Basic Auth (`-u user:pass`) against existing endpoints when `APP_BASIC_AUTH` is configured; new JWT users do not interfere.
5. As an operator deploying behind a sub-path, the login, token handling, nav, and API calls all respect `--base-path` / `appBasePath`.
6. As a developer, the auth data lives in its own DB file so I can wipe chat history without losing admin accounts (and vice versa).

## Acceptance Criteria

**Backend / Storage**
- [ ] On first `go run . rest`, `storages/auth.db` (or configured URI) is created with `users` and `schema_info` tables (versioned migrations, append-only).
- [ ] `POST /auth/login` with valid DB user returns 200 + JWT token (and user info sans hash). Invalid → 401 using existing `AuthError`.
- [ ] `POST /auth/users` (bootstrap case: zero users) succeeds without Authorization header and creates the first admin.
- [ ] Subsequent user management endpoints require valid auth (JWT preferred; legacy basic accepted for compatibility) and return 401/403 appropriately.
- [ ] Passwords are **never** returned in any response; stored only as bcrypt hashes (cost >= 10).
- [ ] JWT uses HS256, configurable secret via `AUTH_JWT_SECRET` (loud warning + dev fallback if unset). Expiry reasonable (e.g. 24h+).
- [ ] `GET /auth/me`, list/create/update-pw/delete users implemented.
- [ ] Last-admin deletion is rejected (both API and UI).
- [ ] Health (`/health`) and chatwoot webhook remain fully public (no auth required).
- [ ] `/auth` routes are correctly reserved so SPA index is not served for them.

**Config / Wiring**
- [ ] New settings: `AuthStorageURI`, enable WAL/FK, `AuthJWTSecret` (plus flags, viper env, `.env` support following existing priority).
- [ ] `initAuthStorage` + repo + usecase initialized exactly like chat storage in `cmd/root.go`.
- [ ] `src/.env.example` documents the new keys.

**Frontend (React + MUI + Vite)**
- [ ] Unauthenticated access to `/` or `/console/*` shows (or redirects to) a clean Login page (MUI Paper, username/password fields, submit).
- [ ] Successful login stores token (localStorage), fetches `/auth/me` or equivalent, populates auth context, navigates to Dashboard.
- [ ] All existing API calls (devices, send, etc.) automatically include `Authorization: Bearer <token>` when a token is present.
- [ ] 401 responses globally clear token and force re-login.
- [ ] New top-level (or grouped) "Users" nav item appears after login; clicking opens the management page.
- [ ] Users page: table of users (id/username/role/created), "Create User" action (username + pw + role), row actions for "Reset Password" and "Delete".
- [ ] Create/edit flows use same dialog/table patterns as DevicesPage + DeviceLoginDialog.
- [ ] Logout action (header or elsewhere) clears token and returns to login.
- [ ] Base path, theme, and MUI conventions fully respected. No new runtime npm dependencies required.
- [ ] Refreshing the page while authenticated keeps the user logged in and on the current console view.

**Security / Ops / Quality**
- [ ] bcrypt used for all password hashing/verification.
- [ ] Duplicate username creation rejected with clear validation error.
- [ ] Auth DB completely separate from chatstorage and whatsapp DBs (no device_id column or scoping needed on users).
- [ ] `go build`, `go vet`, `go test ./...` pass; web `npm run build` succeeds.
- [ ] Manual verification checklist from the implementation plan (first-user bootstrap, legacy basic coexistence, last-admin guard, subpath, persistence) passes.
- [ ] PRD is living: if scope changes mid-impl, re-invoke prd skill and update this doc + the session plan.md.

## Technical Considerations (from approved plan + AGENTS.md)

- **Storage pattern to copy:** `src/cmd/root.go:initChatStorage`, `src/infrastructure/chatstorage/sqlite_repository.go` (InitializeSchema + getSchemaVersion + runMigration + getMigrations append-only + schema_info), `pkg/sqlite/*` for URI formatting.
- **Domain separation:** New `src/domains/auth/` (never add console auth types to `domains/user/` which is WhatsApp-only).
- **Auth compatibility:** `RequireAuth` must accept either (a) valid JWT user in context/locals or (b) legacy basic-auth username (from existing `middleware.BasicAuth()` capture + `basicauth.New`). Order of middlewares in `cmd/rest.go` is critical.
- **SPA integration:** Always serve the index for console paths (client guard); add "/auth" to `reservedBackendPrefixes` in `cmd/spa.go`.
- **Frontend mirroring:** Replicate the entire `web/src/features/devices/` structure (api + context + hook + types + selectors) for auth/users. Use `withBasePath` everywhere. Follow exact MUI + state patterns from DevicesPage / SendMessagesPage.
- **First-user bootstrap rule:** Special case only on create-user when `COUNT(*) == 0`. All other management requires a valid authenticated admin.
- **Dependencies:** `golang.org/x/crypto` (bcrypt) already indirect — promote. Add `github.com/golang-jwt/jwt/v5`.
- **Error reuse:** Prefer `pkg/error.AuthError` (401) and `utils.ResponseData`.
- **Migrations:** Auth repo must have its own `getMigrations()`; append only. Start with users table + schema_info.
- **No code before PRD:** This document was produced by the prd skill invocation before any Go or TS implementation edits.

## Scope Boundaries & Risks

**In:** Dedicated DB + repo + usecase + JWT + login endpoint + user CRUD endpoints + middleware (JWT + require) + full frontend login + users panel + wiring + config + verification.

**Out (future work):** Role-based feature flags in UI, refresh tokens + httpOnly cookies, password policy UI, audit logging of user actions, bulk import, self-service password reset.

**Risks / Mitigations:**
- Breaking existing Basic-auth API clients → Mitigation: RequireAuth explicitly falls back to legacy basic success.
- Token leakage in localStorage → Standard for SPAs; document logout on shared machines; short-ish expiry.
- First-user bootstrap attack surface → Only works when zero users; after first admin, normal auth required. Document clearly.
- JWT secret not set in prod → Loud warning on startup + obvious dev fallback value; document in .env.example and readme.

## References

- Detailed execution plan (files, exact functions to reuse, verification steps): the session plan.md linked above.
- Existing chat storage contract: `src/domains/chatstorage/interfaces.go` + impl.
- Middleware examples: `src/ui/rest/middleware/{basicauth.go,device.go}`.
- Frontend device feature as template: `web/src/features/devices/`.
- AGENTS.md sections on "WHERE TO LOOK", "CONVENTIONS", "ANTI-PATTERNS", and the SUPERPOWERS SKILLS (prd requirement).

This PRD is the authoritative requirements artifact. All implementation must trace back to the stories/ACs here and the referenced plan. Re-run prd skill on any material scope change.
