/**
 * Sites de vagas por ÁREA (testes em area-sites.test.ts).
 * As fontes automáticas gratuitas quase só têm vagas remotas (TI, produto…);
 * vagas presenciais da saúde ficam nos sites dos Conselhos e no "trabalhe conosco"
 * das grandes redes. Todos os endereços foram conferidos (página oficial existe)
 * em 19/11/2026; o app só abre o site, não lê nem copia as páginas.
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

const CRBM_PAGES: { region: number; link: SmartLink }[] = [
  { region: 1, link: { site: 'CRBM-1 · Vagas', url: 'https://crbm1.gov.br/vagas/', note: 'vagas divulgadas pelo Conselho (1ª Região)' } },
  { region: 6, link: { site: 'CRBM-6 · Oportunidades', url: 'https://crbm6.gov.br/vagas/', note: 'vagas divulgadas pelo Conselho (6ª Região)' } },
]

const SITES: Record<Area, Partial<Record<CountryCode, SmartLink[]>>> = {
  saude: {
    BR: [
      { site: 'Grupo Fleury · Carreiras', url: 'https://carreiras.grupofleury.com.br/', note: 'laboratórios e clínicas do grupo' },
      { site: 'Grupo Sabin · Vagas', url: 'https://gruposabin.gupy.io/', note: 'laboratórios (vagas na Gupy)' },
      { site: 'DB Diagnósticos · Vagas', url: 'https://dbdiagnosticos.gupy.io/', note: 'laboratório de apoio (vagas na Gupy)' },
      { site: "Rede D'Or · Vagas", url: 'https://rededor.gupy.io/', note: 'hospitais (vagas na Gupy)' },
      { site: 'Hospital Sírio-Libanês', url: 'https://hospitalsiriolibanes.org.br/trabalhe-conosco', note: 'trabalhe conosco' },
      { site: 'Vagas.com · Saúde', url: 'https://www.vagas.com.br/vagas-de-saude', note: 'todas as vagas da área' },
    ],
    PT: [
      { site: 'Net-Empregos · Saúde', url: 'https://www.net-empregos.com/emprego-saude.asp', note: 'categoria Saúde' },
      { site: 'Unilabs Portugal', url: 'https://apply.workable.com/unilabs/', note: 'laboratórios (filtre por Portugal)' },
      { site: 'SYNLAB · Recrutamento', url: 'https://www.synlab.pt/recrutamento', note: 'laboratórios' },
      { site: 'Lusíadas Saúde · Carreiras', url: 'https://www.lusiadas.pt/carreiras', note: 'hospitais e clínicas' },
      { site: 'BEP · Emprego Público', url: 'https://www.bep.gov.pt/', note: 'vagas do setor público' },
    ],
  },
  ti: {
    BR: [
      { site: 'Programathor', url: 'https://programathor.com.br/jobs', note: 'vagas de tecnologia' },
      { site: 'Trampos', url: 'https://trampos.co/oportunidades', note: 'tecnologia e comunicação' },
      { site: 'Remotar', url: 'https://remotar.com.br/', note: 'vagas 100% remotas' },
    ],
    PT: [
      { site: 'ITJobs', url: 'https://www.itjobs.pt/', note: 'tecnologia em Portugal' },
      { site: 'Landing.Jobs', url: 'https://landing.jobs/jobs', note: 'tecnologia na Europa, com vistos' },
    ],
    EU: [
      { site: 'Landing.Jobs', url: 'https://landing.jobs/jobs', note: 'tecnologia na Europa, com vistos' },
      { site: 'Berlin Startup Jobs', url: 'https://berlinstartupjobs.com/', note: 'startups em Berlim' },
    ],
    DE: [{ site: 'Berlin Startup Jobs', url: 'https://berlinstartupjobs.com/', note: 'startups em Berlim' }],
  },
}

/**
 * Sites da área da pessoa para um destino. Para a saúde no Brasil, a página
 * de vagas do CRBM da região dela vem primeiro (as duas, se a região não for conhecida).
 */
export function areaLinks(dest: CountryCode, areas: Area[], opts: { registry?: string | null } = {}): SmartLink[] {
  const out: SmartLink[] = []
  for (const area of areas) {
    if (area === 'saude' && dest === 'BR') {
      const region = crbmRegion(opts.registry)
      const own = CRBM_PAGES.filter((c) => c.region === region)
      out.push(...(own.length ? own : CRBM_PAGES).map((c) => c.link))
    }
    out.push(...(SITES[area][dest] ?? []))
  }
  // sem repetir o mesmo site (ex.: Landing.Jobs em duas áreas)
  return out.filter((l, i) => out.findIndex((o) => o.url === l.url) === i)
}
