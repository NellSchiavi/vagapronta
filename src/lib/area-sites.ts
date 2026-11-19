/**
 * Sites de vagas por ÁREA (testes em area-sites.test.ts).
 * As fontes automáticas gratuitas quase só têm vagas remotas (TI, produto…);
 * vagas presenciais da saúde ficam nos sites dos Conselhos e no "trabalhe conosco"
 * das grandes redes. O app só abre o site, não lê nem copia as páginas.
 */
import type { CountryCode } from '@/lib/paises'
import type { SmartLink } from '@/lib/smart-search'

export type Area = 'saude' | 'ti'

const AREA_TESTS: Record<Area, RegExp> = {
  saude:
    /\b(biom[eé]dic\w*|biomedicina|sa[uú]de|laborat[oó]ri\w*|an[aá]lises cl[ií]nicas|cl[ií]nic\w*|hospital\w*|enferm\w*|farm[aá]c\w*|patolog\w*|hematolog\w*|microbiolog\w*|citolog\w*|imagenologia|radiolog\w*|hemoterapia|flebotom\w*|biomedical|healthcare|laboratory|nurse|crbm|coren|crf|cfbm)\b/i,
  ti: /\b(dados|data|desenvolvedor\w*|developer|software|programad\w*|python|sql|javascript|typescript|react|java|devops|cloud|front.?end|back.?end|full.?stack|machine learning|intelig[eê]ncia artificial|analista de sistemas|tecnologia da informa[cç][aã]o|ti|qa|power bi|bi|engenheir[oa] de (dados|software|computa[cç][aã]o))\b/i,
}

/** Áreas da pessoa, pelos cargos desejados e pelo registro profissional */
export function detectAreas(texts: (string | null | undefined)[]): Area[] {
  const t = texts.filter(Boolean).join(' \n ')
  return (Object.keys(AREA_TESTS) as Area[]).filter((a) => AREA_TESTS[a].test(t))
}

/** Número da região do CRBM no texto do registro ("1ª Região (SP)" → 1) */
export function crbmRegion(registry?: string | null): number | null {
  const m = registry?.match(/(\d)\s*[ªa°º]?\s*regi/i) ?? registry?.match(/crbm\s*-?\s*(\d)/i)
  return m ? Number(m[1]) : null
}

type Site = { site: string; note: string; lang?: 'en' } & ({ search: (q: string) => string } | { url: string })

const enc = encodeURIComponent

/*
 * "search": o site aceita a busca no endereço; o link já abre filtrado pelo cargo.
 * "url": o site não aceita (a busca é só na tela dele); abre a página de carreiras
 * com a dica "Procure por <cargo> nesta página". Conferido em 19/11/2026.
 */
const CRBM_PAGES: { region: number; site: Site }[] = [
  { region: 1, site: { site: 'CRBM-1 · Vagas', url: 'https://crbm1.gov.br/vagas/', note: 'vagas divulgadas pelo Conselho (1ª Região)' } },
  { region: 6, site: { site: 'CRBM-6 · Oportunidades', url: 'https://crbm6.gov.br/vagas/', note: 'vagas divulgadas pelo Conselho (6ª Região)' } },
]

const SITES: Record<Area, Partial<Record<CountryCode, Site[]>>> = {
  saude: {
    BR: [
      { site: 'Grupo Fleury · Vagas', search: (q) => `https://trabalheconosco.vagas.com.br/grupo-fleury/oportunidades?q=${enc(q)}`, note: 'laboratórios e clínicas do grupo' },
      { site: 'Grupo Sabin · Vagas', url: 'https://gruposabin.gupy.io/', note: 'laboratórios (vagas na Gupy)' },
      { site: 'DB Diagnósticos · Vagas', url: 'https://dbdiagnosticos.gupy.io/', note: 'laboratório de apoio (vagas na Gupy)' },
      { site: "Rede D'Or · Vagas", url: 'https://rededor.gupy.io/', note: 'hospitais (vagas na Gupy)' },
      { site: 'Hospital Sírio-Libanês · Vagas', search: (q) => `https://vagas.hsl.org.br/search/?q=${enc(q)}`, note: 'trabalhe conosco' },
    ],
    PT: [
      { site: 'Unilabs Portugal', url: 'https://apply.workable.com/unilabs/', note: 'laboratórios (filtre por Portugal)' },
      { site: 'SYNLAB · Recrutamento', url: 'https://www.synlab.pt/recrutamento', note: 'laboratórios' },
      { site: 'Lusíadas Saúde · Carreiras', url: 'https://www.lusiadas.pt/carreiras', note: 'hospitais e clínicas' },
      { site: 'BEP · Emprego Público', url: 'https://www.bep.gov.pt/', note: 'vagas do setor público' },
    ],
  },
  ti: {
    BR: [
      { site: 'Programathor', url: 'https://programathor.com.br/jobs', note: 'vagas de tecnologia' },
      { site: 'Trampos', search: (q) => `https://trampos.co/oportunidades?tr=${enc(q)}`, note: 'tecnologia e comunicação' },
      { site: 'Remotar', search: (q) => `https://remotar.com.br/search/jobs?q=${enc(q)}`, note: 'vagas 100% remotas' },
    ],
    PT: [
      { site: 'ITJobs', search: (q) => `https://www.itjobs.pt/emprego?q=${enc(q)}`, note: 'tecnologia em Portugal' },
      { site: 'Landing.Jobs', search: (q) => `https://landing.jobs/jobs?query=${enc(q)}`, note: 'tecnologia na Europa, com vistos', lang: 'en' },
    ],
    EU: [
      { site: 'Landing.Jobs', search: (q) => `https://landing.jobs/jobs?query=${enc(q)}`, note: 'tecnologia na Europa, com vistos', lang: 'en' },
      { site: 'Berlin Startup Jobs', search: (q) => `https://berlinstartupjobs.com/?s=${enc(q)}`, note: 'startups em Berlim', lang: 'en' },
    ],
    DE: [{ site: 'Berlin Startup Jobs', search: (q) => `https://berlinstartupjobs.com/?s=${enc(q)}`, note: 'startups em Berlim', lang: 'en' }],
  },
}

/** Cargos de TI em inglês, para os sites internacionais (as vagas lá são em inglês) */
const ROLE_EN: [RegExp, string][] = [
  [/engenheir[oa]\(?a?\)? de dados/i, 'data engineer'],
  [/cientista de dados/i, 'data scientist'],
  [/analista de dados/i, 'data analyst'],
  [/engenheir[oa]\(?a?\)? de (software|computa[cç][aã]o)/i, 'software engineer'],
  [/engenheir[oa]\(?a?\)? de machine learning|machine learning/i, 'machine learning engineer'],
  [/desenvolvedor\w*\(?a?\)? front.?end/i, 'frontend developer'],
  [/desenvolvedor\w*\(?a?\)? back.?end/i, 'backend developer'],
  [/desenvolvedor\w*\(?a?\)? full.?stack/i, 'full stack developer'],
  [/desenvolvedor\w*\(?a?\)? python|python/i, 'python developer'],
  [/desenvolvedor|programador/i, 'developer'],
  [/analista de (bi|business intelligence)|power bi/i, 'BI analyst'],
]

/** O cargo em inglês, ou o próprio cargo se já parecer estar em inglês; null se não souber */
export function roleInEnglish(role: string): string | null {
  const hit = ROLE_EN.find(([re]) => re.test(role))
  if (hit) return hit[1]
  return /[ãõçáéíóúâêô]|\b(de|da|do|analista|engenheir\w*|desenvolvedor\w*|gerente|coordenador\w*|t[eé]cnic\w*)\b/i.test(role) ? null : role
}

function toLink(s: Site, role: string): SmartLink {
  const term = role && s.lang === 'en' ? roleInEnglish(role) : role
  if ('search' in s && term) return { site: s.site, note: s.note, url: s.search(term) }
  const url = 'search' in s ? new URL(s.search('')).origin + '/' : s.url
  return { site: s.site, note: s.note, url, hint: role ? `Procure por “${role}” nesta página` : undefined }
}

/**
 * Sites da área da pessoa para um destino, já na busca pelo cargo quando o site
 * permite. Para a saúde no Brasil, a página de vagas do CRBM da região dela vem
 * primeiro (as duas, se a região não for conhecida).
 */
export function areaLinks(dest: CountryCode, areas: Area[], opts: { registry?: string | null; role?: string } = {}): SmartLink[] {
  const role = (opts.role ?? '').trim()
  const out: SmartLink[] = []
  for (const area of areas) {
    if (area === 'saude' && dest === 'BR') {
      const region = crbmRegion(opts.registry)
      const own = CRBM_PAGES.filter((c) => c.region === region)
      out.push(...(own.length ? own : CRBM_PAGES).map((c) => toLink(c.site, role)))
    }
    out.push(...(SITES[area][dest] ?? []).map((s) => toLink(s, role)))
  }
  // sem repetir o mesmo site (ex.: Landing.Jobs em duas áreas)
  return out.filter((l, i) => out.findIndex((o) => o.site === l.site) === i)
}