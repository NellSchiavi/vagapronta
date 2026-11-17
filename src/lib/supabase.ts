import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(url && anonKey && !anonKey.startsWith('cole-aqui'))

export const supabase = createClient(url || 'http://127.0.0.1:54321', anonKey || 'chave-ausente', {
  auth: {
    // PKCE: o retorno do login vem como ?code=..., que convive bem com o HashRouter (#/rota)
    flowType: 'pkce',
    persistSession: true,
    autoRefreshToken: true,
    // a troca do código é feita manualmente em lib/auth.tsx para mostrar erros amigáveis
    detectSessionInUrl: false,
    storageKey: 'vp-auth',
  },
})

/** Endereço público do app (localhost no desenvolvimento, GitHub Pages em produção) */
export function appUrl() {
  return `${window.location.origin}${import.meta.env.BASE_URL}`
}

/** Descobre quais provedores de login estão ligados no Supabase (ex.: LinkedIn) */
export async function fetchAuthSettings(): Promise<{ linkedin: boolean }> {
  try {
    const res = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: anonKey } })
    if (!res.ok) return { linkedin: false }
    const json = (await res.json()) as { external?: Record<string, boolean> }
    return { linkedin: Boolean(json.external?.linkedin_oidc) }
  } catch {
    return { linkedin: false }
  }
}
