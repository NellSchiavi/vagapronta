/**
 * Links de vagas (arquivo único, usado pela tela e pelas Edge Functions; testes em links.test.ts):
 *  - cleanJobUrl: tira rastreamento e tokens (trackingId, refId, trk, midToken,
 *    otpToken, eid, lipi, utm_…) antes de salvar ou mostrar qualquer link.
 *    LinkedIn vira https://www.linkedin.com/jobs/view/<id>/ e Indeed vira …/viewjob?jk=<id>.
 *  - blockedSite: sites que não deixam ler o anúncio automaticamente; para eles
 *    a tela já pede o texto colado, sem chamar o servidor nem gastar cota de IA.
 */

/** parâmetros de rastreamento/login que nunca devem ser guardados (comparação sem maiúsculas) */
const TRACKING = new Set(
  [
    // LinkedIn (inclusive os dos e-mails de alerta)
    'trackingid', 'refid', 'trk', 'trkemail', 'midtoken', 'midsig', 'otptoken', 'eid', 'lipi', 'lici', 'li_fat_id',
    'originalsubdomain', 'alternatechannel', 'ebp', 'recommendedflavor', 'position', 'pagenum', 'origin', 'geoid',
    // Indeed
    'tk', 'from', 'vjs', 'advn', 'adid', 'sjdu', 'acatk', 'pub', 'xkcb', 'camk', 'jsa', 'vjtk', 'hl', 'co',
    // genéricos de campanhas e e-mail marketing
    'gclid', 'gbraid', 'wbraid', 'fbclid', 'msclkid', 'dclid', 'yclid', 'twclid', 'ttclid', 'igshid', 'mc_cid', 'mc_eid',
    '_hsenc', '_hsmi', 'hsctatracking', 'mkt_tok', 'oly_anon_id', 'oly_enc_id', 'vero_id', 'ref', 'ref_src', 'referrer',
    'source', 'src', 'si', 'spm', 'share', 'shared', 'sharedfrom', 'token', 'sessionid', 'session', 'sid', 'auth', 'otp',
  ],
)
const TRACKING_PREFIX = /^(utm_|pk_|mtm_|hsa_|_ga|_gl|trk_|li_|ga_)/i

export interface BlockedSite {
  name: string
  /** frase pronta para a tela */
  message: string
}

const BLOCKED: { test: RegExp; name: string }[] = [
  { test: /(^|\.)linkedin\.com$/, name: 'LinkedIn' },
  { test: /(^|\.)indeed\.(com|[a-z]{2}|com\.[a-z]{2}|co\.[a-z]{2})$/, name: 'Indeed' },
  { test: /(^|\.)glassdoor\.(com|[a-z]{2}|com\.[a-z]{2}|co\.[a-z]{2})$/, name: 'Glassdoor' },
]

function parse(raw: string): URL | null {
  const s = raw.trim()
  if (!s) return null
  try {
    const u = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(s) ? s : `https://${s}`)
    return u.protocol === 'http:' || u.protocol === 'https:' ? u : null
  } catch {
    return null
  }
}

/** Site que bloqueia a leitura automática (null = dá para tentar ler) */
export function blockedSite(raw: string): BlockedSite | null {
  const u = parse(raw)
  if (!u) return null
  const host = u.hostname.toLowerCase()
  const hit = BLOCKED.find((b) => b.test.test(host))
  return hit
    ? { name: hit.name, message: `O ${hit.name} não deixa a gente ler a vaga automaticamente. Abra a vaga, copie o texto e cole aqui.` }
    : null
}

/** Número da vaga no LinkedIn, venha de onde vier o link (null = não é uma vaga) */
export function linkedInJobId(u: URL): string | null {
  const path = u.pathname
  const view = path.match(/\/jobs\/view\/(?:[^/]*?-)?(\d{6,})\/?/)
  if (view) return view[1]
  const current = u.searchParams.get('currentJobId')
  if (current && /^\d{6,}$/.test(current)) return current
  return null
}

/**
 * Link limpo para salvar e mostrar. Devolve o próprio texto (aparado) se não for um link válido.
 */
export function cleanJobUrl(raw: string): string {
  const u = parse(raw)
  if (!u) return raw.trim()
  const host = u.hostname.toLowerCase()

  if (/(^|\.)linkedin\.com$/.test(host)) {
    const id = linkedInJobId(u)
    if (id) return `https://www.linkedin.com/jobs/view/${id}/`
  }
  if (/(^|\.)indeed\./.test(host)) {
    const jk = u.searchParams.get('jk') ?? u.searchParams.get('vjk')
    if (jk && /^[a-z0-9]+$/i.test(jk)) return `https://${host}/viewjob?jk=${jk}`
  }

  for (const key of [...u.searchParams.keys()]) {
    if (TRACKING.has(key.toLowerCase()) || TRACKING_PREFIX.test(key)) u.searchParams.delete(key)
  }
  // fragmento com parâmetros (#token=…) também sai; rotas como #/vaga/123 ficam
  if (u.hash.includes('=')) u.hash = ''
  u.username = ''
  u.password = ''
  return u.toString()
}
