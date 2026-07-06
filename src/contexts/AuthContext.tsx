import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { auth } from '../lib/auth'
import type { AuthUser } from '../lib/types'

interface AuthContextValue {
  user: AuthUser | null
  profileExists: boolean
  loading: boolean
  isAuthenticated: boolean
  signIn: (username: string, password: string) => ReturnType<typeof auth.signIn>
  signUp: (username: string, password: string, email: string) => ReturnType<typeof auth.signUp>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    auth.getSession().then((session) => {
      if (!active) return
      setUser(session?.user ?? null)
      setLoading(false)
    })

    const { unsubscribe } = auth.onAuthStateChange((_event, session) => {
      if (!active) return
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => {
      active = false
      unsubscribe()
    }
  }, [])

  const signIn = useCallback(async (username: string, password: string) => {
    return auth.signIn(username, password)
  }, [])

  const signUp = useCallback(async (username: string, password: string, email: string) => {
    return auth.signUp(username, password, email)
  }, [])

  const signOut = useCallback(async () => {
    await auth.signOut()
  }, [])

  const value: AuthContextValue = {
    user,
    profileExists: !!user,
    loading,
    isAuthenticated: !!user,
    signIn,
    signUp,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}