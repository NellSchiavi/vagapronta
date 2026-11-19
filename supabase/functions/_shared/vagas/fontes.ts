/**
 * Fontes de vagas — SÓ fontes 100% gratuitas, sem cartão e com uso permitido
 * pelos termos (README, seção 6.2). Nenhum dado pessoal sai daqui: as fontes
 * recebem apenas o termo de busca (ex.: "data analyst") e o país.
 *
 * Sem chave:  Jobicy, Himalayas, Arbeitnow, Remotive
 * Com chave:  Jooble (JOOBLE_API_KEY) — sem a chave, fica desligada
 *             (ou mostra vagas de EXEMPLO quando JOBS_MODE=mock)
 * Desligada:  Adzuna (não é gratuita) — ver ./adzuna.ts
 *
 * Créditos exigidos: o card mostra "via <fonte>" com link para a página
 * da vaga na fonte, e o botão de candidatura usa o link original, sem alterar.
 */
import { htmlToText } from '../fetch-job.ts'
import { englishQuery, normalize, type FoundJob } from './regras.ts'

const UA = 'VagaPronta/1.0 (app pessoal de busca de emprego; uso nao comercial)'
const TIMEOUT_MS = 15000

export interface SourceQuery {
  /** chave do cache (ex.: "jobicy:brazil:data analyst") */
  key: string
  source: string
  /** intervalo mínimo entre chamadas reais, conforme os termos da fonte */
  minIntervalMin: number
  run: () => Promise<FoundJob[]>
}

/** Créditos mostrados na tela (nome e site), exigidos pelos termos */
export const SOURCE_CREDITS: Record<string, { name: string; site: string }> = {
  jobicy: { name: 'Jobicy', site: 'https://jobicy.com' },
  himalayas: { name: 'Himalayas', site: 'https://himalayas.app' },
  arbeitnow: { name: 'Arbeitnow', site: 'https://www.arbeitnow.com' },
  remotive: { name: 'Remotive', site: 'https://remotive.com' },
  jooble: { name: 'Jooble', site: 'https://jooble.org' },
  adzuna: { name: 'Adzuna', site: 'https://www.adzuna.com' },
  exemplo: { name: 'Exemplo', site: '' },
}

/** fetch com cronômetro próprio e 1 nova tentativa em falha de rede (o DNS/TLS do Docker às vezes falha) */
async function getJson<T>(url: string, init: RequestInit = {}): Promise<T> {
  try {
    return await getJsonOnce<T>(url, init)
  } catch (err) {
    if (/HTTP 4\d\d/.test((err as Error).message)) throw err
    await new Promise((r) => setTimeout(r, 1500))
    return await getJsonOnce<T>(url, init)
  }
}

async function getJsonOnce<T>(url: string, init: RequestInit = {}): Promise<T> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
  try {
    const res = await Promise.race([
      fetch(url, { ...init, signal: ctrl.signal, headers: { 'User-Agent': UA, Accept: 'application/json', ...(init.headers ?? {}) } }),
      new Promise<never>((_, rej) => setTimeout(() => rej(new Error('tempo esgotado')), TIMEOUT_MS + 1000)),
    ])
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return (await res.json()) as T
  } finally {
    clearTimeout(timer)
  }
}

const clipText = (html: string | null | undefined, max = 6000) => htmlToText(html ?? '').slice(0, max)
const asArray = (v: unknown): string[] => (Array.isArray(v) ? v.map(String) : typeof v === 'string' && v ? v.split(',').map((s) => s.trim()) : [])
const isoDate = (v: unknown): string | null => {
  if (typeof v === 'number') return new Date(v * 1000).toISOString()
  if (typeof v === 'string' && v) {
    const d = new Date(v)
    return Number.isNaN(d.getTime()) ? null : d.toISOString()
  }
  return null
}
function salaryText(min?: number | null, max?: number | null, cur?: string | null, period?: string | null): string | null {
  if (!min && !max) return null
  const fmt = (n: number) => n.toLocaleString('pt-BR')
  const range = min && max ? `${fmt(min)} – ${fmt(max)}` : fmt((min || max)!)
  const per = period && /year|annual/i.test(period) ? ' por ano' : period && /month/i.test(period) ? ' por mês' : ''
  return `${cur ?? ''} ${range}${per}`.trim()
}

// ---------------------------------------------------------------------------
// Jobicy — vagas remotas; filtro por país/região. Termos: crédito com link e
// botão de candidatura no link original; no máx. 1 consulta automática por hora.
// ---------------------------------------------------------------------------
export const JOBICY_GEO: Record<string, string> = {
  BR: 'brazil', PT: 'portugal', EU: 'europe', US: 'usa', IT: 'italy', ES: 'spain', FR: 'france',
  DE: 'germany', CH: 'switzerland', IE: 'ireland', GB: 'uk', NL: 'netherlands', BE: 'belgium', CA: 'canada',
}

interface JobicyJob {
  id: number; url: string; jobTitle: string; companyName?: string; jobGeo?: string; jobType?: string[]
  jobExcerpt?: string; jobDescription?: string; pubDate?: string
  salaryMin?: number; salaryMax?: number; salaryCurrency?: string; salaryPeriod?: string
  annualSalaryMin?: number; annualSalaryMax?: number
}

function jobicy(dest: string, query: string): SourceQuery | null {
  const geo = JOBICY_GEO[dest]
  if (!geo) return null
  return {
    key: `jobicy:${geo}:${query}`,
    source: 'jobicy',
    minIntervalMin: 60,
    run: async () => {
      const u = new URL('https://jobicy.com/api/v2/remote-jobs')
      u.searchParams.set('count', '50')
      u.searchParams.set('geo', geo)
      if (query) u.searchParams.set('tag', query)
      const data = await getJson<{ jobs?: JobicyJob[] }>(u.toString())
      return (data.jobs ?? []).map((j) => ({
        source: 'jobicy',
        external_id: String(j.id),
        title: htmlToText(j.jobTitle),
        company: j.companyName ?? null,
        location: j.jobGeo ?? null,
        country: null,
        work_mode: 'remoto' as const,
        url: j.url,
        source_url: j.url,
        description: clipText(j.jobDescription || j.jobExcerpt),
        salary: salaryText(j.salaryMin ?? j.annualSalaryMin, j.salaryMax ?? j.annualSalaryMax, j.salaryCurrency, j.salaryPeriod ?? 'yearly'),
        published_at: isoDate(j.pubDate),
        visa_sponsorship: null,
        regions: asArray(j.jobGeo),
      }))
    },
  }
}

// ---------------------------------------------------------------------------
// Himalayas — vagas remotas abertas ao país informado. Termos: botão com o
// applicationLink sem alterar; link visível para a fonte; só no próprio app;
// não repassar a outros sites; chamadas só do servidor.
// ---------------------------------------------------------------------------
interface HimalayasJob {
  guid: string; title: string; companyName?: string; description?: string; excerpt?: string
  minSalary?: number | null; maxSalary?: number | null; currency?: string; salaryPeriod?: string
  locationRestrictions?: string[]; pubDate?: number; applicationLink: string
}

const HIMALAYAS_COUNTRY = new Set(['BR', 'PT', 'US', 'IT', 'ES', 'FR', 'DE', 'CH', 'IE', 'GB', 'NL', 'BE', 'CA'])

function himalayas(dest: string, query: string): SourceQuery | null {
  if (!HIMALAYAS_COUNTRY.has(dest)) return null
  return {
    key: `himalayas:${dest}:${query}`,
    source: 'himalayas',
    minIntervalMin: 60,
    run: async () => {
      const u = new URL('https://himalayas.app/jobs/api/search')
      if (query) u.searchParams.set('q', query)
      u.searchParams.set('country', dest)
      const key = Deno.env.get('HIMALAYAS_API_KEY')
      const data = await getJson<{ jobs?: HimalayasJob[] }>(u.toString(), key ? { headers: { Authorization: `Bearer ${key}` } } : {})
      return (data.jobs ?? []).map((j) => ({
        source: 'himalayas',
        external_id: j.guid,
        title: j.title,
        company: j.companyName ?? null,
        location: j.locationRestrictions?.length ? j.locationRestrictions.slice(0, 4).join(', ') + (j.locationRestrictions.length > 4 ? '…' : '') : 'Qualquer lugar',
        country: null,
        work_mode: 'remoto' as const,
        url: j.applicationLink,
        source_url: j.guid,
        description: clipText(j.description || j.excerpt),
        salary: salaryText(j.minSalary, j.maxSalary, j.currency, j.salaryPeriod),
        published_at: isoDate(j.pubDate),
        visa_sponsorship: null,
        regions: j.locationRestrictions?.length ? j.locationRestrictions : ['Worldwide'],
      }))
    },
  }
}

// ---------------------------------------------------------------------------
// Arbeitnow — vagas na Europa (sobretudo Alemanha), presenciais e remotas.
// Sem busca por termo: 1 página (300 vagas) atualizada a cada hora, filtrada
// aqui. Termos: "não abuse" e link de volta para o site (feito no card).
// ---------------------------------------------------------------------------
interface ArbeitnowJob {
  slug: string; company_name?: string; title: string; description?: string; remote?: boolean
  url: string; tags?: string[]; location?: string; created_at?: number; visa_sponsorship?: boolean
}

function arbeitnow(dest: string): SourceQuery | null {
  if (!['EU', 'DE', 'NL', 'BE', 'CH'].includes(dest)) return null
  return {
    key: 'arbeitnow:1',
    source: 'arbeitnow',
    minIntervalMin: 60,
    run: async () => {
      const data = await getJson<{ data?: ArbeitnowJob[] }>('https://www.arbeitnow.com/api/job-board-api?page=1')
      return (data.data ?? []).map((j) => ({
        source: 'arbeitnow',
        external_id: j.slug,
        title: j.title,
        company: j.company_name ?? null,
        location: j.location ?? null,
        country: 'DE',
        work_mode: j.remote ? ('remoto' as const) : null,
        url: j.url,
        source_url: j.url,
        description: clipText(j.description),
        salary: null,
        published_at: isoDate(j.created_at),
        visa_sponsorship: typeof j.visa_sponsorship === 'boolean' ? j.visa_sponsorship : null,
        regions: j.remote ? ['Europe'] : [],
      }))
    },
  }
}

// ---------------------------------------------------------------------------
// Remotive — vagas remotas (poucas, com 24 h de atraso). Termos: no máx.
// 4 consultas por dia, crédito "Remotive" com link para a vaga, não repassar
// a outros sites. Por isso UMA consulta geral, guardada por 6 h.
// ---------------------------------------------------------------------------
interface RemotiveJob {
  id: number; url: string; title: string; company_name?: string; job_type?: string
  publication_date?: string; candidate_required_location?: string; salary?: string; description?: string
}

function remotive(dest: string): SourceQuery | null {
  if (!['BR', 'US', 'EU', 'PT', 'CA', 'GB'].includes(dest)) return null
  return {
    key: 'remotive:all',
    source: 'remotive',
    minIntervalMin: 360,
    run: async () => {
      const data = await getJson<{ jobs?: RemotiveJob[] }>('https://remotive.com/api/remote-jobs?limit=100')
      return (data.jobs ?? []).map((j) => ({
        source: 'remotive',
        external_id: String(j.id),
        title: j.title,
        company: j.company_name ?? null,
        location: j.candidate_required_location ?? null,
        country: null,
        work_mode: 'remoto' as const,
        url: j.url,
        source_url: j.url,
        description: clipText(j.description),
        salary: j.salary || null,
        published_at: isoDate(j.publication_date),
        visa_sponsorship: null,
        regions: asArray(j.candidate_required_location),
      }))
    },
  }
}

// ---------------------------------------------------------------------------
// Jooble — Brasil e Portugal, inclusive presenciais. Exige chave (formulário
// em jooble.org/api/about). Sem a chave, fica desligada.
// ---------------------------------------------------------------------------
interface JoobleJob { id: number | string; title: string; location?: string; snippet?: string; salary?: string; type?: string; link: string; company?: string; updated?: string }
const JOOBLE_LOCATION: Record<string, string> = { BR: 'Brasil', PT: 'Portugal' }

function jooble(dest: string, role: string, city: string | null): SourceQuery | null {
  const key = Deno.env.get('JOOBLE_API_KEY')
  if (!key || !JOOBLE_LOCATION[dest]) return null
  const location = dest === 'BR' && city ? city : JOOBLE_LOCATION[dest]
  return {
    key: `jooble:${dest}:${role}:${location}`,
    source: 'jooble',
    minIntervalMin: 60,
    run: async () => {
      const data = await getJson<{ jobs?: JoobleJob[] }>(`https://jooble.org/api/${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keywords: role, location }),
      })
      return (data.jobs ?? []).map((j) => ({
        source: 'jooble',
        external_id: String(j.id),
        title: htmlToText(j.title),
        company: j.company || null,
        location: j.location || null,
        country: dest,
        work_mode: /remot|home office|teletrabalho/i.test(`${j.title} ${j.snippet} ${j.type}`) ? ('remoto' as const) : /h[ií]brid/i.test(`${j.title} ${j.snippet}`) ? ('hibrido' as const) : null,
        url: j.link,
        source_url: j.link,
        description: clipText(j.snippet),
        salary: j.salary || null,
        published_at: isoDate(j.updated),
        visa_sponsorship: null,
        regions: [],
      }))
    },
  }
}

export const keySourcesMissing = () => (Deno.env.get('JOOBLE_API_KEY') ? [] : ['jooble'])

/**
 * Consultas para um destino. Usa no máximo 2 cargos (para poupar as fontes);
 * em fontes em inglês, o cargo é traduzido (ex.: "Analista de Dados" → "data analyst").
 */
export function queriesFor(dest: string, roles: string[], city: string | null): SourceQuery[] {
  const top = roles.slice(0, 2)
  const out: (SourceQuery | null)[] = []
  for (const role of top) {
    const en = englishQuery(role) || normalize(role)
    out.push(jobicy(dest, en), himalayas(dest, en), jooble(dest, role, city))
  }
  out.push(arbeitnow(dest), remotive(dest))
  // sem repetir a mesma consulta (ex.: dois cargos que viram o mesmo termo)
  const seen = new Set<string>()
  return out.filter((q): q is SourceQuery => Boolean(q) && !seen.has(q!.key) && Boolean(seen.add(q!.key)))
}
