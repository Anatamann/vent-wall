import crypto from 'crypto'
import { Router } from 'express'
import { z } from 'zod'
import { query } from '../db.js'
import { optionalAuth, requireAuth } from '../middleware/auth.js'
import {
  MAX_WC_COMMENTS_PER_POST_NON_OP,
  MAX_WC_COMMENTS_PER_POST_OP,
  MAX_WC_WALL_POSTS_PER_USER_PER_DAY,
  MAX_WC_WALL_WRITES_PER_USER_PER_HOUR,
  MAX_GIF_COMMENTS_PER_USER_PER_HOUR,
  MIN_SUPPORTS_FOR_RELIABLE_REGION,
  WC_MEDIA_EXPIRES_AT,
} from '../constants.js'
import { createPublicId } from '../utils/ids.js'
import { resolveLocationFromRequest } from '../utils/geolocation.js'
import { ingestKlipyGif } from '../utils/media-assets.js'
import { isKlipyConfigured } from '../providers/klipy.js'
import {
  parseCommentInput,
  validateEmojiComment,
  validateGifComment,
} from '../utils/comments.js'
import {
  alreadyVotedPayload,
  assertIpBallotCaps,
  bindBallotVoteToUser,
  checkVoteAttemptLimits,
  clientIpHash,
  ensureBallotId,
  fetchCommentsForSupport,
  fetchRegionTally,
  fetchSupportByBallot,
  fetchSupportById,
  fetchSupportByUserId,
  fetchWallSupports,
  fetchWallSupportsByUserId,
  fetchWorldCupGlobeRegions,
  getGlobalStats,
  isVotingClosed,
  isWorldCupTeamId,
  mapSupportRow,
  mapWcCommentRow,
  placementFromLocation,
  readBallotId,
  setBallotCookie,
} from '../utils/worldcup.js'

const router = Router()

const voteSchema = z.object({
  team_id: z.string().refine(isWorldCupTeamId, { message: 'Invalid team' }),
  contribute_to_globe: z.boolean().optional().default(true),
})

const wallPostSchema = z
  .object({
    team_id: z.string().refine(isWorldCupTeamId, { message: 'Invalid team' }).optional(),
    content: z.string().max(500).optional().default(''),
    gif_id: z.string().trim().optional(),
    contribute_to_globe: z.boolean().optional().default(true),
  })
  .superRefine((data, ctx) => {
    const hasText = data.content.trim().length > 0
    const hasGif = Boolean(data.gif_id?.trim())
    if (!hasText && !hasGif) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Add text, a GIF, or both',
      })
    }
  })

router.get('/teams', async (_req, res) => {
  try {
    const result = await query(
      `SELECT id, name, emoji, color FROM worldcup_teams ORDER BY id`
    )
    return res.json(result.rows)
  } catch (err) {
    console.error('WorldCup teams error:', err)
    return res.status(500).json({ error: 'Failed to load teams' })
  }
})

router.get('/stats', async (_req, res) => {
  try {
    return res.json(await getGlobalStats())
  } catch (err) {
    console.error('WorldCup stats error:', err)
    return res.status(500).json({ error: 'Failed to load stats' })
  }
})

router.get('/me', optionalAuth, async (req, res) => {
  try {
    let ballotId = readBallotId(req)
    const userId = req.user?.userId ?? null
    let wallPostsToday = 0
    let wallPosts: ReturnType<typeof mapSupportRow>[] = []
    if (userId) {
      const dayCount = await query<{ count: number }>(
        `SELECT COUNT(*)::int AS count FROM worldcup_supports
         WHERE user_id = $1
           AND is_wall_post = true
           AND wall_published_at IS NOT NULL
           AND (wall_published_at AT TIME ZONE 'UTC')::date = (now() AT TIME ZONE 'UTC')::date`,
        [userId]
      )
      wallPostsToday = dayCount.rows[0]?.count ?? 0
      const posts = await fetchWallSupportsByUserId(userId, { limit: 50 })
      wallPosts = posts.map(mapSupportRow)
    }

    // Registered users: account vote is canonical and immutable.
    if (userId) {
      let userVote = await fetchSupportByUserId(userId)
      if (!userVote && ballotId) {
        // First login after anonymous cast → bind this ballot to the account.
        userVote = await bindBallotVoteToUser(ballotId, userId)
      }
      if (userVote) {
        if (userVote.ballot_id) {
          setBallotCookie(res, userVote.ballot_id)
          ballotId = userVote.ballot_id
        }
        return res.json({
          support: mapSupportRow(userVote),
          wall_posts: wallPosts,
          ballot_id: ballotId,
          voting_closed: isVotingClosed(),
          wall_posts_today: wallPostsToday,
          max_wall_posts_per_day: MAX_WC_WALL_POSTS_PER_USER_PER_DAY,
          vote_bound_to_account: true,
        })
      }
    }

    if (!ballotId) {
      return res.json({
        support: null,
        wall_posts: wallPosts,
        ballot_id: null,
        voting_closed: isVotingClosed(),
        wall_posts_today: wallPostsToday,
        max_wall_posts_per_day: MAX_WC_WALL_POSTS_PER_USER_PER_DAY,
        vote_bound_to_account: false,
      })
    }

    const row = await fetchSupportByBallot(ballotId)
    return res.json({
      support: row ? mapSupportRow(row) : null,
      wall_posts: wallPosts,
      ballot_id: ballotId,
      voting_closed: isVotingClosed(),
      wall_posts_today: wallPostsToday,
      max_wall_posts_per_day: MAX_WC_WALL_POSTS_PER_USER_PER_DAY,
      vote_bound_to_account: Boolean(userId && row?.user_id === userId),
    })
  } catch (err) {
    console.error('WorldCup me error:', err)
    return res.status(500).json({ error: 'Failed to load ballot' })
  }
})

router.get('/supports', async (req, res) => {
  try {
    const team =
      typeof req.query.team === 'string' && isWorldCupTeamId(req.query.team)
        ? req.query.team
        : undefined
    const offset = Math.max(0, Number(req.query.offset || 0) || 0)
    const limit = Math.min(Math.max(1, Number(req.query.limit || 20) || 20), 50)

    const rows = await fetchWallSupports({ teamId: team, offset, limit })
    return res.json(rows.map(mapSupportRow))
  } catch (err) {
    console.error('WorldCup supports list error:', err)
    return res.status(500).json({ error: 'Failed to load supports' })
  }
})

router.get('/supports/:id', async (req, res) => {
  try {
    const row = await fetchSupportById(req.params.id)
    if (!row || !row.is_wall_post) {
      return res.status(404).json({ error: 'Support post not found' })
    }
    return res.json(mapSupportRow(row))
  } catch (err) {
    console.error('WorldCup support get error:', err)
    return res.status(500).json({ error: 'Failed to load support' })
  }
})

/**
 * Cast support.
 * - Anonymous: ballot cookie identity (IP-capped).
 * - Logged in: vote is permanently bound to user_id; cannot change team ever.
 */
router.post('/supports/vote', optionalAuth, async (req, res) => {
  const parsed = voteSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.errors[0]?.message || 'Invalid input' })
  }

  if (isVotingClosed()) {
    return res.status(403).json({ error: 'Voting is closed' })
  }

  try {
    const userId = req.user?.userId ?? null
    let ballotId = ensureBallotId(req, res)
    const ipHash = clientIpHash(req)
    const requestedTeam = parsed.data.team_id

    // ── Account-bound vote wins over browser ballot ───────────────────────
    if (userId) {
      const userVote = await fetchSupportByUserId(userId)
      if (userVote) {
        if (userVote.ballot_id) {
          setBallotCookie(res, userVote.ballot_id)
          ballotId = userVote.ballot_id
        }
        // Optional geo backfill on re-click
        let row = userVote
        if (
          row.contribute_to_globe &&
          (row.location_lat == null || row.location_lng == null)
        ) {
          const location = await resolveLocationFromRequest(req)
          if (location.lat != null && location.lng != null) {
            await query(
              `UPDATE worldcup_supports SET
                 location_country_code = $1, location_country = $2,
                 location_state = $3, location_city = $4,
                 location_lat = $5, location_lng = $6
               WHERE id = $7`,
              [
                location.countryCode,
                location.country,
                location.state,
                location.city,
                location.lat,
                location.lng,
                row.id,
              ]
            )
            row = (await fetchSupportById(row.id)) || row
          }
        }
        return res.status(409).json(
          alreadyVotedPayload(
            row,
            ballotId,
            row.team_id === requestedTeam
              ? 'You already support this team. Your registered vote cannot be changed.'
              : `Your registered vote is locked to ${row.team_id === 'spain' ? 'Spain' : 'Argentina'} and cannot be changed.`
          )
        )
      }
    }

    // Prefer existing ballot over rate limits so re-clicks don't burn quotas.
    let existing = await fetchSupportByBallot(ballotId)
    if (existing && userId && existing.user_id && existing.user_id !== userId) {
      // Ballot owned by another account — mint a fresh ballot for this user.
      ballotId = crypto.randomUUID()
      setBallotCookie(res, ballotId)
      existing = null
    }

    if (existing) {
      // Logged-in user with no account vote yet → claim this ballot permanently.
      if (userId && !existing.user_id) {
        await query(`UPDATE worldcup_supports SET user_id = $1 WHERE id = $2 AND user_id IS NULL`, [
          userId,
          existing.id,
        ])
        existing = (await fetchSupportById(existing.id)) || existing
      }

      if (
        existing.contribute_to_globe &&
        (existing.location_lat == null || existing.location_lng == null)
      ) {
        const location = await resolveLocationFromRequest(req)
        if (location.lat != null && location.lng != null) {
          await query(
            `UPDATE worldcup_supports SET
               location_country_code = $1, location_country = $2,
               location_state = $3, location_city = $4,
               location_lat = $5, location_lng = $6
             WHERE id = $7`,
            [
              location.countryCode,
              location.country,
              location.state,
              location.city,
              location.lat,
              location.lng,
              existing.id,
            ]
          )
          existing = (await fetchSupportById(existing.id)) || existing
        }
      }

      return res.status(409).json(alreadyVotedPayload(existing, ballotId))
    }

    const attemptErr = checkVoteAttemptLimits(ballotId, ipHash)
    if (attemptErr) {
      return res.status(429).json({ error: attemptErr })
    }

    const capErr = await assertIpBallotCaps(ipHash)
    if (capErr) {
      return res.status(429).json({ error: capErr })
    }

    const contribute = parsed.data.contribute_to_globe !== false
    const location = contribute
      ? await resolveLocationFromRequest(req)
      : {
          countryCode: null,
          country: null,
          state: null,
          city: null,
          lat: null,
          lng: null,
        }

    const id = await createPublicId('s', 'worldcup_supports')
    await query(
      `INSERT INTO worldcup_supports (
         id, ballot_id, user_id, team_id, contribute_to_globe,
         location_country_code, location_country, location_state, location_city,
         location_lat, location_lng, ip_hash, is_wall_post
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,false)`,
      [
        id,
        ballotId,
        userId,
        requestedTeam,
        contribute,
        location.countryCode,
        location.country,
        location.state,
        location.city,
        location.lat,
        location.lng,
        ipHash,
      ]
    )

    const row = await fetchSupportById(id)
    const placed = placementFromLocation(location)
    return res.status(201).json({
      support: row ? mapSupportRow(row) : { id, team_id: requestedTeam },
      ballot_id: ballotId,
      placed,
      vote_bound_to_account: Boolean(userId),
    })
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === '23505') {
      // Unique index on user_id (account already voted) or ballot_id
      const userId = req.user?.userId
      if (userId) {
        const userVote = await fetchSupportByUserId(userId)
        if (userVote) {
          if (userVote.ballot_id) setBallotCookie(res, userVote.ballot_id)
          return res.status(409).json(
            alreadyVotedPayload(
              userVote,
              userVote.ballot_id,
              'Your registered vote is locked and cannot be changed.'
            )
          )
        }
      }
      return res.status(409).json({ error: 'You already cast your support.', code: 'ALREADY_VOTED' })
    }
    console.error('WorldCup vote error:', err)
    return res.status(500).json({ error: 'Failed to cast support' })
  }
})

/** Authenticated wall publish — attach to ballot vote or create vote+post. */
router.post('/supports', requireAuth, async (req, res) => {
  const parsed = wallPostSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.errors[0]?.message || 'Invalid input' })
  }

  if (isVotingClosed()) {
    return res.status(403).json({ error: 'Voting is closed' })
  }

  const userId = req.user!.userId
  const trimmedContent = parsed.data.content.trim()
  const gifId = parsed.data.gif_id?.trim() || null
  const contribute = parsed.data.contribute_to_globe !== false

  try {
    const postsToday = await query<{ count: number }>(
      `SELECT COUNT(*)::int AS count FROM worldcup_supports
       WHERE user_id = $1
         AND is_wall_post = true
         AND wall_published_at IS NOT NULL
         AND (wall_published_at AT TIME ZONE 'UTC')::date = (now() AT TIME ZONE 'UTC')::date`,
      [userId]
    )
    const wallPostsToday = postsToday.rows[0]?.count ?? 0
    if (wallPostsToday >= MAX_WC_WALL_POSTS_PER_USER_PER_DAY) {
      return res.status(429).json({
        error: `You can only publish ${MAX_WC_WALL_POSTS_PER_USER_PER_DAY} World Cup wall posts per day. Try again tomorrow.`,
        code: 'WC_WALL_DAILY_LIMIT',
        wall_posts_today: wallPostsToday,
        max_wall_posts_per_day: MAX_WC_WALL_POSTS_PER_USER_PER_DAY,
      })
    }

    const hourly = await query<{ count: number }>(
      `SELECT COUNT(*)::int AS count FROM worldcup_supports
       WHERE user_id = $1 AND is_wall_post = true
         AND wall_published_at > now() - INTERVAL '1 hour'`,
      [userId]
    )
    if ((hourly.rows[0]?.count ?? 0) >= MAX_WC_WALL_WRITES_PER_USER_PER_HOUR) {
      return res.status(429).json({ error: 'Wall post limit reached. Try again later.' })
    }

    let ballotId = ensureBallotId(req, res)
    let accountVote = await fetchSupportByUserId(userId)
    if (accountVote?.ballot_id) {
      setBallotCookie(res, accountVote.ballot_id)
      ballotId = accountVote.ballot_id
    }

    let ballotVote = await fetchSupportByBallot(ballotId)
    if (!accountVote && ballotVote && !ballotVote.user_id) {
      accountVote = await bindBallotVoteToUser(ballotId, userId)
      ballotVote = accountVote
    }

    let assetId: string | null = null
    if (gifId) {
      const gifValidation = validateGifComment(gifId)
      if (!gifValidation.valid) {
        return res.status(400).json({ error: gifValidation.error })
      }
      if (!isKlipyConfigured()) {
        return res.status(503).json({ error: 'GIF posts are not configured.' })
      }
      const asset = await ingestKlipyGif({
        externalId: gifId,
        expiresAt: WC_MEDIA_EXPIRES_AT,
      })
      assetId = asset.id
    }

    // First wall body on the account/ballot vote row (still one vote).
    const primaryVote = accountVote || ballotVote
    if (primaryVote && !primaryVote.is_wall_post) {
      await query(
        `UPDATE worldcup_supports SET
           user_id = $1,
           content = $2,
           asset_id = $3,
           is_wall_post = true,
           wall_published_at = now(),
           contribute_to_globe = COALESCE($4, contribute_to_globe)
         WHERE id = $5`,
        [userId, trimmedContent || null, assetId, contribute, primaryVote.id]
      )
      const row = await fetchSupportById(primaryVote.id)
      return res.status(200).json(row ? mapSupportRow(row) : { id: primaryVote.id })
    }

    // Additional wall posts (or first post that also creates a vote).
    const lockedTeam = primaryVote?.team_id
    const teamId = lockedTeam ?? parsed.data.team_id
    if (!teamId || !isWorldCupTeamId(teamId)) {
      return res.status(400).json({ error: 'team_id is required when casting a new support' })
    }
    if (parsed.data.team_id && parsed.data.team_id !== teamId) {
      return res.status(409).json({
        error: 'Your registered vote is locked. Wall posts must match your supported team.',
        code: 'TEAM_LOCKED',
        support: primaryVote ? mapSupportRow(primaryVote) : undefined,
      })
    }

    const ipHash = clientIpHash(req)

    // Only enforce new-ballot / IP caps when this write also creates the vote row.
    if (!primaryVote) {
      const attemptErr = checkVoteAttemptLimits(ballotId, ipHash)
      if (attemptErr) {
        return res.status(429).json({ error: attemptErr })
      }
      const capErr = await assertIpBallotCaps(ipHash)
      if (capErr) {
        return res.status(429).json({ error: capErr })
      }
    }

    const location = contribute
      ? await resolveLocationFromRequest(req)
      : {
          countryCode: null,
          country: null,
          state: null,
          city: null,
          lat: null,
          lng: null,
        }

    const id = await createPublicId('s', 'worldcup_supports')
    // Additional posts: ballot_id NULL so they do not create a second vote.
    // First-ever vote+post: ballot_id set (one vote).
    const insertBallotId = primaryVote ? null : ballotId

    await query(
      `INSERT INTO worldcup_supports (
         id, ballot_id, user_id, team_id, content, asset_id,
         is_wall_post, contribute_to_globe,
         location_country_code, location_country, location_state, location_city,
         location_lat, location_lng, ip_hash, wall_published_at
       ) VALUES ($1,$2,$3,$4,$5,$6,true,$7,$8,$9,$10,$11,$12,$13,$14,now())`,
      [
        id,
        insertBallotId,
        userId,
        teamId,
        trimmedContent || null,
        assetId,
        contribute,
        location.countryCode,
        location.country,
        location.state,
        location.city,
        location.lat,
        location.lng,
        ipHash,
      ]
    )

    const row = await fetchSupportById(id)
    return res.status(201).json(row ? mapSupportRow(row) : { id })
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === '23505') {
      return res.status(409).json({ error: 'You already cast your support.', code: 'ALREADY_VOTED' })
    }
    console.error('WorldCup wall post error:', err)
    return res.status(500).json({ error: 'Failed to publish support' })
  }
})

router.get('/supports/:id/comments', async (req, res) => {
  try {
    const support = await fetchSupportById(req.params.id)
    if (!support || !support.is_wall_post) {
      return res.status(404).json({ error: 'Support post not found' })
    }
    const comments = await fetchCommentsForSupport(support.id)
    return res.json({
      comments: comments.map(mapWcCommentRow),
      comments_open: true,
    })
  } catch (err) {
    console.error('WorldCup comments list error:', err)
    return res.status(500).json({ error: 'Failed to load comments' })
  }
})

router.post('/supports/:id/comments', requireAuth, async (req, res) => {
  const parsed = parseCommentInput(req.body as Record<string, unknown>)
  if (!parsed) {
    return res.status(400).json({ error: 'Invalid comment payload' })
  }

  const userId = req.user!.userId

  try {
    const support = await fetchSupportById(req.params.id)
    if (!support || !support.is_wall_post) {
      return res.status(404).json({ error: 'Support post not found' })
    }

    const isOwner = support.user_id === userId
    const limit = isOwner ? MAX_WC_COMMENTS_PER_POST_OP : MAX_WC_COMMENTS_PER_POST_NON_OP

    const countResult = await query<{ count: number }>(
      `SELECT COUNT(*)::int AS count FROM worldcup_support_comments
       WHERE support_id = $1 AND user_id = $2`,
      [support.id, userId]
    )
    if ((countResult.rows[0]?.count ?? 0) >= limit) {
      return res.status(429).json({
        error: `You can only add up to ${limit} comments per post`,
        code: 'COMMENT_LIMIT_REACHED',
      })
    }

    let assetId: string | null = null
    let emoji: string | null = null
    let commentType: 'emoji' | 'gif' = 'emoji'

    if (parsed.type === 'emoji') {
      const validation = validateEmojiComment(parsed.emoji)
      if (!validation.valid) {
        return res.status(400).json({ error: validation.error })
      }
      emoji = parsed.emoji
    } else {
      const gifValidation = validateGifComment(parsed.gif_id)
      if (!gifValidation.valid) {
        return res.status(400).json({ error: gifValidation.error })
      }
      if (!isKlipyConfigured()) {
        return res.status(503).json({ error: 'GIF comments are not configured.' })
      }
      const gifHourly = await query<{ count: number }>(
        `SELECT COUNT(*)::int AS count FROM worldcup_support_comments
         WHERE user_id = $1 AND comment_type = 'gif'
           AND created_at > now() - INTERVAL '1 hour'`,
        [userId]
      )
      if ((gifHourly.rows[0]?.count ?? 0) >= MAX_GIF_COMMENTS_PER_USER_PER_HOUR) {
        return res.status(429).json({ error: 'GIF comment limit reached. Try again later.' })
      }
      const asset = await ingestKlipyGif({
        externalId: parsed.gif_id,
        expiresAt: WC_MEDIA_EXPIRES_AT,
      })
      assetId = asset.id
      commentType = 'gif'
    }

    const commentId = await createPublicId('k', 'worldcup_support_comments')
    await query(
      `INSERT INTO worldcup_support_comments (id, support_id, user_id, comment_type, emoji, asset_id)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [commentId, support.id, userId, commentType, emoji, assetId]
    )

    const comments = await fetchCommentsForSupport(support.id)
    const created = comments.find((c) => c.id === commentId)

    return res.status(201).json({
      comment: created ? mapWcCommentRow(created) : { id: commentId },
    })
  } catch (err) {
    console.error('WorldCup comment create error:', err)
    return res.status(500).json({ error: 'Failed to add comment' })
  }
})

router.get('/globe/data', async (_req, res) => {
  try {
    const regions = await fetchWorldCupGlobeRegions()
    return res.json({
      window: 'all-time',
      minVentsForReliable: MIN_SUPPORTS_FOR_RELIABLE_REGION,
      regions,
      activeCount: regions.length,
    })
  } catch (err) {
    console.error('WorldCup globe data error:', err)
    return res.status(500).json({ error: 'Failed to load globe data' })
  }
})

router.get('/globe/regions/:regionKey', async (req, res) => {
  try {
    const regionKey = decodeURIComponent(req.params.regionKey || '')
    const tally = await fetchRegionTally(regionKey)
    if (!tally) {
      return res.status(400).json({ error: 'Invalid region key' })
    }
    return res.json(tally)
  } catch (err) {
    console.error('WorldCup region tally error:', err)
    return res.status(500).json({ error: 'Failed to load region tally' })
  }
})

export default router
