import { api } from './api'
import type { AuthUser } from './types'

export type { AuthUser }

export const auth = {
  signUp: (username: string, password: string, email: string) =>
    api.auth.register(username, email, password),

  signIn: (username: string, password: string) =>
    api.auth.login(username, password),

  signOut: () => api.auth.logout(),

  getCurrentUser: () => api.auth.me(),

  getSession: async () => {
    const user = await api.auth.me()
    return user ? { user } : null
  },

  onAuthStateChange: (callback: (event: string, session: { user: AuthUser } | null) => void) => {
    return api.auth.onAuthStateChange((user) => {
      callback(user ? 'SIGNED_IN' : 'SIGNED_OUT', user ? { user } : null)
    })
  },

  canUserPost: async (_userId: string): Promise<boolean> => {
    const limits = await api.users.postLimits()
    return limits.canPost
  },
}