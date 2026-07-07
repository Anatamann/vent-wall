# Vent Wall — Production Security Guide

This document describes the security controls built into Vent Wall and the steps required before exposing the app to the public internet.

It covers authentication, API integrations (especially Klipy GIFs), abuse limits, and deployment configuration.

---

## Security model (summary)

Vent Wall is an anonymous mood-sharing app with a 24-hour Wall lifetime. Security is layered:

1. **Network edge** — TLS, reverse proxy, rate limits
2. **Application** — JWT auth, input validation, per-action caps
3. **Integrations** — Klipy proxy with host allowlists and no client-side API keys
4. **Data** — Parameterized SQL, hashed passwords, hashed registration IPs, expiring cached media

There is no admin panel or email verification yet. Treat **account creation** and **GIF search/ingest** as the highest-cost abuse surfaces.

---

## Pre-production checklist

Complete every item before going live.

### Secrets and environment

- [ ] Copy `server/.env.example` to `server/.env` and **never commit** `.env`
- [ ] Set `NODE_ENV=production`
- [ ] Generate strong secrets (32+ characters each):
  ```bash
  openssl rand -hex 32   # JWT_SECRET
  openssl rand -hex 32   # IP_HASH_SECRET (must differ from JWT_SECRET)
  ```
- [ ] Set `CLIENT_ORIGIN` to your exact production frontend URL (scheme + host, no trailing slash)
  - Example: `https://ventwall.example.com`
- [ ] Set `DATABASE_URL` to a production PostgreSQL instance (not localhost defaults)
- [ ] Set `KLIPY_API_KEY` from [Klipy partner dashboard](https://partner.klipy.com/api-keys)
- [ ] Confirm the server **starts successfully** — production boot fails if secrets are weak or missing (`server/src/config/env.ts`)

### Database

- [ ] Run migrations: `npm run db:migrate`
- [ ] Confirm migration `008_security_hardening.sql` is applied (login throttling + report deduplication)
- [ ] Use a dedicated DB user with least privilege (not superuser)
- [ ] Enable automated backups and test restore

### Reverse proxy and TLS

- [ ] Terminate TLS at nginx, Caddy, or a cloud load balancer
- [ ] Proxy `/api` to the Node server on port 4000 (or your chosen `PORT`)
- [ ] Ensure the proxy **overwrites** `X-Forwarded-For` with the real client IP
- [ ] Do **not** expose port 4000 directly to the internet

The API sets `trust proxy` to `1` (one hop). This is required for correct IP-based rate limits and registration guards. If the app is reachable without a trusted proxy, clients can spoof IPs and weaken limits.

### Build and deploy

- [ ] Build frontend: `npm run build`
- [ ] Build server: `npm run build --prefix server`
- [ ] Serve the frontend as static files; API runs as a separate process (e.g. systemd, PM2, container)
- [ ] Restart the API after any `.env` change

---

## Environment variables reference

| Variable | Required in prod | Purpose |
|----------|------------------|---------|
| `NODE_ENV` | Yes | Must be `production` to enable strict checks |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `JWT_SECRET` | Yes | Signs session tokens (32+ random chars) |
| `IP_HASH_SECRET` | Yes | HMAC salt for registration/login IP hashing (separate from JWT) |
| `CLIENT_ORIGIN` | Yes | Only origin allowed by CORS |
| `PORT` | No | API listen port (default `4000`) |
| `KLIPY_API_KEY` | For GIF comments | Server-side only; never exposed to the browser |

**Never** put `KLIPY_API_KEY`, `JWT_SECRET`, or `IP_HASH_SECRET` in frontend env vars or client bundles.

---

## Authentication and sessions

### How it works

- Passwords hashed with **bcrypt** (cost factor 12)
- Sessions are **JWT** tokens (7-day expiry), sent as `Authorization: Bearer <token>`
- Frontend stores the token in `localStorage` (`src/lib/api.ts`)

### Password policy (production)

- Minimum 8 characters, maximum 128
- Must include at least one letter and one number

### Login brute-force protection

- IP + username failure tracking in `login_attempts` table
- **20 failed attempts per hour** per IP or username (production)
- Generic error message: `Invalid username or password` (no account enumeration on login)

### Registration abuse protection

- Registration IPs stored as **HMAC-SHA256 hashes** (not plaintext)
- **3 accounts per IP per 24 hours** (production)
- **15 registration attempts per hour** before 24-hour IP block
- Duplicate username/email returns a generic: `Username or email is already in use`

### Known limitation

JWT in `localStorage` is vulnerable to XSS token theft. Mitigation today: no `dangerouslySetInnerHTML` in the app. Future improvement: HttpOnly Secure cookies with short-lived access tokens.

---

## Rate limits

Limits are enforced by `express-rate-limit`. In production (single server):

| Endpoint / action | Limit |
|-------------------|-------|
| All `/api/*` | 300 requests / 15 min per IP |
| `POST /api/auth/login` | 50 / 15 min per IP |
| `POST /api/auth/register` | 50 / 15 min per IP |
| `GET /api/auth/check-username` | 30 / 15 min per IP |
| `GET /api/media/gifs/search` | 30 / min per IP (auth required) |
| `POST /api/vents/:id/comments` | 60 / 15 min per IP |
| `POST /api/reports` | 10 / day per user |

### Application-level caps (database-enforced)

| Action | Limit |
|--------|-------|
| Posts per user per day | 3 |
| Reactions per user per vent | 3 |
| Comments per user per vent | 10 |
| Comments per vent (all users) | 200 |
| GIF comments per user per hour | 20 |
| Wall visibility | 24 hours |

### Scaling note

Default rate limits use **in-memory** storage. They reset on restart and do not sync across multiple API instances. For horizontal scaling, configure a shared store (e.g. Redis) before running more than one API process.

---

## API integrations — Klipy GIFs

Klipy is used server-side only. The browser never sees `KLIPY_API_KEY`.

### Request flow

1. Authenticated user searches GIFs → `GET /api/media/gifs/search` → server calls Klipy
2. User selects a GIF → `POST /api/vents/:id/comments` with `{ type: "gif", gif_id: "..." }`
3. Server fetches GIF metadata from Klipy, downloads the file, caches it under `server/media/cache/`
4. Cached file served at `/api/media/assets/:id` until the post leaves the Wall (max 24h)

### SSRF protections

When downloading GIFs from Klipy:

- URL must be **HTTPS**
- Host must be on the allowlist: `static.klipy.com`, `media.klipy.com` (and legacy Tenor hosts)
- **No trusted-provider bypass** — allowlist always applies
- Redirects followed manually (max 3 hops), re-validated after each hop
- Download size capped at **5 MB**
- Klipy API errors do not log full URLs (API key is embedded in Klipy request paths)

### GIF ID validation

Only numeric Klipy IDs (1–20 digits) are accepted. Arbitrary strings cannot drive outbound API calls.

### Ads

Klipy ad parameters are not used. Search requests use `rating=g`.

### Cost abuse mitigation

- GIF search requires authentication
- Dedicated search rate limit (30/min)
- GIF comment hourly cap per user (20/hour)
- Cache deduplication by `external_id` avoids re-downloading the same GIF

---

## Media cache

| Control | Detail |
|---------|--------|
| Storage | `server/media/cache/` (gitignored) |
| Expiry | `expires_at` on `media_assets`, aligned with vent Wall lifetime |
| Cleanup | Hourly job removes expired rows and files (`server/src/jobs/media-cleanup.ts`) |
| Path traversal | `resolveMediaAbsolutePath()` enforces paths stay under `MEDIA_ROOT` |
| Serving | Streamed via `createReadStream` (not loaded fully into memory) |
| Asset IDs | Must be valid UUIDs |

Cached GIFs are short-lived display copies, not a redistribution library. The legal disclaimer is served at `GET /api/media/legal/gif-disclaimer`.

---

## Access control and IDOR

| Resource | Rule |
|----------|------|
| Vents on Wall | Visible to everyone |
| Expired vents | Visible only to the owner |
| Comments | Only while vent is on Wall; closed after expiry |
| Reactions | Only while vent is on Wall |
| Delete vent | Owner only (`user_id` match in SQL) |
| Reports | Authenticated; one report per user per vent |
| Media assets | Public by UUID, but IDs are unguessable and files expire |

---

## Input validation

All write endpoints validate input with **Zod** or dedicated validators before touching the database.

| Input | Validation |
|-------|------------|
| Vent content | 1–500 chars |
| Mood tags | 1–3 valid UUIDs, must exist in `mood_tags` |
| Emoji comments | Emoji-only regex, max 32 chars |
| GIF comments | Numeric Klipy ID |
| Reactions | Same emoji rules as comments |
| Reports | Enum reason + optional details (max 500 chars) |
| Feed tag filter | Comma-separated UUIDs only |
| JSON body | 16 KB max |

SQL uses parameterized queries throughout — no string-concatenated queries.

---

## HTTP security headers

`helmet()` is enabled on the API (`server/src/index.ts`):

- Standard security headers (X-Content-Type-Options, X-Frame-Options, etc.)
- Content-Security-Policy disabled (JSON API, not HTML)
- `crossOriginResourcePolicy: cross-origin` so cached GIFs load in the frontend

Add **HSTS** at the reverse proxy when TLS is terminated there (recommended).

---

## CORS

- Single allowed origin: `CLIENT_ORIGIN`
- Credentials enabled (for future cookie-based auth)
- Do not use `*` in production

If you have staging and production frontends, deploy separate API instances or extend CORS to an explicit allowlist — never open to all origins.

---

## Health endpoint

`GET /api/health`:

- **Development:** returns `{ status, database }` for local debugging
- **Production:** returns `{ status: "ok" }` only (no database detail)

Use internal monitoring or proxy-level health checks for deeper diagnostics.

---

## Recommended reverse proxy config (nginx sketch)

```nginx
server {
    listen 443 ssl http2;
    server_name ventwall.example.com;

    # ssl_certificate / ssl_certificate_key ...

    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Frontend static files
    root /var/www/vent-wall/dist;
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API
    location /api/ {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## Monitoring and incident response

### Watch these signals

- Rate-limit 429 spikes (possible abuse or misconfigured proxy IPs)
- Klipy API 502 errors (quota, key expiry, upstream outage)
- Disk usage under `server/media/cache/` (cleanup job failures)
- Failed login / registration attempt growth in `login_attempts` and `registration_attempts`
- Unusual GIF ingest volume (`media_assets` insert rate)

### If secrets are compromised

1. Rotate `JWT_SECRET` immediately (invalidates all sessions — users must re-login)
2. Rotate `IP_HASH_SECRET` (registration IP hashes change; historical blocks remain but new hashes differ)
3. Rotate `KLIPY_API_KEY` in Klipy dashboard and `.env`
4. Review access logs for anomalous GIF downloads or auth attempts

### If abuse is detected

- Block abusive IPs at the reverse proxy or firewall (faster than app-level limits)
- Temporarily disable GIF comments by removing `KLIPY_API_KEY` (returns 503 on GIF paths)
- Consider lowering limits in `server/src/constants.ts` and redeploying

---

## Production verification commands

After deploy, confirm controls are active:

```bash
# Health (minimal response in production)
curl -s https://your-domain.com/api/health

# GIF search requires auth (expect 401)
curl -s -o /dev/null -w "%{http_code}\n" https://your-domain.com/api/media/gifs/search?q=test

# GIF search with token (expect 200 + items)
curl -s "https://your-domain.com/api/media/gifs/search?q=hug&per_page=2" \
  -H "Authorization: Bearer <token>"

# CORS rejects wrong origin (test from browser devtools on another domain)
```

---

## Future hardening (not yet implemented)

| Item | Why |
|------|-----|
| Redis-backed rate limits | Multi-instance deployments |
| HttpOnly session cookies | Reduce XSS token theft risk |
| Email verification | Reduce throwaway account abuse |
| CAPTCHA on register/login | Bot resistance at scale |
| Signed/time-limited media URLs | Tighter control on cached GIF access |
| WAF / bot management | Edge protection for high-traffic deploys |

---

## Key source files

| Area | Path |
|------|------|
| Boot validation | `server/src/config/env.ts` |
| Rate limits & helmet | `server/src/index.ts` |
| Auth & JWT | `server/src/middleware/auth.ts`, `server/src/routes/auth.ts` |
| Login throttling | `server/src/utils/login-guard.ts` |
| Registration guards | `server/src/utils/registration-guard.ts` |
| Klipy provider | `server/src/providers/klipy.ts` |
| Media / SSRF controls | `server/src/utils/media-assets.ts` |
| Comment validation | `server/src/utils/comments.ts` |
| Limits constants | `server/src/constants.ts` |
| Security migration | `db/migrations/008_security_hardening.sql` |

---

## Related docs

- [LOCAL_START_GUIDE.md](./LOCAL_START_GUIDE.md) — local development setup
- [phase-7-testing-deployment.md](./phase-7-testing-deployment.md) — broader deployment notes