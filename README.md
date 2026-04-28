# Insighta Labs+ Backend (Stage 3)

Secure backend API for Insighta Labs+ with GitHub OAuth, JWT sessions, RBAC, API version enforcement, CSV export, rate limiting, and structured error responses.

## System Architecture

- **Framework**: NestJS (Express adapter)
- **Database**: PostgreSQL via TypeORM
- **Auth**:
  - GitHub OAuth 2.0 (`passport-github2`) with PKCE + state
  - Session middleware for OAuth PKCE state/verifier handling
  - JWT access/refresh token pair
- **Authorization**:
  - `JwtAuthGuard` for authenticated API access
  - `RolesGuard` + `@Roles()` decorator for admin/analyst permissions
- **Interfaces supported by this backend**:
  - CLI client
  - Web portal
  - Direct API consumers

## Authentication Flow

### GitHub OAuth

1. Client hits `GET /auth/github`.
2. Backend redirects to GitHub OAuth authorize URL.
3. GitHub redirects back to `GET /auth/github/callback`.
4. Backend creates/updates user and issues tokens.
5. Backend sets `refreshToken` as HTTP-only cookie and returns access token payload.

### Refresh

- Endpoint: `POST /auth/refresh`
- Accepts refresh token from either:
  - request body: `refresh_token`
  - cookie: `refreshToken`
- On success:
  - invalidates old refresh token server-side
  - issues new access + refresh token
  - rotates refresh cookie

### Logout

- Endpoint: `POST /auth/logout`
- Invalidates refresh token server-side and clears refresh cookie.

## Token Handling Approach

- **Access token**: 3 minutes
- **Refresh token**: 5 minutes
- Refresh tokens are hashed in DB (`refresh-tokens` table).
- Refresh token rotation is enforced (old token invalidated on refresh).
- Single active refresh token per user is maintained.

## Role Enforcement Logic

User roles:
- `admin`: create, delete, export, query
- `analyst`: read/query only

Enforcement:
- Protected endpoints use `JwtAuthGuard`.
- Role-sensitive endpoints also use `RolesGuard` + `@Roles(...)`.
- `is_active = false` users are blocked with `403`.

## API Versioning Requirement

Profiles endpoints require:
- Header: `X-API-Version: 1`

Missing header response:
```json
{
  "status": "error",
  "message": "API version header required"
}
```

## Profiles API Notes

- Existing Stage 1/2 features retained:
  - profile creation with external APIs
  - filtering/sorting/pagination
  - natural language search
- Pagination response includes:
  - `page`, `limit`, `total`, `total_pages`, `links`, `data`

## CSV Export

- Endpoint: `GET /api/profiles/export?format=csv`
- Admin-only
- Applies same filters + sorting semantics as profile list
- Returns downloadable CSV:
  - `Content-Type: text/csv`
  - `Content-Disposition: attachment; filename="profiles_<timestamp>.csv"`
- Column order:
  - `id,name,gender,gender_probability,age,age_group,country_id,country_name,country_probability,created_at`

## Rate Limiting & Logging

Rate limits:
- `/auth/*`: 10 req/min
- all other endpoints: 60 req/min (keyed by user ID when bearer token present, else IP)

Request logging on every request includes:
- method
- endpoint
- status code
- response time

## Standardized Error Format

All errors follow:
```json
{
  "status": "error",
  "message": "message"
}
```

## CLI Usage (Backend Contract)

This backend supports CLI commands such as:
- `insighta login`
- `insighta logout`
- `insighta whoami`
- `insighta profiles list`
- `insighta profiles get <id>`
- `insighta profiles search "..."`
- `insighta profiles create --name "..."`
- `insighta profiles export --format csv`

CLI is expected to:
- store credentials at `~/.insighta/credentials.json`
- attach tokens on authenticated requests
- auto-refresh when access token expires

## Natural Language Parsing Approach

Search endpoint uses deterministic rule-based parsing:
- keyword matching over normalized lowercased tokens
- maps words to structured filters (`gender`, `age_group`, `min_age`, `max_age`, `country_id`)
- combines filters with AND logic
- returns validation error if query cannot be interpreted

## Environment Variables

Required:
- `PORT`
- `DATABASE_PUBLIC_URL`
- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`
- `BASE_URL`
- `JWT_SECRET`
- `SESSION_SECRET` (recommended)

## Local Run

```bash
npm install
npm run build
npm run start:dev
```
