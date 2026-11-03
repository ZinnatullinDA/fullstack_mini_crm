import type { Session } from '@supabase/supabase-js'
import type { ReactNode } from 'react'
import type { Profile } from '@/entities/task/model/types'
import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/shared/api/supabase'

interface AuthState {
  loading: boolean
  session: Session | null
  profile: Profile | null
  error: string | null
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(Boolean(supabase))
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [error, setError] = useState<string | null>(supabase ? null : 'Не настроено подключение к Supabase. Заполните .env.local.')

  useEffect(() => {
    if (!supabase)
      return

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      if (!nextSession)
        setProfile(null)

      setLoading(false)
    })

    void supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (sessionError)
        setError(sessionError.message)

      setSession(data.session)
      setLoading(false)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session || !supabase)
      return

    let active = true
    void supabase.from('profiles').select('id,role,display_name').eq('id', session.user.id).single().then(({ data, error: profileError }) => {
      if (!active)
        return

      if (profileError)
        setError(profileError.message)
      else
        setProfile(data as Profile)
    })

    return () => { active = false }
  }, [session])

  async function signIn(email: string, password: string) {
    if (!supabase)
      throw new Error('Не настроено подключение к Supabase')

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    if (signInError)
      throw signInError
  }

  async function signOut() {
    if (!supabase)
      return

    const { error: signOutError } = await supabase.auth.signOut()
    if (signOutError)
      throw signOutError
  }

  return <AuthContext.Provider value={{
error,
loading,
profile,
session,
signIn,
signOut
}}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthState {
  const value = useContext(AuthContext)
  if (!value)
    throw new Error('AuthProvider отсутствует')

  return value
}
