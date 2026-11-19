import type { SupabaseClient } from 'npm:@supabase/supabase-js@2.49.1'
import { HttpError } from './http.ts'

/** Limite diário de chamadas de IA por pessoa (secret AI_DAILY_LIMIT, padrão 40) */
export function dailyLimit() {
  const n = Number(Deno.env.get('AI_DAILY_LIMIT') ?? 40)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 40
}

export interface Quota {
  used: number
  limit: number
  /**
   * Roda a chamada de IA; se ela FALHAR (erro, 429, 503, tempo esgotado),
   * devolve o uso à cota do dia e repassa o erro.
   */
  guard<T>(run: () => Promise<T>): Promise<T>
}

/**
 * Registra uma chamada de IA do usuário (função consume_ai_quota no banco).
 * Se a cota do dia do app acabou, interrompe com uma mensagem amigável.
 */
export async function consumeQuota(supabase: SupabaseClient, feature: string): Promise<Quota> {
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
  return {
    used: row.used as number,
    limit,
    async guard(run) {
      try {
        return await run()
      } catch (err) {
        const { error: refundErr } = await supabase.rpc('refund_ai_quota', { p_feature: feature })
        if (refundErr) console.error('[cota] estorno', refundErr)
        else console.info(`[cota] chamada de ${feature} falhou: não contou na cota`)
        throw err
      }
    },
  }
}
