import crypto from 'crypto'
import type { Request, Response } from 'express'
import { query } from '../db.js'
import {
  MAX_NEW_BALLOTS_PER_IP_HASH_EVENT,
  MAX_NEW_BALLOTS_PER_IP_HASH_PER_DAY,
  MAX_VOTE_ATTEMPTS_PER_BALLOT_HOUR,
  MAX_VOTE_ATTEMPTS_PER_IP_HASH_HOUR,
  MIN_SUPPORTS_FOR_RELIABLE_REGION,
  WC_BALLOT_COOKIE,
  WORLDCUP_TEAMS,
  type WorldCupTeamId,
} from '../constants.js'
import { buildAvatarUrl } from './avatar-assets.js'
import { buildRegionKey, parseRegionKey } from './geolocation.js'
import { resolveRegionCenter } from '../data/state-centers.js'
import { hashClientIp } from './ip.js'

const TEAM_SET = new Set<string>(WORLDCUP_TEAMS)

export function isWorldCupTeamId(value: string): value is WorldCupTeamId {
  return TEAM_SET.has(value)
}

export function isVotingClosed(): boolean {
  return process.env.WORLDCUP_VOTING_CLOSED === 'true'
}

/** In-memory attempt counters (process-local; fine for single-node MVP). */
const attemptBuckets = new Map<string, { count: number; resetAt: number }>()

function bumpAttempt(key: string, max: number): boolean {
  const now = Date.now()
  const hour = 60 * 60 * 1000
  const existing = attemptBuckets.get(key)
  if (!existing || existing.resetAt <= now) {
    attemptBuckets.set(key, { count: 1, resetAt: now + hour })
    return true
  }
  if (existing.count >= max) return false
  existing.count += 1
  return true
}

export function checkVoteAttemptLimits(ballotId: string, ipHash: string): string | null {
  if (!bumpAttempt(`ballot:${ballotId}`, MAX_VOTE_ATTEMPTS_PER_BALLOT_HOUR)) {
    return 'Too many vote attempts. Please try again later.'
  }
  if (!bumpAttempt(`ip:${ipHash}`, MAX_VOTE_ATTEMPTS_PER_IP_HASH_HOUR)) {
    return 'Too many votes from this network. Please try again later.'
  }
  return null
}

function isValidBallotId(value: string): boolean {
  return /^[a-f0-9-]{36}$/i.test(value) || /^[a-zA-Z0-9_-]{16,64}$/.test(value)
}

export function readBallotId(req: Request): string | null {
  // SPA can resend ballot via header when cookies are flaky (proxy / privacy mode).
  const header = req.headers['x-wc-ballot-id']
  if (typeof header === 'string') {
    const value = header.trim()
    if (isValidBallotId(value)) return value
  }

  const raw = req.headers.cookie || ''
  const parts = raw.split(';').map((p) => p.trim())
  for (const part of parts) {
    if (part.startsWith(`${WC_BALLOT_COOKIE}=`)) {
      const value = decodeURIComponent(part.slice(WC_BALLOT_COOKIE.length + 1))
      if (isValidBallotId(value)) return value
    }
  }
  return null
}

export function setBallotCookie(res: Response, ballotId: string) {
  const maxAge = 60 * 60 * 24 * 400 // ~400 days
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : ''
  res.append(
    'Set-Cookie',
    `${WC_BALLOT_COOKIE}=${encodeURIComponent(ballotId)}; Path=/; Max-Age=${maxAge}; HttpOnly; SameSite=Lax${secure}`
  )
}

export function ensureBallotId(req: Request, res: Response): string {
  const existing = readBallotId(req)
  if (existing) {
    // Refresh cookie so browser always holds the active ballot.
    setBallotCookie(res, existing)
    return existing
  }

  const ballotId = crypto.randomUUID()
  setBallotCookie(res, ballotId)
  return ballotId
}

export function placementFromLocation(location: {
  countryCode: string | null
  country: string | null
  state: string | null
  lat: number | null
  lng: number | null
}) {
  if (location.lat == null || location.lng == null || !location.countryCode) {
    return null
  }
  const regionKey = buildRegionKey(location.countryCode, location.state)
  const label = [location.state, location.country || location.countryCode].filter(Boolean).join(', ')
  return {
    regionKey,
    label: label || regionKey,
    countryCode: location.countryCode,
    state: location.state,
    lat: location.lat,
    lng: location.lng,
  }
}

export async function countNewBallotsForIp(ipHash: string, sinceIso: string): Promise<number> {
  const result = await query<{ count: number }>(
    `SELECT COUNT(*)::int AS count FROM worldcup_supports
     WHERE ip_hash = $1 AND created_at >= $2::timestamptz`,
    [ipHash, sinceIso]
  )
  return result.rows[0]?.count ?? 0
}

export async function assertIpBallotCaps(ipHash: string): Promise<string | null> {
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const dayCount = await countNewBallotsForIp(ipHash, dayAgo)
  if (dayCount >= MAX_NEW_BALLOTS_PER_IP_HASH_PER_DAY) {
    return 'Too many votes from this network today. Try again tomorrow or another connection.'
  }

  const eventCount = await countNewBallotsForIp(ipHash, '2026-01-01T00:00:00.000Z')
  if (eventCount >= MAX_NEW_BALLOTS_PER_IP_HASH_EVENT) {
    return 'Vote limit reached for this network.'
  }

  return null
}

export function clientIpHash(req: Request): string {
  return hashClientIp(req)
}

export interface SupportRow {
  id: string
  ballot_id: string | null
  user_id: string | null
  team_id: string
  content: string | null
  asset_id: string | null
  is_wall_post: boolean
  contribute_to_globe: boolean
  location_country_code: string | null
  location_country: string | null
  location_state: string | null
  location_city: string | null
  location_lat: number | null
  location_lng: number | null
  created_at: string
  wall_published_at: string | null
  username: string | null
  status: string | null
  avatar_path: string | null
  avatar_updated_at: string | null
  team_name: string
  team_emoji: string
  team_color: string
  asset_preview_url: string | null
  asset_width: number | null
  asset_height: number | null
  comment_count: number
}

const SUPPORT_SELECT = `
  s.id,
  s.ballot_id,
  s.user_id,
  s.team_id,
  s.content,
  s.asset_id,
  s.is_wall_post,
  s.contribute_to_globe,
  s.location_country_code,
  s.location_country,
  s.location_state,
  s.location_city,
  s.location_lat,
  s.location_lng,
  s.created_at,
  s.wall_published_at,
  u.username,
  u.status,
  u.avatar_path,
  u.avatar_updated_at,
  t.name AS team_name,
  t.emoji AS team_emoji,
  t.color AS team_color,
  a.preview_url AS asset_preview_url,
  a.width AS asset_width,
  a.height AS asset_height,
  (SELECT COUNT(*)::int FROM worldcup_support_comments c WHERE c.support_id = s.id) AS comment_count
`

export function mapSupportRow(row: SupportRow) {
  return {
    id: row.id,
    slug: row.id,
    team_id: row.team_id,
    team: {
      id: row.team_id,
      name: row.team_name,
      emoji: row.team_emoji,
      color: row.team_color,
    },
    content: row.content || '',
    is_wall_post: row.is_wall_post,
    contribute_to_globe: row.contribute_to_globe,
    created_at: row.created_at,
    wall_published_at: row.wall_published_at,
    comment_count: row.comment_count,
    user: row.user_id
      ? {
          id: row.user_id,
          username: row.username || 'Anonymous',
          status: row.status ?? null,
          avatar_url: buildAvatarUrl(row.user_id, row.avatar_path, row.avatar_updated_at),
        }
      : null,
    asset:
      row.asset_id
        ? {
            id: row.asset_id,
            preview_url: row.asset_preview_url,
            width: row.asset_width,
            height: row.asset_height,
            url: `/api/media/assets/${row.asset_id}`,
          }
        : null,
  }
}

export async function fetchWallSupports(options: {
  teamId?: string
  offset: number
  limit: number
}): Promise<SupportRow[]> {
  const params: unknown[] = []
  const where = ['s.is_wall_post = true']

  if (options.teamId && isWorldCupTeamId(options.teamId)) {
    params.push(options.teamId)
    where.push(`s.team_id = $${params.length}`)
  }

  params.push(options.limit, options.offset)

  const result = await query<SupportRow>(
    `
    SELECT ${SUPPORT_SELECT}
    FROM worldcup_supports s
    JOIN worldcup_teams t ON t.id = s.team_id
    LEFT JOIN users u ON u.id = s.user_id
    LEFT JOIN media_assets a ON a.id = s.asset_id
    WHERE ${where.join(' AND ')}
    ORDER BY COALESCE(s.wall_published_at, s.created_at) DESC
    LIMIT $${params.length - 1} OFFSET $${params.length}
    `,
    params
  )

  return result.rows
}

/** Wall posts published by a registered user (profile / “my Finals posts”). */
export async function fetchWallSupportsByUserId(
  userId: string,
  options: { limit?: number; offset?: number } = {}
): Promise<SupportRow[]> {
  const limit = Math.min(Math.max(1, options.limit ?? 40), 100)
  const offset = Math.max(0, options.offset ?? 0)
  const result = await query<SupportRow>(
    `
    SELECT ${SUPPORT_SELECT}
    FROM worldcup_supports s
    JOIN worldcup_teams t ON t.id = s.team_id
    LEFT JOIN users u ON u.id = s.user_id
    LEFT JOIN media_assets a ON a.id = s.asset_id
    WHERE s.user_id = $1
      AND s.is_wall_post = true
    ORDER BY COALESCE(s.wall_published_at, s.created_at) DESC
    LIMIT $2 OFFSET $3
    `,
    [userId, limit, offset]
  )
  return result.rows
}

export async function fetchSupportById(id: string): Promise<SupportRow | null> {
  const result = await query<SupportRow>(
    `
    SELECT ${SUPPORT_SELECT}
    FROM worldcup_supports s
    JOIN worldcup_teams t ON t.id = s.team_id
    LEFT JOIN users u ON u.id = s.user_id
    LEFT JOIN media_assets a ON a.id = s.asset_id
    WHERE s.id = $1
    LIMIT 1
    `,
    [id]
  )
  return result.rows[0] ?? null
}

export async function fetchSupportByBallot(ballotId: string): Promise<SupportRow | null> {
  const result = await query<SupportRow>(
    `
    SELECT ${SUPPORT_SELECT}
    FROM worldcup_supports s
    JOIN worldcup_teams t ON t.id = s.team_id
    LEFT JOIN users u ON u.id = s.user_id
    LEFT JOIN media_assets a ON a.id = s.asset_id
    WHERE s.ballot_id = $1
    LIMIT 1
    `,
    [ballotId]
  )
  return result.rows[0] ?? null
}

/**
 * Canonical vote for a registered user: ballot-backed row with their user_id.
 * Earliest row wins if historical duplicates exist before the unique index.
 */
export async function fetchSupportByUserId(userId: string): Promise<SupportRow | null> {
  const result = await query<SupportRow>(
    `
    SELECT ${SUPPORT_SELECT}
    FROM worldcup_supports s
    JOIN worldcup_teams t ON t.id = s.team_id
    LEFT JOIN users u ON u.id = s.user_id
    LEFT JOIN media_assets a ON a.id = s.asset_id
    WHERE s.user_id = $1
      AND s.ballot_id IS NOT NULL
    ORDER BY s.created_at ASC
    LIMIT 1
    `,
    [userId]
  )
  return result.rows[0] ?? null
}

/** Bind an unbound ballot vote to a user (first login after anonymous cast). */
export async function bindBallotVoteToUser(
  ballotId: string,
  userId: string
): Promise<SupportRow | null> {
  const owned = await fetchSupportByUserId(userId)
  if (owned) return owned

  await query(
    `UPDATE worldcup_supports
     SET user_id = $1
     WHERE ballot_id = $2
       AND user_id IS NULL
       AND ballot_id IS NOT NULL`,
    [userId, ballotId]
  )
  return fetchSupportByUserId(userId)
}

export function alreadyVotedPayload(
  row: SupportRow,
  ballotId: string | null,
  message = 'You already cast your support. Registered votes cannot be changed.'
) {
  return {
    error: message,
    code: 'ALREADY_VOTED' as const,
    ballot_id: ballotId || row.ballot_id,
    support: mapSupportRow(row),
    placed: placementFromLocation({
      countryCode: row.location_country_code,
      country: row.location_country,
      state: row.location_state,
      lat: row.location_lat,
      lng: row.location_lng,
    }),
  }
}

/**
 * Vote tallies only count ballot-backed rows (one immutable vote per ballot).
 * Extra wall posts share the same team but use ballot_id NULL so they do not inflate votes.
 */
const VOTE_ROW_SQL = `ballot_id IS NOT NULL`

export async function getGlobalStats() {
  const result = await query<{ team_id: string; votes: number }>(
    `SELECT team_id, COUNT(*)::int AS votes
     FROM worldcup_supports
     WHERE ${VOTE_ROW_SQL}
     GROUP BY team_id`
  )

  const teams = await query<{ id: string; name: string; emoji: string; color: string }>(
    `SELECT id, name, emoji, color FROM worldcup_teams ORDER BY id`
  )

  const countMap = new Map(result.rows.map((r) => [r.team_id, r.votes]))
  const teamStats = teams.rows.map((t) => ({
    id: t.id,
    name: t.name,
    emoji: t.emoji,
    color: t.color,
    votes: countMap.get(t.id) ?? 0,
  }))

  const total = teamStats.reduce((sum, t) => sum + t.votes, 0)

  return {
    total,
    teams: teamStats.map((t) => ({
      ...t,
      percent: total > 0 ? Math.round((t.votes / total) * 1000) / 10 : 0,
    })),
    voting_closed: isVotingClosed(),
  }
}

export interface WorldCupGlobeRegion {
  regionKey: string
  state: string | null
  country: string | null
  countryCode: string | null
  lat: number
  lng: number
  leadingTeamId: string | null
  leadingEmoji: string
  isTied: boolean
  isReliable: boolean
  isEmpty: boolean
  total: number
  spainCount: number
  argentinaCount: number
}

export async function fetchWorldCupGlobeRegions(): Promise<WorldCupGlobeRegion[]> {
  const result = await query<{
    country_code: string | null
    country: string | null
    state: string | null
    avg_lat: number | null
    avg_lng: number | null
    total: number
    spain_count: number
    argentina_count: number
  }>(
    `
    SELECT
      location_country_code AS country_code,
      MAX(location_country) AS country,
      location_state AS state,
      AVG(location_lat) AS avg_lat,
      AVG(location_lng) AS avg_lng,
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE team_id = 'spain')::int AS spain_count,
      COUNT(*) FILTER (WHERE team_id = 'argentina')::int AS argentina_count
    FROM worldcup_supports
    WHERE ${VOTE_ROW_SQL}
      AND contribute_to_globe = true
      AND location_lat IS NOT NULL
      AND location_lng IS NOT NULL
      AND location_country_code IS NOT NULL
    GROUP BY location_country_code, location_state
    `
  )

  const regions: WorldCupGlobeRegion[] = []

  for (const row of result.rows) {
    const regionKey = buildRegionKey(row.country_code, row.state)
    if (!regionKey) continue

    const center = resolveRegionCenter({
      countryCode: row.country_code,
      state: row.state,
      avgLat: row.avg_lat,
      avgLng: row.avg_lng,
    })
    const lat = center?.lat ?? row.avg_lat
    const lng = center?.lng ?? row.avg_lng
    if (lat == null || lng == null) continue

    const spainCount = row.spain_count
    const argentinaCount = row.argentina_count
    const total = row.total
    const isTied = spainCount === argentinaCount
    let leadingTeamId: string | null = null
    let leadingEmoji = '⚖️'
    if (!isTied) {
      if (spainCount > argentinaCount) {
        leadingTeamId = 'spain'
        leadingEmoji = '🇪🇸'
      } else {
        leadingTeamId = 'argentina'
        leadingEmoji = '🇦🇷'
      }
    }

    regions.push({
      regionKey,
      state: row.state,
      country: row.country,
      countryCode: row.country_code,
      lat,
      lng,
      leadingTeamId,
      leadingEmoji,
      isTied,
      isReliable: total >= MIN_SUPPORTS_FOR_RELIABLE_REGION,
      isEmpty: false,
      total,
      spainCount,
      argentinaCount,
    })
  }

  return regions
}

export async function fetchRegionTally(regionKey: string) {
  const parsed = parseRegionKey(regionKey)
  if (!parsed) return null

  const params: unknown[] = [parsed.countryCode]
  let stateClause = 'location_state IS NULL'
  if (parsed.state) {
    params.push(parsed.state)
    stateClause = `location_state = $${params.length}`
  }

  const result = await query<{ team_id: string; votes: number }>(
    `
    SELECT team_id, COUNT(*)::int AS votes
    FROM worldcup_supports
    WHERE ${VOTE_ROW_SQL}
      AND contribute_to_globe = true
      AND location_country_code = $1
      AND ${stateClause}
    GROUP BY team_id
    `,
    params
  )

  const teamsMeta = await query<{ id: string; name: string; emoji: string; color: string }>(
    `SELECT id, name, emoji, color FROM worldcup_teams ORDER BY id`
  )

  const countMap = new Map(result.rows.map((r) => [r.team_id, r.votes]))
  const teams = teamsMeta.rows.map((t) => {
    const votes = countMap.get(t.id) ?? 0
    return { ...t, votes }
  })
  const total = teams.reduce((s, t) => s + t.votes, 0)
  const spain = teams.find((t) => t.id === 'spain')?.votes ?? 0
  const argentina = teams.find((t) => t.id === 'argentina')?.votes ?? 0
  const isTied = total > 0 && spain === argentina
  let leadingTeamId: string | null = null
  if (total > 0 && !isTied) {
    leadingTeamId = spain > argentina ? 'spain' : 'argentina'
  }

  const labelParts: string[] = []
  if (parsed.state) labelParts.push(parsed.state)
  // country name from any row
  const countryRow = await query<{ country: string | null }>(
    `SELECT location_country AS country FROM worldcup_supports
     WHERE location_country_code = $1 LIMIT 1`,
    [parsed.countryCode]
  )
  if (countryRow.rows[0]?.country) labelParts.push(countryRow.rows[0].country)
  else labelParts.push(parsed.countryCode)

  return {
    regionKey,
    label: labelParts.join(', '),
    window: 'all-time' as const,
    total,
    teams: teams.map((t) => ({
      id: t.id,
      name: t.name,
      emoji: t.emoji,
      color: t.color,
      votes: t.votes,
      percent: total > 0 ? Math.round((t.votes / total) * 1000) / 10 : 0,
    })),
    leadingTeamId,
    isTied: total > 0 ? isTied : false,
    isReliable: total >= MIN_SUPPORTS_FOR_RELIABLE_REGION,
    minForReliable: MIN_SUPPORTS_FOR_RELIABLE_REGION,
  }
}

export interface WcCommentRow {
  id: string
  support_id: string
  user_id: string
  comment_type: 'emoji' | 'gif'
  emoji: string | null
  asset_id: string | null
  created_at: string
  username: string
  status: string | null
  asset_preview_url: string | null
  asset_width: number | null
  asset_height: number | null
}

export function mapWcCommentRow(row: WcCommentRow) {
  return {
    id: row.id,
    support_id: row.support_id,
    user_id: row.user_id,
    comment_type: row.comment_type,
    emoji: row.emoji,
    created_at: row.created_at,
    user: { id: row.user_id, username: row.username, status: row.status ?? null },
    asset:
      row.comment_type === 'gif' && row.asset_id
        ? {
            id: row.asset_id,
            preview_url: row.asset_preview_url,
            width: row.asset_width,
            height: row.asset_height,
            url: `/api/media/assets/${row.asset_id}`,
          }
        : undefined,
  }
}

export async function fetchCommentsForSupport(supportId: string): Promise<WcCommentRow[]> {
  const result = await query<WcCommentRow>(
    `
    SELECT
      c.id,
      c.support_id,
      c.user_id,
      c.comment_type,
      c.emoji,
      c.asset_id,
      c.created_at,
      u.username,
      u.status,
      a.preview_url AS asset_preview_url,
      a.width AS asset_width,
      a.height AS asset_height
    FROM worldcup_support_comments c
    JOIN users u ON u.id = c.user_id
    LEFT JOIN media_assets a ON a.id = c.asset_id
    WHERE c.support_id = $1
    ORDER BY c.created_at ASC
    `,
    [supportId]
  )
  return result.rows
}
