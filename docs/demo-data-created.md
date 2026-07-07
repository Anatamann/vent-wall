# Demo Data Created

**Date:** January 26, 2024  
**Purpose:** Testing Phase 2 UI Components with realistic data

## Demo Users Created (9 profiles)
- `mindful_soul` - Meditation and mindfulness focused
- `night_thinker` - Late night reflections and anxiety
- `coffee_dreamer` - Morning person, gratitude focused
- `ocean_waves` - Nature lover, beach reflections
- `city_wanderer` - Urban explorer, energy and chaos
- `quiet_storm` - Introspective, personal growth
- `sunrise_seeker` - Hopeful, new beginnings
- `midnight_poet` - Creative, emotional expression
- `demo` - Quick test account (`demo` / `demo123`)

## Mood Tags Created (15 tags)
- **Positive:** Happy 😊, Excited 🤩, Calm 😌, Grateful 🙏, Motivated 💪, Hopeful 🌟, Peaceful 🕊️
- **Challenging:** Sad 😢, Anxious 😰, Frustrated 😤, Lonely 😔, Overwhelmed 😵, Angry 😡
- **Reflective:** Confused 🤔, Nostalgic 🌅

## Sample Vents Created (20 posts)
- **Variety:** Short tweets to longer reflections
- **Themes:** Meditation, anxiety, gratitude, nature, city life, personal growth
- **Timestamps:** Spread across recent days for chronological testing
- **Content:** Realistic emotional expressions and relatable experiences

## Reactions Added (35 reactions)
- **Emojis:** ❤️, 🙏, 😌, 🫂, ☕, 🌊, 🌃, 💪, 🌈, 🌅, ✨, 📝, 🌙, 😊, 🏄, 🤗, 🔥, 👏, 🕊️
- **Distribution:** Popular posts have 3-4 reactions, others have 1-2
- **Realistic patterns:** Supportive reactions for vulnerable posts, celebratory for positive ones

## Emoji Comments Added (12 comments)
- **Scope:** Only on posts currently on the Wall (same 24h lifetime as the post)
- **Format:** Emoji-only responses via the post detail page comment section
- **Distribution:** Supportive emojis on vulnerable posts, celebratory on positive ones

## Testing Coverage
- ✅ Multiple tags per vent
- ✅ Various content lengths
- ✅ Different user posting patterns
- ✅ Realistic reaction distributions
- ✅ Chronological ordering
- ✅ Tag filtering capabilities
- ✅ User interaction patterns
- ✅ Post detail page with full text, reactions, and emoji comments
- ✅ Truncated feed cards linking to `/post/:id`

## Syncing data

```bash
npm run db:seed
```

Re-runs safely on existing databases — adds missing records and refreshes demo wall timers.

## Next Steps
- Test the interface with this realistic data
- Verify filtering and search functionality
- Check responsive design with varied content
- Validate reaction system display
- Proceed to Phase 3 (Posting System) once UI is confirmed working