import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import { pool, query } from '../db.js';
import { backfillMissingVentSlugs } from '../utils/slug.js';
import { getWallExpiresAt } from '../utils/wall.js';
dotenv.config();
const DEMO_PASSWORD = 'demo123';
const USERS = [
    { id: '11111111-1111-1111-1111-111111111101', username: 'mindful_soul', email: 'mindful@ventwall.local' },
    { id: '11111111-1111-1111-1111-111111111102', username: 'night_thinker', email: 'night@ventwall.local' },
    { id: '11111111-1111-1111-1111-111111111103', username: 'coffee_dreamer', email: 'coffee@ventwall.local' },
    { id: '11111111-1111-1111-1111-111111111104', username: 'ocean_waves', email: 'ocean@ventwall.local' },
    { id: '11111111-1111-1111-1111-111111111105', username: 'city_wanderer', email: 'city@ventwall.local' },
    { id: '11111111-1111-1111-1111-111111111106', username: 'quiet_storm', email: 'quiet@ventwall.local' },
    { id: '11111111-1111-1111-1111-111111111107', username: 'sunrise_seeker', email: 'sunrise@ventwall.local' },
    { id: '11111111-1111-1111-1111-111111111108', username: 'midnight_poet', email: 'poet@ventwall.local' },
    { id: '11111111-1111-1111-1111-111111111109', username: 'demo', email: 'demo@ventwall.local' },
];
const MOOD_TAGS = [
    { id: '22222222-2222-2222-2222-222222222201', name: 'Happy', color: '#fbbf24', emoji: '😊' },
    { id: '22222222-2222-2222-2222-222222222202', name: 'Excited', color: '#f59e0b', emoji: '🤩' },
    { id: '22222222-2222-2222-2222-222222222203', name: 'Calm', color: '#10b981', emoji: '😌' },
    { id: '22222222-2222-2222-2222-222222222204', name: 'Grateful', color: '#ec4899', emoji: '🙏' },
    { id: '22222222-2222-2222-2222-222222222205', name: 'Motivated', color: '#0ea5e9', emoji: '💪' },
    { id: '22222222-2222-2222-2222-222222222206', name: 'Hopeful', color: '#8b5cf6', emoji: '🌟' },
    { id: '22222222-2222-2222-2222-222222222207', name: 'Peaceful', color: '#06b6d4', emoji: '🕊️' },
    { id: '22222222-2222-2222-2222-222222222208', name: 'Sad', color: '#3b82f6', emoji: '😢' },
    { id: '22222222-2222-2222-2222-222222222209', name: 'Anxious', color: '#8b5cf6', emoji: '😰' },
    { id: '22222222-2222-2222-2222-222222222210', name: 'Frustrated', color: '#f97316', emoji: '😤' },
    { id: '22222222-2222-2222-2222-222222222211', name: 'Lonely', color: '#6366f1', emoji: '😔' },
    { id: '22222222-2222-2222-2222-222222222212', name: 'Overwhelmed', color: '#a855f7', emoji: '😵' },
    { id: '22222222-2222-2222-2222-222222222213', name: 'Angry', color: '#ef4444', emoji: '😡' },
    { id: '22222222-2222-2222-2222-222222222214', name: 'Confused', color: '#64748b', emoji: '🤔' },
    { id: '22222222-2222-2222-2222-222222222215', name: 'Nostalgic', color: '#f472b6', emoji: '🌅' },
    { id: '22222222-2222-2222-2222-222222222216', name: 'Dreaming', color: '#7C3AED', emoji: '💭' },
    { id: '22222222-2222-2222-2222-222222222217', name: 'Fantasy', color: '#A855F7', emoji: '🧚' },
    { id: '22222222-2222-2222-2222-222222222218', name: 'Work Rant', color: '#DC2626', emoji: '📢' },
    { id: '22222222-2222-2222-2222-222222222219', name: 'Witty', color: '#EAB308', emoji: '😏' },
    { id: '22222222-2222-2222-2222-222222222220', name: 'Horny', color: '#BE123C', emoji: '🔥' },
    { id: '22222222-2222-2222-2222-222222222221', name: 'Flirty', color: '#EC4899', emoji: '😉' },
    { id: '22222222-2222-2222-2222-222222222222', name: 'Burnout', color: '#78716F', emoji: '🫠' },
    { id: '22222222-2222-2222-2222-222222222223', name: 'Petty', color: '#F97316', emoji: '🙄' },
    { id: '22222222-2222-2222-2222-222222222224', name: 'Savage', color: '#DB2777', emoji: '💅' },
    { id: '22222222-2222-2222-2222-222222222225', name: 'Overthinking', color: '#4F46E5', emoji: '🌀' },
    { id: '22222222-2222-2222-2222-222222222226', name: 'Gossip', color: '#D946EF', emoji: '👀' },
    { id: '22222222-2222-2222-2222-222222222227', name: 'Unhinged', color: '#65A30D', emoji: '🎭' },
    { id: '22222222-2222-2222-2222-222222222228', name: 'Spicy', color: '#991B1B', emoji: '🌶️' },
    { id: '22222222-2222-2222-2222-222222222229', name: 'Daydreaming', color: '#0EA5E9', emoji: '☁️' },
    { id: '22222222-2222-2222-2222-222222222230', name: 'Ambitious', color: '#059669', emoji: '🚀' },
    { id: '22222222-2222-2222-2222-222222222231', name: 'Sarcastic', color: '#CA8A04', emoji: '🙃' },
    { id: '22222222-2222-2222-2222-222222222232', name: 'Caffeinated', color: '#78350F', emoji: '☕' },
    { id: '22222222-2222-2222-2222-222222222233', name: 'Existential', color: '#4338CA', emoji: '🌌' },
    { id: '22222222-2222-2222-2222-222222222234', name: 'Villain Arc', color: '#7F1D1D', emoji: '😈' },
    { id: '22222222-2222-2222-2222-222222222235', name: 'Delulu', color: '#C026D3', emoji: '🦄' },
    { id: '22222222-2222-2222-2222-222222222236', name: 'Touch Starved', color: '#FB7185', emoji: '🫂' },
    { id: '22222222-2222-2222-2222-222222222237', name: 'Chaos Mode', color: '#84CC16', emoji: '🌪️' },
    { id: '22222222-2222-2222-2222-222222222238', name: 'Shower Thoughts', color: '#06B6D4', emoji: '🚿' },
    { id: '22222222-2222-2222-2222-222222222239', name: 'Dead Inside', color: '#52525B', emoji: '💀' },
    { id: '22222222-2222-2222-2222-222222222240', name: 'Main Character', color: '#FACC15', emoji: '✨' },
    { id: '22222222-2222-2222-2222-222222222241', name: 'Thirsty', color: '#E11D48', emoji: '💦' },
    { id: '22222222-2222-2222-2222-222222222242', name: 'Seductive', color: '#9D174D', emoji: '💋' },
    { id: '22222222-2222-2222-2222-222222222243', name: 'Steamy', color: '#9F1239', emoji: '♨️' },
    { id: '22222222-2222-2222-2222-222222222244', name: 'Sensual', color: '#831843', emoji: '🕯️' },
    { id: '22222222-2222-2222-2222-222222222245', name: 'Heated', color: '#C2410C', emoji: '🥵' },
    { id: '22222222-2222-2222-2222-222222222246', name: 'After Dark', color: '#4C1D95', emoji: '🌙' },
    { id: '22222222-2222-2222-2222-222222222247', name: 'Secret Desire', color: '#7E22CE', emoji: '🤫' },
    { id: '22222222-2222-2222-2222-222222222248', name: 'Teasing', color: '#F43F5E', emoji: '🫦' },
    { id: '22222222-2222-2222-2222-222222222249', name: 'Erotic Fantasy', color: '#BE185D', emoji: '🌹' },
    { id: '22222222-2222-2222-2222-222222222250', name: 'Kink Curious', color: '#581C87', emoji: '⛓️' },
    { id: '22222222-2222-2222-2222-222222222251', name: 'Naughty', color: '#D63384', emoji: '💄' },
    { id: '22222222-2222-2222-2222-222222222252', name: 'Yearning', color: '#F472B6', emoji: '🫀' },
];
const VENTS = [
    {
        id: '33333333-3333-3333-3333-333333333301',
        slug: 'peace2am',
        user_id: USERS[0].id,
        content: 'Morning meditation helped me find a moment of peace before the chaos of the day begins.',
        hoursAgo: 18,
        tags: ['Calm', 'Grateful', 'Peaceful'],
    },
    {
        id: '33333333-3333-3333-3333-333333333302',
        slug: 'nyte2amx',
        user_id: USERS[1].id,
        content: 'Another sleepless night. My mind just will not stop racing through every possible scenario.',
        hoursAgo: 2,
        tags: ['Anxious', 'Overwhelmed'],
    },
    {
        id: '33333333-3333-3333-3333-333333333303',
        slug: 'caff33am',
        user_id: USERS[2].id,
        content: 'Grateful for this quiet morning coffee and the sunrise painting the sky orange.',
        hoursAgo: 4,
        tags: ['Grateful', 'Happy', 'Hopeful'],
    },
    {
        id: '33333333-3333-3333-3333-333333333304',
        slug: 'wave5hmt',
        user_id: USERS[3].id,
        content: 'The ocean always knows how to wash away the heaviness. Walked the beach until I felt lighter.',
        hoursAgo: 50,
        tags: ['Calm', 'Peaceful', 'Nostalgic'],
    },
    {
        id: '33333333-3333-3333-3333-333333333305',
        slug: 'ctywr3nt',
        user_id: USERS[4].id,
        content: 'City energy is exhausting today. Too many people, too much noise, not enough air.',
        hoursAgo: 20,
        tags: ['Frustrated', 'Overwhelmed'],
    },
    {
        id: '33333333-3333-3333-3333-333333333306',
        slug: 'grw7thmx',
        user_id: USERS[5].id,
        content: 'Growth is uncomfortable. Learning to sit with difficult feelings instead of running from them.',
        hoursAgo: 80,
        tags: ['Hopeful', 'Motivated', 'Confused'],
    },
    {
        id: '33333333-3333-3333-3333-333333333307',
        slug: 'newd4awn',
        user_id: USERS[6].id,
        content: 'New day, new chances. Trying to believe that things can get better even when yesterday was hard.',
        hoursAgo: 1,
        tags: ['Hopeful', 'Motivated'],
    },
    {
        id: '33333333-3333-3333-3333-333333333308',
        slug: 'p3tmn3xw',
        user_id: USERS[7].id,
        content: 'Wrote three pages of feelings I could not say out loud. Poetry is my safest room.',
        hoursAgo: 15,
        tags: ['Sad', 'Nostalgic', 'Calm'],
    },
    {
        id: '33333333-3333-3333-3333-333333333309',
        slug: 'smawdn2x',
        user_id: USERS[0].id,
        content: 'Small wins matter. Finished a task I had been avoiding for weeks and feel surprisingly proud.',
        hoursAgo: 100,
        tags: ['Motivated', 'Happy'],
    },
    {
        id: '33333333-3333-3333-3333-333333333310',
        slug: 'n3yerm2x',
        user_id: USERS[1].id,
        content: 'Feeling lonely in a crowded room again. Wish connection felt easier sometimes.',
        hoursAgo: 48,
        tags: ['Lonely', 'Sad'],
    },
    {
        id: '33333333-3333-3333-3333-333333333311',
        slug: 'tdysght2',
        user_id: USERS[2].id,
        content: 'Today felt lighter.',
        hoursAgo: 6,
        tags: ['Happy', 'Calm'],
    },
    {
        id: '33333333-3333-3333-3333-333333333312',
        slug: 'repray2n',
        user_id: USERS[1].id,
        content: 'I keep replaying conversations from years ago like they are happening right now. Why does the mind do this at 2am? I know logically that everyone has moved on, but emotionally I am still standing in that hallway wondering what I should have said differently.',
        hoursAgo: 8,
        tags: ['Anxious', 'Nostalgic', 'Sad'],
    },
    {
        id: '33333333-3333-3333-3333-333333333313',
        slug: 'satarx2m',
        user_id: USERS[3].id,
        content: 'Salt air, cold sand, and the sound of waves until my thoughts finally went quiet. Nature therapy is real.',
        hoursAgo: 10,
        tags: ['Peaceful', 'Calm', 'Grateful'],
    },
    {
        id: '33333333-3333-3333-3333-333333333314',
        slug: 'msstrn2x',
        user_id: USERS[4].id,
        content: 'Missed my train. Late to everything. Urban life is a constant sprint.',
        hoursAgo: 3,
        tags: ['Frustrated', 'Anxious'],
    },
    {
        id: '33333333-3333-3333-3333-333333333315',
        slug: 'therapyh',
        user_id: USERS[5].id,
        content: 'Therapy homework: name the feeling without judging it. Today I named it grief, and that alone made it softer.',
        hoursAgo: 22,
        tags: ['Sad', 'Hopeful', 'Calm'],
    },
    {
        id: '33333333-3333-3333-3333-333333333316',
        slug: 'frstrun2',
        user_id: USERS[6].id,
        content: 'First run in months. Legs burned, heart raced, but I feel alive again.',
        hoursAgo: 5,
        tags: ['Motivated', 'Excited', 'Happy'],
    },
    {
        id: '33333333-3333-3333-3333-333333333317',
        slug: 'p3mstn2w',
        user_id: USERS[7].id,
        content: 'Some poems are just screams in prettier fonts. Wrote one tonight and deleted it twice before keeping a single stanza.',
        hoursAgo: 12,
        tags: ['Sad', 'Confused', 'Nostalgic'],
    },
    {
        id: '33333333-3333-3333-3333-333333333318',
        slug: 'br3ath2e',
        user_id: USERS[0].id,
        content: 'Breathed in. Breathed out. That is enough for today.',
        hoursAgo: 7,
        tags: ['Calm', 'Peaceful'],
    },
    {
        id: '33333333-3333-3333-3333-333333333319',
        slug: 'dempst2x',
        user_id: USERS[8].id,
        content: 'Testing Vent Wall with the demo account. Grateful this exists as a place to share without pressure.',
        hoursAgo: 2,
        tags: ['Grateful', 'Hopeful'],
    },
    {
        id: '33333333-3333-3333-3333-333333333320',
        slug: 'surfwave',
        user_id: USERS[3].id,
        content: 'Surfed until my arms gave out. For an hour the only thing that mattered was the next wave.',
        hoursAgo: 72,
        tags: ['Excited', 'Happy', 'Peaceful'],
    },
];
const REACTIONS = [
    { vent_id: VENTS[0].id, user_id: USERS[2].id, emoji: '🙏' },
    { vent_id: VENTS[0].id, user_id: USERS[3].id, emoji: '😌' },
    { vent_id: VENTS[0].id, user_id: USERS[6].id, emoji: '❤️' },
    { vent_id: VENTS[1].id, user_id: USERS[0].id, emoji: '🫂' },
    { vent_id: VENTS[1].id, user_id: USERS[6].id, emoji: '❤️' },
    { vent_id: VENTS[1].id, user_id: USERS[4].id, emoji: '🙏' },
    { vent_id: VENTS[1].id, user_id: USERS[7].id, emoji: '🌙' },
    { vent_id: VENTS[2].id, user_id: USERS[4].id, emoji: '☕' },
    { vent_id: VENTS[2].id, user_id: USERS[7].id, emoji: '🌅' },
    { vent_id: VENTS[2].id, user_id: USERS[0].id, emoji: '😊' },
    { vent_id: VENTS[2].id, user_id: USERS[5].id, emoji: '✨' },
    { vent_id: VENTS[3].id, user_id: USERS[1].id, emoji: '🌊' },
    { vent_id: VENTS[3].id, user_id: USERS[2].id, emoji: '🏄' },
    { vent_id: VENTS[4].id, user_id: USERS[5].id, emoji: '🤗' },
    { vent_id: VENTS[4].id, user_id: USERS[3].id, emoji: '🌃' },
    { vent_id: VENTS[5].id, user_id: USERS[6].id, emoji: '💪' },
    { vent_id: VENTS[5].id, user_id: USERS[0].id, emoji: '🌈' },
    { vent_id: VENTS[6].id, user_id: USERS[2].id, emoji: '🌟' },
    { vent_id: VENTS[6].id, user_id: USERS[1].id, emoji: '🔥' },
    { vent_id: VENTS[6].id, user_id: USERS[4].id, emoji: '💪' },
    { vent_id: VENTS[7].id, user_id: USERS[0].id, emoji: '✨' },
    { vent_id: VENTS[7].id, user_id: USERS[3].id, emoji: '📝' },
    { vent_id: VENTS[8].id, user_id: USERS[2].id, emoji: '👏' },
    { vent_id: VENTS[9].id, user_id: USERS[5].id, emoji: '🫂' },
    { vent_id: VENTS[9].id, user_id: USERS[6].id, emoji: '❤️' },
    { vent_id: VENTS[10].id, user_id: USERS[3].id, emoji: '😊' },
    { vent_id: VENTS[11].id, user_id: USERS[0].id, emoji: '🫂' },
    { vent_id: VENTS[11].id, user_id: USERS[2].id, emoji: '🙏' },
    { vent_id: VENTS[12].id, user_id: USERS[1].id, emoji: '🌊' },
    { vent_id: VENTS[13].id, user_id: USERS[5].id, emoji: '🤗' },
    { vent_id: VENTS[15].id, user_id: USERS[4].id, emoji: '🔥' },
    { vent_id: VENTS[15].id, user_id: USERS[7].id, emoji: '💪' },
    { vent_id: VENTS[17].id, user_id: USERS[6].id, emoji: '🕊️' },
    { vent_id: VENTS[18].id, user_id: USERS[0].id, emoji: '👏' },
    { vent_id: VENTS[18].id, user_id: USERS[2].id, emoji: '❤️' },
];
const COMMENTS = [
    { id: '44444444-4444-4444-4444-444444444401', vent_id: VENTS[1].id, user_id: USERS[2].id, emoji: '🫂' },
    { id: '44444444-4444-4444-4444-444444444402', vent_id: VENTS[1].id, user_id: USERS[5].id, emoji: '💙' },
    { id: '44444444-4444-4444-4444-444444444403', vent_id: VENTS[2].id, user_id: USERS[0].id, emoji: '☕' },
    { id: '44444444-4444-4444-4444-444444444404', vent_id: VENTS[2].id, user_id: USERS[4].id, emoji: '🌅' },
    { id: '44444444-4444-4444-4444-444444444405', vent_id: VENTS[6].id, user_id: USERS[1].id, emoji: '🌟' },
    { id: '44444444-4444-4444-4444-444444444406', vent_id: VENTS[6].id, user_id: USERS[3].id, emoji: '💪' },
    { id: '44444444-4444-4444-4444-444444444407', vent_id: VENTS[6].id, user_id: USERS[7].id, emoji: '✨' },
    { id: '44444444-4444-4444-4444-444444444408', vent_id: VENTS[11].id, user_id: USERS[4].id, emoji: '🫂' },
    { id: '44444444-4444-4444-4444-444444444409', vent_id: VENTS[13].id, user_id: USERS[2].id, emoji: '🤗' },
    { id: '44444444-4444-4444-4444-444444444410', vent_id: VENTS[15].id, user_id: USERS[0].id, emoji: '🔥' },
    { id: '44444444-4444-4444-4444-444444444411', vent_id: VENTS[18].id, user_id: USERS[3].id, emoji: '👏' },
    { id: '44444444-4444-4444-4444-444444444412', vent_id: VENTS[18].id, user_id: USERS[6].id, emoji: '❤️' },
];
function ventTimestamps(hoursAgo) {
    const createdAt = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);
    return {
        createdAt: createdAt.toISOString(),
        expiresAt: getWallExpiresAt(createdAt).toISOString(),
    };
}
async function seed() {
    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);
    const tagByName = Object.fromEntries(MOOD_TAGS.map((t) => [t.name, t.id]));
    let usersAdded = 0;
    let ventsSynced = 0;
    let reactionsAdded = 0;
    let commentsAdded = 0;
    for (const user of USERS) {
        const result = await query(`INSERT INTO users (id, username, email, password_hash, last_post_date, post_count_today)
       VALUES ($1, $2, $3, $4, CURRENT_DATE, 0)
       ON CONFLICT (id) DO UPDATE
         SET username = EXCLUDED.username,
             email = EXCLUDED.email
       RETURNING (xmax = 0) AS inserted`, [user.id, user.username, user.email, passwordHash]);
        if (result.rows[0]?.inserted)
            usersAdded++;
    }
    for (const tag of MOOD_TAGS) {
        await query(`INSERT INTO mood_tags (id, name, color, emoji)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO NOTHING`, [tag.id, tag.name, tag.color, tag.emoji]);
    }
    for (const vent of VENTS) {
        const { createdAt, expiresAt } = ventTimestamps(vent.hoursAgo);
        await query(`INSERT INTO vents (id, user_id, content, slug, created_at, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO UPDATE
         SET content = EXCLUDED.content,
             slug = EXCLUDED.slug,
             created_at = EXCLUDED.created_at,
             expires_at = EXCLUDED.expires_at`, [vent.id, vent.user_id, vent.content, vent.slug, createdAt, expiresAt]);
        ventsSynced++;
        await query('DELETE FROM vent_tags WHERE vent_id = $1', [vent.id]);
        for (const tagName of vent.tags) {
            await query(`INSERT INTO vent_tags (vent_id, tag_id) VALUES ($1, $2)
         ON CONFLICT DO NOTHING`, [vent.id, tagByName[tagName]]);
        }
    }
    for (const reaction of REACTIONS) {
        const result = await query(`INSERT INTO reactions (vent_id, user_id, emoji)
       VALUES ($1, $2, $3)
       ON CONFLICT (vent_id, user_id, emoji) DO NOTHING
       RETURNING id`, [reaction.vent_id, reaction.user_id, reaction.emoji]);
        if (result.rowCount)
            reactionsAdded++;
    }
    for (const comment of COMMENTS) {
        const result = await query(`INSERT INTO vent_comments (id, vent_id, user_id, emoji)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO NOTHING
       RETURNING id`, [comment.id, comment.vent_id, comment.user_id, comment.emoji]);
        if (result.rowCount)
            commentsAdded++;
    }
    const slugsBackfilled = await backfillMissingVentSlugs();
    console.log('Seed sync complete');
    console.log(`  Users added: ${usersAdded}`);
    console.log(`  Demo vents synced: ${ventsSynced}`);
    console.log(`  Reactions added: ${reactionsAdded}`);
    console.log(`  Comments added: ${commentsAdded}`);
    console.log(`  Slugs backfilled: ${slugsBackfilled}`);
    console.log(`Demo accounts: any seeded username / password "${DEMO_PASSWORD}"`);
    console.log('Quick login: demo / demo123');
    await pool.end();
}
seed().catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
});
