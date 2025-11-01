# StaticForge

StaticForge is a self-hosted platform for creating, managing, and publishing static websites online. It provides authentication, file management, analytics, and an embedded React frontend.

## Features

### Core Features

- **User Management**

  - Registration and login with password
  - OAuth/OpenID login support with custom providers
  - Admin management interface
- **Project Management**

  - Create and manage multiple static website projects
  - Unique project names across the platform
  - Monaco Editor integration (frontend handles editing)
  - Auto-save functionality
  - Project published at `/s/{projectName}/`
- **Publishing & Access Control**

  - One-click publish/unpublish
  - Consent mechanism: first-time visitors must accept via `/auth/{projectName}` (frontend route)
  - Optional password protection for published sites
  - Cookie-based authentication
- **Analytics**

  - Automatic tracking of page views (PV) and unique visitors (UV)
  - Redis-based aggregation with periodic MySQL persistence
  - Trend data available via API
- **Security**

  - Origin check prevents static sites from accessing management APIs
  - bcrypt password hashing
  - JWT-based authentication
  - Static sites can be embedded in iframes from any origin
  - Management API protected from cross-origin access

## Technology Stack

- **Backend**: Go + Gin
- **Database**: MySQL
- **Cache**: Redis
- **Frontend**: React + TypeScript (embedded in binary)
- **ORM**: GORM
- **Auth**: JWT + OAuth2

## Installation

### Prerequisites

- Go 1.21+
- MySQL 5.7+ / 8.0+
- Redis 6.0+
- Node.js 18+ (for frontend development)

### Quick Start

1. **Clone and build backend:**

```bash
git clone https://github.com/itsHenry35/StaticForge.git
cd StaticForge
go mod download
go build -o StaticForge
```

2. **Setup database:**

```sql
CREATE DATABASE staticforge CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

3. **Configure:** Edit `config.json` (auto-created on first run):

```json
{
  "server": {
    "host": "0.0.0.0",
    "port": 8080,
    "mode": "release",
    "base_url": "http://localhost:8080"
  },
  "database": {
    "host": "localhost",
    "port": 3306,
    "username": "root",
    "password": "your_password",
    "database": "staticforge"
  },
  "redis": {
    "host": "localhost",
    "port": 6379
  }
}
```

4. **Run:**

```bash
./StaticForge
```

### First Startup

On first run, an admin account is auto-created:

```
=====================================
ADMIN ACCOUNT CREATED
=====================================
Username: admin
Password: <random-12-chars>
=====================================
```

**Save these credentials!**

## Frontend Development

The frontend is located in `web/` and embedded into the Go binary at build time.

### Development Setup

```bash
cd web
npm install
npm start
```

Frontend runs on `http://localhost:3000` with API proxy to backend.

### Building for Production

```bash
cd web
npm run build
```

Built files go to `web/build/` and are embedded in the Go binary.

## Architecture

### Directory Structure

```
StaticForge/
├── api/
│   ├── handlers/      # HTTP handlers
│   ├── middlewares/   # Middleware (auth, CORS, security, origin check)
│   └── routes/        # Route definitions + embedded frontend
├── config/            # Configuration management
├── database/          # Database initialization
├── models/            # GORM models
├── services/          # Business logic (analytics)
├── types/             # DTOs
├── utils/             # Utilities
├── web/               # React frontend
│   └── dist/          # Production build (embedded in main.go)
├── data/projects/     # User projects storage
├── main.go            # Main entry point with embedded frontend
└── config.json
```

### Request Flow

1. **Frontend Access** (`/`, `/app/*`, `/auth/:name`):

   - Served from embedded `web/build/index.html`
   - React Router handles client-side routing
2. **API Requests** (`/api/*`):

   - Origin check middleware blocks requests from `/s/*`
   - JWT authentication for protected routes
   - Admin middleware for admin routes
3. **Static Sites** (`/s/:name/*`):

   - Check consent cookie (`consent_{projectName}`)
   - If no consent → redirect to `/auth/{projectName}`
   - If password protected → check password cookie
   - If missing/invalid → redirect to `/auth/{projectName}`
   - Serve static files from `data/projects/{username}/{projectName}/`

## Key Features Explained

### Consent Mechanism

Every project requires user consent before first access:

1. User visits `/s/my-project/`
2. No `consent_my-project` cookie → redirect to `/auth/my-project` (frontend)
3. Frontend shows consent UI (and password input if needed)
4. User accepts → frontend calls:
   - `POST /api/auth/consent/my-project` (no password)
   - `POST /api/auth/verify-project-password/my-project` (with password)
5. Backend sets cookies:
   - `consent_{projectName}` (1 year)
   - `project_auth_{projectName}` (7 days, if password protected)
6. User redirected to `/s/my-project/`

### Security Model

- **API Protection**: Origin check middleware prevents static sites from calling management APIs
- **Iframe Embedding**: Static sites can be embedded anywhere (no X-Frame-Options for `/s/*`)
- **No File Restrictions**: Upload any file type (only size limit: 100MB)

### Analytics

- **Automatic**: Visits recorded when serving `index.html`
- **Privacy**: Visitor ID = MD5(IP + User-Agent)
- **Storage**: Redis (realtime) → MySQL (every 5 minutes)
- **Metrics**: PV, UV, daily trends

## Deployment

### Production Build

```bash
# Build frontend
cd web
npm run build

# Build backend (embeds frontend)
cd ..
go build -ldflags="-s -w" -o StaticForge

# Run
./StaticForge
```

### Systemd Service

```ini
[Unit]
Description=StaticForge
After=network.target mysql.service redis.service

[Service]
Type=simple
User=staticforge
WorkingDirectory=/opt/staticforge
ExecStart=/opt/staticforge/StaticForge
Restart=always

[Install]
WantedBy=multi-user.target
```

### Nginx Reverse Proxy

```nginx
server {
    listen 80;
    server_name staticforge.example.com;

    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    client_max_body_size 100M;
}
```

## Development

### Backend

```bash
go run main.go
```

### Frontend

```bash
cd web
npm start
```

Frontend proxies API requests to `http://localhost:8080`.

### Hot Reload

Use `air` for backend hot reload:

```bash
go install github.com/cosmtrek/air@latest
air
```

## License

MIT License

## Contributing

Contributions welcome! Please open an issue or PR.

## Support

For issues: https://github.com/itsHenry35/StaticForge/issues
