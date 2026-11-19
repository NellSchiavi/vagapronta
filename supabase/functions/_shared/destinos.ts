/**
 * CONFIGURAÇÃO DA BUSCA POR DESTINO (arquivo único).
 * Usado pela busca diária de vagas (Etapa 9) e pela tela Vagas.
 *
 * - Distribuição: quantas vagas buscar em cada destino, pela ordem de preferência.
 * - Ordenação: bônus pela prioridade do destino, somado à compatibilidade.
 *   O bônus é pequeno de propósito: uma vaga MUITO compatível de um destino
 *   de menor prioridade ainda pode ficar no topo.
 */

/** % da busca diária por posição (1º, 2º, 3º…), conforme quantos destinos a pessoa escolheu */
export const DESTINATION_WEIGHTS: Record<number, number[]> = {
  1: [100],
  2: [70, 30],
  3: [60, 30, 10],
  4: [50, 25, 15, 10],
  5: [45, 25, 15, 10, 5],
}

/** pontos somados à compatibilidade (0–100) conforme a posição do destino da vaga */
export const PRIORITY_BONUS = [8, 4, 2] // 1º, 2º, 3º; do 4º em diante: 0

/** Pesos para n destinos (acima de 5, divide o que sobra igualmente) */
export function searchWeights(n: number): number[] {
  if (n <= 0) return []
  if (DESTINATION_WEIGHTS[n]) return DESTINATION_WEIGHTS[n]
  const base = DESTINATION_WEIGHTS[5]
  const rest = (100 - base.slice(0, 4).reduce((a, b) => a + b, 0)) / (n - 4)
  return [...base.slice(0, 4), ...Array.from({ length: n - 4 }, () => rest)]
}

/** Divide `total` buscas pelos destinos (a soma sempre dá `total`; cada destino recebe ao menos 1) */
export function distributeSearch(total: number, codes: string[]): { code: string; count: number }[] {
  const w = searchWeights(codes.length)
  const raw = w.map((p) => (p / 100) * total)
  const counts = raw.map((x) => Math.max(1, Math.floor(x)))
  let diff = total - counts.reduce((a, b) => a + b, 0)
  // ajusta o arredondamento começando pelos destinos de maior prioridade
  for (let i = 0; diff !== 0 && i < counts.length * 4; i++) {
    const k = i % counts.length
    if (diff > 0) {
      counts[k]++
      diff--
    } else if (counts[k] > 1) {
      counts[k]--
      diff++
    }
  }
  return codes.map((code, i) => ({ code, count: counts[i] }))
}

/** Nota usada para ordenar as vagas: compatibilidade + bônus pela prioridade do destino */
export function rankScore(compatibility: number | null, priority: number | null): number {
  const bonus = priority && priority >= 1 ? (PRIORITY_BONUS[priority - 1] ?? 0) : 0
  return (compatibility ?? 0) + bonus
}

/**
 * Adzuna (DESLIGADA: não é gratuita; ver _shared/vagas/adzuna.ts).
 * Países da Adzuna para cada destino, caso um dia seja ligada.
 * As fontes gratuitas em uso estão em _shared/vagas/fontes.ts.
 */
export const ADZUNA_COUNTRIES: Record<string, string[]> = {
  BR: ['br'],
  US: ['us'],
  CA: ['ca'],
  GB: ['gb'],
  FR: ['fr'],
  DE: ['de'],
  IT: ['it'],
  ES: ['es'],
  NL: ['nl'],
  BE: ['be'],
  CH: ['ch'],
  PT: [],
  IE: [],
  EU: ['de', 'fr', 'es', 'it', 'nl', 'be', 'at', 'pl'],
}

/**
 * Categorias da Adzuna que a busca SEMPRE inclui além da busca por cargo,
 * para não ficar só em vagas de escritório (ex.: biomedicina, laboratório).
 */
export const ADZUNA_EXTRA_CATEGORIES = ['healthcare-nursing-jobs', 'scientific-qa-jobs']
