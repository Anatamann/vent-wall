# Vent Wall — Project Summary & Continuation Plan

**Last analyzed:** July 6, 2026  
**Purpose:** Snapshot of current codebase state, recommended architecture changes, and a path to resume development with local infrastructure while preserving the existing UI.

---

## What Vent Wall Is

Vent Wall is an anonymous mood-sharing platform where users post emotional "vents" tagged with mood labels, react with emojis, and browse a supportive community feed. The product goal is a digital bulletin board for mental health and emotional expression — not a full social network.

**Core user flows (already built in UI):**
- Browse a feed of vents with mood tag filters, sorting, and time filters
- Sign up / sign in with username + password
- Post a vent (1–3 mood tags, 500 char limit, 3 posts/day)
- React to vents with emoji
- View and manage a personal profile (username, stats, vent history, delete own posts)
- Advanced features: trending dashboard, advanced search UI, content reporting UI, performance monitor (dev-only)

---

## Current Technology Stack

| Layer | Current | Planned (local) |
|-------|---------|-----------------|
| Frontend | React 18 + TypeScript + Vite | **Keep as-is** |
| Styling | Tailwind CSS (dark mode via `prefers-color-scheme`) | **Keep as-is** |
| Routing | React Router v6 | Keep |
| Icons | Lucide React | Keep |
| Dates | date-fns | Keep |
| Database | Supabase (hosted PostgreSQL) | **Local PostgreSQL** |
| Auth | Supabase Auth (email + password, username login via RPC) | **Local JWT/session auth** |
| Real-time | Supabase Realtime (postgres_changes) | **Polling or SSE/WebSocket** |
| Deployment | Netlify (planned, not configured) | **Local dev first**; defer production |

---

## Codebase Inventory

### Pages (3)
- `src/pages/Home.tsx` — Main feed with filters, trending, posting, advanced search
- `src/pages/Auth.tsx` — Sign up / sign in
- `src/pages/Profile.tsx` — Profile, stats, vent history

### Components (20)
Layout, VentCard, VentsFeed, MoodTagFilter, TagSearch, FeedFilters, FloatingPostButton, PostModal, PostLimitBanner, ReactionButton, EmojiPicker, InfiniteScroll, UsernameEditor, UserStats, UserVentsList, TrendingDashboard, AdvancedSearch, ContentModerationTools, PerformanceOptimizer, LoadingSpinner

### Hooks (9)
`useAuth`, `useVents`, `useRealtimeVents`, `useMoodTags`, `usePostLimits`, `useUserProfile`, `useTrendingAnalysis`, `usePerformanceMonitor`, `useScrollAnimation`

### Data layer (Supabase-coupled)
- `src/lib/supabase.ts` — Client, env vars, TypeScript types
- `src/lib/auth.ts` — Sign up/in/out, rate-limit check, Supabase Auth + custom RPC

**Files that directly call Supabase (17):** All hooks above (except `useScrollAnimation`, `usePerformanceMonitor`), plus `PostModal`, `ContentModerationTools`, and type imports in several components.

---

## Development Phase Status

Based on `DEVELOPMENT_PLAN.md` and `docs/phase-*.md`:

| Phase | Description | Status | Notes |
|-------|-------------|--------|-------|
| 1 | Setup & database | **Partial** | App scaffolded; schema lived in Supabase (`.sql` gitignored); no migrations in repo |
| 2 | Core UI | **Mostly done** | Components exist; docs still say "In Progress"; `ErrorBoundary` never added |
| 3 | Posting system | **Done** | PostModal, rate limits, floating button |
| 4 | Reactions & feed | **Done** | Realtime hook, infinite scroll, optimistic reactions |
| 5 | User profile | **Done** | Profile page, stats, username edit, delete vents |
| 6 | Advanced features | **Done** | Trending, advanced search, moderation UI, perf monitor |
| 7 | Testing & deployment | **Not started** | No test suite, no CI, no deployment config |

**Effective progress:** Phases 2–6 are largely implemented on the frontend. The backend is entirely Supabase-dependent and not portable without migration work.

---

## Database Schema (as designed)

Original tables from the development plan (demo data doc confirms 15 mood tags, 8 users, 20 vents):

```
users          — id, username, created_at, last_post_date, post_count_today
mood_tags      — id, name, color, emoji, created_at
vents          — id, user_id, content, created_at, expires_at
vent_tags      — vent_id, tag_id (junction)
reactions      — id, vent_id, user_id, emoji, created_at
```

**Supabase-specific additions (in code, not in original plan):**
- `auth.users` — Supabase-managed auth table (email, password hash)
- RPC `get_user_email_by_id` — Maps username login to email for `signInWithPassword`
- Database trigger — Auto-creates `users` row on auth signup
- RLS policies — Row-level security on all public tables

**Not yet persisted (UI only):**
- `reports` table — ContentModerationTools logs to console only

---

## UI Design (preserve)

The UI should stay unchanged for now. Established patterns:

- **Color system:** Primary sky-blue palette (`primary-50`–`900`), mood-specific colors in Tailwind config
- **Layout:** Header / main / footer via `Layout.tsx`, max-width `7xl`
- **Cards:** `.card` utility — white/dark-800, rounded-lg, subtle border/shadow
- **Vent cards:** Gradient avatar initials, mood tag pills with per-tag colors, scroll-enter animations
- **Dark mode:** System preference via `darkMode: 'media'`
- **Typography:** Inter, utility classes (`btn-primary`, `btn-secondary`, `input`)
- **Feed:** Horizontal scroll container pattern (see known issues)

---

## Known Issues & Technical Debt

1. **Missing component:** `VentsFeed.tsx` imports `./HorizontalScrollContainer` which does not exist in the repo — build will fail until restored or feed layout is rewired.
2. **Duplicate vent hooks:** `useVents.ts` exists but `Home.tsx` uses `useRealtimeVents.ts`; `useVents` may be dead code.
3. **No SQL migrations in repo:** `.gitignore` excludes `*.sql`; schema only existed in Supabase dashboard.
4. **No `.env.example`:** Supabase URL/key requirements are undocumented in-repo.
5. **Auth complexity:** Username login requires email lookup RPC + 1–2s delays waiting for DB triggers — fragile for local auth.
6. **Client-side filtering:** Tag filters applied after fetch in `useRealtimeVents` — inefficient at scale.
7. **Advanced search:** `handleAdvancedSearch` in Home only `console.log`s — not wired to feed.
8. **Content reports:** Not stored anywhere.
9. **No tests:** Phase 7 untouched.
10. **Outdated footer:** Copyright says 2024.

---

## Recommended Architecture Changes

### 1. Database: Supabase → Local PostgreSQL

**Why:** Full control, no external dependency, easier local dev, schema in version control.

**Suggested approach:**
- Add `server/` (Node.js API) or use a lightweight backend (Express/Fastify/Hono)
- Store migrations with **Prisma**, **Drizzle**, or raw SQL in `db/migrations/` (stop gitignoring migration SQL)
- Run PostgreSQL via **Docker Compose** (`docker-compose.yml` with `postgres:16`)
- Seed script reproducing demo data from `docs/demo-data-created.md`

**Schema adjustments for local auth:**

```sql
-- Extend users table for local auth (merge auth.users into app users)
users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username      TEXT UNIQUE NOT NULL,
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,        -- bcrypt/argon2
  created_at    TIMESTAMPTZ DEFAULT now(),
  last_post_date DATE,
  post_count_today INTEGER DEFAULT 0
)
```

Remove dependency on Supabase `auth.users` and the `get_user_email_by_id` RPC.

### 2. Security: Supabase RLS → Local API-layer auth

**Why:** RLS is a Supabase/Postgres hosted pattern; local dev is simpler with application-level authorization.

**Suggested local security model:**

| Concern | Local approach |
|---------|----------------|
| Authentication | JWT (access + refresh) or HTTP-only session cookies via backend |
| Password storage | bcrypt (cost 12) or argon2id — never store plaintext |
| Authorization | Middleware checks `req.user.id` on protected routes |
| Rate limiting | Express middleware (`express-rate-limit`) — 3 posts/day enforced in API + DB |
| Input validation | Zod schemas on API boundary (mirror frontend validation) |
| CORS | Restrict to `localhost:3000` in dev |
| SQL injection | Parameterized queries via ORM/query builder |

**Defer for later:** Email verification, OAuth, CAPTCHA, production HTTPS, audit logging.

### 3. API layer (new)

Replace direct Supabase client calls with REST (or tRPC) endpoints:

```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/auth/me

GET    /api/vents?tags=&sort=&time=&page=
POST   /api/vents
DELETE /api/vents/:id

GET    /api/mood-tags
POST   /api/vents/:id/reactions
DELETE /api/vents/:id/reactions/:emoji

GET    /api/users/me/profile
PATCH  /api/users/me/username
GET    /api/analytics/trending
POST   /api/reports
```

Frontend changes: replace `src/lib/supabase.ts` with `src/lib/api.ts` (fetch wrapper). **Component JSX and Tailwind classes stay the same** — only hooks and `auth.ts` change.

### 4. Real-time: Supabase Realtime → Polling (short term)

`useRealtimeVents` uses `supabase.channel('postgres_changes')`. For local MVP:

- **Option A (simplest):** Poll `GET /api/vents` every 30–60s + refresh on user actions (already partially done)
- **Option B:** Server-Sent Events for new vents/reactions
- **Option C:** Socket.io room per feed

Recommend **Option A** initially to minimize backend scope; UI behavior stays acceptable.

### 5. Other recommended changes (non-UI)

| Area | Recommendation | Rationale |
|------|----------------|-----------|
| Monorepo structure | `client/` (current Vite app) + `server/` | Clear separation |
| Env management | `.env.example` for both client and server | Onboarding |
| Migrations | Commit SQL or Prisma migrations; un-ignore `db/migrations/*.sql` | Schema as code |
| Types | Shared types package or OpenAPI-generated client | Single source of truth |
| Vite proxy | Proxy `/api` → backend in `vite.config.ts` | Avoid CORS in dev |
| Docker Compose | `postgres` + optional `api` services | One-command dev env |
| Testing | Vitest (frontend) + supertest (API) | Phase 7 foundation |
| Deployment | Defer Netlify; use `docker compose up` locally | Matches local-first goal |
| `useVents.ts` | Remove or merge into `useRealtimeVents` | Reduce duplication |
| `HorizontalScrollContainer` | Restore missing component or switch VentsFeed to grid | Fix build |
| Reports | Add `reports` table when API exists | Complete Phase 6 moderation |
| Advanced search | Wire `AdvancedSearch` filters to API query params | Complete stub |

### 6. What NOT to change (per your preference)

- All Tailwind classes, color tokens, animations, and component visual structure
- Page layout and navigation flow
- Vent card bento styling and mood tag pill design
- Modal and form UX for posting
- Dark mode behavior

---

## Supabase Dependency Map

Understanding what must be replaced:

```
supabase.auth.signUp/signIn/signOut/getUser/getSession/onAuthStateChange
  → src/lib/auth.ts, useAuth.ts, usePostLimits.ts, useRealtimeVents.ts, PostModal.tsx

supabase.from('users'|'vents'|'mood_tags'|'vent_tags'|'reactions').select/insert/update/delete
  → All hooks + PostModal

supabase.rpc('get_user_email_by_id')
  → src/lib/auth.ts (signIn only)

supabase.channel().on('postgres_changes')
  → useRealtimeVents.ts

VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY
  → src/lib/supabase.ts
```

---

## Suggested Implementation Order

### Phase A — Make it run locally (infrastructure)
1. Docker Compose for PostgreSQL
2. Database migrations + seed data
3. Minimal Express/Fastify API with auth + vents + tags + reactions
4. `.env.example` files

### Phase B — Rewire frontend (no UI changes)
1. Replace `supabase.ts` / `auth.ts` with API client
2. Update hooks one by one (`useAuth` → `useMoodTags` → `useRealtimeVents` → etc.)
3. Fix `HorizontalScrollContainer` missing import
4. Replace realtime subscriptions with polling

### Phase C — Complete stubs
1. Wire advanced search to API
2. Persist content reports
3. Add basic API tests

### Phase D — Polish (later)
1. SSE/WebSocket real-time
2. Phase 7 testing suite
3. Production deployment strategy (when ready)

---

## Local Development Target (end state)

```bash
# Terminal 1
docker compose up -d          # PostgreSQL on :5432

# Terminal 2
cd server && npm run dev      # API on :4000

# Terminal 3
cd client && npm run dev      # Vite on :3000, proxies /api → :4000
```

Environment variables (example):

```env
# server/.env
DATABASE_URL=postgresql://ventwall:ventwall@localhost:5432/ventwall
JWT_SECRET=dev-secret-change-in-production
PORT=4000

# client/.env
VITE_API_URL=http://localhost:4000/api
```

---

## File Reference

| Document | Contents |
|----------|----------|
| `DEVELOPMENT_PLAN.md` | Original 7-phase roadmap (Supabase-era) |
| `docs/phase-1-setup.md` … `phase-6-advanced-features.md` | Per-phase implementation notes |
| `docs/demo-data-created.md` | Seed data specification (Jan 2024) |
| `docs/README.md` | Index of phase docs |

---

## Summary

Vent Wall has a **mature frontend** (phases 2–6) with a polished Tailwind UI, but a **Supabase-coupled backend** that blocks local development. The highest-value next step is introducing a **local PostgreSQL + Node API + JWT auth** stack while leaving all visual components untouched.

The migration is well-scoped: 17 source files touch Supabase, no SQL is versioned yet, and real-time can degrade gracefully to polling. One blocking bug (`HorizontalScrollContainer` missing) should be fixed before or during the first local run.

**Preserve:** UI components, Tailwind design system, page structure, user flows.  
**Replace:** Supabase client, Supabase Auth, RLS, Realtime subscriptions.  
**Add:** API server, migrations, Docker Compose, env examples, tests.