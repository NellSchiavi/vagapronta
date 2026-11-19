/**
 * Qual limite do Gemini estourou numa resposta 429 (testado em ai-limits.test.ts).
 * O nível gratuito tem limites POR MINUTO e POR DIA, separados por modelo.
 * A resposta traz em "details" as cotas violadas (quotaId) e quanto esperar (retryDelay).
 */
export interface LimitInfo {
  kind: 'minuto' | 'dia'
  /** segundos sugeridos pelo Google para tentar de novo (só faz sentido no limite por minuto) */
  retryAfter: number | null
  /** cotas violadas, para o log */
  quotas: string[]
}

export const MSG_LIMITE_MINUTO = 'Muita gente usando a IA agora, tentando de novo em instantes.'
export const MSG_LIMITE_DIA = 'A IA descansou por hoje. Tente de novo amanhã!'

export function classify429(body: string): LimitInfo {
  const quotas: string[] = []
  let retryAfter: number | null = null
  try {
    const j = JSON.parse(body)
    for (const d of j?.error?.details ?? []) {
      for (const v of d?.violations ?? []) if (v?.quotaId) quotas.push(String(v.quotaId))
      if (typeof d?.retryDelay === 'string') {
        const s = parseFloat(d.retryDelay)
        if (Number.isFinite(s)) retryAfter = Math.ceil(s)
      }
    }
  } catch {
    /* corpo que não é JSON: decide pelo texto */
  }
  const ids = quotas.join(' ')
  // havendo violação por minuto, vale tentar de novo em instantes (mesmo que outra seja por dia)
  if (/PerMinute/i.test(ids)) return { kind: 'minuto', retryAfter, quotas }
  if (/PerDay/i.test(ids)) return { kind: 'dia', retryAfter: null, quotas }
  if (/per.?minute|PerMinute/i.test(body)) return { kind: 'minuto', retryAfter, quotas }
  if (/per.?day|PerDay|daily/i.test(body)) return { kind: 'dia', retryAfter: null, quotas }
  // sem pista: trata como passageiro (o pior caso é uma nova tentativa a mais)
  return { kind: 'minuto', retryAfter, quotas }
}
