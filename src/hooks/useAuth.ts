import { useState, useEffect } from 'react'
import { auth } from '../lib/auth'
import { supabase } from '../lib/supabase'
import type { User } from '@supabase/supabase-js'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [profileExists, setProfileExists] = useState(false)

  useEffect(() => {
    // Get initial session
    auth.getSession().then(async session => {
      setUser(session?.user ?? null)
      
      // Check if user profile exists in our database
      if (session?.user) {
        try {
          const { data: profile } = await supabase
            .from('users')
            .select('id')
            .eq('id', session.user.id)
            .single()
          
          setProfileExists(!!profile)
          console.log('Profile exists check:', !!profile)
        } catch (error) {
          console.error('Error checking profile:', error)
          setProfileExists(false)
        }
      } else {
        setProfileExists(false)
      }
      
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change:', event, session?.user?.id)
        setUser(session?.user ?? null)
        
        // Check profile exists for new sessions
        if (session?.user && event === 'SIGNED_IN') {
          // Wait a moment for the trigger to create the profile
          setTimeout(async () => {
            try {
              const { data: profile } = await supabase
                .from('users')
                .select('id')
                .eq('id', session.user.id)
                .single()
              
              setProfileExists(!!profile)
              console.log('Profile exists after sign in:', !!profile)
            } catch (error) {
              console.error('Error checking profile after sign in:', error)
              setProfileExists(false)
            }
          }, 2000)
        } else if (!session?.user) {
          setProfileExists(false)
        }
        
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (username: string, password: string) => {
    try {
      const result = await auth.signIn(username, password)
      return result
    } catch (error) {
      throw error
    }
  }

  const signUp = async (username: string, password: string, email: string) => {
    try {
      const result = await auth.signUp(username, password, email)
      return result
    } catch (error) {
      throw error
    }
  }

  const signOut = async () => {
    setLoading(true)
    try {
      await auth.signOut()
    } finally {
      setLoading(false)
    }
  }

  return {
    user,
    profileExists,
    loading,
    signIn,
    signUp,
    signOut,
    isAuthenticated: !!user
  }
}