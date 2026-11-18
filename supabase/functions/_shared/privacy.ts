/**
 * Privacidade: antes de mandar um currículo para a IA, troca dados pessoais
 * por marcadores ([EMAIL_1], [TELEFONE_1]…). Depois, restore() recoloca os
 * valores originais no resultado.
 *
 * Removidos: e-mail, telefone, CPF, CEP, endereço (rua/avenida…) e links pessoais
 * (LinkedIn, GitHub, sites). Nome, cidade, empresas e datas continuam, porque
 * a IA precisa deles para avaliar o currículo.
 *
 * Este arquivo não usa nada específico do Deno: é testado com o Vitest
 * (privacy.test.ts) junto com o resto do projeto.
 */

export type PersonalKind = 'EMAIL' | 'TELEFONE' | 'CPF' | 'CEP' | 'ENDERECO' | 'LINK'

interface Rule {
  kind: PersonalKind
  re: RegExp
}

// A ordem importa: CPF antes de telefone (ambos são sequências de números),
// links antes de e-mail (para não quebrar URLs com @).
const RULES: Rule[] = [
  { kind: 'LINK', re: /\b(?:https?:\/\/|www\.)[^\s<>"')\]]+/gi },
  {
    kind: 'LINK',
    re: /\b(?:[a-z]{2,3}\.)?(?:linkedin\.com|github\.com|gitlab\.com|behance\.net|instagram\.com|facebook\.com|wa\.me)\/[^\s<>"')\]]+/gi,
  },
  { kind: 'EMAIL', re: /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g },
  { kind: 'CPF', re: /\b\d{3}\.\d{3}\.\d{3}-\d{2}\b|\b\d{3}\s?\d{3}\s?\d{3}\s?-?\s?\d{2}\b(?=.*$)/gm },
  {
    kind: 'TELEFONE',
    // +55 (11) 99999-0000 · (11) 3333-4444 · 11 99999 0000 · +39 333 123 4567 · +1 (415) 555-0100
    re: /(?:\+\d{1,3}[\s.-]?)?(?:\(\d{2,3}\)|\b\d{2,3})[\s.-]?\d{4,5}[\s.-]?\d{4}\b|(?:\+1[\s.-]?)?\(\d{3}\)[\s.-]?\d{3}[\s.-]\d{4}\b|\+\d{1,3}(?:[\s.-]?\d{2,4}){3,4}\b/g,
  },
  { kind: 'CEP', re: /\b\d{5}-\d{3}\b/g },
  {
    kind: 'ENDERECO',
    // linha de endereço: "Rua das Flores, 123 - Apto 4", "Av. Paulista, 1000", "Via Roma 12"
    re: /\b(?:Rua|R\.|Avenida|Av\.|Alameda|Al\.|Travessa|Tv\.|Rodovia|Estrada|Praça|Largo|Via|Viale|Calle|Avenue|Street|St\.)\s+[^\n,;]{2,60}?,?\s*(?:n[ºo°.]?\s*)?\d{1,5}[^\n]{0,40}/gi,
  },
]

export interface Redacted {
  /** texto com os marcadores no lugar dos dados pessoais */
  text: string
  /** marcador → valor original */
  map: Map<string, string>
  /** recoloca os valores originais em qualquer texto ou objeto (JSON) */
  restore: <T>(value: T) => T
}

export function redactPersonalData(input: string): Redacted {
  const map = new Map<string, string>()
  const byValue = new Map<string, string>()
  const counters: Record<string, number> = {}
  let text = input

  for (const { kind, re } of RULES) {
    text = text.replace(re, (match) => {
      const value = match.trim()
      if (!value || /^\[[A-Z]+_\d+\]$/.test(value)) return match
      const existing = byValue.get(value)
      if (existing) return existing
      counters[kind] = (counters[kind] ?? 0) + 1
      const token = `[${kind}_${counters[kind]}]`
      map.set(token, value)
      byValue.set(value, token)
      return match.replace(value, token)
    })
  }

  const restoreString = (s: string) => s.replace(/\[(?:EMAIL|TELEFONE|CPF|CEP|ENDERECO|LINK)_\d+\]/g, (t) => map.get(t) ?? t)

  const restore = <T>(value: T): T => {
    if (typeof value === 'string') return restoreString(value) as T
    if (Array.isArray(value)) return value.map((v) => restore(v)) as T
    if (value && typeof value === 'object') {
      return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, restore(v)])) as T
    }
    return value
  }

  return { text, map, restore }
}
