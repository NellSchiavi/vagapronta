/**
 * Lê o texto de um anúncio de vaga a partir do link.
 * - Só http/https, sem endereços internos (proteção contra uso indevido do servidor).
 * - Usa os dados estruturados "JobPosting" (JSON-LD) quando o site publica;
 *   senão, extrai o texto visível da página.
 * Se não der para ler, quem chama pede para a pessoa colar o texto.
 */
import { HttpError } from './http.ts'
import { blockedSite, cleanJobUrl } from './links.ts'

export interface FetchedJob {
  text: string
  title?: string
  company?: string
  location?: string
}

const MAX_BYTES = 2_000_000

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
    host === '::1' ||
    host.startsWith('[')
  if (
    !['http:', 'https:'].includes(u.protocol) ||
    (u.port && !['80', '443'].includes(u.port)) ||
    host === 'localhost' ||
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
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))

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

/** Procura um JobPosting (schema.org) nos blocos JSON-LD da página */
export function findJobPosting(html: string): FetchedJob | null {
  const blocks = html.match(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi) ?? []
  for (const block of blocks) {
    const raw = block.replace(/^<script[^>]*>/i, '').replace(/<\/script>$/i, '')
    let data: unknown
    try {
      data = JSON.parse(raw)
    } catch {
      continue
    }
    const items = (Array.isArray(data) ? data : [data]).flatMap((d) =>
      d && typeof d === 'object' && '@graph' in d ? (d as { '@graph': unknown[] })['@graph'] : [d],
    )
    for (const it of items as Record<string, unknown>[]) {
      const type = it?.['@type']
      if (type === 'JobPosting' || (Array.isArray(type) && type.includes('JobPosting'))) {
        const org = it.hiringOrganization as { name?: string } | undefined
        const loc = (Array.isArray(it.jobLocation) ? it.jobLocation[0] : it.jobLocation) as
          | { address?: { addressLocality?: string; addressRegion?: string } }
          | undefined
        const description = htmlToText(decodeEntities(String(it.description ?? '')))
        return {
          title: typeof it.title === 'string' ? it.title : undefined,
          company: org?.name,
          location: [loc?.address?.addressLocality, loc?.address?.addressRegion].filter(Boolean).join(', ') || undefined,
          text: [it.title, org?.name, description].filter(Boolean).join('\n\n'),
        }
      }
    }
  }
  return null
}

export async function fetchJobFromUrl(raw: string): Promise<FetchedJob> {
  // LinkedIn, Indeed…: nem tenta (a tela já pede o texto; isto é só a garantia do servidor)
  const blocked = blockedSite(raw)
  if (blocked) throw new HttpError(422, blocked.message, 'site_bloqueado')
  const url = assertSafeUrl(cleanJobUrl(raw))
  const fail = () =>
    new HttpError(
      422,
      'Não conseguimos ler o anúncio nesse link (alguns sites bloqueiam a leitura). Copie o texto do anúncio e cole aqui.',
      'link_ilegivel',
    )

  let res: Response
  const controller = new AbortController()
  let timer: number | undefined
  try {
    res = await Promise.race([
      fetch(url, {
        redirect: 'follow',
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
        }, 12_000)
      }),
    ])
  } catch {
    throw fail()
  } finally {
    clearTimeout(timer)
  }
  // o redirecionamento também precisa ser um endereço permitido
  try {
    assertSafeUrl(res.url || url.toString())
  } catch {
    throw fail()
  }
  if (!res.ok || !(res.headers.get('content-type') ?? '').includes('html')) throw fail()

  const reader = res.body?.getReader()
  if (!reader) throw fail()
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
  const html = new TextDecoder().decode(all)

  const posting = findJobPosting(html)
  const job = posting && posting.text.length >= 200 ? posting : { text: htmlToText(html) }
  if (job.text.length < 200) throw fail()
  return { ...job, text: job.text.slice(0, 20_000) }
}
