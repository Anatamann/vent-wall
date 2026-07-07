const isDev = process.env.NODE_ENV !== 'production'

export const MAX_POSTS_PER_DAY = 3
export const MAX_REACTIONS_PER_VENT = 3
export const WALL_VISIBILITY_HOURS = 24

export const MAX_ACCOUNTS_PER_IP_PER_DAY = isDev ? 20 : 3
export const MAX_REGISTRATION_ATTEMPTS_PER_HOUR = isDev ? 100 : 15
export const IP_REGISTRATION_BLOCK_HOURS = 24

export const MAX_COMMENTS_PER_USER_PER_VENT = 10