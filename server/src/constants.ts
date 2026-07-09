const isDev = process.env.NODE_ENV !== 'production'

export const MAX_POSTS_PER_DAY = 3
export const MAX_REACTIONS_PER_VENT = 3
export const WALL_VISIBILITY_HOURS = 24

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