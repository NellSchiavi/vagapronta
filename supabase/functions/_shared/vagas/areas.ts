/**
 * Áreas de atuação por profissão (arquivo único, usado pela busca de vagas e
 * pela tela; testes em areas.test.ts). Para ampliar, acrescente uma profissão
 * ou uma área em PROFESSIONS — nada mais precisa mudar:
 *  - detect:   como reconhecer a profissão (cargos desejados, registro profissional)
 *  - terms:    termos de busca por país; "en" vale para as fontes em inglês e para
 *              os países sem lista própria
 *  - signals:  palavras que mostram que uma vaga é da área. No título valem muito;
 *              no anúncio/empresa valem pouco (é preciso 2 para contar)
 *  - requires: (opcional) contexto obrigatório em algum lugar da vaga
 *              (ex.: "Qualidade" só conta em saúde/laboratório, não em call center)
 *  - avoid:    palavras que a profissão costuma querer EXCLUIR (sugeridas nas preferências)
 *  - offTopic: vagas parecidas no nome, mas de outra área: vão para o fim da lista
 *  - keep:     exceções do offTopic (contam como da área mesmo assim)
 * Termos conferidos em 21/11/2026 (Jooble BR/PT, Vagas.com, Gupy, SNS/ACSS).
 */
import { normalize } from './regras.ts'

export interface JobArea {
  id: string
  /** nome curto do chip (ex.: "Qualidade") */
  label: string
  /** frase para a tela de preferências */
  description: string
  terms: { BR?: string[]; PT?: string[]; en: string[] }
  signals: string[]
  requires?: string[]
}

/** contexto de saúde e laboratório clínico (redes conhecidas no BR e em PT incluídas) */
const HEALTH_LAB = [
  'laboratorio', 'laboratory', 'analises clinicas', 'clinic', 'saude', 'health', 'hospital', 'farmac', 'pharma', 'diagnostic',
  'medic', 'acreditacao', '15189', 'biomedic', 'pesquisa clinica', 'ensaios clinicos', 'dasa', 'fleury', 'pardini', 'sabin',
  'unilabs', 'synlab', 'germano de sousa', 'joaquim chaves', 'lusiadas', 'cuf',
]

export interface Profession {
  id: string
  label: string
  detect: RegExp
  areas: JobArea[]
  avoid: string[]
  offTopic: RegExp[]
  /** como offTopic, mas só no título da vaga */
  offTopicTitle?: RegExp[]
  keep: RegExp[]
}

export const PROFESSIONS: Profession[] = [
  {
    id: 'biomedicina',
    label: 'Biomedicina e laboratório',
    detect: /\b(biom[eé]dic[oa]s?|biomedicina|crbm|an[aá]lises cl[ií]nicas|laborat[oó]rio cl[ií]nico)\b/i,
    areas: [
      {
        id: 'laboratorio',
        label: 'Laboratório',
        description: 'Rotina do laboratório clínico: análises, coleta, liberação de laudos',
        terms: {
          BR: ['biomédico análises clínicas', 'analista de laboratório clínico', 'biomédico laboratório', 'análises clínicas'],
          PT: ['técnico de análises clínicas', 'TSDT análises clínicas', 'cientista biomédico', 'técnico de laboratório clínico'],
          en: ['clinical laboratory scientist', 'medical laboratory scientist', 'biomedical scientist'],
        },
        signals: [
          'analises clinicas', 'laboratorio clinico', 'biomedic', 'hematologia', 'bioquimica', 'imunologia', 'microbiologia',
          'urinalise', 'parasitologia', 'coleta', 'colheita', 'tsdt', 'clinical laboratory', 'medical laboratory', 'biomedical scientist',
          'analista de laboratorio', 'analista laboratorio', 'tecnico de laboratorio', 'tecnica de laboratorio', 'auxiliar de laboratorio',
          // redes de laboratório clínico (aparecem no nome da empresa)
          'dasa', 'fleury', 'hermes pardini', 'sabin', 'db diagnosticos', 'alta diagnosticos', 'lavoisier', 'unilabs', 'synlab',
          'germano de sousa', 'joaquim chaves', 'lumilabo', 'cintramedica',
        ],
      },
      {
        id: 'gestao',
        label: 'Gestão',
        description: 'Coordenação, supervisão e responsabilidade técnica do laboratório',
        terms: {
          // sempre com "clínico"/"análises clínicas": sem isso a busca traz laboratório industrial
          BR: [
            'coordenador de análises clínicas', 'responsável técnico laboratório clínico', 'supervisor de laboratório clínico',
            'líder técnico laboratório clínico', 'gestão da qualidade laboratorial', 'gerente de laboratório clínico',
          ],
          PT: [
            'coordenador de laboratório de análises clínicas', 'diretor técnico laboratório análises clínicas',
            'responsável técnico laboratório clínico', 'gestor de laboratório clínico',
          ],
          en: ['clinical laboratory manager', 'clinical laboratory supervisor'],
        },
        signals: [
          'coordenador de laboratorio', 'coordenadora de laboratorio', 'supervisor tecnico', 'supervisora tecnica', 'gerente de laboratorio',
          'coordenador de analises clinicas', 'coordenadora de analises clinicas', 'supervisor de laboratorio', 'supervisora de laboratorio',
          'gestao da qualidade laboratorial', 'gestor da qualidade laboratorial',
          'responsavel tecnic', 'gestor de laboratorio', 'gestora de laboratorio', 'diretor tecnico', 'diretora tecnica', 'lider tecnic',
          'laboratory manager', 'lab manager', 'laboratory supervisor',
        ],
      },
      {
        id: 'qualidade',
        label: 'Qualidade',
        description: 'Controle e garantia da qualidade, acreditação (PALC, DICQ, ONA, ISO 15189)',
        terms: {
          BR: ['analista da qualidade laboratório', 'garantia da qualidade', 'controle de qualidade laboratório', 'acreditação laboratório'],
          PT: ['técnico da qualidade laboratório', 'gestor da qualidade laboratório', 'ISO 15189', 'garantia de qualidade'],
          en: ['quality assurance laboratory', 'quality control laboratory', 'ISO 15189'],
        },
        signals: [
          'qualidade', 'quality', 'acreditacao', 'accreditation', 'palc', 'dicq', ' ona ', 'iso 15189', 'iso 17025', 'iso 9001',
          'westgard', 'controle interno', 'controle externo', 'boas praticas', 'gmp', 'bpf', 'ipac',
        ],
        requires: HEALTH_LAB,
      },
      {
        id: 'pesquisa',
        label: 'Pesquisa clínica',
        description: 'Estudos e ensaios clínicos: coordenação, monitoria (CRA), assistência',
        terms: {
          BR: ['pesquisa clínica', 'coordenador de estudos clínicos', 'assistente de pesquisa clínica', 'monitor clínico CRA'],
          PT: ['ensaios clínicos', 'coordenador de ensaios clínicos', 'clinical research associate', 'study coordinator'],
          en: ['clinical research associate', 'clinical research coordinator', 'clinical trial assistant'],
        },
        signals: [
          'pesquisa clinica', 'estudos clinicos', 'estudo clinico', 'ensaios clinicos', 'ensaio clinico', 'clinical research',
          'clinical trial', 'study coordinator', 'monitor clinico', 'monitora clinica', ' cra ', ' cta ', ' cro ', 'boas praticas clinicas', 'gcp',
        ],
      },
    ],
    avoid: ['estética', 'esteta', 'harmonização', 'harmonização facial', 'estética avançada', 'injetáveis', 'micropigmentação', 'tricologia', 'depilação a laser'],
    offTopic: [
      /\bengenh\w* biomedic\w*/,
      /\bbiomedical (engineer\w*|imaging|signals?|data|microfluidics)\b/,
      /\b(tecnico|tecnica|manutencao) (em |de )?equipamentos?\b/,
      /\bequipamentos? (biomedicos|medicos|hospitalares)\b/,
      /\blaboratorio \(?(quimico|fisico.?quimico|de alimentos|industrial|de tintas|ambiental|eletrico|de solos|de materiais)\b/,
      /\banalista de laboratorio (quimico|fisico.?quimico|eletrico|industrial)\b/,
      /\b(industria|fabrica) (de |da |do )?(alimentos|alimenticia|tintas|quimica|petroquimica|bebidas|cosmeticos|plasticos)\b/,
      /\b(alimentos|alimentar|lacticinios|laticinios|conserveira|tintas|petroquimic\w*|siderurg\w*|metalurg\w*|metalomecanic\w*|polimeros|ceramica|cimento|cortica|textil)\b/,
    ],
    // só no título ("recepção de amostras" no anúncio é do laboratório)
    offTopicTitle: [/\boperador(a)? de laboratorio\b/, /\b(engenharia clinica|qualidade e performance|recepcionista|recepcao)\b/],
    keep: [/\bfarmac\w*|\bpharma\w*/],
  },
  {
    id: 'dados',
    label: 'Dados e tecnologia',
    detect: /\b(dados|data|engenheir[oa] de (dados|software)|cientista de dados|desenvolvedor\w*|developer|python|sql|power bi|machine learning)\b/i,
    areas: [
      {
        id: 'engenharia-dados',
        label: 'Engenharia de dados',
        description: 'Pipelines, ETL, data lake e cloud',
        terms: { BR: ['engenheiro de dados'], PT: ['engenheiro de dados', 'data engineer'], en: ['data engineer'] },
        signals: ['engenheiro de dados', 'engenheira de dados', 'data engineer', 'etl', 'pipeline', 'airflow', 'spark', 'databricks', 'dbt'],
      },
      {
        id: 'analise-dados',
        label: 'Análise de dados e BI',
        description: 'Indicadores, dashboards, SQL e Power BI',
        terms: { BR: ['analista de dados', 'analista de BI'], PT: ['analista de dados', 'data analyst'], en: ['data analyst', 'BI analyst'] },
        signals: ['analista de dados', 'data analyst', 'business intelligence', ' bi ', 'power bi', 'dashboard', 'tableau', 'looker'],
      },
      {
        id: 'ciencia-dados',
        label: 'Ciência de dados e IA',
        description: 'Modelos, machine learning e IA generativa',
        terms: { BR: ['cientista de dados', 'engenheiro de machine learning'], PT: ['cientista de dados', 'machine learning engineer'], en: ['data scientist', 'machine learning engineer'] },
        signals: ['cientista de dados', 'data scientist', 'machine learning', 'ciencia de dados', 'deep learning', 'llm', 'inteligencia artificial', ' ia ', ' ai '],
      },
      {
        id: 'desenvolvimento',
        label: 'Desenvolvimento',
        description: 'Back-end e automação, principalmente em Python',
        terms: { BR: ['desenvolvedor python'], PT: ['programador python', 'python developer'], en: ['python developer'] },
        signals: ['desenvolvedor', 'developer', 'programador', 'software engineer', 'back-end', 'backend', 'python', 'django', 'fastapi'],
      },
    ],
    avoid: [],
    offTopic: [/\b(help ?desk|suporte tecnico|tecnico de suporte|service desk|televendas|call ?center)\b/],
    keep: [],
  },
]

// ------------------------------------------------------------ consultas

/** Profissões da pessoa, pelos cargos desejados, áreas e registro profissional */
export function detectProfessions(texts: (string | null | undefined)[]): Profession[] {
  const t = texts.filter(Boolean).join(' \n ')
  return PROFESSIONS.filter((p) => p.detect.test(t))
}

/** Área (de qualquer profissão) pelo id ou pelo nome do chip, sem diferença de acentos */
export function findArea(idOrLabel: string): { profession: Profession; area: JobArea } | null {
  const key = normalize(idOrLabel.trim())
  for (const profession of PROFESSIONS) {
    const area = profession.areas.find((a) => a.id === key || normalize(a.label) === key)
    if (area) return { profession, area }
  }
  return null
}

/** As áreas escolhidas que existem na configuração (as outras são texto livre) */
export function knownAreas(chosen: string[]): JobArea[] {
  const out: JobArea[] = []
  for (const c of chosen) {
    const hit = findArea(c)
    if (hit && !out.some((a) => a.id === hit.area.id)) out.push(hit.area)
  }
  return out
}

export interface SearchTerm {
  /** termo para as fontes do país (ex.: Jooble BR em português) */
  local: string
  /** termo para as fontes em inglês (vagas remotas) */
  en: string
}

/**
 * Termos de busca para um destino. Com áreas escolhidas: 2 termos da área
 * preferida e 1 de cada outra (os termos das áreas já cobrem o cargo). Sem áreas:
 * os 2 primeiros cargos (como antes). No máximo `max` termos, para poupar as fontes.
 */
export function searchTerms(
  dest: string,
  roles: string[],
  chosenAreas: string[],
  preferred: string | null,
  toEnglish: (s: string) => string,
  max = 5,
): SearchTerm[] {
  const areas = knownAreas(chosenAreas)
  const pref = preferred ? findArea(preferred)?.area.id : null
  const ordered = [...areas].sort((a, b) => Number(b.id === pref) - Number(a.id === pref))

  const out: SearchTerm[] = []
  const push = (local: string, en: string) => {
    const k = normalize(local)
    if (local.trim() && !out.some((t) => normalize(t.local) === k)) out.push({ local, en: en || toEnglish(local) })
  }
  if (!ordered.length) {
    for (const r of roles.slice(0, 2)) push(r, toEnglish(r))
    return out.slice(0, max)
  }
  for (const a of ordered) {
    const local = (dest === 'BR' || dest === 'PT' ? a.terms[dest] : undefined) ?? a.terms.en
    const n = a.id === pref ? 2 : 1
    local.slice(0, n).forEach((t, i) => push(t, a.terms.en[i] ?? a.terms.en[0]))
  }
  return out.slice(0, max)
}

// ---------------------------------------------------------- classificação

type JobLike = { title: string; description?: string | null; company?: string | null }

/** texto comparável: sem acentos, sem "(a)" de "Coordenador(a)", só letras e números */
const plain = (s: string) => ` ${normalize(s).replace(/\((a|o|as|os|es)\)/g, '').replace(/[^a-z0-9]+/g, ' ')} `
const haystack = (j: JobLike) => plain(`${j.title} ${j.company ?? ''} ${(j.description ?? '').slice(0, 800)}`)
const titleOf = (j: JobLike) => plain(j.title)
/** frase mais longa = mais específica ("coordenador de laboratorio" vence "laboratorio") */
const specificity = (s: string) => s.trim().split(/\s+/).length
/**
 * Sinal no texto: palavras curtas ou marcadas com espaços (" bi ", " cra ") só
 * contam como palavra inteira; as outras valem como começo de palavra ("biomedic").
 */
function hasSignal(text: string, s: string): boolean {
  const n = normalize(s).trim().replace(/[^a-z0-9]+/g, ' ')
  const whole = /^\s|\s$/.test(s) || n.length <= 4
  return text.includes(whole ? ` ${n} ` : ` ${n}`)
}

/**
 * Áreas a que a vaga pertence, da mais forte para a mais fraca
 * (sinal no título vale mais que no anúncio).
 */
export function jobAreas(job: JobLike, areas: JobArea[]): JobArea[] {
  const title = titleOf(job)
  const all = haystack(job)
  return areas
    .filter((a) => !a.requires || a.requires.some((s) => hasSignal(all, s)))
    .map((a) => ({ a, w: a.signals.reduce((n, s) => n + (hasSignal(title, s) ? 3 + specificity(s) : hasSignal(all, s) ? 1 : 0), 0) }))
    // um sinal só no anúncio é fraco demais (ex.: "atendimento com qualidade")
    .filter((x) => x.w >= 2)
    .sort((x, y) => y.w - x.w)
    .map((x) => x.a)
}

/** Vaga parecida no nome, mas de outra área (ex.: engenharia biomédica para biomédica) */
export function isOffTopic(job: JobLike, professions: Profession[]): boolean {
  const title = normalize(job.title)
  const text = normalize(`${job.title} ${job.company ?? ''} ${(job.description ?? '').slice(0, 400)}`)
  return professions.some((p) => {
    if (!p.offTopic.some((re) => re.test(title) || re.test(text)) && !p.offTopicTitle?.some((re) => re.test(title))) return false
    // indústria farmacêutica com foco em qualidade ou pesquisa clínica conta como da área
    const kept = p.keep.some((re) => re.test(text)) && jobAreas(job, p.areas.filter((a) => a.id === 'qualidade' || a.id === 'pesquisa')).length > 0
    return !kept
  })
}

/**
 * Ajuste da compatibilidade pela área: +10 na área preferida, +5 em outra área
 * escolhida, −30 para vaga fora da área (vai para o fim da lista).
 */
export function areaAdjustment(job: JobLike, chosen: JobArea[], preferred: string | null, professions: Profession[]): { delta: number; area: string | null; offTopic: boolean } {
  if (isOffTopic(job, professions)) return { delta: -30, area: null, offTopic: true }
  const hit = jobAreas(job, chosen)[0] ?? null
  if (!hit) return { delta: 0, area: null, offTopic: false }
  const pref = preferred ? findArea(preferred)?.area.id : null
  return { delta: hit.id === pref ? 10 : 5, area: hit.id, offTopic: false }
}
