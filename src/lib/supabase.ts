import { createClient } from '@supabase/supabase-js'
import type { Database, Json } from '@/lib/database.types'

/** Converte um objeto tipado do app para o tipo JSON das colunas jsonb */
export const asJson = <T>(value: T) => value as unknown as NonNullable<Json>

const LOCAL_HOSTS = ['localhost', '127.0.0.1', '[::1]']

/**
 * URL do Supabase.
 * No PC, usa VITE_SUPABASE_URL (ex.: http://127.0.0.1:54321).
 * Quando o app é aberto pelo IP do PC (celular no Wi-Fi), "127.0.0.1" apontaria
 * para o próprio celular. Nesse caso usa VITE_SUPABASE_URL_REDE:
 *   - "auto": troca o endereço pelo mesmo IP que o celular usou para abrir o app;
 *   - uma URL completa (ex.: http://192.168.15.162:54321): usa essa.
 */
function resolveSupabaseUrl(): string | undefined {
  const base = import.meta.env.VITE_SUPABASE_URL
  const rede = import.meta.env.VITE_SUPABASE_URL_REDE?.trim()
  const pageHost = window.location.hostname
  if (!base || !rede || LOCAL_HOSTS.includes(pageHost)) return base
  if (rede !== 'auto') return rede
  try {
    const u = new URL(base)
    if (!LOCAL_HOSTS.includes(u.hostname)) return base // Supabase na nuvem: não mexe
    u.hostname = pageHost
    return u.toString().replace(/\/$/, '')
  } catch {
    return base
  }
}

const url = resolveSupabaseUrl()
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

/** true quando o app está usando o Supabase local (desenvolvimento) */
export const isLocalSupabase = (() => {
  try {
    return LOCAL_HOSTS.includes(new URL(import.meta.env.VITE_SUPABASE_URL).hostname)
  } catch {
    return false
  }
})()

/** Endereço do Mailpit (e-mails locais) visto do aparelho atual */
export const localMailUrl = `http://${LOCAL_HOSTS.includes(window.location.hostname) ? '127.0.0.1' : window.location.hostname}:54324`

export const isSupabaseConfigured = Boolean(url && anonKey && !anonKey.startsWith('cole-aqui'))

export const supabase = createClient<Database>(url || 'http://127.0.0.1:54321', anonKey || 'chave-ausente', {
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
