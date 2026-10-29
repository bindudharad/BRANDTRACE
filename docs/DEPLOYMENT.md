# Deployment guide

BRANDTRACE is not deployed by this repository. The local and container paths below were prepared for a user-operated deployment; no public URL is implied.

## Local Windows path

Run the API on port 8000 and Vite on port 3000 as documented in the root README. The frontend uses its Vite `/api` proxy while developing. SQLite creates `brandtrace.db` in the configured location and survives API restarts.

## PostgreSQL container path

From the repository root:

```powershell
docker compose up --build
```

Before starting, copy the local production password setting from `.env.production.example` into an untracked `.env` and replace it with a strong URL-safe value. Open `http://localhost:8080`; API documentation is at `http://localhost:8000/docs`. Docker retains deployed-style data in the `brandtrace-postgres` named volume. `GET /api/ready` is the service health check and reports `database: postgresql` when connected. The seed is idempotent: it creates fictional rules/facts only when the database has no rules.

## Public deployment steps

1. Provision a managed PostgreSQL 16+ database, create an application user with access only to the BRANDTRACE database, and obtain its TLS connection string.
2. Set API secrets from `.env.production.example`: `DATABASE_URL` (PostgreSQL), `CORS_ORIGINS` (the exact frontend origin), and optional server-side AI provider values. Never place a database or AI secret in `VITE_*` variables.
3. Build the frontend with `VITE_API_BASE_URL=https://YOUR_API_DOMAIN`; deploy the static `dist/` directory and API as separate services, then configure HTTPS at the provider/reverse proxy.
4. Verify `/api/health`, `/api/ready` (must report PostgreSQL), the no-key demo submission, a guarded approval, stored draft versions and audit trail from a fresh browser session.
5. Back up the managed database before upgrades. The current schema has an idempotent initialization path in `init_db()` rather than a migration framework; production schema migrations remain a manual-release responsibility until an Alembic migration layer is added.

The backend supports SQLite for the zero-setup local demo and `postgresql://`/`postgres://` production URLs through SQLAlchemy + Psycopg. PostgreSQL was not connected in this workspace because no database credentials/provider access were supplied; a public deployment and live PostgreSQL runtime verification are therefore not claimed.
