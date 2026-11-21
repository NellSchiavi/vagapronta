/**
 * Lê o texto de um anúncio de vaga a partir do link.
 * - Só http/https, sem endereços internos (proteção contra uso indevido do servidor).
 *   Os redirecionamentos são seguidos um a um (no máximo MAX_HOPS), e cada salto
 *   passa pela mesma checagem e pela limpeza de rastreadores.
 * - Ordem de leitura: dados estruturados "JobPosting" (JSON-LD do schema.org) →
 *   meta tags Open Graph → texto visível da página.
 * - Agregadores (Jooble, Careerjet, Talent.com…): se a página não tiver o anúncio
 *   completo mas tiver o link para o anúncio original, segue até ele (uma vez).
 * - Páginas com proteção contra robôs (ex.: "Just a moment…") e vagas encerradas
 *   não são contornadas: quem chama pede para a pessoa colar o texto, sem gastar cota de IA.
 */
import { HttpError } from './http.ts'
import { blockedSite, cleanJobUrl } from './links.ts'

export type ReadVia = 'json-ld' | 'open-graph' | 'texto'

export interface FetchedJob {
  text: string
  title?: string
  company?: string
  location?: string
  employmentType?: string
  datePosted?: string
  validThrough?: string
  /** como o anúncio foi lido */
  via?: ReadVia
  /** página de onde o texto saiu (depois de redirecionamentos e do salto do agregador) */
  url?: string
}

const MAX_BYTES = 2_000_000
const MAX_HOPS = 5
const TIMEOUT_MS = 12_000
const MIN_TEXT = 200

const FAIL_MESSAGE = 'Não conseguimos ler o anúncio nesse link (alguns sites bloqueiam a leitura). Copie o texto do anúncio e cole aqui.'
const fail = () => new HttpError(422, FAIL_MESSAGE, 'link_ilegivel')
const protectedSite = () =>
  new HttpError(
    422,
    'Esse site tem uma proteção contra robôs e não deixa a gente ler a vaga. Abra a vaga, copie o texto do anúncio e cole aqui.',
    'link_protegido',
  )
const closedJob = () =>
  new HttpError(
    422,
    'Esse anúncio parece ter sido encerrado (o site mostrou a lista de vagas no lugar dele). Se você tiver o texto da vaga, cole aqui.',
    'vaga_encerrada',
  )

export function assertSafeUrl(raw: string): URL {
  let u: URL
  try {
    u = new URL(raw.trim())
  } catch {
    throw new HttpError(422, 'Esse link parece incompleto. Confira ou cole o texto do anúncio.', 'link_invalido')
  }
  const host = u.hostname.toLowerCase()
  const isPrivateIp =
    /^(127\.|10\.|192\.168\.|169\.254\.|0\.)/.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
    /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./.test(host) ||
    host === '::1' ||
    host.startsWith('[')
  if (
    !['http:', 'https:'].includes(u.protocol) ||
    (u.port && !['80', '443'].includes(u.port)) ||
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local') ||
    host.endsWith('.internal') ||
    !host.includes('.') ||
    isPrivateIp
  ) {
    throw new HttpError(422, 'Não conseguimos abrir esse link. Copie o texto do anúncio e cole aqui.', 'link_ilegivel')
  }
  return u
}

const decodeEntities = (s: string) =>
  s
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&amp;/g, '&')

/** HTML → texto simples, mantendo quebras de parágrafo e listas */
export function htmlToText(html: string): string {
  return decodeEntities(
    html
      .replace(/<(script|style|noscript|svg|nav|footer|header)[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|div|li|h[1-6]|tr|section|article)>/gi, '\n')
      .replace(/<li[^>]*>/gi, '• ')
      .replace(/<[^>]+>/g, ' '),
  )
    .replace(/[ \t\f\v]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

// ------------------------------------------------------------- JSON-LD

type Obj = Record<string, unknown>
const str = (v: unknown): string | undefined => (typeof v === 'string' && v.trim() ? v.trim() : undefined)
const nameOf = (v: unknown): string | undefined => str(v) ?? (v && typeof v === 'object' ? str((v as Obj).name) : undefined)
const first = (v: unknown) => (Array.isArray(v) ? v[0] : v)

function placeOf(v: unknown): string | undefined {
  const places = (Array.isArray(v) ? v : [v]).slice(0, 3)
  const out = places
    .map((p) => {
      const addr = p && typeof p === 'object' ? (p as Obj).address : undefined
      if (typeof addr === 'string') return addr.trim()
      const a = (addr ?? {}) as Obj
      return [str(a.addressLocality), str(a.addressRegion), nameOf(a.addressCountry)].filter(Boolean).join(', ')
    })
    .filter(Boolean)
  return out.length ? [...new Set(out)].join(' · ') : undefined
}

function isJobPosting(it: unknown): it is Obj {
  if (!it || typeof it !== 'object') return false
  const type = (it as Obj)['@type']
  return type === 'JobPosting' || (Array.isArray(type) && type.includes('JobPosting'))
}

/** todos os objetos de um bloco JSON-LD (listas, @graph e itens aninhados de um nível) */
function ldItems(data: unknown): unknown[] {
  const list = Array.isArray(data) ? data : [data]
  return list.flatMap((d) => {
    if (!d || typeof d !== 'object') return []
    const o = d as Obj
    const graph = Array.isArray(o['@graph']) ? (o['@graph'] as unknown[]) : []
    const main = o.mainEntity ? [o.mainEntity] : []
    return [o, ...graph, ...main]
  })
}

function parseLd(raw: string): unknown {
  // alguns sites (ex.: Gupy) publicam o JSON com as aspas escapadas como &quot;
  for (const candidate of [raw, decodeEntities(raw)]) {
    try {
      return JSON.parse(candidate.trim().replace(/^<!--|-->$/g, ''))
    } catch {
      /* tenta a próxima forma */
    }
  }
  return null
}

const EMPLOYMENT: Record<string, string> = {
  FULL_TIME: 'Tempo integral',
  PART_TIME: 'Meio período',
  CONTRACTOR: 'Prestador de serviço (PJ)',
  TEMPORARY: 'Temporário',
  INTERN: 'Estágio',
  VOLUNTEER: 'Voluntário',
  PER_DIEM: 'Por diária',
  OTHER: 'Outro',
}

/** Procura um JobPosting (schema.org) nos blocos JSON-LD da página */
export function findJobPosting(html: string): FetchedJob | null {
  const blocks = html.match(/<script[^>]+application\/ld\+json[^>]*>[\s\S]*?<\/script>/gi) ?? []
  for (const block of blocks) {
    const raw = block.replace(/^<script[^>]*>/i, '').replace(/<\/script>$/i, '')
    const it = ldItems(parseLd(raw)).find(isJobPosting)
    if (!it) continue

    const title = str(it.title) ?? str(it.name)
    const company = nameOf(first(it.hiringOrganization))
    const remote = it.jobLocationType === 'TELECOMMUTE'
    const location = [placeOf(it.jobLocation), remote ? 'Remoto' : ''].filter(Boolean).join(' · ') || undefined
    const types = (Array.isArray(it.employmentType) ? it.employmentType : [it.employmentType])
      .map((t) => str(t))
      .filter((t): t is string => !!t)
    const employmentType = types.length ? types.map((t) => EMPLOYMENT[t.toUpperCase()] ?? t).join(', ') : undefined
    const datePosted = str(it.datePosted)?.slice(0, 10)
    const validThrough = str(it.validThrough)?.slice(0, 10)
    const description = htmlToText(decodeEntities(String(it.description ?? '')))

    const header = [
      title,
      company,
      location && `Local: ${location}`,
      employmentType && `Tipo de contrato: ${employmentType}`,
      datePosted && `Publicada em: ${datePosted}`,
      validThrough && `Inscrições até: ${validThrough}`,
    ].filter(Boolean)
    return {
      title,
      company,
      location,
      employmentType,
      datePosted,
      validThrough,
      via: 'json-ld',
      text: [header.join('\n'), description].filter(Boolean).join('\n\n'),
    }
  }
  return null
}

// --------------------------------------------------------- Open Graph

function metaContent(html: string, key: string): string | undefined {
  const tags = html.match(/<meta\b[^>]*>/gi) ?? []
  for (const tag of tags) {
    const name = tag.match(/\b(?:property|name)\s*=\s*["']([^"']+)["']/i)?.[1]?.toLowerCase()
    if (name !== key) continue
    const content = tag.match(/\bcontent\s*=\s*"([^"]*)"/i)?.[1] ?? tag.match(/\bcontent\s*=\s*'([^']*)'/i)?.[1]
    if (content?.trim()) return decodeEntities(content).trim()
  }
  return undefined
}

/** Título e descrição das meta tags Open Graph (null se não houver descrição) */
export function findOpenGraph(html: string): FetchedJob | null {
  const title = metaContent(html, 'og:title')
  const description = metaContent(html, 'og:description') ?? metaContent(html, 'description')
  if (!description) return null
  const company = metaContent(html, 'og:site_name')
  return {
    title,
    company,
    via: 'open-graph',
    text: [title, company, htmlToText(description)].filter(Boolean).join('\n\n'),
  }
}

/** Texto visível, de preferência só do conteúdo principal (<main>/<article>) */
export function visibleText(html: string): string {
  const body = html.match(/<body[\s\S]*<\/body>/i)?.[0] ?? html
  for (const tag of ['main', 'article']) {
    const m = body.match(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*)<\\/${tag}>`, 'i'))
    const t = m ? htmlToText(m[1]) : ''
    if (t.length >= MIN_TEXT) return t
  }
  return htmlToText(body)
}

// ------------------------------------------------------- agregadores

const AGGREGATORS = [
  /(^|\.)jooble\.org$/,
  /(^|\.)careerjet\.[a-z.]+$/,
  /(^|\.)talent\.com$/,
  /(^|\.)neuvoo\.[a-z.]+$/,
  /(^|\.)jobrapido\.com$/,
  /(^|\.)jora\.com$/,
  /(^|\.)jobted\.[a-z.]+$/,
  /(^|\.)whatjobs\.com$/,
  /(^|\.)jobatus\.[a-z.]+$/,
  /(^|\.)adzuna\.[a-z.]+$/,
  /(^|\.)simplyhired\.[a-z.]+$/,
  /(^|\.)ziprecruiter\.[a-z.]+$/,
  /(^|\.)bebee\.com$/,
]
export const isAggregator = (host: string) => AGGREGATORS.some((re) => re.test(host.toLowerCase()))

const ORIGINAL_LINK_TEXT =
  /(candidat|ver (a )?vaga|vaga original|an[uú]ncio original|site da empresa|site do anunciante|ir para a vaga|continuar no site|apply|view (the )?(original )?job|candidatura)/i

/** "parte principal" do domínio, para comparar sites (br.jooble.org → jooble.org) */
const siteOf = (host: string) => host.toLowerCase().split('.').slice(-2).join('.')

/** Link para o anúncio original numa página de agregador (null se não houver) */
export function findOriginalLink(html: string, pageUrl: string): string | null {
  const page = new URL(pageUrl)
  const anchors = html.match(/<a\b[^>]*href\s*=\s*["'][^"']+["'][^>]*>[\s\S]*?<\/a>/gi) ?? []
  for (const a of anchors) {
    const href = decodeEntities(a.match(/href\s*=\s*["']([^"']+)["']/i)![1])
    const label = htmlToText(a) + ' ' + (a.match(/\b(?:title|aria-label)\s*=\s*["']([^"']*)["']/i)?.[1] ?? '')
    if (!ORIGINAL_LINK_TEXT.test(label)) continue
    let target: URL
    try {
      target = new URL(href, page)
    } catch {
      continue
    }
    if (!['http:', 'https:'].includes(target.protocol)) continue
    if (siteOf(target.hostname) === siteOf(page.hostname) || isAggregator(target.hostname)) continue
    return target.toString()
  }
  return null
}

// ------------------------------------------------------------ leitura

/** Página de desafio anti-robô (Cloudflare, captcha…) */
export function isBotChallenge(status: number, html: string): boolean {
  const head = html.slice(0, 20_000)
  return (
    /<title>\s*(just a moment|attention required|um momento|access denied|verifica)/i.test(head) ||
    /cf-chl-|challenges\.cloudflare\.com|g-recaptcha|hcaptcha\.com|perimeterx|datadome/i.test(head) ||
    (status === 403 && /captcha|bot/i.test(head))
  )
}

/** O site mandou para uma página "acima" da vaga (ex.: /empresa/jobs/123 → /empresa?error=true) */
export function looksClosed(requested: URL, landed: URL): boolean {
  if (requested.toString() === landed.toString()) return false
  if (/(^|&)error=true/.test(landed.search.slice(1))) return true
  const from = requested.pathname.replace(/\/+$/, '')
  const to = landed.pathname.replace(/\/+$/, '')
  return requested.hostname === landed.hostname && from !== to && from.startsWith(to + '/')
}

async function readBody(res: Response): Promise<string> {
  const reader = res.body?.getReader()
  if (!reader) return ''
  const chunks: Uint8Array[] = []
  let size = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    size += value.length
    if (size > MAX_BYTES) {
      await reader.cancel()
      break
    }
    chunks.push(value)
  }
  const all = new Uint8Array(chunks.reduce((n, c) => n + c.length, 0))
  let offset = 0
  for (const c of chunks) {
    all.set(c, offset)
    offset += c.length
  }
  // respeita o charset declarado (alguns sites ainda usam ISO-8859-1)
  const declared =
    res.headers.get('content-type')?.match(/charset=([\w-]+)/i)?.[1] ??
    new TextDecoder().decode(all.subarray(0, 4096)).match(/<meta[^>]+charset=["']?([\w-]+)/i)?.[1]
  try {
    return new TextDecoder(declared ?? 'utf-8').decode(all)
  } catch {
    return new TextDecoder().decode(all)
  }
}

async function fetchOnce(url: URL): Promise<Response> {
  const controller = new AbortController()
  let timer: number | undefined
  try {
    return await Promise.race([
      fetch(url, {
        redirect: 'manual',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; VagaPronta/1.0; leitura de anúncio de vaga)',
          Accept: 'text/html,application/xhtml+xml',
          'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
        },
        signal: controller.signal,
      }),
      // cronômetro próprio (DNS travado não respeita o AbortSignal)
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          controller.abort()
          reject(new Error('tempo esgotado'))
        }, TIMEOUT_MS)
      }),
    ])
  } finally {
    clearTimeout(timer)
  }
}

/** Baixa a página seguindo redirecionamentos com segurança. Devolve o HTML e o endereço final. */
async function fetchPage(start: URL): Promise<{ html: string; url: URL }> {
  let url = start
  for (let hop = 0; hop <= MAX_HOPS; hop++) {
    let res: Response
    try {
      res = await fetchOnce(url)
    } catch {
      throw fail()
    }
    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get('location')
      await res.body?.cancel()
      if (!location || hop === MAX_HOPS) throw fail()
      let next: URL
      try {
        next = new URL(location, url)
      } catch {
        throw fail()
      }
      // cada salto passa pela limpeza e pela mesma proteção do link original
      url = assertSafeUrl(cleanJobUrl(next.toString()))
      if (blockedSite(url.toString())) throw new HttpError(422, blockedSite(url.toString())!.message, 'site_bloqueado')
      continue
    }
    const type = res.headers.get('content-type') ?? ''
    const html = type.includes('html') ? await readBody(res) : (await res.body?.cancel(), '')
    if (isBotChallenge(res.status, html)) throw protectedSite()
    if (!res.ok || !html) throw fail()
    if (looksClosed(start, url)) throw closedJob()
    return { html, url }
  }
  throw fail()
}

/** Extrai o anúncio de uma página já baixada (JSON-LD → Open Graph → texto visível) */
export function extractJob(html: string): FetchedJob | null {
  const posting = findJobPosting(html)
  if (posting && posting.text.length >= MIN_TEXT) return posting
  const og = findOpenGraph(html)
  if (og && og.text.length >= MIN_TEXT) return { ...og, title: posting?.title ?? og.title, company: posting?.company ?? og.company }
  const text = visibleText(html)
  if (text.length < MIN_TEXT) return null
  return {
    text,
    via: 'texto',
    title: posting?.title ?? og?.title,
    company: posting?.company ?? og?.company,
    location: posting?.location,
  }
}

export async function fetchJobFromUrl(raw: string): Promise<FetchedJob> {
  // LinkedIn, Indeed…: nem tenta (a tela já pede o texto; isto é só a garantia do servidor)
  const blocked = blockedSite(raw)
  if (blocked) throw new HttpError(422, blocked.message, 'site_bloqueado')
  const start = assertSafeUrl(cleanJobUrl(raw))

  let page = await fetchPage(start)
  let job = extractJob(page.html)

  // agregador sem o anúncio completo: segue uma vez para o anúncio original
  if (isAggregator(page.url.hostname) && job?.via !== 'json-ld') {
    const original = findOriginalLink(page.html, page.url.toString())
    if (original) {
      try {
        const target = assertSafeUrl(cleanJobUrl(original))
        if (!blockedSite(target.toString())) {
          const next = await fetchPage(target)
          const nextJob = extractJob(next.html)
          if (nextJob) {
            page = next
            job = nextJob
          }
        }
      } catch {
        /* fica com o que o agregador mostrou */
      }
    }
  }

  if (!job) throw fail()
  return { ...job, url: page.url.toString(), text: job.text.slice(0, 20_000) }
}
