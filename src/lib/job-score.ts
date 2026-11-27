/**
 * As duas notas de uma vaga, com nomes claros:
 * - "Aderência aos requisitos": quanto a pessoa REALMENTE atende ao que a vaga pede (nota principal).
 * - "Palavras-chave da vaga": quanto o currículo usa os termos do anúncio (é o que a adaptação melhora).
 * Testado em job-score.test.ts.
 */
import type { Adaptation, MatchNotes } from '@/lib/types'

export const SCORE_DISCLAIMER = 'Esta nota é uma estimativa do app. Cada empresa e cada sistema de seleção avalia de um jeito.'

export type ScoreKind = 'aderencia' | 'palavras'

export const SCORE_LABEL: Record<ScoreKind, string> = {
  aderencia: 'Aderência aos requisitos',
  palavras: 'Palavras-chave da vaga',
}

/** Qual nota a vaga mostra: a aderência, quando existe; senão, a de palavras-chave */
export function jobScore(job: { compatibility: number | null; match_notes?: MatchNotes | null }): { value: number; kind: ScoreKind } | null {
  const ad = job.match_notes?.aderencia
  if (ad && typeof ad.nota === 'number') return { value: ad.nota, kind: 'aderencia' }
  if (job.compatibility == null) return null
  return { value: job.compatibility, kind: 'palavras' }
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')

/** O texto contém o termo como palavra inteira (aceita plural simples)? Igual ao servidor (basico.ts). */
export function containsTerm(text: string, term: string): boolean {
  const t = norm(term).trim()
  if (t.length < 2) return false
  const pattern = t
    .split(/\s+/)
    .map((w) => {
      const esc = w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      return w.length > 3 ? `${esc.replace(/(?:e?s)$/, '')}(?:e?s?)` : esc
    })
    .join('\\s+')
  return new RegExp(`(^|[^a-z0-9])${pattern}(?=$|[^a-z0-9])`).test(norm(text))
}

/**
 * Palavras-chave com as mudanças marcadas: as que o currículo já tinha + as que
 * cada mudança aceita realmente acrescenta (conferindo o texto final, já editado).
 */
export function keywordsAfter(a: Adaptation, accepted: boolean[], edits?: string[]): number {
  const total = a.palavras_chave.length
  // resultado antigo (sem a lista de presentes): soma dos impactos, como antes
  if (!a.palavras_presentes) {
    const gain = a.mudancas.reduce((s, m, i) => s + (accepted[i] ? m.impacto : 0), 0)
    return Math.min(95, a.compat_antes + gain)
  }
  if (!total) return 0
  const covered = new Set(a.palavras_presentes)
  a.mudancas.forEach((m, i) => {
    if (!accepted[i]) return
    const text = edits?.[i] ?? m.depois
    for (const k of m.cobre ?? []) if (containsTerm(text, k)) covered.add(k)
  })
  return Math.round((100 * covered.size) / total)
}
