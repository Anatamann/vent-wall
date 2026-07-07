# Admin Dashboard — Product & Technical Plan

Planning document for Vent Wall’s internal admin control page. Admins use it to understand platform usage (tags, emojis, GIFs), read user feedback, spot anomalies, and inform product decisions.

**Status:** Decisions locked (see [Locked decisions](#locked-decisions)).

---

## Goals

| Goal | How the dashboard helps |
|------|-------------------------|
| **Product planning** | See what moods, reactions, and GIFs resonate; spot rising tags before they peak |
| **Feedback inbox** | Single **Feedback** tab — users submit product feedback; admins review in-app only |
| **Anomaly detection** | Surface spikes and suspicious patterns on the dashboard (no external alerts) |
| **Safe operations** | Read-heavy by default; same Wall privacy rules apply to everyone including admins |

---

## Locked decisions

| Topic | Decision |
|-------|----------|
| **Admin access (2–5 people)** | **Env allowlist** — `ADMIN_USER_IDS` (comma-separated UUIDs). Best fit for a small fixed team: no DB migration, easy to rotate in deploy config, no role hierarchy to maintain. |
| **Expired vent content** | **Admins cannot view vent content after it leaves the Wall.** Same 404 rules as any user. Insights use aggregated stats only — never resurrect expired post bodies for admin. |
| **Reports / flagging** | **No report feature.** Remove content-report flow. Users submit **product feedback** only (bugs, features, UX). |
| **Feedback rate limit** | **1 submission per user per calendar day** (DB-enforced + API). |
| **Notifications** | **None.** No email, Slack, or push. Admins check the **Feedback** section when they open `/admin`. |

### Why env allowlist (not `users.role`) for 2–5 admins

| Approach | 2–5 admin team |
|----------|----------------|
| `ADMIN_USER_IDS` in `.env` | ✅ Simple, auditable in infra, no migration, revoke by redeploy |
| `users.role` column | Better at 10+ staff with self-serve promotion — overkill now |
| `ADMIN_USERNAMES` | Acceptable alternative if UUIDs are awkward; prefer IDs (immutable) |

**Setup example**

```env
ADMIN_USER_IDS=11111111-1111-1111-1111-111111111109,22222222-2222-2222-2222-222222222222
```

Lookup once at request time (or cache in memory on boot). `GET /api/auth/me` returns `is_admin: true` when `userId` is in the list.

---

## Current state (what we have today)

| Area | Status | Action |
|------|--------|--------|
| Admin auth | None | Add `requireAdmin` + env allowlist |
| Public analytics | `GET /api/analytics/trending` | Reuse queries for admin insights |
| Content reports | `reports` table + `POST /api/reports` + `ContentModerationTools` | **Deprecate / remove** |
| Product feedback | None | **Add** `user_feedback` table + form |
| Comments / GIFs | In DB, not in trending API | Add to admin insights |
| Historical data | Vents expire after 24h | Daily rollup tables required |

**Implication:** Planning metrics need **rollup tables** or nightly snapshots. You cannot build “last 90 days tag trends” from live `vents` after posts leave the Wall.

---

## Wall privacy (applies to admins)

```
┌─────────────────────────────────────────────────────────┐
│  On Wall (expires_at >= now)  →  vent readable          │
│  Off Wall                     →  404 for EVERYONE       │
│                             (including admins)          │
└─────────────────────────────────────────────────────────┘
```

- Admin insights: **counts and aggregates** (tags, emojis, GIF ids) — not full vent text archives.
- Feedback messages are user-written and stored separately — not tied to vent lifecycle.
- **Do not** add `?admin=true` bypass on `GET /api/vents/:id`.
- Rollup job may store `vent_count` and tag usage counts — not `content` text.

---

## Information architecture

Single route: **`/admin`** with tabbed sections. No notification badges outside the app.

```
┌─────────────────────────────────────────────────────────────────┐
│  Vent Wall Admin          [24h ▼] [7d] [30d]     🔄  👤 admin   │
├──────────┬──────────────────────────────────────────────────────┤
│ Overview │  KPI cards + anomaly summary + recent feedback     │
│ Insights │  Tags · Emojis · GIFs · peak times                 │
│ Feedback │  User feedback inbox (new → triaged → closed)      │
│ Anomalies│  Rule hits · security signals · cost/abuse         │
│ Health   │  API, DB, Klipy, media cache                       │
│ Exports  │  CSV / JSON for planning meetings                  │
└──────────┴──────────────────────────────────────────────────────┘
```

### Default landing: **Overview**

1. **Anomaly summary** — inline list (no push alerts)
2. **New feedback count** — submissions with `status = 'new'`
3. **Today’s pulse** — vents, reactions, comments (emoji vs GIF), new users
4. **Top 3 tags / emojis / GIFs** for selected period

---

## Feature modules

### 1. Insights — Tags

| Metric | UI |
|--------|-----|
| Usage count | Sortable table + bar chart |
| % of vents | Column |
| Growth vs prior period | ↑↓ badge |
| Co-occurrence | “Often with: …” |
| Peak hour | Mini sparkline |

**Sources:** live `vent_tags` (24h window) + `daily_tag_stats` (history).

---

### 2. Insights — Emojis

| Stream | Table |
|--------|-------|
| Reactions | `reactions` |
| Comments | `vent_comments` WHERE `comment_type = 'emoji'` |

Leaderboard: emoji, count, % share, source filter.

---

### 3. Insights — GIFs

| Metric | Source |
|--------|--------|
| GIF comment count | `vent_comments` (`gif`) |
| Top GIFs | `media_assets.external_id` + preview |
| Unique GIFs / cache reuse | ingest dedup stats |

Store Klipy `title` on `media_assets` at ingest for readable admin labels.

---

### 4. Feedback — Product feedback only

**No content reports.** Users share platform feedback (not “flag this post”).

#### Public: feedback form

| Field | Rules |
|-------|-------|
| `category` | `feature`, `bug`, `ux`, `other` |
| `message` | Required, 10–1000 chars |
| Auth | **Required** — must be logged in |
| Rate limit | **1 per user per calendar day** |

**Entry points**

- Footer link: “Send feedback”
- Profile page: “Help us improve”

**Rate limit implementation**

```sql
-- One row per user per UTC date (or app timezone)
CREATE UNIQUE INDEX user_feedback_one_per_day
  ON user_feedback (user_id, feedback_date);
```

API checks before insert; returns `429` with friendly message if already submitted today.

**Remove from product**

- `POST /api/reports`
- `ContentModerationTools` report modal (or replace with link to feedback form)
- `reports` table (migration: drop or leave unused — prefer drop in new migration)

#### Admin: Feedback inbox

| Column | Content |
|--------|---------|
| Submitted | Relative time |
| User | Username (logged-in only) |
| Category | Chip |
| Message | Full text (expandable) |
| Status | `new` → `triaged` → `planned` → `closed` |

| Admin action | Effect |
|--------------|--------|
| Change status | Update row + `admin_audit_log` |
| Internal note | `admin_note` (not visible to user) |

**Sorting:** `new` first, oldest first within status.

**No vent links** in feedback — messages are standalone.

---

### 5. Anomaly detection (dashboard only)

Rule-based comparison: last 1h / today vs 7-day average. Shown on **Overview** and **Anomalies** tab. **No webhooks or email.**

| Signal | Source |
|--------|--------|
| Registration spike | `users.created_at` |
| Login failures | `login_attempts` |
| Registration attempts | `registration_attempts` |
| Feedback spike | `user_feedback` (volume, not content) |
| GIF ingest spike | `media_assets` inserts |
| Comment flood on one vent | `vent_comments` per `vent_id` |
| Klipy errors | optional `admin_events` log |

Acknowledge in UI; store in `admin_anomalies` for history.

---

### 6. Platform health

Read-only: API, DB, Klipy reachability, media cache size, last cleanup run.

---

### 7. Exports

| Export | Format |
|--------|--------|
| Tag leaderboard | CSV |
| Emoji + GIF top 100 | CSV |
| Daily platform summary | JSON |
| Feedback snapshot | CSV (no vent content) |

---

## Data model

### New: user feedback

```sql
CREATE TABLE user_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  feedback_date DATE NOT NULL DEFAULT CURRENT_DATE,
  category TEXT NOT NULL CHECK (category IN ('feature', 'bug', 'ux', 'other')),
  message TEXT NOT NULL CHECK (char_length(message) BETWEEN 10 AND 1000),
  status TEXT NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'triaged', 'planned', 'closed')),
  admin_note TEXT,
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX user_feedback_one_per_user_per_day
  ON user_feedback (user_id, feedback_date);

CREATE INDEX user_feedback_status_created
  ON user_feedback (status, created_at DESC);
```

### Daily rollups (historical insights)

```sql
CREATE TABLE daily_platform_stats (
  stat_date DATE PRIMARY KEY,
  vents_count INT NOT NULL DEFAULT 0,
  reactions_count INT NOT NULL DEFAULT 0,
  emoji_comments_count INT NOT NULL DEFAULT 0,
  gif_comments_count INT NOT NULL DEFAULT 0,
  new_users_count INT NOT NULL DEFAULT 0,
  feedback_count INT NOT NULL DEFAULT 0,
  unique_gifs_used INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE daily_tag_stats (
  stat_date DATE NOT NULL,
  tag_id UUID NOT NULL REFERENCES mood_tags(id),
  usage_count INT NOT NULL DEFAULT 0,
  PRIMARY KEY (stat_date, tag_id)
);

CREATE TABLE daily_emoji_stats (
  stat_date DATE NOT NULL,
  emoji TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('reaction', 'comment')),
  usage_count INT NOT NULL DEFAULT 0,
  PRIMARY KEY (stat_date, emoji, source)
);

CREATE TABLE daily_gif_stats (
  stat_date DATE NOT NULL,
  external_id TEXT NOT NULL,
  usage_count INT NOT NULL DEFAULT 0,
  title TEXT,
  preview_url TEXT,
  PRIMARY KEY (stat_date, external_id)
);
```

### Admin audit

```sql
CREATE TABLE admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL REFERENCES users(id),
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### Deprecate reports

```sql
-- Migration 009: replace reports with feedback
DROP TABLE IF EXISTS reports;
```

Remove `server/src/routes/reports.ts`, report limiter in `index.ts`, and frontend report UI.

---

## API design

### Public (authenticated users)

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/feedback` | Submit feedback (1/day per user) |
| GET | `/api/feedback/mine` | Optional: “you already submitted today” |

### Admin (`requireAdmin`)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/overview?period=7d` | KPIs + anomalies + new feedback count |
| GET | `/insights/tags?period=30d` | Tag leaderboard |
| GET | `/insights/emojis?period=30d` | Reaction + comment emojis |
| GET | `/insights/gifs?period=30d` | Top GIFs |
| GET | `/insights/activity` | Peak hours, time series |
| GET | `/feedback?status=new&page=1` | Feedback inbox |
| PATCH | `/feedback/:id` | Status, admin_note |
| GET | `/anomalies` | Active anomalies |
| PATCH | `/anomalies/:id/acknowledge` | Mark seen |
| GET | `/health` | Platform health |
| GET | `/exports/tags.csv` | CSV download |

**Period:** `24h` | `7d` | `30d` | `90d` (90d from rollups).

---

## Frontend structure

```
src/pages/AdminDashboard.tsx
src/pages/Feedback.tsx                    # optional standalone /feedback
src/components/FeedbackForm.tsx           # public modal / page
src/components/admin/
  AdminLayout.tsx
  AdminOverview.tsx
  AdminTagInsights.tsx
  AdminEmojiInsights.tsx
  AdminGifInsights.tsx
  AdminFeedbackInbox.tsx
  AdminAnomalies.tsx
  AdminHealth.tsx
  AdminExportPanel.tsx
```

- **`AdminRoute`** — non-admins → `/`
- **Nav** — “Admin” link only when `is_admin`
- **No** `AdminReportsQueue.tsx`

---

## Security

| Requirement | Implementation |
|-------------|----------------|
| Admin auth | `ADMIN_USER_IDS` + `requireAdmin` |
| Wall privacy | No admin bypass on vent reads |
| Feedback abuse | 1/day per user + auth required + message length cap |
| Admin API | Stricter rate limit (e.g. 60/min) |
| Audit | Feedback status changes + exports |
| PII in exports | Usernames in feedback export only; insights are aggregates |

---

## Phased implementation

### Phase 1 — Admin shell + feedback (first ship)

1. `ADMIN_USER_IDS` + `requireAdmin` + `is_admin` on `/api/auth/me`
2. Migration: `user_feedback`, drop `reports`
3. `POST /api/feedback` with 1/day limit
4. `GET/PATCH /api/admin/feedback`
5. Public `FeedbackForm` (footer + profile)
6. `/admin` with **Overview** + **Feedback** tabs
7. Remove report routes and `ContentModerationTools` report flow

**Deliverable:** Small admin team can log in and read user feedback; users can submit once per day.

### Phase 2 — Insights (tags, emojis, GIFs)

1. Admin insight APIs (extend `analytics.ts` logic)
2. Insights tabs + Overview top-3 widgets
3. Klipy `title` on `media_assets` (optional column)

### Phase 3 — Rollups + exports

1. `daily_*_stats` tables + nightly job
2. Period selector 7d / 30d / 90d
3. CSV exports

### Phase 4 — Anomalies + health

1. Rule engine + `admin_anomalies`
2. Overview + Anomalies tab (no external alerts)
3. Health panel

---

## UI wireframe (Overview)

```
┌────────────────────────────────────────────────────────────┐
│ 3 new feedback · 1 anomaly (GIF ingest spike)   [View all] │
├────────────────────────────────────────────────────────────┤
│  Vents   Reactions   Comments   GIFs   New users           │
│   142      389        56        12      8      (24h)       │
├────────────────────────────┬───────────────────────────────┤
│ Top mood tags             │ Top emojis                    │
│ 1. Anxious      48  ↑12%  │ 1. 💙  89                     │
│ 2. Tired        41        │ 2. 🫂  72                     │
├────────────────────────────┴───────────────────────────────┤
│ Recent feedback (new)                                      │
│ · bug — demo — “GIF picker slow on mobile” — 1h ago        │
│ · feature — sunrise_seeker — “dark mode schedule” — 3h   │
└────────────────────────────────────────────────────────────┘
```

---

## Success metrics

| Metric | Target |
|--------|--------|
| Feedback review | Admin sees new items on next `/admin` visit |
| Planning prep | One-click export for tags/emojis/GIFs |
| Privacy | Zero admin access to expired vent content |
| Feedback spam | ≤ 1 submission per user per day enforced |

---

## Related files

| File | Relevance |
|------|-----------|
| `server/src/routes/analytics.ts` | Insight query seeds |
| `server/src/routes/reports.ts` | **Remove** |
| `src/components/ContentModerationTools.tsx` | **Remove report UI** |
| `docs/PRODUCTION_SECURITY.md` | Add `ADMIN_USER_IDS` to env docs when implemented |

---

## Next step

Implement **Phase 1**: admin allowlist, feedback table + API, feedback form, admin inbox, remove reports.

Say when to start building Phase 1.