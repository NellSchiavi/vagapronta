/**
 * Aderência aos requisitos: quanto a pessoa REALMENTE atende ao que a vaga pede
 * (obrigatórios e desejáveis). É calculada sempre sobre o currículo ORIGINAL,
 * nunca sobre a versão adaptada, então a adaptação não consegue inflar a nota.
 *
 * - A IA (ou, sem IA, basicRequirements) diz o status de cada requisito.
 * - verifyEvidence confere se o trecho citado existe mesmo no currículo.
 * - scoreRequirements calcula a nota aqui no código (não é a IA que dá a nota),
 *   com teto quando falta requisito obrigatório.
 * Testado em aderencia.test.ts.
 */
import { containsTerm, contentWords, jobKeywords, normalize } from './basico.ts'
import type { ResumeSections } from './resume.ts'

export type ReqStatus = 'atende' | 'parcial' | 'nao_atende'
export type ReqKind = 'obrigatorio' | 'desejavel'
export type ReqCategory = 'experiencia' | 'formacao' | 'registro' | 'ferramenta' | 'idioma' | 'outro'

export interface Requirement {
  requisito: string
  tipo: ReqKind
  categoria: ReqCategory
  status: ReqStatus
  /** trecho do currículo original que comprova ("" quando não há) */
  evidencia: string
  /** dica honesta para "parcial" e "nao_atende" ("" quando atende) */
  dica: string
}

export interface Adherence {
  /** nota principal, 0–100 */
  nota: number
  /** a nota foi limitada por requisito obrigatório não atendido (ou atendido só em parte) */
  limitada: boolean
  teto: number | null
  requisitos: Requirement[]
  /** checklist feito sem IA (regras simples) */
  basica?: boolean
}

/** Teto da nota quando um requisito obrigatório não é atendido */
export const TETO_OBRIGATORIO = 70
/** Teto quando um obrigatório é atendido só em parte */
export const TETO_PARCIAL = 85

const WEIGHT: Record<ReqKind, number> = { obrigatorio: 3, desejavel: 1 }
const CREDIT: Record<ReqStatus, number> = { atende: 1, parcial: 0.5, nao_atende: 0 }

/** Nota da aderência: média ponderada (obrigatório pesa 3, desejável 1), com teto */
export function scoreRequirements(reqs: Requirement[]): Omit<Adherence, 'requisitos'> | null {
  if (!reqs.length) return null
  let got = 0
  let max = 0
  for (const r of reqs) {
    got += WEIGHT[r.tipo] * CREDIT[r.status]
    max += WEIGHT[r.tipo]
  }
  const raw = Math.round((100 * got) / max)
  const mandatory = reqs.filter((r) => r.tipo === 'obrigatorio')
  const teto = mandatory.some((r) => r.status === 'nao_atende')
    ? TETO_OBRIGATORIO
    : mandatory.some((r) => r.status === 'parcial')
      ? TETO_PARCIAL
      : null
  const nota = Math.max(0, Math.min(teto ?? 100, raw))
  return { nota, limitada: teto !== null && raw > teto, teto }
}

/** Trechos do currículo que podem servir de comprovação (sem contato) */
export function resumePieces(s: ResumeSections | null | undefined, rawText = ''): string[] {
  if (!s) return rawText.split(/\n+|(?<=\.)\s+/).map((x) => x.trim()).filter((x) => x.length > 3)
  const sentences = (t?: string) => (t ?? '').split(/(?<=[.;])\s+/).map((x) => x.trim()).filter((x) => x.length > 3)
  return [
    ...sentences(s.resumo),
    ...(s.experiencias ?? []).flatMap((e) => [
      `${e.cargo} — ${e.empresa}${e.inicio ? ` (${e.inicio} a ${e.fim ?? 'atual'})` : ''}`,
      ...sentences(e.descricao),
    ]),
    ...(s.formacao ?? []).map((f) => `${f.curso} — ${f.instituicao}${f.fim ? ` (${f.fim})` : ''}`),
    ...(s.habilidades ?? []),
    ...(s.cursos ?? []),
    ...(s.idiomas ?? []),
  ]
}

/**
 * Confere a comprovação citada: ela precisa estar no currículo original.
 * Se não estiver, a comprovação sai e "atende" vira "parcial" (nada inventado passa).
 */
export function verifyEvidence(reqs: Requirement[], resumeText: string): Requirement[] {
  const norm = normalize(resumeText)
  return reqs.map((r) => {
    const ev = r.evidencia.trim()
    let ok = false
    if (ev) {
      const n = normalize(ev).replace(/\s+/g, ' ')
      if (norm.replace(/\s+/g, ' ').includes(n)) ok = true
      else {
        const words = contentWords(ev)
        const hits = words.filter((w) => containsTerm(norm, w)).length
        ok = words.length >= 2 && hits / words.length >= 0.7
      }
    }
    if (ok) return r
    return {
      ...r,
      evidencia: '',
      status: r.status === 'atende' ? 'parcial' : r.status,
      dica:
        r.status === 'atende'
          ? r.dica || `Não encontramos no seu currículo um trecho que mostre "${r.requisito}". Se você tem isso, deixe escrito com clareza.`
          : r.dica,
    }
  })
}

/** "2021-03" → meses desde o ano zero; "atual"/vazio → hoje */
function monthIndex(v: string | null | undefined, today: Date): number | null {
  if (!v || /atual|presente|hoje|current|present/i.test(v)) return today.getFullYear() * 12 + today.getMonth()
  const m = /(\d{4})(?:-(\d{1,2}))?/.exec(v)
  if (!m) return null
  return Number(m[1]) * 12 + (m[2] ? Number(m[2]) - 1 : 0)
}

/** Anos de experiência nas experiências que citam algum dos termos (todas, se não houver termos) */
export function experienceYears(s: ResumeSections | null | undefined, terms: string[], today = new Date()): number {
  let months = 0
  for (const e of s?.experiencias ?? []) {
    const text = normalize(`${e.cargo} ${e.descricao ?? ''}`)
    if (terms.length && !terms.some((t) => containsTerm(text, t))) continue
    const a = monthIndex(e.inicio, today)
    const b = monthIndex(e.fim ?? 'atual', today)
    if (a !== null && b !== null && b >= a) months += b - a + 1
  }
  return Math.round((months / 12) * 10) / 10
}

const HEAD_MUST = /^(requisitos|requisitos obrigatorios|pre-?requisitos|qualificacoes|imprescindive(l|is)|obrigatorios?|essenciais|o que buscamos|o que esperamos|perfil|perfil desejado|exigencias|requirements|qualifications|must have)\b/
const HEAD_NICE = /^(diferenciais|diferencial|desejavel|desejaveis|requisitos desejaveis|sera um diferencial|nice to have|preferred|bonus|plus)\b/
const HEAD_OTHER = /^(responsabilidades|atividades|principais atividades|beneficios|sobre|o que oferecemos|oferecemos|informacoes adicionais|local|horario|jornada|remuneracao|salario|responsibilities|benefits|about)\b/
/** linhas que nunca são requisito (local, horário, salário…) */
const NOT_REQ = /^(horario|local|unidade|endereco|salario|remuneracao|beneficio|jornada|escala|contratacao|regime|informacoes)\b/
/** sem seção de requisitos, só linhas que claramente pedem algo da pessoa */
const CUE = /(experiencia (em|com|de|na|no)|graduacao|formacao|ensino (medio|superior|tecnico)|registro|conhecimentos? (em|de)|ingles|espanhol|\d+\s*anos|especializacao|certificacao|dominio de)/
/** tarefas do dia a dia (não são requisito) */
const TASK = /^(realizar|elaborar|executar|acompanhar|atuar|apoiar|garantir|preparar|coordenar|conduzir|preencher|processar|organizar|atender|controlar|analisar|participar|manter|zelar)\b/

const categoryOf = (n: string): ReqCategory =>
  /(ingles|espanhol|frances|alemao|italiano|idioma|english|spanish)/.test(n)
    ? 'idioma'
    : /(registro|crbm|crf|crbio|coren|conselho|certificacao|certificado|cnh)/.test(n)
      ? 'registro'
      : /(graduacao|formacao|superior|bacharel|especializacao|pos-graduacao|mestrado|doutorado|tecnico em|curso)/.test(n)
        ? 'formacao'
        : /(experiencia|vivencia|atuacao|anos)/.test(n)
          ? 'experiencia'
          : /(excel|sistema|software|lims|lis|sap|power bi|pacote office|equipamento|hplc|pcr|tasy)/.test(n)
            ? 'ferramenta'
            : 'outro'

/** Linha normalizada, sem marcador de lista nem ":" no fim */
const headerText = (raw: string) => normalize(raw.trim()).replace(/^[•\-*·–—~>\d.)\s]+/, '').replace(/[:\s]+$/, '')

/** O anúncio tem uma seção de requisitos? (sem ela, o checklist sem IA não é confiável) */
export function hasRequirementsSection(jobText: string): boolean {
  return jobText.split('\n').some((l) => l.trim().length <= 40 && (HEAD_MUST.test(headerText(l)) || HEAD_NICE.test(headerText(l))))
}

/** Linhas de requisito do anúncio, com o tipo (obrigatório ou desejável) */
export function requirementLines(jobText: string, max = 10): { texto: string; tipo: ReqKind }[] {
  const lines = jobText.split('\n').map((l) => l.trim()).filter(Boolean)
  const out: { texto: string; tipo: ReqKind }[] = []
  let mode: ReqKind | null = null
  let sawHeader = false
  for (const raw of lines) {
    const n = headerText(raw)
    const short = raw.length <= 40
    if (short && HEAD_NICE.test(n)) { mode = 'desejavel'; sawHeader = true; continue }
    if (short && HEAD_MUST.test(n)) { mode = 'obrigatorio'; sawHeader = true; continue }
    if (short && HEAD_OTHER.test(n)) { mode = null; sawHeader = true; continue }
    // outro título curto terminado em ":" (ex.: "Informações:"): não é requisito
    if (short && /:\s*$/.test(raw)) { mode = null; continue }
    const texto = raw.replace(/^[•\-*·–—~>\s]+/, '').trim()
    // trecho cortado pela fonte ("Formação Superior Completa em...") não dá para avaliar
    if (texto.length < 8 || texto.length > 220 || /(\.\.\.|…)$/.test(texto) || NOT_REQ.test(n) || TASK.test(n)) continue
    const tipo: ReqKind = /^(desejavel|diferencial|sera um diferencial|preferencialmente)/.test(n) || mode === 'desejavel' ? 'desejavel' : 'obrigatorio'
    if (mode || (!sawHeader && CUE.test(n))) out.push({ texto: texto.replace(/^(desejável|diferencial)\s*:\s*/i, ''), tipo })
    if (out.length >= max) break
  }
  return out
}

/**
 * Checklist SEM IA: cada linha de requisito do anúncio é comparada com o currículo
 * original (termos, "ou" entre opções, anos de experiência).
 */
export function basicRequirements(jobText: string, s: ResumeSections | null | undefined, rawText = '', today = new Date()): Requirement[] {
  const pieces = resumePieces(s, rawText)
  const resumeNorm = normalize(pieces.join(' \n '))
  return requirementLines(jobText).map(({ texto, tipo }) => {
    const n = normalize(texto)
    const terms = [...new Set([...jobKeywords(texto, 6).map(normalize), ...contentWords(texto)])].filter((t) => t.length > 2 && !/^\d+$/.test(t))
    const present = terms.filter((t) => containsTerm(resumeNorm, t))
    let coverage = terms.length ? present.length / terms.length : 0
    // "Biomedicina, Farmácia ou Química": basta uma das opções
    if (/\sou\s|\/|\sor\s/.test(n) && present.length) coverage = Math.max(coverage, 0.7)
    let status: ReqStatus = coverage >= 0.6 ? 'atende' : coverage >= 0.25 ? 'parcial' : 'nao_atende'
    let dica = ''

    // escolaridade: quem tem graduação atende "ensino médio" e "superior completo"
    const formacoes = s?.formacao ?? []
    const graduated = formacoes.some((f) => f.fim && !/cursando|andamento/i.test(`${f.curso} ${f.fim}`))
    const plain = n.replace(/[.;]+$/, '')
    if (/ensino (medio|fundamental)/.test(plain) && formacoes.length) status = 'atende'
    else if (/^(ensino |nivel |formacao )?superior complet[oa]$/.test(plain) && graduated) status = 'atende'

    const years = /(\d+)\s*\+?\s*anos?/.exec(n)
    if (years) {
      const need = Number(years[1])
      const areaTerms = terms.filter((t) => !/^(anos?|experiencia|minimo|pelo|menos)$/.test(t))
      const have = experienceYears(s, areaTerms, today)
      status = have >= need ? 'atende' : have >= need / 2 ? 'parcial' : 'nao_atende'
      if (status !== 'atende') {
        dica = `Esta vaga pede ${need} ${need === 1 ? 'ano' : 'anos'} de experiência nisso; ${have ? `seu currículo mostra ${String(have).replace('.', ',')} ${have === 1 ? 'ano' : 'anos'}` : 'seu currículo não mostra experiência direta'}. Vale destacar na carta o que você tem de próximo.`
      }
    }
    if (!dica && status === 'nao_atende') {
      dica = `Esta vaga pede: "${texto}". Seu currículo não mostra isso. Se você tem algo próximo, vale destacar na carta de apresentação.`
    } else if (!dica && status === 'parcial') {
      dica = `Seu currículo atende em parte a "${texto}". Se você tem mais experiência nisso, deixe claro (sem exagerar).`
    }

    // comprovação: o trecho do currículo com mais termos do requisito
    let best = ''
    let bestHits = 0
    for (const p of pieces) {
      const pn = normalize(p)
      const hits = present.filter((t) => containsTerm(pn, t)).length
      if (hits > bestHits) {
        best = p
        bestHits = hits
      }
    }
    return { requisito: texto, tipo, categoria: categoryOf(n), status, evidencia: status === 'nao_atende' ? '' : best.slice(0, 200), dica }
  })
}

/** Só ficam os requisitos que estão no anúncio (a IA não pode acrescentar exigências) */
export function onlyFromJob(reqs: Requirement[], jobText: string): Requirement[] {
  const job = normalize(jobText)
  return reqs.filter((r) => {
    const words = contentWords(r.requisito)
    return !words.length || words.some((w) => containsTerm(job, w))
  })
}

/**
 * Junta tudo: descarta requisitos que não estão no anúncio, confere as comprovações
 * e calcula a nota. Sem requisitos, devolve null.
 */
export function buildAdherence(reqs: Requirement[], resumeText: string, basica = false, jobText?: string): Adherence | null {
  const fromJob = jobText ? onlyFromJob(reqs, jobText) : reqs
  const checked = basica ? fromJob : verifyEvidence(fromJob, resumeText)
  const score = scoreRequirements(checked)
  if (!score) return null
  // não atende primeiro, depois parcial, depois atende (o que mais importa no topo)
  const order: Record<ReqStatus, number> = { nao_atende: 0, parcial: 1, atende: 2 }
  const requisitos = [...checked].sort((a, b) => order[a.status] - order[b.status] || WEIGHT[b.tipo] - WEIGHT[a.tipo])
  return { ...score, requisitos, ...(basica ? { basica: true } : {}) }
}
