# StaticForgeGo Backend Architecture

## Overview

StaticForgeGo is organised around a layered architecture that distinguishes transport, business logic, data access, and infrastructure concerns.

```
cmd/server/main.go           -- Server bootstrap
├── internal/
│   ├── config/               -- Environment configuration loading, JWT/crypto secrets
│   ├── database/             -- MySQL + Redis clients, migrations, seed routines
│   ├── domain/               -- Core entity definitions (User, Project, FileAsset, Session, Analytics)
│   ├── repositories/         -- GORM repositories for MySQL persistence
│   ├── services/             -- Business logic (auth, projects, publishing, analytics)
│   ├── oauth/                -- Custom provider registry and OpenID client helpers
│   ├── storage/              -- Local filesystem coordination under data/projects
│   ├── analytics/            -- Redis aggregation and scheduled flush to MySQL
│   ├── http/
│   │   ├── middlewares/      -- Auth, admin guard, rate limit, static auth cookies
│   │   ├── handlers/         -- Gin handlers for REST APIs
│   │   └── router/           -- Route binding layout (public, auth, admin, published sites)
│   └── scheduler/            -- Background jobs (analytics flush)
└── pkg/                      -- Shared helpers (responses, hashing, tokens, logging)
```

## Key Responsibilities

- **Configuration**: Load `.env`, environment variables, and provide strongly typed config (ports, DB creds, JWT, static root). Generates and persists JWT signing key on first run.
- **Bootstrap**: `cmd/server/main.go` wires config, logging, databases, repositories, services, HTTP router, scheduler, and graceful shutdown.
- **Authentication & Users**: Handles admin auto-creation, passwordless OAuth mapping, bcrypt password storage, JWT issuance/refresh, cookie session storage via Redis.
- **Projects & Files**: Enforces unique project names, manages filesystem directories, debounced autosave metadata tracking, prevents deletion of `index.html`, validates uploads.
- **Publishing**: Toggles public availability, optional password protection with cookie verification, serves static assets using Gin `StaticFS`.
- **Analytics**: Middleware collects PV/UV, stores counters in Redis, scheduled worker flushes aggregated stats into MySQL.
- **Administration**: Admin-only handlers for managing users/projects, disabling accounts, cleaning project directories, viewing analytics snapshots.

## Database Schema Outline

- `users`: id, username, email, password_hash (nullable), role, status, oauth_provider, metadata, created_at, updated_at.
- `oauth_providers`: id, name, key, icon_url, issuer, client_id, client_secret, scopes, claim_name, claim_email, created_at, updated_at.
- `projects`: id, owner_id, name, display_name, description, is_published, password_hash (nullable), publish_at, created_at, updated_at.
- `analytics_daily`: id, project_id, date, pv, uv, sources_json, created_at.
- `sessions`: id, user_id, refresh_token, expires_at, created_at (optional depending on strategy).

## Redis Usage

- Session storage (refresh tokens, OAuth state).
- Analytics counters: `analytics:{projectID}:{date}` with hyperloglog for UV and hash fields for PV/source counts.
- Temporary publish password verifications and rate limiting.

## File Storage Layout

- Root path configurable, default `data/projects`.
- Files stored under `data/projects/{username}/{projectName}/`.
- Publish routine ensures current snapshot is served from root and optionally writes hashed password for protected routes.

## Background Jobs

- Analytics flush job runs on ticker (configurable interval).
- Admin password creation logs once during bootstrap when no users exist.

## Testing Strategy

- Unit tests for services with repository and storage mocks.
- Integration coverage for auth flows, project lifecycle, and analytics flush (using dockerised MySQL/Redis or in-memory substitutes).
