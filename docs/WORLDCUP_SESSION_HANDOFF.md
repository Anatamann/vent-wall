# World Cup Finals 2026 — Session Handoff

**Purpose**: Resume work in the **original Vent Wall repo** with full context from the Grok / worldcupGlobe session.  
**Repo**: `/home/anitya/MyApps/Github/vent-wall` (remote: `Anatamann/vent-wall`)  
**Branch**: `feature/worldcup-finals-2026` (pushed to `origin`)  
**Commit**: `3f3ed082` — *feat: add World Cup Finals 2026 Support Wall and Globe*  
**PR**: https://github.com/Anatamann/vent-wall/pull/new/feature/worldcup-finals-2026  
**Date of handoff**: 2026-07-17  

---

## 1. Where to work (source of truth)

| Location | Role |
|----------|------|
| **`/home/anitya/MyApps/Github/vent-wall`** | **Only source of truth** — continue here |
| Branch `feature/worldcup-finals-2026` | World Cup feature (not merged to `master` yet) |
| `/home/anitya/MyApps/worldcupGlobe/` | Sandbox/docs from the build session; **do not develop the app there** |
| `/home/anitya/MyApps/worldcupGlobe/app` | Old clone of vent-wall; optional to delete |

```bash
cd /home/anitya/MyApps/Github/vent-wall
git checkout feature/worldcup-finals-2026
git pull origin feature/worldcup-finals-2026
```

Related docs in this repo:

- `docs/worldcup-finals-2026-support-wall-instructions.md` — product/API (updated during session)
- `docs/worldcup-finals-2026-ui-color-guide.md` — UI/color system (Vent-family glass + team accents)
- **This file** — session decisions + resume checklist

---

## 2. Product in one sentence

Fans cast an **anonymous immutable** vote for **Spain** or **Argentina**, optionally **log in** to post text/GIF on a Support Wall and leave **flat emoji/GIF reactions**, and explore a Support Globe where region markers show the **leading team flag** and open **all-time tallies**. Vent Wall mood product on `/` is unchanged.

---

## 3. Locked product decisions (MVP)

| Topic | Decision |
|-------|----------|
| Teams | Spain vs Argentina only |
| Data retention | **Forever** (no 24h expiry of votes/posts) |
| Bare vote | **No login** |
| Wall post (text and/or GIF) | **Login required** |
| Reactions (emoji / GIF comments) | **Login required**; flat thread; no free text |
| Comment quotas | **3** per non-author per post; **50** for original poster |
| Vote change | **Cannot change** once cast (immutable `team_id`) |
| Anonymous identity | `wc_ballot_id` **HttpOnly cookie** + **localStorage** + header **`X-WC-Ballot-Id`** |
| Abuse backstop | IP **hash** caps (not whole ISP): ~5 new ballots/IP/day, ~15/event; attempt rate limits |
| Globe window | **All-time** tallies |
| Show on globe | Default **on** when geo works |
| Wall body | Text **and/or** GIF required to publish |
| Anonymous then post | Attach wall post to existing ballot vote if present |
| Route | **`/worldcup` only** (no `/finals-2026` alias required) |
| Early regions | Leader + “early” if &lt; 5 supports (`MIN_SUPPORTS_FOR_RELIABLE_REGION = 5`) |
| Voting closed | Env **`WORLDCUP_VOTING_CLOSED=true`** |
| IDs | Short public ids (`s…` supports, `k…` comments) — same style as Vent Wall; **pretty URLs**, not UUIDs in paths |
| UI | Follow color guide: ~90% Vent glass shell, ~10% team red/blue |
| Platforms simultaneous? | **Yes** — `/` Vent + `/worldcup` Finals share one app/DB; separate tables |

### Explicitly out of v1

Live FIFA scores, full bracket, paid boosts, nested replies, free-text comments, auto-translate of UGC, captcha/fingerprints (unless abuse forces it), separate microservice.

### i18n (agreed direction, not fully built)

- UI strings: browser default → locale packs (`en` / `es` …), fallback `en`
- User posts/comments: **original language only** for MVP

---

## 4. What was built

### Backend

- Migration: `db/migrations/020_worldcup_supports.sql`
  - `worldcup_teams` (spain, argentina)
  - `worldcup_supports` (ballot, optional user, team, wall body, geo, `is_wall_post`)
  - `worldcup_support_comments` (emoji or GIF only)
- Routes: `server/src/routes/worldcup.ts` mounted at `/api/worldcup`
- Utils: `server/src/utils/worldcup.ts`
- Geolocation: private/localhost IPs fall back to public-egress lookup in **dev** (so globe markers work locally); optional `DEV_GEO_*` in `server/.env`
- Seed: `server/src/scripts/seed-worldcup.ts` — 5 wall posts with **real city geo**
- Constants in `server/src/constants.ts` (ballot limits, comment quotas, etc.)
- `package.json` script: `db:seed:worldcup` / server `seed:worldcup`

### Frontend

- Pages: `src/pages/WorldCup.tsx`, `src/pages/WorldCupPost.tsx`
- Components under `src/components/worldcup/`:
  - `TeamChip`, `Scoreboard`, `VotePills`
  - `SupportCard` (clickable → post detail; comments stop propagation)
  - `SupportCommentSection` (login required for emoji/GIF)
  - `SupportPostModal`, `SupportGlobe`, `SupportGlobeLazy`
- Nav **Finals** link in `Layout.tsx`
- Routes in `App.tsx`: `/worldcup`, `/worldcup/post/:slug`
- Auth `?next=` return path in `Auth.tsx`
- Tailwind `worldcup.spain` / `worldcup.argentina` + CSS vars in `index.css`
- API client: `api.worldcup.*` + ballot localStorage helpers

### Design tokens (must use)

- Spain primary `#C60B1E`, Argentina `#74ACDF`
- Shell void `#070b14`, sky chrome for All / switcher / focus — **not** team colors
- See `docs/worldcup-finals-2026-ui-color-guide.md`

---

## 5. API sketch (base `/api/worldcup`)

| Method | Path | Auth | Notes |
|--------|------|------|--------|
| GET | `/teams` | No | Spain / Argentina metadata |
| GET | `/stats` | No | Global totals |
| GET | `/me` | Cookie/header ballot | Current support + `ballot_id` |
| GET | `/supports` | No | Wall feed `?team=spain\|argentina` |
| GET | `/supports/:id` | No | Single wall post (short id) |
| POST | `/supports/vote` | No | Bare vote; sets cookie; immutable |
| POST | `/supports` | JWT | Wall publish (text and/or GIF) |
| GET/POST | `/supports/:id/comments` | POST needs JWT | Emoji or GIF only |
| GET | `/globe/data` | No | Region aggregates all-time |
| GET | `/globe/regions/:regionKey` | No | Tally popup payload |

**Vote integrity**: one row per `ballot_id`; no team update; IP-hash caps for new ballots after cookie clear; re-click on existing vote can **backfill geo** if lat/lng were null (local testing fix).

---

## 6. How to run (resume checklist)

```bash
cd /home/anitya/MyApps/Github/vent-wall
git checkout feature/worldcup-finals-2026

npm install
cd server && npm install && cd ..

# Ensure server/.env has DATABASE_URL, e.g.:
# DATABASE_URL=postgresql://ventwall:ventwall@localhost:5432/ventwall
# JWT_SECRET=...
# IP_HASH_SECRET=...
# Optional: WORLDCUP_VOTING_CLOSED=true
# Optional DEV_GEO_LAT / DEV_GEO_LNG / DEV_GEO_COUNTRY_CODE for fixed local geo

npm run db:up          # if Postgres not running
npm run db:migrate     # includes 020_worldcup_supports
npm run db:seed:worldcup   # 5 sample posts + real geo (optional)

npm run dev:server     # :4000
npm run dev            # :3000
```

Smoke test:

- http://localhost:3000/ → Vent Wall  
- http://localhost:3000/worldcup → Support Wall / Globe  
- Vote pills work without login; map shows leading 🇪🇸/🇦🇷 after geo  
- Wall post + emoji/GIF reactions require login  

Demo seed users (if seeded via main seed): password often `demo123`.

---

## 7. Sample seed posts (5)

| ID | Team | City (real coords) |
|----|------|--------------------|
| sw01 | Spain | Madrid |
| sw02 | Argentina | Buenos Aires |
| sw03 | Spain | Mexico City |
| sw04 | Argentina | Miami, Florida |
| sw05 | Spain | London, England |

Script: `server/src/scripts/seed-worldcup.ts` (safe re-run / upsert).

---

## 8. Known issues / lessons from the session

1. **Globe “failed to load”** — API missing `server/.env` / `DATABASE_URL` → health `database: disconnected`. Fix: `server/.env` + migrate.  
2. **Votes without map markers** — localhost IP is private → no lat/lng. Fix: dev public-egress geo fallback + backfill on re-vote.  
3. **Ballot reliability** — cookie alone flaky through Vite proxy → also localStorage + `X-WC-Ballot-Id`.  
4. **Both platforms at once** — yes; separate tables; shared users/auth/media.  
5. **Do not keep two live clones** — develop only in `Github/vent-wall`.

---

## 9. Suggested next work (not done)

- [ ] Merge PR when ready (`feature/worldcup-finals-2026` → `master`)  
- [ ] UI i18n packs (en/es) if still desired  
- [ ] More globe seed density for “reliable” regions (≥5) if demos need it  
- [ ] Optional captcha if abuse appears  
- [ ] Post-match freeze + banner via `WORLDCUP_VOTING_CLOSED`  
- [ ] Delete sandbox `worldcupGlobe/app` once you’re sure  
- [ ] Production env: real `CLIENT_ORIGIN`, strong secrets, CORS  

---

## 10. File map (quick)

```text
db/migrations/020_worldcup_supports.sql
server/src/routes/worldcup.ts
server/src/utils/worldcup.ts
server/src/utils/geolocation.ts          # private-IP fallback
server/src/scripts/seed-worldcup.ts
server/src/constants.ts                  # WC constants
server/src/index.ts                      # mounts /api/worldcup
src/pages/WorldCup.tsx
src/pages/WorldCupPost.tsx
src/components/worldcup/*
src/lib/api.ts                           # api.worldcup + ballot helpers
src/App.tsx, Layout.tsx, Auth.tsx, ViewSwitcher.tsx
src/index.css, tailwind.config.js
docs/worldcup-finals-2026-*.md
docs/WORLDCUP_SESSION_HANDOFF.md          # this file
```

---

## 11. One-liner for a new agent session

> Continue World Cup Finals 2026 on branch `feature/worldcup-finals-2026` in `/home/anitya/MyApps/Github/vent-wall`. Product: Support Wall + Support Globe (Spain/Argentina), anonymous immutable ballot vote, auth for wall posts and emoji/GIF reactions, all-time globe tallies, short public ids, Vent glass UI + team colors per docs. Read `docs/WORLDCUP_SESSION_HANDOFF.md` and the two worldcup finals docs under `docs/`. Do not use worldcupGlobe/app as source of truth.

---

*End of handoff. Update this file when major decisions change or after merge to master.*
