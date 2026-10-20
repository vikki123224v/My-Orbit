import React, { createContext, useContext, useEffect, useState } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import type { Profile } from '../types/database'

interface AuthContextType {
  user: User | null
  session: Session | null
  profile: Profile | null
  loading: boolean
  isConfigured: boolean
  refreshProfile: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  profile: null,
  loading: true,
  isConfigured: false,
  refreshProfile: async () => {},
  signOut: async () => {},
})

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState<boolean>(true)

  const fetchProfile = async (userObj: User) => {
    if (!isSupabaseConfigured) return
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userObj.id)
        .single()

      if (!error && data) {
        setProfile(data as Profile)
      } else {
        // If trigger has not executed or profile does not exist yet (e.g. Google OAuth sign-in)
        const generatedHandle =
          userObj.user_metadata?.username ||
          userObj.email?.split('@')[0]?.replace(/[^a-zA-Z0-9_]/g, '_')?.slice(0, 20) ||
          `user_${userObj.id.slice(0, 8)}`
        const generatedName =
          userObj.user_metadata?.full_name ||
          userObj.user_metadata?.display_name ||
          userObj.user_metadata?.name ||
          userObj.email?.split('@')[0] ||
          'Orbit Explorer'
        const avatar = userObj.user_metadata?.avatar_url || userObj.user_metadata?.picture || null

        const { data: insertedProfile } = await supabase
          .from('profiles')
          .upsert(
            {
              id: userObj.id,
              username: generatedHandle.toLowerCase(),
              display_name: generatedName,
              avatar_url: avatar,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'id' }
          )
          .select()
          .single()

        if (insertedProfile) {
          setProfile(insertedProfile as Profile)
        }
      }
    } catch (err) {
      console.error('Failed to fetch user profile:', err)
      setProfile(null)
    }
  }

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user)
    }
  }

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false)
      return
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user)
      }
      setLoading(false)
    })

    // Listen to auth state transitions (including OAuth callback SIGNED_IN)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        await fetchProfile(session.user)
      } else {
        setProfile(null)
      }
      setLoading(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const signOut = async () => {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut()
    }
    setUser(null)
    setSession(null)
    setProfile(null)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        isConfigured: isSupabaseConfigured,
        refreshProfile,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
