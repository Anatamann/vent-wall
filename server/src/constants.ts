const isDev = process.env.NODE_ENV !== 'production'

export const MAX_POSTS_PER_DAY = 3
export const MAX_REACTIONS_PER_VENT = 3
export const WALL_VISIBILITY_HOURS = 24
/** Max successful edits an OP can make while a vent is still on the Wall. */
export const MAX_VENT_EDITS = 3

export const MAX_ACCOUNTS_PER_IP_PER_DAY = isDev ? 20 : 3
export const MAX_REGISTRATION_ATTEMPTS_PER_HOUR = isDev ? 100 : 15
export const IP_REGISTRATION_BLOCK_HOURS = 24

export const MAX_COMMENTS_PER_USER_PER_VENT = 10
export const MAX_OP_COMMENTS_PER_VENT = 50
export const MAX_COMMENTS_PER_VENT = 200
export const MAX_GIF_COMMENTS_PER_USER_PER_HOUR = isDev ? 100 : 20
export const MAX_LOGIN_FAILURES_PER_HOUR = isDev ? 100 : 20
export const KLIPY_SEARCH_MAX_QUERY_LENGTH = 100

export const MAX_AVATAR_GIF_BYTES = 2 * 1024 * 1024
export const MAX_AVATAR_CHANGES_PER_HOUR = isDev ? 50 : 10

/** Vent Globe: min vents in a region before dominating emotion is marked reliable. */
export const MIN_VENTS_FOR_DOMINATING = 5
/** World Cup Finals 2026 */
export const WORLDCUP_TEAMS = ['spain', 'argentina'] as const
export type WorldCupTeamId = (typeof WORLDCUP_TEAMS)[number]

export const MAX_NEW_BALLOTS_PER_IP_HASH_PER_DAY = isDev ? 50 : 5
export const MAX_NEW_BALLOTS_PER_IP_HASH_EVENT = isDev ? 200 : 15
export const MAX_VOTE_ATTEMPTS_PER_IP_HASH_HOUR = isDev ? 200 : 20
export const MAX_VOTE_ATTEMPTS_PER_BALLOT_HOUR = isDev ? 50 : 5
export const MAX_WC_COMMENTS_PER_POST_NON_OP = 3
export const MAX_WC_COMMENTS_PER_POST_OP = 50
export const MAX_WC_WALL_WRITES_PER_USER_PER_HOUR = isDev ? 50 : 5
export const MIN_SUPPORTS_FOR_RELIABLE_REGION = 5
export const WC_BALLOT_COOKIE = 'wc_ballot_id'
export const WC_MEDIA_EXPIRES_AT = new Date('2099-12-31T00:00:00.000Z')
