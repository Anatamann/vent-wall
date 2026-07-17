# World Cup Finals 2026 — Support Wall & Support Globe

## Implementation instruction document

**Status**: Concept / ready for implementation (product decisions locked for MVP)  
**Date**: July 14, 2026 · **Updated**: July 17, 2026  
**Event**: FIFA World Cup Finals 2026 — fan support tracker  
**Teams**: **Spain** vs **Argentina** (fixed binary choice)  
**Purpose**: Build a **very similar** product surface to **Vent Wall** + **Vent Globe**, but instead of mood tags users declare **which finalist they support**.

**Document pair (both required)**

| Doc | Owns |
|-----|------|
| **This file** | Product flows, data, anti-spam, API, acceptance |
| [`worldcup-finals-2026-ui-color-guide.md`](./worldcup-finals-2026-ui-color-guide.md) | **Visual only** — colors, glass shell, chips, scoreboard, markers, modal, a11y |

**UI fidelity rule**: Implement chrome like Vent Wall/Globe (**~90% shared shell**). Team identity is **~10%** (chips, bars, markers, vote CTAs) per the color guide. Do **not** invent a sports-broadcast theme. Prefer existing tokens: `#070b14` void, glass panels/cards, Inter, sky accents for neutral chrome, Spain/Argentina tokens only for team surfaces.

**Parent product patterns to reuse**

| Existing (Vent Wall) | New (World Cup 2026) |
|----------------------|----------------------|
| Vent Wall feed | **Support Wall** — posts filtered by team |
| Vent Globe | **Support Globe** — region markers by leading team |
| Mood tags (`MoodTagChip`) | **Team chips** (Spain / Argentina only) — see color guide §4.3 |
| Post modal + GIF + ISP disclaimer | **Support post** modal (same shape) — color guide §4.6 |
| Globe region popup | **Region vote tally** popup (counts per team) — color guide §4.8 |
| Login to **post** / **comment** | **Required** for wall publish + comments; **not** required for bare vote |
| IP geo (ISP, not exact GPS) | Same geolocation pipeline |
| Vent comments (engagement) | **Flat** emoji/GIF comments under wall posts (see §2.5) |

---

## 1. Product overview

### 1.1 Two switchable views

Same interaction model as Home (`ViewSwitcher`):

1. **Support Wall** (default on mobile / small screens)  
   Card feed of support posts. Filters limited to **Spain**, **Argentina**, or **All**.

2. **Support Globe** (default on desktop ≥1024px, optional)  
   3D globe (same `react-globe.gl` stack) showing **regional leading team** emoticons / colors. Clicking a **region marker** opens a **vote tally popup** (not the full vent list by default — see §5).

Optional third entry: deep links  
- `/worldcup` or `/finals-2026`  
- `?view=wall|globe`  
- `?team=spain|argentina`

### 1.2 Core user journey

```
Land on Support Wall / Globe
        │
        ├─ Browse posts (read-only, public)
        ├─ Filter by Spain | Argentina | All  (chip UI like mood tags)
        │
        └─ Tap Spain or Argentina to **vote / support**
                 │
                 ├─ Not logged in → redirect to /auth?next=… (return to post flow)
                 └─ Logged in → open Support Post modal
                          │
                          ├─ Team pre-selected (Spain or Argentina)
                          ├─ Optional text thought (0–500 chars, same vent rules)
                          ├─ Optional GIF (Klipy, same as vents)
                          ├─ ISP location disclaimer + contribute-to-globe toggle
                          └─ Submit → counts as **one support vote** for that team
                                      + optional wall post for that team
```

### 1.3 Visual language for teams (mood-tag analogue)

**Source of truth for all hex/CSS/Tailwind values**: [`worldcup-finals-2026-ui-color-guide.md`](./worldcup-finals-2026-ui-color-guide.md) §§2–4.

Present **exactly two** selection chips, anatomy like `MoodTagChip` (**color dot · emoji · name**):

| Team | Emoji | Primary (dark-UI tuned) | Soft fill | Chip label |
|------|-------|-------------------------|-----------|------------|
| Spain | 🇪🇸 | `#C60B1E` (`spain.primary`) | `rgba(198,11,30,0.18)` | Spain |
| Argentina | 🇦🇷 | `#74ACDF` (`argentina.primary`) | `rgba(116,172,223,0.20)` | Argentina |

- Selected chips: team soft fill + team text (`spain.text` / `argentina.text`) + optional soft glow — **not** full-page team paint.  
- **“All”** chip: **sky** selection (Vent “All Moods”), never red/blue.  
- View switcher, links, focus rings: **neutral sky** (`#38bdf8`) — never team-hijacked.  
- Wall filter row: **All** · **Spain** · **Argentina** only (no multi-select).  
- Do **not** expose the full 50+ mood tag catalog on this product surface.

---

## 2. Feature requirements

### 2.1 Support Wall (Vent Wall analogue)

- Layout: Vent Wall glass shell — `.glass-card`, void `#070b14`, optional **4px team left border** on cards (color guide §4.5).  
- Each card shows:
  - Author avatar + username
  - Team chip (Spain / Argentina, static selected style)
  - Optional text + optional GIF (wall publish requires text **and/or** GIF)
  - Relative time
  - **Comments** (flat thread; emoji/GIF only — §2.5)
- Filters: single-select team chips + “All” (sky for All).  
- Empty states: glass panel + muted text + dual Support CTAs (color guide §4.9).  
- Time window: **all-time** (event lifetime; no rolling 24h expiry of data).

### 2.2 Support Globe (Vent Globe analogue)

- Same full-viewport globe stage, view switcher, bottom gradient.  
- Markers: **leading team** for that region (state-level, same region keys as Vent Globe).  
  - Spain lead → Spanish flag emoji or 🔴 ball  
  - Argentina lead → Argentine flag emoji or 🔵 ball  
  - Tie → neutral ⚖️ or split marker / dual count in title  
  - No activity → cloud/duck empty pattern (reuse)  
- **Minimum activity** (reuse `MIN_VENTS_FOR_DOMINATING` idea): e.g. ≥5 support posts in region before “leading” is treated as reliable; below that show “early” styling.

### 2.3 Vote vs wall post (split auth)

Distinguish **Filter** vs **Support** in UI (color guide §4.3): filter chips change the feed only; **Support Spain / Support Argentina** CTAs are larger team-tinted pills.

#### Bare vote (no login)

- User picks Spain or Argentina → cast **anonymous** support immediately (or confirm sheet with globe toggle only).  
- Tracked by long-lived **`ballot_id` cookie** (httpOnly); **immutable** once cast (cannot change team).  
- Optional: “Show on Support Globe” default **on** when geo succeeds.  
- Does **not** create a wall card by itself.

#### Wall post (login required)

Triggered when user wants to **publish** a thought/GIF on the Support Wall (and for **comments**).

**Modal contents** (shell per color guide §4.6)

1. Header: “You’re supporting **Spain**” (or Argentina) + team chip.  
2. Thought textarea and/or GIF — wall publish needs **text and/or GIF**.  
3. GIF picker (existing Klipy flow).  
4. Disclaimer:

   > Approximate location from your connection (ISP) may be used to place this support on the **Support Globe**. We never store your exact GPS position. Votes are approximate by region.

5. Checkbox (default **on**): “Show my support on the Support Globe”.  
6. Submit: team-colored soft fill (“Post support”). Cancel: `btn-glass`.  
7. If they already voted via ballot cookie, **attach** post to that vote (no second ballot; team fixed).

**Auth gate (post / comment only)**

- If `!isAuthenticated` when publishing or commenting:  
  `navigate('/auth?next=' + encodeURIComponent(returnPath))`  
  e.g. `/worldcup?view=wall&support=spain` or post slug + comment intent.  
- After login, resume the post/comment flow.

### 2.4 Region marker popup (vote tallies)

When the user clicks a region’s **leading team emoticon / marker**:

Open a glass popup (same shell as `GlobePopup`) that shows:

| Field | Example |
|-------|---------|
| Region title | California, United States |
| Total supports in window | 128 |
| Spain votes | 74 (58%) + 🇪🇸 |
| Argentina votes | 54 (42%) + 🇦🇷 |
| Leading | Spain (or “Tied”) |
| Reliability | “Early sample” if below min threshold |

**Optional secondary actions (v1.1)**

- “View Spain posts from this region”  
- “View Argentina posts from this region”  
  → either open Support Wall filtered by team + region, or a second list tab inside the popup.

**v1 requirement (must-have)**  
Show **totals per team for that region** clearly (dual bars, team primaries — color guide §4.8). Full post list optional; tallies mandatory. Subtitle uses **all-time** (not “last 7d”).

### 2.5 Comments (flat, emoji / GIF only)

Under each **wall** support post (not bare tally-only votes without a published card):

| Rule | Value |
|------|--------|
| Thread | **Flat** (no nested replies) |
| Body | **Emoji and/or GIF only** — no free-text comments |
| Per non-author commenter | **Max 3** comments per post |
| Original poster | **Max 50** comments on their own post |
| Auth | Login required to comment |
| UI | Reuse glass card density; sky for links; emoji picker + GIF picker (no textarea) |

Prefer **either emoji or GIF per comment** for simple cards (both allowed if one comment carries both fields).

---

## 3. Data model (recommended)

Prefer a **dedicated** support entity so World Cup data does not pollute mood vents. Alternative: reuse `vents` with a special tag namespace — **not recommended**.

**IDs**: UUID primary keys internally; **short URL-safe slugs** in public paths (no ugly long UUIDs in URLs). Team keys stay pretty: `spain` | `argentina`.

### 3.1 Tables (sketch)

```sql
-- Fixed teams (seed) — colors from UI color guide
CREATE TABLE worldcup_teams (
  id TEXT PRIMARY KEY,           -- 'spain' | 'argentina'
  name TEXT NOT NULL,
  emoji TEXT NOT NULL,
  color TEXT NOT NULL            -- e.g. #C60B1E / #74ACDF
);

-- One ballot / support (+ optional wall body when published)
CREATE TABLE worldcup_supports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,     -- short public id, e.g. s_k7m2n9xq
  ballot_id TEXT UNIQUE,         -- anonymous cookie ballot; unique when set
  user_id UUID REFERENCES users(id),  -- null until wall post / claimed
  team_id TEXT NOT NULL REFERENCES worldcup_teams(id),
  content TEXT CHECK (content IS NULL OR char_length(content) <= 500),
  asset_id UUID,                 -- optional GIF for wall
  is_wall_post BOOLEAN NOT NULL DEFAULT false,
  contribute_to_globe BOOLEAN NOT NULL DEFAULT true,
  location_country_code TEXT,
  location_country TEXT,
  location_state TEXT,
  location_city TEXT,
  location_lat DOUBLE PRECISION,
  location_lng DOUBLE PRECISION,
  ip_hash TEXT,                  -- HMAC(ip); never raw IP long-term
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  -- data kept forever; team_id immutable after insert
);

CREATE TABLE worldcup_support_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE,              -- optional short id
  support_id UUID NOT NULL REFERENCES worldcup_supports(id),
  user_id UUID NOT NULL REFERENCES users(id),
  emoji TEXT,                    -- emoji-only when set
  asset_id UUID,                 -- GIF when set
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (emoji IS NOT NULL OR asset_id IS NOT NULL)
);

CREATE INDEX idx_wc_supports_team_created ON worldcup_supports (team_id, created_at DESC);
CREATE INDEX idx_wc_supports_globe ON worldcup_supports (created_at DESC)
  WHERE contribute_to_globe = true AND location_lat IS NOT NULL;
CREATE INDEX idx_wc_comments_support_user ON worldcup_support_comments (support_id, user_id);
```

### 3.2 Vote definition

- **1 row in `worldcup_supports` = 1 vote** for `team_id` (keyed by `ballot_id` for anonymous).  
- Bare vote: no wall body; `is_wall_post = false`.  
- Wall post: auth + text and/or GIF; may attach to existing ballot row.  
- **No team change** after cast (immutable).

---

## 4. Anti-spam & vote integrity

Goal: limit flooding of tallies and wall/comments while keeping **bare vote** frictionless (no login).

### 4.1 Must-have (v1)

| Technique | How | Effect |
|-----------|-----|--------|
| **Ballot cookie** | HttpOnly `wc_ballot_id`; unique row per `ballot_id` | One vote per browser profile |
| **Immutable team** | No UPDATE of `team_id` after insert | Cannot change vote |
| **Auth for wall + comments** | JWT on publish/comment only | Stops anonymous text/GIF spam |
| **IP hash caps** | `HMAC(ip)`; max **new ballots** per day/event | Limits cookie-clear abuse |
| **Rate limits** | Attempts per IP hash + per ballot | Blunts bots |
| **Comment quotas** | 3 / post / non-OP; 50 / post / OP | Thread spam control |
| **Voting closed** | `WORLDCUP_VOTING_CLOSED=true` | Freeze after final |

**Recommended v1 policy**

1. Bare vote: **no login**; one row per `ballot_id`; team **immutable**.  
2. Clearing cookies can create a new ballot — capped by **IP-hash new-ballot limits** (not whole-ISP; same **public IP** only).  
3. Wall post + comments: **login required**.  
4. Data kept **forever** unless ops freeze or manual moderation later.

### 4.2 Optional later (not MVP)

Captcha, account age gate, device fingerprint, heavy admin void UI.

### 4.3 What not to rely on alone

- Client-only disable of submit  
- Cookie uniqueness without IP caps  
- Raw IP storage  
- Blocking entire countries / “same ISP region” as identity  

### 4.4 Suggested constants

```text
MAX_NEW_BALLOTS_PER_IP_HASH_PER_DAY = 5
MAX_NEW_BALLOTS_PER_IP_HASH_EVENT   = 15
MAX_VOTE_ATTEMPTS_PER_IP_HASH_HOUR  = 20
MAX_VOTE_ATTEMPTS_PER_BALLOT_HOUR   = 5
MAX_COMMENTS_PER_POST_NON_OP        = 3
MAX_COMMENTS_PER_POST_OP            = 50
MAX_WALL_WRITES_PER_USER_PER_HOUR   = 5
MIN_SUPPORTS_FOR_RELIABLE_REGION    = 5
# team change: not allowed
```

---

## 5. API sketch

Base path: `/api/worldcup`. Public paths use **slugs**, not UUIDs.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/teams` | No | Spain / Argentina metadata + colors |
| GET | `/supports` | No | Wall feed; query: `team`, `limit`, `cursor`, `regionKey` |
| POST | `/supports/vote` | No | Cast bare vote; cookie ballot; body: `team_id`, `contribute_to_globe?` |
| POST | `/supports` | **Yes** | Publish/attach wall post; body: `team_id?`, `content?`, `gif_id?`, … |
| GET | `/supports/:slug` | No | Single post by **slug** |
| GET | `/supports/:slug/comments` | No | Flat comments |
| POST | `/supports/:slug/comments` | **Yes** | Body: `{ emoji? }` and/or `{ gif_id? }` |
| GET | `/me` | No* | Ballot/session support if cookie or user (*cookie and/or JWT) |
| GET | `/globe/data` | No | Region aggregates (all-time) |
| GET | `/globe/regions/:regionKey` | No | Tally popup payload |
| GET | `/stats` | No | Global Spain vs Argentina totals |

### 5.1 Globe region response (popup)

```json
{
  "regionKey": "US:California",
  "label": "California, United States",
  "window": "all-time",
  "total": 128,
  "teams": [
    { "id": "spain", "name": "Spain", "emoji": "🇪🇸", "color": "#C60B1E", "votes": 74, "percent": 57.8 },
    { "id": "argentina", "name": "Argentina", "emoji": "🇦🇷", "color": "#74ACDF", "votes": 54, "percent": 42.2 }
  ],
  "leadingTeamId": "spain",
  "isTied": false,
  "isReliable": true,
  "minForReliable": 5
}
```

### 5.2 Write rules

- `POST /supports/vote`: set/read `wc_ballot_id`; **409** if ballot already voted; **429** IP/ballot limits; no team update path.  
- `POST /supports` (wall): **401** without JWT; require content and/or GIF.  
- `POST .../comments`: **401** without JWT; emoji and/or GIF only; enforce 3 / 50 quotas.  
- Geocode from request IP server-side; never trust client lat/lng for tallies.

---

## 6. Frontend architecture (reuse map)

**Visual implementation**: follow [`worldcup-finals-2026-ui-color-guide.md`](./worldcup-finals-2026-ui-color-guide.md) checklist §11 (CSS vars / `worldcup.*` Tailwind, TeamChip, scoreboard, markers, body classes).

| UI piece | Reuse / fork | Color guide |
|----------|----------------|-------------|
| View switcher | `ViewSwitcher` → “Support Wall” / “Support Globe” | §4.2 sky active (not team) |
| Team chips | `MoodTagChip` → `TeamChip` | §4.3 |
| Scoreboard | New dual bar chrome | §4.4 |
| Wall feed | `VentCard` → `SupportCard` + left accent | §4.5 |
| Comments | Flat emoji/GIF row under card | shell §2; no free text |
| Globe | `VentGlobe` → `SupportGlobe` | §4.7 |
| Region popup | `GlobePopup` → tally-first | §4.8 |
| Post modal | `PostModal` → `SupportPostModal` | §4.6 |
| Auth redirect | `useAuth` + `next=` for **post/comment only** | §4.10 |
| i18n | Browser default → locale packs (en/es/…); UGC stays original | — |

### 6.1 Routing

```text
/worldcup                 → Support home (wall/globe switch)
/worldcup/post/:slug      → support post by short slug (+ comments)
/auth?next=/worldcup?...  → return after login for post/comment
```

Keep **separate from** `/` Vent Wall. Shared layout, auth, design system (Vent glass + this color guide).

### 6.2 Mobile notes

- Support Wall: keep **multi-row / chip row** consistent with Vent Wall filter patterns (no need for 50 tags). With only 2 teams + All, mobile is trivial.  
- Support Globe: bottom bar can show **two team chips + global score** (Spain X – Y Argentina) instead of 50 mood filters.  
- Region popup: stack tallies vertically on small screens; large tap targets.

---

## 7. Global scoreboard (recommended chrome)

Always-visible summary (header or above feed / above globe):

```text
  🇪🇸 Spain  1,204    —    987  Argentina 🇦🇷
         ████████░░  55% Spain
```

Updates from `GET /stats` (poll every 30–60s or on focus).

---

## 8. Implementation phases

### Phase 0 — Spec lock
- [x] Teams fixed: Spain, Argentina  
- [x] Anonymous immutable vote + auth for wall/comments  
- [x] All-time tallies; no 24h data expiry  
- [x] Route `/worldcup`; UI per color guide  
- [x] Comments: flat emoji/GIF; 3 / 50 quotas; UUID + slug

### Phase 1 — Backend
- Migrations + seed teams  
- POST/GET supports + auth + rate limits + one-vote-per-user  
- Globe aggregate + region tally endpoint  
- Reuse IP geolocation + hash helpers  

### Phase 2 — Support Wall UI
- Page shell + view switcher  
- Team filter chips  
- Feed + cards  
- Support post modal + auth redirect  

### Phase 3 — Support Globe UI
- Globe markers by leading team  
- Click marker → tally popup (Spain vs Argentina counts)  
- Optional: list posts from region  

### Phase 4 — Hardening
- Admin void/hide  
- Voting closed flag  
- Seed demo geo data (like `globe-3day.sql`)  
- Load test aggregates  

### Phase 5 — Polish
- Share image / OG “I support Spain on Vent Wall Finals”  
- Accessibility, i18n if needed  
- Post-match freeze + final results banner  

---

## 9. Locked product decisions (MVP)

| # | Decision | Lock |
|---|----------|------|
| 1 | Bare vote auth | **No login** |
| 2 | Wall post / comment auth | **Login required** |
| 3 | Vote uniqueness | **`ballot_id` cookie** + IP-hash new-ballot caps |
| 4 | Team switch | **Never** (immutable) |
| 5 | Data retention | **Forever** (no 24h roll-off) |
| 6 | Globe window | **All-time** |
| 7 | Show on globe default | **On** when geo works |
| 8 | Wall body | Text **and/or** GIF required to publish |
| 9 | Anonymous then post | Attach to existing ballot if present |
| 10 | Route | **`/worldcup`** only |
| 11 | Early regions | Leader + early styling if &lt; 5 |
| 12 | Voting closed | **`WORLDCUP_VOTING_CLOSED`** |
| 13 | Comments | Flat; **emoji/GIF only**; 3 non-OP / 50 OP per post |
| 14 | Public IDs | **UUID** internal + **short slug** in URLs |
| 15 | UI / colors | **`worldcup-finals-2026-ui-color-guide.md`** (Vent-family shell) |
| 16 | i18n | Browser default locale packs; UGC original language |

---

## 10. Acceptance criteria (v1)

1. Support Wall / Support Globe switch works; shell matches Vent glass + color guide.  
2. Only Spain and Argentina team chips; All uses sky; team tokens from color guide.  
3. Bare vote works **logged out**; ballot cookie; cannot change team; second cast → 409.  
4. Wall publish and comments require login; redirect with `next=`.  
5. Wall lists posts; filter All / Spain / Argentina; scoreboard updates.  
6. Globe leading markers; click → **tally popup** both teams (all-time).  
7. IP-hash + rate limits bound new ballots; no raw IP; server-side geo only.  
8. Comments: flat, emoji/GIF only, quotas 3 / 50; public read.  
9. URLs use short **slugs** (e.g. `/worldcup/post/:slug`).  
10. UI language follows browser among supported packs; does not break mood product on `/`.  
11. `WORLDCUP_VOTING_CLOSED` freezes votes.  

---

## 11. Security & privacy checklist

- [ ] Ballot cookie + unique `ballot_id`  
- [ ] Immutable team after cast  
- [ ] Auth on wall publish + comment writes  
- [ ] IP hashed; new-ballot + attempt rate limits  
- [ ] Comment quotas enforced server-side  
- [ ] CLIENT_ORIGIN / CORS correct  
- [ ] Voting closed switch  
- [ ] No client-supplied coordinates for tallies  

---

## 12. Out of scope (v1)

- Live match scores / official FIFA feeds  
- Bracket beyond final two  
- Paid boosts / sponsored votes  
- Nested comment replies  
- Free-text comments  
- Auto-translate of user content (UI i18n only)  
- Captcha / fingerprints (unless abuse forces it)  
- Native apps  

---

## 13. Agent / implementer notes

1. **Do not** overload mood tags; dedicated World Cup tables.  
2. **Do** implement visuals from **`worldcup-finals-2026-ui-color-guide.md`** (pair with this doc).  
3. **Do** copy Vent structure: `VentGlobe`, `GlobePopup`, `MoodTagChip`, `PostModal`, `ViewSwitcher`, glass CSS.  
4. **Do** enforce ballots, quotas, and immutability in the **API**.  
5. Pages: `src/pages/WorldCup*.tsx`; routes: `server/src/routes/worldcup.ts`.  
6. Seed multi-region demo supports (mirror `globe-3day.sql` style).  
7. Env: `WORLDCUP_VOTING_CLOSED`, `IP_HASH_SECRET` (or shared secret).  
8. Tailwind: extend `worldcup.spain` / `worldcup.argentina` per color guide §3.4.  

---

## 14. One-line product summary

> **Support Wall + Support Globe**: Vent-family dark glass UI; fans cast an **anonymous immutable** Spain/Argentina vote (ballot cookie + IP caps), optionally **log in** to post text/GIF and leave **flat emoji/GIF comments**, browse a team-filtered wall and a globe whose region markers open **all-time tallies** — colors and chrome per the UI color guide.

---

*End of instruction document. Visuals: `worldcup-finals-2026-ui-color-guide.md`. Product locks: §9.*
