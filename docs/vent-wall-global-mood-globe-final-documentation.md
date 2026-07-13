# Vent Wall — Global Mood Globe (Vent Globe)
## Final Implementation Documentation

**Status**: Concept Finalized  
**Date**: July 14, 2026  
**Purpose**: This document contains the complete, agreed-upon specification for the Vent Globe feature. It is optimized for direct use with Groq to generate code incrementally.

---

## 1. Finalized Concept Overview

Vent Wall will have **two distinct, switchable views**:

- **Vent Globe** (new): A 3D interactive globe that visualizes dominating emotions from anonymous vents posted in the last 24 hours.
- **Vent Wall** (existing): The traditional card/list view of vents.

### Core Behavior
- The globe shows **only emoticons** representing the dominating emotion tag from original posts (reactions do not influence the displayed emotion).
- Regions are clustered at **state level** using defined state boundaries.
- Users can freely rotate, zoom, and explore the globe.
- Clicking a region with activity opens a clean translucent glass popup showing the list of vents from that state/region (last 24 hours only).
- Inside the popup: Users see vents + total engagement count (reactions + comments). No direct reactions or comments are available here.
- A clear **"Open full vent"** button takes the user to the dedicated vent page for reactions and comments.
- Empty regions (no vents in last 24h) display either a cloud or duck emoticon (randomized per region for visual variety).
- When creating a new vent, users are asked for permission to include it in the Vent Globe. IP is captured server-side regardless (for backend and Globe purposes), but the vent only appears on the globe if permission is granted.

### Dominating Emotion Logic
A mood wins as "dominating" only if:
- It has the highest count, **and**
- It leads the second-highest by more than 10%, **or**
- When margin is ≤10%, the system uses cumulative counting among the top 3 tags to decide the winner.

for future use only: A minimum number of vents (recommended: 5–8) should exist in the region before attempting to determine a dominating emotion.

---

## 2. User Flow Summary

1. User lands on Vent Wall → Sees a **switch button** to toggle between **Vent Wall** and **Vent Globe**.
2. In Vent Globe view:
   - Interactive 3D globe with emoticons on active regions.
   - Click region → Glass popup with vents + total counts.
   - "Open full vent" → Opens dedicated post page.
   - Close popup → Continue exploring globe.
3. When posting a vent:
   - Simple permission toggle/checkbox: “Allow this vent to appear on the Global Mood Globe (approximate location from your connection will be used).”
   - Default: **Checked (opt-in)** recommended for better data coverage.
4. IP is always captured on post creation for backend processing. Permission only controls visibility on the globe.

---

## 3. Key Technical & Design Decisions

| Area                        | Final Decision                                      | Reason / Notes |
|----------------------------|-----------------------------------------------------|----------------|
| **Views**                  | Two views with switch button                        | Clean separation of exploration vs traditional feed |
| **Granularity**            | State-level clustering                              | More meaningful than country; requires fallback logic |
| **Location Source**        | IP-based (ISP location)                             | Silent, no user input required |
| **Permission**             | Ask only to contribute to Vent Globe                | Transparent and respectful |
| **IP Capture**             | Always capture on post creation                     | Needed for backend + Globe |
| **Popup Interaction**      | View only + total count + "Open full vent"          | Keeps globe lightweight |
| **Empty State**            | Randomized cloud or duck emoticon                   | Avoids repetitive look |
| **Emotions on Globe**      | Emoticons only (from posts)                         | Clean visual language |
| **Dominating Logic**       | Highest + >10% margin OR top-3 cumulative           | Balanced and fair |
|(in future) **Minimum Activity**       | 5–8 vents minimum before showing dominating emotion | Avoids misleading data on low-activity regions |

---

## 4. UI & Desktop Layout Specifications (Desktop Focus)

### Overall Aesthetic
- Dark background with white text
- Blue accents for interactive elements (buttons, links, active states)
- Clean sans-serif typography
- Generous vertical and horizontal spacing (matching current Vent Wall)
- Calm, minimal, and supportive tone

### 4.1 View Switcher
- Location: Below the main header, centered 
- Style: Clean segmented control / pill switch
- Options: **Vent Wall** | **Vent Globe 🌍**
- Active state: Blue background or underline on the selected view
- Desktop behavior: Switching views replaces the two different views completely to the designated designed page

### 4.2 Vent Globe View (Desktop)
- Main content area: Large interactive 3D globe (centered or slightly upper)
- Globe features: Full rotate (drag), zoom in/out (scroll/pinch), click on regions
- Hint text below globe: “Drag to rotate • Scroll to zoom”
- Bottom section: Horizontal scrollable row of **mood filter tags/pills** (exact same style and icons as current Vent Wall mood filters)
- Behavior of mood filters: Clicking any mood tag opens the glass popup showing vents with that specific emotion from **all regions** (global mood filter)
- Empty regions on globe: Show randomized cloud ☁️ or duck 🦆 emoticon

### 4.3 Glass Popup Modal (Desktop)
- Style: Translucent glassmorphism (frosted glass effect with backdrop blur)
- Background: The 3D globe should remain faintly visible and blurred behind the modal
- Width: Wide enough for desktop (approximately 900–1100px or responsive)
- Header: filter context (The corresponding tag name) + dominating emoticon
- Content inside modal: Vent cards displayed in a **3-column grid** layout
- Each card must follow the existing Vent Wall card style:
  - Emoji mood indicator on the left
  - Short vent preview text
  - Timestamp
  - Total engagement count (reactions + comments)
  - very subtle Blue **"View full vent"** button on the right side of each card
- No reactions or comments inside the popup — only viewing + navigation to full post
- Close button: Top right corner (X)

### 4.4 Post Creation Form
- Keep the **existing post creation form layout and style** exactly as it is currently on Vent Wall
- Add only one new element at the very bottom of the form:
  - Checkbox / Toggle labeled: **"Add to 3D-Globe view"**
  - Default state: **Checked**
  - Style: Match existing pill/minimal toggle design
  - Purpose: Controls the `contributeToGlobe` flag

### 4.5 Visual Hierarchy & Responsiveness (Desktop Priority)
- Desktop is the current focus
- The globe should feel like the primary explorative element
- Mood filters at the bottom should be easily accessible without scrolling too much
- The glass popup should not feel cramped — use the extra desktop width for the 3-column card grid

---

## 5. Privacy & Transparency Requirements

- Permission text must clearly state that they are willing to contribute in the Vent Globe and be used **only** if they opt in to Vent Globe.
- Never claim the location is the user’s exact position.
- Add a short note in Privacy Policy / footer: “ISP region is derived from connection data solely to power the Global Mood Globe visualization when users choose to contribute.”
- Do not store raw IP long-term after processing.

---

## 5. Recommended Implementation Order (for Groq)

1. Update Post/Vent schema to include `location` object + `contributeToGlobe` boolean flag.
2. Modify post creation flow to capture IP, geolocate, ask for permission, and store flag. (No actual permission for geolocation by the way, only opt-in data)
3. Create new aggregation endpoint for globe data (last 24h, state-level, dominating emotion calculation).
4. Build Vent Globe view with globe.gl (or react-globe.gl) + state centers data.
5. Implement glass popup with vent list + total engagement count + "Open full vent" action.
6. Add view switcher (button/toggle) between Vent Globe and Vent Wall.
7. Add empty state handling with randomized cloud/duck.
8. Add permission UI on the existing post creation form.
9. Testing, edge cases, and polish.

---

## 6. Ready-to-Use Groq Prompts

### Prompt A: Schema Update

```
You are an expert full-stack developer building Vent Wall.

Final requirements:
- Add optional `location` object: { countryCode, country, state, city, lat (rounded), lng (rounded) }
- Add boolean field `contributeToGlobe` (default true)
- Keep fully backward compatible

Current database/ORM: [INSERT YOUR TECH]

Return only the schema changes + migration notes.
```

### Prompt B: Post Creation + Permission + IP Capture

```
You are building Vent Wall.

Requirements:
- Always capture real client IP on vent creation (handle proxies)
- Geolocate using ipapi.co (or equivalent) and store rounded location + state if possible
- Show a permission checkbox/toggle during posting: “Allow this vent to appear on the Global Mood Globe (approximate location from your connection)”
- Default: checked
- Only set `contributeToGlobe = true` if user allows it
- IP processing must never break post creation

Return the helper function + exact integration into your existing post creation handler.
```

### Prompt C: Globe Data Aggregation Endpoint

```
Create GET /api/globe/data?hours=24

Logic:
- Filter vents where contributeToGlobe = true AND created within last X hours AND has valid location.state
- Group by state (or state + country)
- Calculate dominating emotion using this rule:
  - Highest count + leads 2nd by >10%, OR
  - If margin ≤10%, use cumulative of top 3 tags
- Only include states with minimum 5–8 vents
- Return array with: state, country, lat, lng, dominatingEmoticon, totalVents, totalEngagement

Also provide a small static mapping of state centers.

Return complete endpoint code + helper logic.
```

### Prompt D: Vent Globe Frontend Component

```
Build the Vent Globe view using globe.gl (or react-globe.gl).

Requirements:
- Fetch data from the aggregation endpoint
- Render interactive 3D globe with emoticons as points/labels
- Color and size points based on activity
- On click of a point/region → open glassmorphism modal showing list of vents + total engagement count
- Inside modal: "Open full vent" button that navigates to dedicated post page
- Add randomized cloud or duck icon for regions with no activity
- Include a clean switch button to toggle to Vent Wall view
- Make it responsive and performant

Return the complete component code + styling notes that match Vent Wall’s existing design.
```

### Prompt E: Permission UI on Post Form

```
Add a clean, optional permission toggle/checkbox to the existing vent creation form.

Text: “Allow this vent to appear on the Global Mood Globe (approximate location from your connection will be used)”

Default: checked
Store the choice as `contributeToGlobe`

Return only the UI component + how to pass the value to the backend.
```

---

## 7. Open Technical Considerations (for Groq to Handle)

- State-level geolocation accuracy is limited → implement sensible fallback (e.g., show at country level or hide very low-confidence states).
- Minimum vent threshold (suggest 5–8) to avoid noisy data.
- Performance: Lazy load the globe component. Consider WebGL fallbacks or a list view toggle for very low-end devices.
- Empty state randomization: Simple client-side random choice between cloud and duck icons.

---

## 8. References

- globe.gl: https://github.com/vasturiano/globe.gl
- ipapi.co (free tier): https://ipapi.co/api/
- Glassmorphism inspiration: Keep it subtle and supportive, not overly decorative.

---

**This document is now the single source of truth for the Vent Globe feature.**

You can copy any prompt above directly into Groq and generate code step by step. All previous discussions and decisions have been consolidated here.

When you are ready to begin implementation, start with **Prompt A** (schema) and proceed in the recommended order.

If you need any section expanded or an additional prompt created, let me know and I will update this file. 

We have a clear, respectful, and feasible plan. Ready to build. 🌍
