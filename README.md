# Vent Wall

A short-lived public wall for vents — share how you feel, react to others, and let posts fade after 24 hours. Accounts are optional for browsing; sign in to post, comment, and manage your profile.

---

## Get started

### Run with Docker (recommended)

You need [Docker](https://docs.docker.com/get-docker/) and Docker Compose on the machine that will host the app.

1. **Copy the environment file**

   ```bash
   cp .env.docker.example .env
   ```

2. **Start everything**

   **Local / default** (single file):

   ```bash
   docker compose up -d --build
   # or: podman compose up -d --build
   ```

   **VPS / low-memory** (base + explicit second file):

   ```bash
   docker compose -f docker-compose.yml -f docker-compose.vps.yml up -d --build
   # or: podman compose -f docker-compose.yml -f docker-compose.vps.yml up -d --build
   ```

   The VPS overlay (`docker-compose.vps.yml`) uses a tighter Node build heap (512) and
   prefers production-ish defaults when those keys are **unset** in `.env`.
   Postgres is published only on `127.0.0.1` in the base compose (not on public interfaces).

   On the VPS, set in `.env` (otherwise values already in `.env` win over overlay defaults):

   ```env
   CLIENT_ORIGIN=http://YOUR_SERVER_IP:3000   # or https://your-domain
   ALLOW_LOCALHOST_CORS=false
   VENTWALL_SEED_DB=false                     # true only for the first seed
   NODE_MAX_OLD_SPACE_SIZE=512
   ```

   Confirm Postgres is loopback-only after merge:

   ```bash
   docker compose -f docker-compose.yml -f docker-compose.vps.yml config | grep -A25 'postgres:'
   # published host should be 127.0.0.1 (not 0.0.0.0)
   ```

3. **Open the app**

   Visit the web URL from your `.env` (default):

   **http://localhost:3000**

   On first start the database is migrated and seeded with demo data (local default). Try logging in as:

   | Username | Password |
   |----------|----------|
   | `demo`   | `demo123` |

4. **Stop the stack**

   ```bash
   docker compose down
   # VPS stack:
   docker compose -f docker-compose.yml -f docker-compose.vps.yml down
   ```

Useful commands:

| Command | What it does |
|---------|----------------|
| `npm run docker:up` | Local stack: `docker compose up -d --build` |
| `npm run docker:down` | Stops local stack |
| `npm run docker:logs` | Follow container logs |
| `npm run docker:vps:up` | VPS overlay: base + `docker-compose.vps.yml` |
| `npm run docker:vps:down` | Stops VPS overlay stack |
| `npm run docker:vps:build` | Sequential image build (low RAM) |
| `npm run docker:vps:config` | Print merged compose config |

---

## Hosting on a shared server

If ports **3000**, **4000**, or **5432** are already in use, change them in `.env` before starting:

```env
VENTWALL_WEB_PORT=3100
VENTWALL_API_PORT=4100
VENTWALL_POSTGRES_PORT=55432
CLIENT_ORIGIN=http://localhost:3100
```

`CLIENT_ORIGIN` must match the address people use in the browser (scheme + host + port).

Run more than one copy on the same machine by using different ports and a project name:

```bash
COMPOSE_PROJECT_NAME=ventwall-staging docker compose up -d --build
```

### Environment essentials

| Variable | Purpose |
|----------|---------|
| `VENTWALL_WEB_PORT` | Public web UI port |
| `VENTWALL_API_PORT` | Direct API access (optional; the web UI proxies `/api`) |
| `VENTWALL_POSTGRES_PORT` | Exposed Postgres port (optional; for external DB tools) |
| `CLIENT_ORIGIN` | Allowed browser origin for CORS |
| `JWT_SECRET` / `IP_HASH_SECRET` | Auth secrets — use long random values in production (`openssl rand -hex 32`) |
| `KLIPY_API_KEY` | Enables GIF search for posts, comments, and profile pictures |
| `ADMIN_USER_IDS` | Comma-separated user UUIDs who can open `/admin` |
| `VENTWALL_SEED_DB` | Set to `false` after the first run to skip re-seeding demo data on restart |

After the first successful deployment, set `VENTWALL_SEED_DB=false` in `.env` and restart the API container.

---

## Using Vent Wall

### The Wall (home)

The home feed shows posts that are still **on the Wall** (less than 24 hours old).

- **Filter by mood tags** — tap tags to narrow the feed; combine multiple tags.
- **Sort & time range** — newest, oldest, most reactions, or trending; limit to today, this week, or this month.
- **Search** — quick tag search or advanced search (text + tags + date).
- **Trending** — toggle the trending panel for popular tags and activity.
- **Open a post** — click a card to read the full vent, react, and comment.

Posts leave the public Wall after **24 hours**. They remain on your **Profile** in the archive.

### Create a post

Sign in, then use the **+** floating button on the home page.

Each post needs:

- **Content** — up to **500 characters** of text, and/or a **GIF** from Klipy (Add GIF).
- **Mood tags** — pick **1–3** tags that describe how you feel.

You can post up to **3 vents per day**.

### React and comment

On a post detail page (while it is on the Wall):

- **Reactions** — up to **3 different emoji reactions** per post per user.
- **Comments** — emoji or GIF replies; up to **10 comments per user per post**.

Comments and attached GIFs are only available while the post is on the Wall. After 24 hours the thread closes but the post text (and any post GIF) stays on your profile.

### Your profile

Open **Profile** from the header after signing in.

| Area | What you can do |
|------|-----------------|
| **Username** | Change your display name |
| **Profile picture** | Pick a GIF from Klipy (max 2 MB) |
| **Status** | Short line (30 characters, letters/numbers/spaces) shown under your name on posts and comments |
| **Stats** | Vents, reactions, join date, activity |
| **Posts tab** | “On the Wall” vents as full cards; older vents grouped by date in collapsible archive sections |
| **Search tab** | Search your own vents by text, mood tag, or date |
| **Delete** | Remove your own vents (permanent) |

### Feedback

Signed-in users see a **feedback** button (bottom-right on most pages). Use it to suggest new mood tags or send product feedback — **one submission per day**.

### Admin dashboard

Users listed in `ADMIN_USER_IDS` can open **/admin** for usage overview, feedback inbox, and moderation-style stats. This is intended for a small trusted team (about 2–5 people).

---

## Limits at a glance

| Action | Limit |
|--------|-------|
| Posts per day | 3 |
| Post length | 500 characters |
| Mood tags per post | 1–3 |
| Time on public Wall | 24 hours |
| Reactions per user per post | 3 unique emojis |
| Comments per user per post | 10 |
| Profile status | 30 characters |
| Feedback submissions | 1 per day |
| GIF posts / GIF comments | Hourly rate limit applies |

GIF features require a valid `KLIPY_API_KEY` on the server. GIF media is cached temporarily and cleaned up after posts expire.

---

## Troubleshooting

**The site loads but sign-in or posts fail**

- Check API logs: `docker compose logs api`
- Confirm `CLIENT_ORIGIN` in `.env` matches the URL in your browser.

**Port already allocated**

- Change `VENTWALL_WEB_PORT`, `VENTWALL_API_PORT`, and/or `VENTWALL_POSTGRES_PORT` in `.env`, update `CLIENT_ORIGIN` if the web port changed, then `docker compose up -d --build`.

**GIF picker empty or errors**

- Add `KLIPY_API_KEY` to `.env` and restart: `docker compose up -d api`

**Database connection errors on startup**

- Wait for Postgres to become healthy, or run `docker compose ps` and ensure the `postgres` service is up.
- API migrations run automatically on container start.

**Want a fresh demo dataset**

- Set `VENTWALL_SEED_DB=true`, restart the API, or run seed manually against your database.

**Web Docker build: JavaScript heap out of memory**

The Vent Globe stack (`react-globe.gl` + `three`) makes `vite build` RAM-heavy. On a small VPS:

1. Use the **VPS compose overlay** and sequential builds:
   ```bash
   docker compose -f docker-compose.yml -f docker-compose.vps.yml build --parallel 1
   docker compose -f docker-compose.yml -f docker-compose.vps.yml up -d
   # or: npm run docker:vps:build && npm run docker:vps:up
   ```
2. Add temporary swap if the host has little free RAM (example 2G):
   ```bash
   sudo fallocate -l 2G /swapfile
   sudo chmod 600 /swapfile
   sudo mkswap /swapfile
   sudo swapon /swapfile
   ```
3. Tune Node heap for the web image (MB) in `.env`:
   ```bash
   NODE_MAX_OLD_SPACE_SIZE=512   # vps default; try 768/1024 if you have headroom
   ```
4. Rebuild only web after frontend changes:
   ```bash
   docker compose -f docker-compose.yml -f docker-compose.vps.yml build --parallel 1 web
   docker compose -f docker-compose.yml -f docker-compose.vps.yml up -d web
   ```

Docker web build uses `npm run build:docker` (`vite build` only) to avoid a second TypeScript peak.

**Podman/Docker: blank page in browser**

Usually not “compose failed” — the stack can be up while the UI looks empty:

1. Open **`http://localhost:3000`** (or your `VENTWALL_WEB_PORT`), not only the API port `4000`.
2. Hard refresh (Ctrl+Shift+R) after rebuild so old asset hashes are not cached.
3. Rebuild web after the low-memory vite fix (globe code must not load on first paint):
   ```bash
   podman compose build --parallel 1 web
   podman compose up -d
   ```
4. If the desktop opens **Vent Globe** first and WebGL is blocked, try `http://localhost:3000/?view=wall`.
5. Confirm assets exist:
   ```bash
   curl -sI http://localhost:3000/ | head -1
   curl -s http://localhost:3000/api/health
   ```
6. DevTools → Console/Network: look for failed `/assets/*.js` or CORS errors.  
   `CLIENT_ORIGIN` should match the browser URL (e.g. `http://localhost:3000`).

---

## Project layout (for operators)

| Path | Role |
|------|------|
| `docker-compose.yml` | Base stack: Postgres, API, web (local default) |
| `docker-compose.vps.yml` | Explicit VPS overlay (merge with `-f … -f …`) |
| `.env.docker.example` | Template for `.env` |
| `docker/` | API and web Dockerfiles, nginx config, entrypoint |
| `db/migrations/` | Database schema updates (applied automatically in Docker) |

---

## Local development

For contributors running the frontend and API outside Docker:

```bash
npm run db:up          # Postgres only
npm run db:migrate
npm run db:seed
npm run dev:server     # API on :4000
npm run dev            # Web on :3000 (proxies /api)
```

Copy `server/.env.example` to `server/.env` and adjust `DATABASE_URL` if needed.

---

Vent Wall is built for expressive, ephemeral sharing — post honestly, tag your mood, and let the Wall breathe.