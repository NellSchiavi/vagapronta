/**
 * "Procure também em": links prontos para os sites de vagas de cada destino,
 * já com o cargo, a cidade e a modalidade das preferências. O app só abre o
 * site na busca certa (sem ler nem copiar as páginas deles).
 */
import { countryInfo, type CountryCode } from '@/lib/paises'
import type { WorkMode } from '@/lib/types'

export interface SmartLink {
  site: string
  url: string
  /** observação curta, ex.: "grandes empresas" */
  note?: string
}

export interface SmartQuery {
  role: string
  /** cidade da pessoa (só usada nos destinos do país dela) */
  city?: string | null
  workModes?: WorkMode[]
}

const enc = encodeURIComponent
const slug = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\([^)]*\)/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

/** Só "remoto"? (aí a busca vai sem cidade e com o filtro de remoto) */
const onlyRemote = (q: SmartQuery) => q.workModes?.length === 1 && q.workModes[0] === 'remoto'

/** Filtro de modalidade do LinkedIn: 1 presencial, 2 remoto, 3 híbrido */
function linkedinWorkType(modes?: WorkMode[]) {
  const map: Record<WorkMode, string> = { presencial: '1', remoto: '2', hibrido: '3' }
  return modes?.length ? modes.map((m) => map[m]).join(',') : ''
}

function linkedin(q: SmartQuery, location: string): SmartLink {
  const u = new URL('https://www.linkedin.com/jobs/search/')
  u.searchParams.set('keywords', q.role)
  if (location) u.searchParams.set('location', location)
  const wt = linkedinWorkType(q.workModes)
  if (wt) u.searchParams.set('f_WT', wt)
  return { site: 'LinkedIn Vagas', url: u.toString() }
}

/** Indeed: o mesmo formato em todos os países; "remotejob" é o filtro de remoto deles */
function indeed(domain: string, q: SmartQuery, location: string, site = 'Indeed'): SmartLink {
  const u = new URL(`https://${domain}/jobs`)
  u.searchParams.set('q', q.role)
  if (location && !onlyRemote(q)) u.searchParams.set('l', location)
  if (onlyRemote(q)) u.searchParams.set('remotejob', '032b3046-06a3-4876-8dfd-474eb5e7ed11')
  return { site, url: u.toString() }
}

function eures(q: SmartQuery, countryIso?: string): SmartLink {
  const u = new URL('https://europa.eu/eures/portal/jv-se/search')
  u.searchParams.set('keywordsEverywhere', q.role)
  u.searchParams.set('lang', 'pt')
  if (countryIso) u.searchParams.set('location', countryIso.toLowerCase())
  return { site: 'EURES (portal oficial da UE)', url: u.toString(), note: 'vagas de toda a União Europeia' }
}

const INDEED_DOMAIN: Partial<Record<CountryCode, string>> = {
  BR: 'br.indeed.com', PT: 'pt.indeed.com', US: 'www.indeed.com', IT: 'it.indeed.com', ES: 'es.indeed.com',
  FR: 'fr.indeed.com', DE: 'de.indeed.com', CH: 'ch.indeed.com', IE: 'ie.indeed.com', GB: 'uk.indeed.com',
  NL: 'nl.indeed.com', BE: 'be.indeed.com', CA: 'ca.indeed.com',
}

/** Nome do país em inglês para o campo "local" do LinkedIn/Indeed */
const LOCATION_EN: Partial<Record<CountryCode, string>> = {
  BR: 'Brasil', PT: 'Portugal', EU: 'European Union', US: 'United States', IT: 'Italy', ES: 'Spain', FR: 'France',
  DE: 'Germany', CH: 'Switzerland', IE: 'Ireland', GB: 'United Kingdom', NL: 'Netherlands', BE: 'Belgium', CA: 'Canada',
}

const EU_MEMBERS = new Set<CountryCode>(['PT', 'IT', 'ES', 'FR', 'DE', 'IE', 'NL', 'BE'])

/** Links da busca inteligente para um destino */
export function smartLinks(dest: CountryCode, q: SmartQuery): SmartLink[] {
  const role = q.role.trim()
  if (!role) return []
  const query = { ...q, role }

  if (dest === 'BR') {
    const city = onlyRemote(query) ? '' : (q.city ?? '').trim()
    const where = city || 'Brasil'
    const roleRemote = onlyRemote(query) ? `${role} remoto` : role
    return [
      linkedin(query, where),
      indeed('br.indeed.com', query, city),
      { site: 'Gupy', url: `https://portal.gupy.io/job-search/term=${enc(roleRemote)}`, note: 'muitas empresas grandes' },
      { site: 'Vagas.com', url: `https://www.vagas.com.br/vagas-de-${slug(roleRemote)}` },
      { site: 'Catho', url: `https://www.catho.com.br/vagas/${slug(roleRemote)}/` },
    ]
  }

  if (dest === 'PT') {
    return [
      linkedin(query, 'Portugal'),
      indeed('pt.indeed.com', query, 'Portugal', 'Indeed Portugal'),
      { site: 'Net-Empregos', url: `https://www.net-empregos.com/pesquisa-empregos.asp?chaves=${enc(role)}` },
      eures(query, 'PT'),
    ]
  }

  if (dest === 'EU') {
    return [linkedin(query, 'European Union'), eures(query), indeed('de.indeed.com', query, '', 'Indeed Alemanha')]
  }

  const links: SmartLink[] = [linkedin(query, LOCATION_EN[dest] ?? countryInfo(dest).name)]
  const domain = INDEED_DOMAIN[dest]
  if (domain) links.push(indeed(domain, query, '', `Indeed ${countryInfo(dest).name}`))
  if (EU_MEMBERS.has(dest)) links.push(eures(query, dest))
  if (dest === 'US') links.push({ site: 'USAJOBS', url: `https://www.usajobs.gov/search/results/?k=${enc(role)}`, note: 'vagas do governo; quase todas exigem cidadania americana' })
  return links
}
