/**
 * Regras da busca de vagas que não dependem de rede (testadas em regras.test.ts):
 * termos de busca, idioma do anúncio, avisos para vagas no exterior e
 * compatibilidade ESTIMADA (sem IA, custo zero: compara palavras do
 * currículo e dos cargos desejados com o anúncio).
 */

export type WorkMode = 'presencial' | 'hibrido' | 'remoto'

export interface FoundJob {
  source: string
  external_id: string
  title: string
  company: string | null
  location: string | null
  /** país da vaga (ISO-2), quando a fonte informa */
  country: string | null
  work_mode: WorkMode | null
  /** link original de candidatura (os termos exigem não alterar) */
  url: string
  /** página da vaga na fonte, para o crédito "via Jobicy" */
  source_url: string
  description: string
  salary: string | null
  published_at: string | null
  visa_sponsorship: boolean | null
  /** onde a vaga aceita pessoas (vagas remotas); vazio = não informado */
  regions: string[]
  /** vaga de exemplo (modo de desenvolvimento) */
  example?: boolean
}

const STOP = new Set(
  'de da do das dos e em para com a o as os um uma no na nos nas por the and of to in for with on at an or as is are be you we our your will this that from by'.split(' '),
)

export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
}

export function words(s: string): string[] {
  return normalize(s)
    .split(/[^a-z0-9+#.]+/)
    .map((w) => w.replace(/^\.+|\.+$/g, ''))
    .filter((w) => w.length > 1 && !STOP.has(w))
}

/**
 * As fontes gratuitas são quase todas em inglês: traduz os termos mais comuns
 * dos cargos para buscar nelas (ex.: "Analista de Dados" → "data analyst").
 */
const PT_EN: [RegExp, string][] = [
  [/\bbiomedic[oa]s?\b/, 'biomedical'],
  [/\banalises clinicas\b/, 'clinical laboratory'],
  [/\blaboratorio\b/, 'laboratory'],
  [/\bpesquisa clinica\b/, 'clinical research'],
  [/\bcontrole de qualidade\b/, 'quality control'],
  [/\bgarantia da qualidade\b/, 'quality assurance'],
  [/\bqualidade\b/, 'quality'],
  [/\bimagenologia\b/, 'imaging'],
  [/\bhemoterapia\b/, 'blood bank'],
  [/\bcientista de dados\b/, 'data scientist'],
  [/\bengenheir[oa] de dados\b/, 'data engineer'],
  [/\banalista de dados\b/, 'data analyst'],
  [/\bengenheir[oa] de machine learning\b/, 'machine learning engineer'],
  [/\bdesenvolvedor[a]?\b/, 'developer'],
  [/\bengenheir[oa] de software\b/, 'software engineer'],
  [/\bdados\b/, 'data'],
  [/\banalista\b/, 'analyst'],
  [/\bengenheir[oa]\b/, 'engineer'],
  [/\bcoordenador[a]?\b/, 'coordinator'],
  [/\bgerente\b/, 'manager'],
  [/\bassistente\b/, 'assistant'],
  [/\bpesquisador[a]?\b/, 'researcher'],
  [/\bfarmaceutic[oa]\b/, 'pharmaceutical'],
  [/\bsaude\b/, 'healthcare'],
]

/** Termo de busca em inglês para um cargo em português (mantém o original se já for inglês) */
export function englishQuery(role: string): string {
  let s = normalize(role).trim()
  for (const [re, en] of PT_EN) s = s.replace(re, en)
  // remove o que sobrou de preposições e níveis ("pleno", "jr.")
  return words(s)
    .filter((w) => !['pleno', 'senior', 'junior', 'jr', 'sr', 'estagio', 'trainee'].includes(w))
    .join(' ')
    .trim()
}

/** Idioma provável de um texto (pt, en, de, es, fr, it), pela frequência de palavras comuns */
export function detectLanguage(text: string): string | null {
  const t = ` ${normalize(text).slice(0, 4000)} `
  const marks: Record<string, string[]> = {
    pt: [' voce ', ' para ', ' com ', ' experiencia ', ' vaga ', ' nao ', ' sao ', ' empresa '],
    en: [' the ', ' and ', ' you ', ' with ', ' experience ', ' our ', ' will ', ' team '],
    de: [' und ', ' die ', ' der ', ' mit ', ' sie ', ' wir ', ' fur ', ' erfahrung '],
    es: [' el ', ' los ', ' con ', ' experiencia ', ' para ', ' una ', ' empresa ', ' trabajo '],
    fr: [' et ', ' les ', ' des ', ' vous ', ' avec ', ' pour ', ' une ', ' nous '],
    it: [' il ', ' della ', ' con ', ' per ', ' esperienza ', ' una ', ' sono ', ' lavoro '],
  }
  let best: string | null = null
  let max = 2
  for (const [lang, list] of Object.entries(marks)) {
    const n = list.reduce((acc, w) => acc + (t.split(w).length - 1), 0)
    if (n > max) {
      max = n
      best = lang
    }
  }
  return best
}

const LANG_NAME: Record<string, string> = { pt: 'português', en: 'inglês', de: 'alemão', es: 'espanhol', fr: 'francês', it: 'italiano' }
export const languageName = (code: string | null | undefined) => (code ? (LANG_NAME[code] ?? code) : null)

/** Idioma que a vaga pede: um idioma citado como exigência ou, se não houver, o idioma do anúncio */
export function requiredLanguage(text: string): string | null {
  const t = normalize(text)
  if (/\b(fluent|fliessend|verhandlungssicher|native)\b[^.]{0,30}\b(german|deutsch)\b|\b(german|deutsch)\b[^.]{0,30}\b(c1|c2|b2|fluent|fliessend)\b|deutschkenntnisse/.test(t)) return 'de'
  if (/\b(fluent|native)\b[^.]{0,30}\bfrench\b|\bfrench\b[^.]{0,20}\b(c1|c2|b2)\b/.test(t)) return 'fr'
  if (/\b(fluent|native)\b[^.]{0,30}\bspanish\b|\bspanish\b[^.]{0,20}\b(c1|c2|b2)\b/.test(t)) return 'es'
  if (/\b(fluent|native)\b[^.]{0,30}\bitalian\b/.test(t)) return 'it'
  if (/\b(fluent|native)\b[^.]{0,30}\bportuguese\b/.test(t)) return 'pt'
  return detectLanguage(text)
}

/** Oferece visto / ajuda de mudança? (true, false ou não informado) */
export function visaSponsorship(text: string, flag?: boolean | null): boolean | null {
  const t = normalize(text)
  if (/\b(no|not|unable to|cannot|can't|do not|don't)\b[^.]{0,40}\b(visa|sponsor)/.test(t) || /without (visa )?sponsorship/.test(t)) return false
  if (flag === true) return true
  if (/visa sponsorship|sponsor(ing)? (your |a )?visa|relocation (support|package|assistance|bonus)|visum/.test(t)) return true
  return flag === false ? false : null
}

const OPEN_TO_BRAZIL = /brazil|brasil|latam|latin america|south america|americas|worldwide|anywhere|global/i

/** Dá para trabalhar remoto morando no Brasil? (só faz sentido para vagas remotas) */
export function remoteFromBrazil(job: Pick<FoundJob, 'work_mode' | 'regions' | 'location'>): boolean | null {
  if (job.work_mode !== 'remoto') return null
  const places = [...job.regions, job.location ?? ''].filter(Boolean)
  if (!places.length) return null
  return places.some((p) => OPEN_TO_BRAZIL.test(p))
}

/** Palavras comuns em qualquer currículo ou anúncio: não contam como "combina com" */
const GENERIC = new Set(
  (
    'contato sao paulo rio janeiro brasil brazil sp rj mg ltda exemplo empresa empresas area areas equipe equipes team teams ' +
    'trabalho trabalhar work working profissional professional experiencia experiencias experience formacao curso cursos ' +
    'conhecimento conhecimentos knowledge skills habilidades idiomas atual atuacao atuando responsavel responsible rotina rotinas ' +
    'resultados results cliente clientes client clients projeto projetos project projects anos years ano year mes meses ' +
    'desenvolvimento development tecnologia technology suporte support apoio novo nova new boa bom good ' +
    'como sobre mais muito pelo pela ate apos also more about into their they have has using use'
  ).split(' '),
)

export interface MatchInput {
  roles: string[]
  /** habilidades e cargos do currículo (texto livre) */
  resumeText: string
  include: string[]
  workModes: string[]
  /** níveis escolhidos nas preferências (estagio, trainee, junior, pleno, senior); vazio = qualquer */
  seniority?: string[]
}

/** Nível pelo título da vaga (null = não dá para saber) */
export function titleLevel(title: string): string | null {
  const t = normalize(title)
  if (/\b(intern|internship|estagi\w*|praktikum)\b/.test(t)) return 'estagio'
  if (/\btrainee\b/.test(t)) return 'trainee'
  if (/\b(junior|jr|entry[- ]level)\b/.test(t)) return 'junior'
  if (/\b(senior|sr|staff|principal|lead|head|director|diretor\w*)\b/.test(t)) return 'senior'
  if (/\b(pleno|mid[- ]level)\b/.test(t)) return 'pleno'
  return null
}

/**
 * Compatibilidade ESTIMADA (20–95), sem IA:
 *  - até 45 pontos se o título da vaga parece com um dos cargos desejados;
 *  - até 40 pelas palavras do currículo que aparecem no anúncio;
 *  - até 10 pelas palavras obrigatórias das preferências;
 *  - 5 se a modalidade é uma das escolhidas.
 * A análise completa (com IA) acontece ao adaptar o currículo.
 */
export function estimateMatch(job: Pick<FoundJob, 'title' | 'description' | 'work_mode'>, m: MatchInput): { score: number; terms: string[] } {
  const titleWords = new Set(words(`${job.title}`))
  const allWords = new Set(words(`${job.title} ${job.description}`))

  let titleScore = 0
  for (const role of m.roles) {
    const variants = [words(role), words(englishQuery(role))]
    for (const rw of variants) {
      if (!rw.length) continue
      const hit = rw.filter((w) => titleWords.has(w)).length / rw.length
      titleScore = Math.max(titleScore, hit)
    }
  }

  const resumeTerms = [...new Set(words(m.resumeText))].filter((w) => w.length > 2 && !GENERIC.has(w))
  const found = resumeTerms.filter((w) => allWords.has(w))
  const skillScore = resumeTerms.length ? Math.min(1, found.length / Math.min(25, Math.max(8, resumeTerms.length * 0.15))) : 0

  const include = m.include.map(normalize).filter(Boolean)
  const incScore = include.length ? include.filter((w) => normalize(`${job.title} ${job.description}`).includes(w)).length / include.length : 0.5

  const modeScore = job.work_mode && m.workModes.includes(job.work_mode) ? 1 : 0

  // nível diferente do escolhido pesa contra (ex.: vaga "Senior" para quem marcou só "Pleno")
  const level = titleLevel(job.title)
  const levelPenalty = level && m.seniority?.length && !m.seniority.includes(level) ? 20 : 0

  const raw = 45 * titleScore + 40 * skillScore + 10 * incScore + 5 * modeScore - levelPenalty
  return { score: Math.max(20, Math.min(95, Math.round(raw))), terms: found.slice(0, 8) }
}

/** Vaga que a pessoa não quer ver (palavra proibida no título, empresa ou anúncio, ou empresa bloqueada) */
export function isExcluded(job: Pick<FoundJob, 'title' | 'description' | 'company'>, exclude: string[], blocked: string[]): boolean {
  // a empresa também conta (ex.: "Clínica Estética Fulana")
  const text = normalize(`${job.title} ${job.company ?? ''} ${job.description}`)
  if (exclude.some((w) => w.trim() && text.includes(normalize(w.trim())))) return true
  const company = normalize(job.company ?? '')
  return Boolean(company) && blocked.some((b) => b.trim() && company.includes(normalize(b.trim())))
}
