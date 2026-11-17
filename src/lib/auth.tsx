import * as React from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { friendlyAuthError } from '@/lib/errors'

interface AuthState {
  session: Session | null
  user: User | null
  loading: boolean
  /** erro vindo do retorno do login (link vencido, LinkedIn cancelado…) */
  authError: string | null
  clearAuthError: () => void
  signOut: () => Promise<void>
}

const AuthContext = React.createContext<AuthState | null>(null)

/**
 * Lê ?code= (PKCE) ou ?error= da URL uma única vez, mesmo com o StrictMode
 * montando os efeitos duas vezes.
 */
let bootPromise: Promise<string | null> | null = null
function bootFromUrl(): Promise<string | null> {
  if (bootPromise) return bootPromise
  bootPromise = (async () => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    const err = params.get('error_description') || params.get('error')
    if (code || err) {
      // limpa a URL, mantendo a rota do HashRouter
      window.history.replaceState(null, '', window.location.pathname + window.location.hash)
    }
    if (err) return friendlyAuthError({ message: err })
    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code)
      if (error) {
        return 'Esse link de acesso não funcionou neste navegador. Se você abriu o e-mail em outro aparelho, peça um novo link e digite o código de 6 dígitos que vem no e-mail.'
      }
    }
    return null
  })()
  return bootPromise
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient()
  const [session, setSession] = React.useState<Session | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [authError, setAuthError] = React.useState<string | null>(null)

  React.useEffect(() => {
    let active = true
    bootFromUrl().then(async (err) => {
      const { data } = await supabase.auth.getSession()
      if (!active) return
      setAuthError(err)
      setSession(data.session)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      if (active) setSession(s)
    })
    return () => {
      active = false
      sub.subscription.unsubscribe()
    }
  }, [])

  const signOut = React.useCallback(async () => {
    await supabase.auth.signOut()
    queryClient.clear()
  }, [queryClient])

  const value = React.useMemo<AuthState>(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      authError,
      clearAuthError: () => setAuthError(null),
      signOut,
    }),
    [session, loading, authError, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = React.useContext(AuthContext)
  if (!ctx) throw new Error('useAuth precisa estar dentro de <AuthProvider>')
  return ctx
}
