# Vent Wall — Local Start Guide

Manual instructions for running Vent Wall on your machine with local PostgreSQL, the Node API, and the Vite frontend.

---

## Prerequisites

- **Node.js** 18+ and npm
- **Docker** or **Podman** (for PostgreSQL)
- Free ports **3000** (frontend) and **4000** (API)

---

## First-time setup

Run these steps once per machine (or after a fresh clone).

### 1. Install dependencies

```bash
cd /path/to/vent-wall

npm install
cd server && npm install && cd ..
```

### 2. Configure environment

```bash
cp server/.env.example server/.env
cp .env.example .env.local
```

**`server/.env`**

```env
DATABASE_URL=postgresql://ventwall:ventwall@localhost:5432/ventwall
JWT_SECRET=change-this-to-a-long-random-string-in-production
PORT=4000
CLIENT_ORIGIN=http://localhost:3000
```

**`.env.local`** (optional — defaults work in dev)

```env
VITE_API_URL=/api
```

### 3. Start PostgreSQL

```bash
npm run db:up
```

If Docker fails with permission errors, try Podman:

```bash
podman compose up -d
```

Wait a few seconds for the database to become ready.

### 4. Migrate and seed the database

```bash
npm run db:migrate
npm run db:seed
```

Or run database + schema + seed in one step (first time only):

```bash
npm run db:setup
```

---

## Daily startup

Use **three terminals** (database can stay running between sessions).

### Terminal 1 — Database

```bash
cd /path/to/vent-wall
npm run db:up
```

Skip this if Postgres is already running from a previous session.

Check readiness (optional):

```bash
pg_isready -h localhost -p 5432
```

### Terminal 2 — API server

```bash
cd /path/to/vent-wall
npm run dev:server
```

Expected output:

```
Vent Wall API running on http://localhost:4000
```

Verify the API:

```bash
curl http://localhost:4000/api/health
```

Expected response:

```json
{"status":"ok","database":"connected"}
```

### Terminal 3 — Frontend

```bash
cd /path/to/vent-wall
npm run dev
```

Open the app: **http://localhost:3000**

Vite proxies `/api` requests to `http://localhost:4000` in development.

---

## Demo accounts

After seeding, these accounts are available. **Sign in with username + password** (not email).

| Username | Password |
|----------|----------|
| `demo` | `demo123` |
| `mindful_soul` | `demo123` |
| `night_thinker` | `demo123` |
| `coffee_dreamer` | `demo123` |
| `ocean_waves` | `demo123` |
| `city_wanderer` | `demo123` |
| `quiet_storm` | `demo123` |
| `sunrise_seeker` | `demo123` |
| `midnight_poet` | `demo123` |

You can also register new accounts at **http://localhost:3000/auth**.

---

## Stopping services

| Service | How to stop |
|---------|-------------|
| Frontend | `Ctrl+C` in Terminal 3 |
| API server | `Ctrl+C` in Terminal 2 |
| PostgreSQL | `npm run db:down` |

---

## Useful commands

| Task | Command |
|------|---------|
| Start database | `npm run db:up` |
| Stop database | `npm run db:down` |
| Run migrations | `npm run db:migrate` |
| Seed demo data | `npm run db:seed` |
| Full DB setup | `npm run db:setup` |
| Dev API | `npm run dev:server` |
| Dev frontend | `npm run dev` |
| Build frontend | `npm run build` |
| Build API | `npm run build:server` |
| Run API (production build) | `cd server && npm start` |

---

## Troubleshooting

### `Too many requests` on login or API calls

The dev rate limiter may have tripped. Restart the API server:

```bash
# Ctrl+C in the API terminal, then:
npm run dev:server
```

Hard-refresh the browser (`Ctrl+Shift+R`).

### Health check returns `database: disconnected`

PostgreSQL is not running or not ready.

```bash
npm run db:up
sleep 5
curl http://localhost:4000/api/health
```

### Frontend loads but feed shows errors

The API must be running on port **4000** before you use the app. Start Terminal 2 first.

### `EADDRINUSE` on port 3000 or 4000

Another process is using that port. Stop it, or change `PORT` in `server/.env` and update the Vite proxy in `vite.config.ts` if needed.

### Re-sync demo sample data

The seed script is idempotent — it adds missing demo users, vents, reactions, and comments, and refreshes demo post wall timers. Safe to run anytime:

```bash
npm run db:seed
```

To wipe **everything** and re-seed from scratch:

```bash
PGPASSWORD=ventwall psql -h localhost -U ventwall -d ventwall \
  -c "TRUNCATE vent_comments, registration_attempts, blocked_ip_hashes, users, mood_tags, vents, vent_tags, reactions, reports CASCADE;"
npm run db:seed
```

### Docker permission denied

Use Podman instead:

```bash
podman compose up -d
```

---

## Quick reference

```bash
# ── First time only ──
npm install && cd server && npm install && cd ..
cp server/.env.example server/.env
npm run db:setup

# ── Every session ──
npm run db:up          # Terminal 1 (skip if already up)
npm run dev:server     # Terminal 2
npm run dev            # Terminal 3 → http://localhost:3000
```

---

## Architecture (local dev)

```
Browser  →  http://localhost:3000  (Vite / React)
                ↓ proxy /api
           http://localhost:4000  (Express API)
                ↓
           localhost:5432         (PostgreSQL via Docker/Podman)
```

---

## Related docs

- [PROJECT_SUMMARY.md](./PROJECT_SUMMARY.md) — project status and architecture notes
- [../DEVELOPMENT_PLAN.md](../DEVELOPMENT_PLAN.md) — original development roadmap