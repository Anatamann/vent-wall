# World Cup Finals 2026 — UI & Color Code Guide

## Design instruction document (Vent Wall family)

**Status**: Design system for implementation  
**Date**: July 14, 2026  
**Product**: Support Wall + Support Globe (Spain vs Argentina)  
**Sibling docs**: Pair with [`worldcup-finals-2026-support-wall-instructions.md`](./worldcup-finals-2026-support-wall-instructions.md) for flows, auth, anti-spam, API, comments. **This file is visual only** and is the source of truth for colors and component chrome when building the MVP.

**Principle**: Look and feel like **Vent Wall / Vent Globe** (dark glass, sky accents, Inter, calm density) while introducing a clear **binary team identity** (Spain red-gold vs Argentina sky-blue-white) that never overwhelms the shared shell.

---

## 1. Design lineage (match Vent Wall)

Reuse these existing building blocks wherever possible:

| Token / pattern | Vent Wall source | World Cup usage |
|-----------------|------------------|-----------------|
| Page background | `#070b14` (`body.wall-view-active` / globe) | Support Wall + Support Globe shell |
| Header glass | `rgba(15, 23, 42, 0.92)` + `border-white/6` | Same header treatment |
| Glass panel | `.glass-panel` | Filters, scoreboard, empty states |
| Glass card | `.glass-card` | Support post cards |
| Interactive accent | Sky / primary (`#38bdf8`, `#0ea5e9`) | View switcher, links, focus rings (neutral chrome) |
| Typography | Inter, `text-sm sm:text-base` | Same scale |
| Radius | `rounded-full` chips, `rounded-xl` cards, `rounded-2xl` panels/modals | Same |
| Motion | 150–300ms ease; soft hover scale on chips | Same restraint |

**Do not** invent a bright “sports broadcast” theme. Keep the night-glass aesthetic; teams show through **chips, bars, and markers** only.

---

## 2. Color code — system (shell)

These colors are **neutral product chrome**, shared with Vent Wall. Prefer Tailwind slate/sky classes already used on glass views.

### 2.1 Foundations

| Role | Hex / value | Tailwind-ish | Notes |
|------|-------------|--------------|--------|
| Page void | `#070b14` | custom | Full dark shell background |
| Shell gradient peak | `#12203a` | custom | Radial top glow under header |
| Surface elevated | `rgba(15, 23, 42, 0.92)` | `slate-900/90` | Header / footer |
| Panel fill | `rgba(15, 23, 42, 0.55)` | `bg-slate-900/55` | `.glass-panel` |
| Card fill | `rgba(30, 41, 59, 0.55)` | `bg-slate-800/55` | `.glass-card` |
| Border subtle | `rgba(255, 255, 255, 0.10)` | `border-white/10` | Panels, cards |
| Border strong | `rgba(255, 255, 255, 0.15)` | `border-white/15` | Modals, popups |
| Text primary | `#f1f5f9` | `slate-100` | Titles |
| Text body | `#e2e8f0` | `slate-200` | Body copy |
| Text secondary | `#cbd5e1` | `slate-300` | Meta, usernames secondary |
| Text muted | `#94a3b8` | `slate-400` / `slate-500` | Hints, disclaimers |
| Focus / link (neutral) | `#38bdf8` | `sky-400` | Focus rings, “All”, switcher |
| Focus ring alpha | `rgba(56, 189, 248, 0.40)` | `ring-sky-400/40` | a11y |
| Sky soft fill | `rgba(14, 165, 233, 0.15)` | `bg-sky-500/15` | Selected neutral controls |
| Danger / error | `#f87171` | `red-400` | Validation only |
| Success (generic) | `#34d399` | `emerald-400` | Optional “vote recorded” |

### 2.2 Overlay / modal scrim

| Role | Value |
|------|--------|
| Modal backdrop | `bg-slate-950/50 backdrop-blur-md` |
| Popup panel | `bg-slate-900/75 backdrop-blur-2xl` + `border-white/15` |
| Popup shadow | `0 25px 80px rgba(0,0,0,0.55)` + optional sky rim `0 0 0 1px rgba(125,211,252,0.08)` |

### 2.3 Globe stage (Support Globe)

Match Vent Globe stage gradients:

```text
Stage base:
  radial-gradient(ellipse 70% 60% at 50% 42%, #1a2744 0%, #0b1224 55%, #070b14 100%)

Vignette:
  radial-gradient(circle at 50% 45%, transparent 30%, rgba(7,11,20,0.5) 80%)

Bottom fade (filters / score strip):
  linear-gradient(to top, #070b14 → #070b14/92 → transparent)

Atmosphere (three-globe):
  atmosphereColor: #7dd3fc
  atmosphereAltitude: ~0.22
```

---

## 3. Color code — teams (brand accents)

Official-inspired palette, **tuned for dark UI** (slightly brighter than pure flag inks so chips read on slate).

### 3.1 Spain

| Token | Hex | Usage |
|-------|-----|--------|
| `spain.primary` | `#C60B1E` | Chip border/dot, bar fill, leading marker ring |
| `spain.deep` | `#8B0000` | Hover press, gradient end |
| `spain.gold` | `#FFC400` | Secondary accent, score numbers optional |
| `spain.soft` | `rgba(198, 11, 30, 0.18)` | Selected chip fill, card left accent |
| `spain.glow` | `rgba(198, 11, 30, 0.35)` | Soft selected shadow (use sparingly) |
| `spain.text` | `#FECACA` | Text on soft red fill (`red-200`-like) |
| Emoji | 🇪🇸 | Chip leading icon (preferred over custom crest in v1) |

**CSS variables (recommended)**

```css
--wc-spain: #C60B1E;
--wc-spain-deep: #8B0000;
--wc-spain-gold: #FFC400;
--wc-spain-soft: rgba(198, 11, 30, 0.18);
--wc-spain-glow: rgba(198, 11, 30, 0.35);
--wc-spain-text: #fecaca;
```

### 3.2 Argentina

| Token | Hex | Usage |
|-------|-----|--------|
| `argentina.primary` | `#74ACDF` | Chip border/dot, bar fill, marker ring |
| `argentina.deep` | `#3D7AB5` | Hover, gradient end |
| `argentina.sun` | `#F6B40E` | Optional sun accent (use rarely) |
| `argentina.soft` | `rgba(116, 172, 223, 0.20)` | Selected chip fill |
| `argentina.glow` | `rgba(116, 172, 223, 0.40)` | Selected shadow |
| `argentina.text` | `#E0F2FE` | Text on soft blue fill (`sky-100`) |
| Emoji | 🇦🇷 | Chip leading icon |

```css
--wc-argentina: #74ACDF;
--wc-argentina-deep: #3D7AB5;
--wc-argentina-sun: #F6B40E;
--wc-argentina-soft: rgba(116, 172, 223, 0.20);
--wc-argentina-glow: rgba(116, 172, 223, 0.40);
--wc-argentina-text: #e0f2fe;
```

### 3.3 Neutral / tie / empty

| Role | Hex / value | Usage |
|------|-------------|--------|
| Tie / split | `#94A3B8` | Tied region marker, “Tied” label |
| Empty region | `#64748B` face on `slate-800` disc | Reuse cloud/duck empty markers |
| All / no filter | Sky system (`sky-400`) | “All teams” chip — not team-colored |

### 3.4 Tailwind extend (implementation hint)

```js
// tailwind.config.js — theme.extend.colors
worldcup: {
  spain: {
    DEFAULT: '#C60B1E',
    deep: '#8B0000',
    gold: '#FFC400',
    soft: 'rgba(198, 11, 30, 0.18)',
    text: '#fecaca',
  },
  argentina: {
    DEFAULT: '#74ACDF',
    deep: '#3D7AB5',
    sun: '#F6B40E',
    soft: 'rgba(116, 172, 223, 0.20)',
    text: '#e0f2fe',
  },
}
```

---

## 4. Component UI specs

### 4.1 Page shell

- Body class pattern (mirror globe/wall):  
  `body.worldcup-wall-active` / `body.worldcup-globe-active`  
  → same background `#070b14` and header overrides as wall/globe.
- Layout: existing app header + footer (year 2026 already).
- Main: max-width container on Wall; **full bleed** on Globe (no page scroll).

### 4.2 View switcher

Reuse `ViewSwitcher` visual language:

| State | Style |
|-------|--------|
| Track | `rounded-full border border-white/10 bg-slate-900/70 backdrop-blur` |
| Idle segment | `text-slate-400 hover:text-slate-200` |
| Active segment | `bg-sky-500/15 text-sky-100 border border-sky-400/40` (neutral sky — **not** team color) |
| Labels | “Support Wall” / “Support Globe” (short on mobile: “Wall” / “Globe”) |

Team identity must **not** hijack the view switcher; keep switcher product-neutral.

### 4.3 Team chips (mood-tag analogue)

Mirror `MoodTagChip` structure: **color dot · emoji · name**.

#### Anatomy

```
┌─────────────────────────────┐
│  ●  🇪🇸  Spain              │  ← pill, rounded-full
└─────────────────────────────┘
   ^dot  emoji  label
```

| Part | Spec |
|------|------|
| Height | ~28–32px (`py-1` / `py-1.5`) |
| Padding | `px-2.5`–`px-3` |
| Font | `text-[10px] sm:text-[11px]` medium |
| Dot | 6px circle, `spain.primary` or `argentina.primary` |
| Gap | `gap-1.5` |
| Default | `border-white/10 bg-slate-800/80 text-slate-200` |
| Hover | Border tints toward team primary at ~30% opacity |

#### Selected (Spain)

```text
border: 1px solid rgba(198, 11, 30, 0.55)
background: var(--wc-spain-soft)
color: var(--wc-spain-text)
box-shadow: 0 0 12px var(--wc-spain-glow)   /* optional, keep subtle */
```

#### Selected (Argentina)

```text
border: 1px solid rgba(116, 172, 223, 0.55)
background: var(--wc-argentina-soft)
color: var(--wc-argentina-text)
box-shadow: 0 0 12px var(--wc-argentina-glow)
```

#### “All” chip

Use **sky** selection (Vent Wall “All Moods”), never red/blue.

#### Filter vs support actions

| Control | Appearance | Behavior |
|---------|------------|----------|
| Filter chips | Compact chips in filter row | Change feed only |
| Support CTA | Larger pill or dual CTA buttons under scoreboard | Opens post modal |
| Support CTA Spain | Filled soft red + white/red text | `Support Spain` |
| Support CTA Argentina | Filled soft blue | `Support Argentina` |

If one chip does both filter and vote, require a confirm modal — prefer **separate** CTAs.

### 4.4 Global scoreboard

Place above Wall feed and above Globe bottom strip (or sticky under header on Wall).

```
┌──────────────────────────────────────────────────────┐
│  🇪🇸 Spain     1,204     55% ████████░░ 45%     987  Argentina 🇦🇷 │
└──────────────────────────────────────────────────────┘
```

| Element | Spec |
|---------|------|
| Container | `.glass-panel` `p-3 sm:p-4` |
| Numbers | `tabular-nums font-semibold text-slate-50` |
| Spain segment | fill `spain.primary` |
| Argentina segment | fill `argentina.primary` |
| Track | `bg-slate-800 h-2 rounded-full overflow-hidden` |
| Labels | `text-xs text-slate-400` |
| Mobile | Stack: Spain row / bar / Argentina row if width &lt; 400px |

### 4.5 Support Wall — cards

Reuse `.glass-card` layout from `VentCard`:

| Zone | Content | Color |
|------|---------|--------|
| Header | Avatar + username + time | slate text |
| Team | Single team chip (static selected style) | Team palette |
| Body | Optional text | `text-slate-100` |
| Media | GIF | Full width, rounded-lg |
| Footer | Comment count / expand | `text-slate-400`; “View” link `text-sky-400` |
| Comments | Flat row: avatar + emoji and/or GIF only (no free text) | Same glass density; meta `text-slate-500` |

**Left accent (optional)**  
4px left border on card: `spain.primary` or `argentina.primary` at 80% opacity — helps scan filters quickly.

**Comment composer (auth)**  
No textarea. Emoji picker control + GIF button (`btn-glass`); primary send uses **sky** (neutral chrome), not team fill — comments are engagement, not a second vote CTA.

### 4.6 Support post modal

Same shell as PostModal / glass modals:

| Element | Spec |
|---------|------|
| Width | `max-w-lg` |
| Panel | `rounded-2xl border-white/15 bg-slate-900/85 backdrop-blur-2xl` |
| Title | “You’re supporting {Team}” + team chip |
| Textarea | Dark input: `bg-slate-800/80 border-white/10 text-slate-100` |
| GIF button | `btn-glass` |
| Disclaimer | `text-[11px] text-slate-500` in muted panel `bg-slate-800/40` |
| Primary submit | Team-colored soft fill (Spain or Argentina), not generic primary-600 |
| Secondary cancel | `btn-glass` or text button slate |
| Focus | Team-tinted ring or sky ring for a11y consistency — prefer **sky** focus ring for keyboard users |

### 4.7 Support Globe — markers

Reuse circular disc markers (no heavy glow — Vent Globe lesson):

| State | Face | Border / disc |
|-------|------|----------------|
| Spain leads | 🇪🇸 (or 🔴) | Border `spain.primary` ~60%, fill `slate-800/90` |
| Argentina leads | 🇦🇷 (or 🔵) | Border `argentina.primary` ~60% |
| Tie | ⚖️ | Border `slate-400/50` |
| Empty | ☁️ / 🦆 | Border `slate-500/40`, dim face |
| Size | 2.15rem base; scale slightly with log(votes) | `--marker-scale` |

Hover: light border brighten only (no bloom).

### 4.8 Region tally popup (mandatory UI)

Glass dialog centered; mobile full-width with padding.

**Layout**

```
┌─────────────────────────────────────┐
│  California, United States      [×] │
│  128 supports · all-time            │
│─────────────────────────────────────│
│  🇪🇸 Spain          74   57.8%      │
│  ████████████░░░░░░░░               │  ← spain.primary
│  🇦🇷 Argentina      54   42.2%      │
│  ████████░░░░░░░░░░░░               │  ← argentina.primary
│─────────────────────────────────────│
│  Leading: Spain · Reliable sample   │
│  [ View posts ]  (optional)         │
└─────────────────────────────────────┘
```

| Element | Spec |
|---------|------|
| Title | `text-base sm:text-xl font-semibold text-slate-50` |
| Subtitle | `text-xs sm:text-sm text-slate-400` |
| Vote row | Flag + name left; count + % right, `tabular-nums` |
| Bar height | 8–10px, `rounded-full` |
| Leading badge | Small pill: team soft fill |
| Early sample | `text-amber-300/90` if below min threshold |
| Close | Icon button `hover:bg-white/10` |

### 4.9 Empty & loading

| State | UI |
|-------|-----|
| Loading chips | Pulse pills `bg-slate-700/60` |
| Empty feed | Glass panel, muted text, dual CTAs to support |
| Globe loading | Centered spinner (existing `LoadingSpinner`) sky-tinted |
| Error | `text-red-400` inline, retry `btn-glass` |

### 4.10 Auth redirect interstitial (optional)

If sending users to `/auth`:

- Keep dark auth page as today, or pass `?next=` only.  
- Optional banner on return: soft team color toast “Finish supporting Spain”.

---

## 5. Typography scale

| Role | Class / size |
|------|----------------|
| Page title | `text-xl sm:text-2xl font-bold text-slate-50` |
| Section title | `text-sm sm:text-base font-semibold text-slate-100` |
| Card body | `text-xs sm:text-sm text-slate-100 leading-relaxed` |
| Meta / time | `text-[10px] sm:text-xs text-slate-500` |
| Chip label | `text-[10px] sm:text-[11px] font-medium` |
| Disclaimer | `text-[9px] sm:text-[10px] text-slate-500 leading-snug` |
| Scoreboard numbers | `text-lg sm:text-2xl font-bold tabular-nums` |

Font family: **Inter** (global).

---

## 6. Spacing & layout

| Context | Spec |
|---------|------|
| Page padding (Wall) | `px-3 sm:px-4` / container `max-w-6xl` or existing feed width |
| Card gap | `gap-4` grid; `grid-cols-1 md:grid-cols-2 xl:grid-cols-3` in popups |
| Chip gap | `gap-1.5` |
| Section stack | `space-y-4 sm:space-y-6` |
| Modal padding | `p-4 sm:p-6` |
| Globe bottom safe area | `pb-[max(0.75rem,env(safe-area-inset-bottom))]` |
| Touch targets | Min **44×44px** hit area for team CTAs on mobile |

---

## 7. Motion & interaction

| Interaction | Motion |
|-------------|--------|
| Chip hover | `scale-[1.03]`, 150ms |
| Chip selected | `scale-[1.02]` + soft team glow |
| Card hover | Border sky (neutral) or slight team border if filtered |
| Modal open | Existing fade/slide patterns |
| Globe marker click | Immediate popup; no confetti in v1 |
| Vote success | Short toast; optional confetti **off** by default (keep calm brand) |

Respect `prefers-reduced-motion`: disable scale animations.

---

## 8. Accessibility

| Rule | Detail |
|------|--------|
| Contrast | Team soft fills + light text must meet ~4.5:1 on slate; prefer `spain.text` / `argentina.text` |
| Don’t rely on color alone | Always show name + emoji + counts |
| Focus visible | `ring-2 ring-sky-400/40` (consistent) |
| Icons | Decorative flags `aria-hidden`; buttons have aria-labels |
| Popup | `role="dialog"` `aria-modal="true"` labelled by title |
| Scoreboard | Live region optional: `aria-live="polite"` on total updates |

---

## 9. Do / Don’t

### Do

- Keep glass + night sky shell identical to Vent Wall / Globe.  
- Use **sky** for product chrome (switcher, links, focus).  
- Use **Spain red / Argentina blue** only for team identity (chips, bars, markers, vote CTAs).  
- Truncate long copy; keep chips single-line.  
- Match Vent Wall filter patterns on Wall (simple All / Spain / Argentina).  

### Don’t

- Don’t paint the whole page red/blue.  
- Don’t use pure white backgrounds on this surface.  
- Don’t add neon stadium LEDs or heavy drop-shadows on markers.  
- Don’t use mood-tag rainbow colors for teams.  
- Don’t put team colors on the global header logo (keep Vent Wall brand).  

---

## 10. Quick reference — hex sheet

```text
SHELL
  void          #070b14
  gradient peak #12203a
  panel         slate-900 @ 55%
  card          slate-800 @ 55%
  text primary  #f1f5f9
  text muted    #94a3b8
  sky accent    #38bdf8 / #0ea5e9

SPAIN
  primary #C60B1E
  deep    #8B0000
  gold    #FFC400
  soft    rgba(198,11,30,0.18)
  text    #fecaca

ARGENTINA
  primary #74ACDF
  deep    #3D7AB5
  sun     #F6B40E
  soft    rgba(116,172,223,0.20)
  text    #e0f2fe

TIE / EMPTY
  tie     #94A3B8
  empty   #64748B
```

---

## 11. Implementation checklist (UI only)

- [ ] Add CSS variables or Tailwind `worldcup.*` colors  
- [ ] `TeamChip` component matching MoodTagChip anatomy  
- [ ] Scoreboard component with dual progress bar  
- [ ] Support card with optional team left border  
- [ ] Flat emoji/GIF comment row + composer (sky send, no free text)  
- [ ] Support modal with team-tinted submit  
- [ ] Globe markers Spain / Argentina / tie / empty  
- [ ] Region tally popup dual bars (all-time subtitle)  
- [ ] Body classes for worldcup wall/globe dark shell  
- [ ] Mobile scoreboard stack + 44px CTAs  
- [ ] Contrast pass on both team selected chips  

---

## 12. Fidelity target

If a designer or agent asks “how close to Vent Wall?”:

> **90% shared shell** (glass, typography, layout, sky chrome).  
> **10% team system** (two color tokens, chips, score bars, globe markers, vote CTAs).

That balance keeps Finals 2026 recognizably **Vent Wall**, not a separate sports site.

---

*End of UI & color guide. Pair with the product/instruction doc for flows, auth, anti-spam, and API.*
