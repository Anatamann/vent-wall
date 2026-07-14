import type {
  AdminOverview,
  AuthUser,
  CommentPayload,
  CreateVentPayload,
  UpdateVentPayload,
  FeedbackStatus,
  GifDisclaimer,
  GlobeDataResponse,
  GlobeMoodVentsResponse,
  GlobeRegionVentsResponse,
  KlipyGifItem,
  MoodTag,
  User,
  UserFeedback,
  Vent,
  VentComment,
} from './types'

const API_BASE = import.meta.env.VITE_API_URL || '/api'
const TOKEN_KEY = 'ventwall_token'

type AuthListener = (user: AuthUser | null) => void
const authListeners = new Set<AuthListener>()

function notifyAuthListeners(user: AuthUser | null) {
  authListeners.forEach((listener) => listener(user))
}

function syncAuthUserAvatar(user: Pick<User, 'id' | 'username' | 'email' | 'is_admin' | 'avatar_url'>) {
  if (!getToken()) return
  notifyAuthListeners({
    id: user.id,
    username: user.username,
    email: user.email,
    is_admin: user.is_admin,
    avatar_url: user.avatar_url,
  })
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string | null) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token)
  } else {
    localStorage.removeItem(TOKEN_KEY)
  }
}

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

async function parseResponseBody(response: Response): Promise<Record<string, unknown>> {
  const text = await response.text()
  if (!text) return {}

  try {
    return JSON.parse(text)
  } catch {
    return { error: text }
  }
}

function handleUnauthorized(tokenUsed: string | null) {
  if (tokenUsed && getToken() === tokenUsed) {
    setToken(null)
    notifyAuthListeners(null)
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  auth = true
): Promise<T> {
  const headers = new Headers(options.headers)
  let tokenUsed: string | null = null

  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  if (auth) {
    tokenUsed = getToken()
    if (tokenUsed) {
      headers.set('Authorization', `Bearer ${tokenUsed}`)
    }
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  })

  if (response.status === 204) {
    return undefined as T
  }

  const data = await parseResponseBody(response)

  if (!response.ok) {
    if (response.status === 401) {
      handleUnauthorized(tokenUsed)
    }
    throw new ApiError(
      typeof data.error === 'string' ? data.error : 'Request failed',
      response.status
    )
  }

  return data as T
}

export const api = {
  auth: {
    async checkUsername(username: string): Promise<{
      available: boolean
      reason?: string
    }> {
      const params = new URLSearchParams({ username })
      return request(`/auth/check-username?${params.toString()}`, {}, false)
    },

    async register(username: string, email: string, password: string) {
      const data = await request<{ token: string; user: User }>(
        '/auth/register',
        {
          method: 'POST',
          body: JSON.stringify({ username, email, password }),
        },
        false
      )
      setToken(data.token)
      const authUser: AuthUser = {
        id: data.user.id,
        username: data.user.username,
        email: data.user.email,
        is_admin: data.user.is_admin,
        avatar_url: data.user.avatar_url,
      }
      notifyAuthListeners(authUser)
      return data
    },

    async login(username: string, password: string) {
      const data = await request<{ token: string; user: User }>(
        '/auth/login',
        {
          method: 'POST',
          body: JSON.stringify({ username, password }),
        },
        false
      )
      setToken(data.token)
      const authUser: AuthUser = {
        id: data.user.id,
        username: data.user.username,
        email: data.user.email,
        is_admin: data.user.is_admin,
        avatar_url: data.user.avatar_url,
      }
      notifyAuthListeners(authUser)
      return data
    },

    async logout() {
      setToken(null)
      notifyAuthListeners(null)
    },

    async me(): Promise<AuthUser | null> {
      const token = getToken()
      if (!token) return null

      try {
        const data = await request<{ user: User }>('/auth/me')
        return {
          id: data.user.id,
          username: data.user.username,
          email: data.user.email,
          is_admin: data.user.is_admin,
          avatar_url: data.user.avatar_url,
        }
      } catch {
        return null
      }
    },

    onAuthStateChange(listener: AuthListener) {
      authListeners.add(listener)
      return {
        unsubscribe: () => authListeners.delete(listener),
      }
    },
  },

  moodTags: {
    list(): Promise<MoodTag[]> {
      return request<MoodTag[]>('/mood-tags', {}, false)
    },
  },

  vents: {
    get(slug: string): Promise<Vent> {
      return request<Vent>(`/vents/${slug}`)
    },

    list(params: {
      tags?: string[]
      sort?: string
      time?: string
      offset?: number
      limit?: number
      username?: string
      q?: string
      min_reactions?: number
    } = {}): Promise<Vent[]> {
      const search = new URLSearchParams()
      if (params.tags?.length) search.set('tags', params.tags.join(','))
      if (params.sort) search.set('sort', params.sort)
      if (params.time) search.set('time', params.time)
      if (params.offset !== undefined) search.set('offset', String(params.offset))
      if (params.limit !== undefined) search.set('limit', String(params.limit))
      if (params.username?.trim()) search.set('username', params.username.trim())
      if (params.q?.trim()) search.set('q', params.q.trim())
      if (params.min_reactions !== undefined && params.min_reactions > 0) {
        search.set('min_reactions', String(params.min_reactions))
      }

      const query = search.toString()
      return request<Vent[]>(`/vents${query ? `?${query}` : ''}`, {}, false)
    },

    create(payload: CreateVentPayload): Promise<Vent> {
      return request<Vent>('/vents', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
    },

    update(slug: string, payload: UpdateVentPayload): Promise<Vent> {
      return request<Vent>(`/vents/${slug}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      })
    },

    delete(slug: string): Promise<void> {
      return request<void>(`/vents/${slug}`, { method: 'DELETE' })
    },

    toggleReaction(slug: string, emoji: string): Promise<{ action: 'added' | 'removed' }> {
      return request(`/vents/${slug}/reactions`, {
        method: 'POST',
        body: JSON.stringify({ emoji }),
      })
    },

    listComments(slug: string): Promise<{
      comments: VentComment[]
      comments_open: boolean
    }> {
      return request(`/vents/${slug}/comments`, {}, false)
    },

    addComment(slug: string, payload: CommentPayload): Promise<{ comment: VentComment }> {
      return request(`/vents/${slug}/comments`, {
        method: 'POST',
        body: JSON.stringify(payload),
      })
    },
  },

  media: {
    searchGifs(params: {
      q?: string
      page?: number
      per_page?: number
    } = {}): Promise<{
      items: KlipyGifItem[]
      page: number
      per_page: number
      has_next: boolean
      attribution: string
    }> {
      const search = new URLSearchParams()
      if (params.q) search.set('q', params.q)
      if (params.page) search.set('page', String(params.page))
      if (params.per_page) search.set('per_page', String(params.per_page))
      const query = search.toString()
      return request(`/media/gifs/search${query ? `?${query}` : ''}`)
    },

    gifDisclaimer(): Promise<GifDisclaimer> {
      return request('/media/legal/gif-disclaimer', {}, false)
    },
  },

  users: {
    profile(): Promise<{
      profile: User
      vents: Vent[]
      stats: {
        totalVents: number
        totalReactions: number
        joinedDate: string
        lastActiveDate: string
        postsThisMonth: number
        averageReactionsPerVent: number
      }
    }> {
      return request('/users/me/profile')
    },

    updateUsername(username: string): Promise<{ user: User }> {
      return request('/users/me/username', {
        method: 'PATCH',
        body: JSON.stringify({ username }),
      })
    },

    postLimits(): Promise<{
      canPost: boolean
      postsToday: number
      maxPosts: number
      timeUntilReset: string | null
    }> {
      return request('/users/me/post-limits')
    },

    async setAvatar(gifId: string): Promise<{ user: User }> {
      const data = await request<{ user: User }>('/users/me/avatar', {
        method: 'POST',
        body: JSON.stringify({ gif_id: gifId }),
      })
      syncAuthUserAvatar(data.user)
      return data
    },

    async deleteAvatar(): Promise<{ user: User }> {
      const data = await request<{ user: User }>('/users/me/avatar', { method: 'DELETE' })
      syncAuthUserAvatar(data.user)
      return data
    },

    updateStatus(status: string): Promise<{ user: User }> {
      return request('/users/me/status', {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      })
    },
  },

  analytics: {
    trending(): Promise<{
      trendingTags: Array<MoodTag & { usage_count: number; growth_rate: number; recent_usage: number }>
      popularEmojis: { emoji: string; count: number }[]
      peakHours: { hour: number; count: number }[]
      totalVentsToday: number
      totalReactionsToday: number
    }> {
      return request('/analytics/trending', {}, false)
    },
  },

  globe: {
    data(hours = 24): Promise<GlobeDataResponse> {
      const search = new URLSearchParams({ hours: String(hours) })
      return request(`/globe/data?${search.toString()}`, {}, false)
    },

    regionVents(regionKey: string, hours = 24): Promise<GlobeRegionVentsResponse> {
      const search = new URLSearchParams({ hours: String(hours) })
      return request(
        `/globe/regions/${encodeURIComponent(regionKey)}/vents?${search.toString()}`,
        {},
        false
      )
    },

    moodVents(tagId: string, hours = 24): Promise<GlobeMoodVentsResponse> {
      const search = new URLSearchParams({ hours: String(hours) })
      return request(`/globe/moods/${encodeURIComponent(tagId)}/vents?${search.toString()}`, {}, false)
    },
  },

  feedback: {
    status(): Promise<{ submitted_today: boolean; feedback: UserFeedback | null }> {
      return request('/feedback/status')
    },

    submit(payload: { tag_request?: string; message: string }): Promise<{ feedback: UserFeedback }> {
      return request('/feedback', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
    },
  },

  admin: {
    overview(): Promise<AdminOverview> {
      return request('/admin/overview')
    },

    listFeedback(params: {
      status?: FeedbackStatus | 'all'
      page?: number
      per_page?: number
    } = {}): Promise<{
      items: UserFeedback[]
      page: number
      per_page: number
      total: number
    }> {
      const search = new URLSearchParams()
      if (params.status) search.set('status', params.status)
      if (params.page) search.set('page', String(params.page))
      if (params.per_page) search.set('per_page', String(params.per_page))
      const query = search.toString()
      return request(`/admin/feedback${query ? `?${query}` : ''}`)
    },

    updateFeedback(
      id: string,
      payload: { status?: FeedbackStatus; admin_note?: string }
    ): Promise<{ feedback: UserFeedback }> {
      return request(`/admin/feedback/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      })
    },
  },
}