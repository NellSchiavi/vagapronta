import type { Job } from './types'

/**
 * Segurança dos links de vaga: só http/https, nunca domínios reservados para
 * exemplo, e sempre abrindo em nova aba com noopener + noreferrer.
 */

/** Domínios reservados para exemplos e testes (RFC 2606 / 6761) */
const RESERVED = /(^|\.)(example\.(com|org|net)|[^.]+\.(example|invalid|test|localhost))$|^(example|invalid|test|localhost)$/i

function parse(raw?: string | null): URL | null {
  if (!raw) return null
  try {
    const url = new URL(raw.trim())
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    if (!url.hostname || RESERVED.test(url.hostname)) return null
    return url
  } catch {
    return null
  }
}

/** O link, se for seguro abrir (http/https e não é de exemplo); senão null */
export function safeHttpUrl(raw?: string | null): string | null {
  return parse(raw)?.toString() ?? null
}

/** Domínio para mostrar ao lado do botão: "gupy.io", "linkedin.com"… */
export function linkHost(raw?: string | null): string | null {
  const url = parse(raw)
  return url ? url.hostname.replace(/^www\./i, '') : null
}

/** Abre em nova aba, sem dar acesso a esta página (noopener, noreferrer). */
export function openExternal(raw?: string | null): boolean {
  const url = safeHttpUrl(raw)
  if (!url) return false
  window.open(url, '_blank', 'noopener,noreferrer')
  return true
}

/** Vaga de exemplo (dados de teste): sem candidatura nem link para fora */
export function isExampleJob(job: { source: Job['source']; match_notes?: Job['match_notes'] | null }): boolean {
  return job.source === 'exemplo' || Boolean(job.match_notes?.exemplo)
}
