import type { SupabaseClient } from 'npm:@supabase/supabase-js@2.49.1'
import { HttpError } from './http.ts'

/** Limite diário de chamadas de IA por pessoa (secret AI_DAILY_LIMIT, padrão 40) */
export function dailyLimit() {
  const n = Number(Deno.env.get('AI_DAILY_LIMIT') ?? 40)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 40
}

/**
 * Registra uma chamada de IA do usuário (função consume_ai_quota no banco).
 * Se a cota do dia acabou, interrompe com uma mensagem amigável.
 */
export async function consumeQuota(supabase: SupabaseClient, feature: string) {
  const limit = dailyLimit()
  const { data, error } = await supabase.rpc('consume_ai_quota', { p_feature: feature, p_daily_limit: limit })
  if (error) {
    console.error('[cota]', error)
    throw new HttpError(500, 'Não conseguimos verificar seu limite de uso agora. Tente de novo em instantes.', 'cota')
  }
  const row = Array.isArray(data) ? data[0] : data
  if (!row?.allowed) {
    throw new HttpError(
      429,
      `Você já usou a IA ${limit} vezes hoje, que é o limite diário para o app continuar gratuito. Amanhã ela libera de novo!`,
      'limite_diario',
    )
  }
  return { used: row.used as number, limit }
}
