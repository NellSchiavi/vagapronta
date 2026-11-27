/**
 * Modo reserva SEM IA (custo zero): quando todos os modelos falham, o Adaptar e a
 * Análise continuam funcionando com regras simples de palavras-chave e de estrutura.
 * Nada é inventado: os textos sugeridos só reorganizam o que já está no currículo
 * e deixam lacunas [entre colchetes] para a pessoa completar.
 * Testado em basico.test.ts.
 */
import type { ResumeSections } from './resume.ts'

export const AVISO_BASICO = 'Análise básica: a IA está sobrecarregada agora. Tente a análise completa em alguns minutos.'

export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
}

/** Palavras que não dizem nada sobre a vaga (português, inglês e espanhol, e o "jargão" de anúncio) */
const STOP = new Set(
  (
    'a o as os um uma uns umas de da do das dos e em no na nos nas para por pelo pela pelos pelas com sem sob sobre entre ate ' +
    'que se ou ao aos seu sua seus suas nosso nossa nossos nossas voce voces ele ela eles elas isso este esta esse essa ' +
    'mais muito muita muitos muitas bem como onde quando qual quais ser ter estar ja nao sim tambem todo toda todos todas ' +
    'cada outro outra outros outras mesmo mesma pode podem deve devem sera sao foi tem era ha num numa pelo via etc ' +
    'vaga vagas empresa empresas cargo cargos area areas setor equipe time trabalho trabalhar atuacao atuar atividades ' +
    'atividade responsabilidades responsabilidade requisitos requisito qualificacoes qualificacao desejavel desejaveis ' +
    'obrigatorio obrigatoria diferencial diferenciais beneficios beneficio salario remuneracao horario local regime ' +
    'contratacao clt pj candidato candidata candidatos pessoa pessoas profissional profissionais oportunidade buscamos ' +
    'procuramos procura busca venha junte faca parte nosso nossa sobre descricao principais conhecimento conhecimentos ' +
    'experiencia experiencias vivencia nivel ensino formacao completo completa superior cursando graduacao tecnico ' +
    'dia dias semana mes meses ano anos hora horas segunda sexta sabado domingo periodo integral meio inclusive ' +
    'vale refeicao alimentacao transporte plano saude odontologico seguro vida auxilio bonus participacao lucros ' +
    'gympass wellhub convenio desconto descontos day off home office hibrido presencial remoto modelo ' +
    'the and of to in for with on at an or as is are be you we our your will this that from by job role team work ' +
    'company position requirements responsibilities experience knowledge skills skill years year must should ' +
    'el la los las del para con por una unos unas que en al se su sus es son puesto empresa ' +
    'realizar garantir executar acompanhar apoiar elaborar desenvolver manter assegurar participar efetuar conduzir ' +
    'atender organizar preparar registrar verificar monitorar orientar identificar avaliar implementar promover ' +
    'responsavel responsaveis possuir saber gostar contribuir buscar oferecer oferecemos garantia'
  ).split(' '),
)

/**
 * Termos técnicos e profissionais que valem como palavra-chave mesmo aparecendo uma vez
 * (saúde, laboratório, qualidade, pesquisa clínica e ferramentas comuns).
 */
const KNOWN = [
  'analises clinicas', 'analise clinica', 'bioquimica', 'hematologia', 'microbiologia', 'imunologia', 'parasitologia',
  'urinalise', 'uroanalise', 'citologia', 'citopatologia', 'histologia', 'patologia', 'biologia molecular', 'genetica',
  'pcr', 'rt-pcr', 'qpcr', 'elisa', 'hplc', 'citometria', 'citometria de fluxo', 'espectrofotometria', 'cromatografia',
  'cultura de celulas', 'sequenciamento', 'coleta', 'coleta de sangue', 'puncao venosa', 'triagem', 'hemoterapia',
  'banco de sangue', 'imunohematologia', 'liberacao de laudos', 'laudos', 'controle de qualidade', 'controle de qualidade interno',
  'controle de qualidade externo', 'garantia da qualidade', 'gestao da qualidade', 'sistema de gestao da qualidade',
  'boas praticas de laboratorio', 'boas praticas de fabricacao', 'boas praticas clinicas', 'bpl', 'bpf', 'bpc', 'gcp', 'glp', 'gmp',
  'iso 9001', 'iso 15189', 'iso 17025', 'iso/iec 17025', 'pals', 'dicq', 'acreditacao', 'auditoria', 'auditorias',
  'validacao', 'validacao de metodos', 'calibracao', 'rastreabilidade', 'nao conformidades', 'acoes corretivas', 'capa',
  'pop', 'pops', 'procedimentos operacionais', 'documentacao', 'biosseguranca', 'descarte de residuos', 'pgrss',
  'anvisa', 'rdc', 'rdc 786', 'crbm', 'crf', 'crbio', 'vigilancia sanitaria', 'farmacovigilancia', 'tecnovigilancia',
  'pesquisa clinica', 'estudos clinicos', 'ensaios clinicos', 'monitoria clinica', 'monitor clinico', 'cra', 'crc',
  'coordenacao de estudos', 'protocolo', 'protocolos', 'tcle', 'cep', 'conep', 'ich', 'ich-gcp', 'edc', 'crf eletronico',
  'assuntos regulatorios', 'regulatorio', 'registro de produtos', 'lims', 'sistema lis', 'lis', 'equipamentos',
  'automacao', 'manutencao de equipamentos', 'gestao de estoque', 'compras', 'indicadores', 'kpi', 'kpis',
  'gestao de equipe', 'lideranca', 'treinamento', 'treinamentos', 'atendimento ao cliente', 'atendimento ao paciente',
  'comunicacao', 'trabalho em equipe', 'organizacao', 'proatividade', 'excel', 'excel avancado', 'power bi', 'sap', 'tasy',
  'pacote office', 'word', 'powerpoint', 'python', 'r', 'sql', 'estatistica', 'ingles', 'ingles avancado', 'ingles fluente',
  'espanhol', 'frances', 'alemao', 'italiano', 'cnh', 'disponibilidade para viagens',
]
const KNOWN_SET = new Set(KNOWN)

/** O texto (já normalizado) contém o termo como palavra inteira? Aceita plural simples. */
export function containsTerm(normText: string, term: string): boolean {
  const t = normalize(term).trim()
  if (t.length < 2) return false
  // plural/singular em cada palavra: "analises clinicas" encontra "analise clinica" e vice-versa
  const pattern = t
    .split(/\s+/)
    .map((w) => {
      const esc = w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      return w.length > 3 ? `${esc.replace(/(?:e?s)$/, '')}(?:e?s?)` : esc
    })
    .join('\\s+')
  return new RegExp(`(^|[^a-z0-9])${pattern}(?=$|[^a-z0-9])`).test(normText)
}

const isVerbLike = (w: string) => /(ando|endo|indo|mente)$/.test(w) && w.length > 5
const goodWord = (w: string) => w.length >= 3 && !STOP.has(w) && !/^\d+$/.test(w) && !isVerbLike(w)

/** Trecho de requisitos/qualificações do anúncio (onde ficam as palavras-chave mais importantes) */
function requirementsPart(norm: string) {
  const m = /(requisitos|qualificacoes|o que buscamos|o que esperamos|perfil desejado|conhecimentos|requirements|qualifications)/.exec(norm)
  return m ? norm.slice(m.index) : ''
}

/**
 * Palavras-chave do anúncio, da mais para a menos importante.
 * Junta termos conhecidos (KNOWN), siglas (LIMS, ISO, POP) e palavras/pares que se repetem.
 */
export function jobKeywords(jobText: string, max = 14): string[] {
  const norm = normalize(jobText)
  const req = requirementsPart(norm)
  const scores = new Map<string, number>()
  const display = new Map<string, string>()
  const add = (key: string, pts: number, shown?: string) => {
    scores.set(key, (scores.get(key) ?? 0) + pts)
    if (shown && !display.has(key)) display.set(key, shown)
  }

  // 1. termos conhecidos (os mais longos primeiro, para "controle de qualidade interno" vencer "controle de qualidade")
  const known = [...KNOWN].sort((a, b) => b.length - a.length)
  const taken: string[] = []
  for (const k of known) {
    if (!containsTerm(norm, k)) continue
    if (taken.some((t) => t.includes(k))) continue
    taken.push(k)
    add(k, 4 + (req && containsTerm(req, k) ? 2 : 0))
  }

  // 2. siglas escritas em maiúsculas no anúncio (ex.: LIMS, POP, ISO, HPLC)
  for (const m of jobText.matchAll(/\b([A-Z][A-Z0-9]{1,6}(?:[-/][A-Z0-9]{1,6})?)\b/g)) {
    const raw = m[1]
    const key = normalize(raw)
    if (STOP.has(key) || /^(CLT|PJ|VR|VA|PLR|CNPJ|CPF|RH|SP|RJ|MG|PR|RS|SC|BA|PE|CE|DF|GO|ES|PT|BR|EUA|LTDA|SA)$/.test(raw)) continue
    if (taken.some((t) => t === key || t.split(' ').includes(key))) continue
    add(key, 3, raw)
  }

  // 3. palavras e pares de palavras que se repetem (ou aparecem nos requisitos)
  const tokens = norm.split(/[^a-z0-9+#]+/).filter(Boolean)
  const counts = new Map<string, number>()
  for (let i = 0; i < tokens.length; i++) {
    const w = tokens[i]
    if (goodWord(w)) counts.set(w, (counts.get(w) ?? 0) + 1)
    // par "palavra palavra" ou "palavra de palavra" (ex.: "biologia molecular", "gestao de pessoas")
    const n1 = tokens[i + 1]
    const n2 = tokens[i + 2]
    if (goodWord(w) && n1 && goodWord(n1)) counts.set(`${w} ${n1}`, (counts.get(`${w} ${n1}`) ?? 0) + 1)
    if (goodWord(w) && (n1 === 'de' || n1 === 'em') && n2 && goodWord(n2)) {
      counts.set(`${w} ${n1} ${n2}`, (counts.get(`${w} ${n1} ${n2}`) ?? 0) + 1)
    }
  }
  for (const [k, c] of counts) {
    if (scores.has(k) || taken.some((t) => t.includes(k) || k.includes(t))) continue
    const inReq = req && containsTerm(req, k)
    const isPair = k.includes(' ')
    if (c >= 2 || (inReq && isPair && k.split(' ').length === 2)) add(k, c + (inReq ? 1 : 0) + (isPair ? 1 : 0))
  }

  // pares cobrem as palavras soltas que os formam
  const ranked = [...scores.entries()].sort((a, b) => b[1] - a[1] || b[0].length - a[0].length)
  const out: string[] = []
  for (const [k] of ranked) {
    if (out.some((o) => o.split(' ').includes(k) || (k.includes(' ') && k.split(' ').every((w) => o.includes(w))))) continue
    out.push(k)
    if (out.length >= max) break
  }
  return out.map((k) => display.get(k) ?? prettify(k, jobText))
}

/** Volta o termo para a grafia do anúncio (com acentos e maiúsculas), se achar */
function prettify(key: string, original: string): string {
  const words = original.split(/(\s+)/)
  const target = key.split(' ')
  const plain = words.filter((w) => w.trim()).map((w) => w.replace(/[^\p{L}\p{N}+#/-]/gu, ''))
  for (let i = 0; i + target.length <= plain.length; i++) {
    const slice = plain.slice(i, i + target.length)
    if (slice.map((w) => normalize(w)).join(' ') === key) {
      const s = slice.join(' ')
      // tudo em maiúsculas vira só a primeira maiúscula (exceto siglas curtas)
      return s === s.toUpperCase() && s.length > 5 ? s.charAt(0) + s.slice(1).toLowerCase() : s.charAt(0).toUpperCase() + s.slice(1)
    }
  }
  return key.charAt(0).toUpperCase() + key.slice(1)
}

/** Texto do currículo usado na comparação (sem contato) */
export function resumeComparableText(s: ResumeSections | null | undefined, rawText = ''): string {
  if (!s) return normalize(rawText)
  return normalize(
    [
      s.resumo ?? '',
      ...(s.experiencias ?? []).flatMap((e) => [e.cargo, e.empresa, e.descricao ?? '']),
      ...(s.formacao ?? []).flatMap((f) => [f.curso, f.instituicao]),
      ...(s.habilidades ?? []),
      ...(s.cursos ?? []),
      ...(s.idiomas ?? []),
    ].join(' \n '),
  )
}

export interface KeywordMatch {
  palavras: string[]
  presentes: string[]
  faltando: string[]
  /** % das palavras-chave da vaga que já estão no currículo */
  compat: number
}

export function compareKeywords(jobText: string, resumeNorm: string): KeywordMatch {
  const palavras = jobKeywords(jobText)
  const presentes = palavras.filter((k) => containsTerm(resumeNorm, k))
  const faltando = palavras.filter((k) => !presentes.includes(k))
  const compat = palavras.length ? Math.round((100 * presentes.length) / palavras.length) : 50
  return { palavras, presentes, faltando, compat: Math.max(10, Math.min(95, compat)) }
}

/** Título da vaga: o informado pelo site ou a primeira linha que parece um título */
export function guessJobTitle(jobText: string, fallback?: string): string {
  if (fallback) return fallback.slice(0, 160)
  const line = jobText
    .split('\n')
    .map((l) => l.trim())
    .find((l) => l.length > 3 && l.length <= 120 && !/^(sobre|descri|about|vaga\s*:?$)/i.test(l))
  return (line ?? 'Vaga').replace(/^(vaga|cargo)\s*:\s*/i, '').slice(0, 160)
}

const lacuna = (s: string) => `[${s.length > 38 ? `${s.slice(0, 37)}…` : s}]`
const sentence = (s: string) => s.trim().replace(/[.;,\s]*$/, '.')

export interface BasicChange {
  secao: 'resumo' | 'experiencia' | 'formacao' | 'habilidades'
  titulo: string
  motivo: string
  antes: string
  depois: string
  impacto: number
}

/**
 * Adaptação sem IA: palavras-chave que faltam (para a pessoa marcar só as que domina),
 * o cargo da vaga no resumo e onde contar a experiência com o termo mais importante.
 */
export function basicAdaptation(input: {
  jobText: string
  sections: ResumeSections
  title?: string
  company?: string
  location?: string
  /** idioma da versão do currículo; os textos novos só são sugeridos em português */
  language?: string | null
}) {
  const s = input.sections
  const resumeNorm = resumeComparableText(s)
  const m = compareKeywords(input.jobText, resumeNorm)
  const titulo = guessJobTitle(input.jobText, input.title)
  const portuguese = !input.language || input.language.startsWith('pt')
  const perKeyword = m.palavras.length ? 100 / m.palavras.length : 0
  const mudancas: BasicChange[] = []

  if (m.faltando.length) {
    const items = m.faltando.slice(0, 10)
    mudancas.push({
      secao: 'habilidades',
      titulo: 'Inclua as palavras-chave da vaga que você domina',
      motivo: 'O anúncio cita estes termos e eles não aparecem no seu currículo. Marque só os que você realmente sabe fazer.',
      antes: '',
      depois: items.join(', '),
      impacto: Math.min(30, Math.round(items.length * perKeyword)),
    })
  }

  // cargo da vaga no resumo (os sistemas das empresas comparam os títulos)
  const resumo = s.resumo?.trim() ?? ''
  if (portuguese && !containsTerm(normalize(resumo), titulo)) {
    const destaque = m.presentes.filter((k) => !containsTerm(normalize(resumo), k)).slice(0, 4)
    const extra = destaque.length ? ` Conhecimento em ${destaque.join(', ')}.` : ''
    mudancas.push({
      secao: 'resumo',
      titulo: 'Coloque o nome do cargo da vaga no resumo',
      motivo: 'Os sistemas das empresas comparam o seu resumo com o título da vaga. Revise o texto antes de salvar.',
      antes: resumo,
      depois: `Objetivo: ${titulo}.${resumo ? ` ${sentence(resumo)}` : ''}${extra}`,
      impacto: 8,
    })
  }

  // onde incluir o termo que falta mais importante: na experiência mais recente com descrição
  const exp = (s.experiencias ?? []).find((e) => (e.descricao ?? '').trim().length > 10)
  const termo = m.faltando[0]
  if (portuguese && exp && termo) {
    const antes = exp.descricao!.replace(/\s+/g, ' ').trim()
    mudancas.push({
      secao: 'experiencia',
      titulo: `Se você já trabalhou com ${/^[A-Z][a-zà-ú]/.test(termo) ? termo.charAt(0).toLowerCase() + termo.slice(1) : termo}, conte em ${exp.cargo}`,
      motivo: `A vaga pede "${termo}". Se você fez isso em ${exp.empresa}, descreva com suas palavras no lugar da lacuna; se não fez, desmarque.`,
      antes,
      depois: `${sentence(antes)} ${lacuna(`como você usou ${termo}`)}`,
      impacto: Math.max(2, Math.round(perKeyword)),
    })
  }

  return {
    vaga: { titulo, empresa: input.company, local: input.location, modalidade: undefined, resumo: '' },
    compat_antes: m.compat,
    palavras_chave: m.palavras,
    palavras_presentes: m.presentes,
    palavras_faltando: m.faltando,
    mudancas,
    basica: true as const,
    aviso: AVISO_BASICO,
  }
}

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)))
const wordCount = (s: string) => s.trim().split(/\s+/).filter(Boolean).length

/**
 * Análise sem IA: confere a estrutura (seções, contato, descrições, números)
 * e se o cargo desejado aparece. Sugestões só com lacunas para completar.
 */
export function basicAnalysis(s: ResumeSections | null | undefined, desiredRole?: string | null) {
  const sec = s ?? ({ experiencias: [], formacao: [], habilidades: [], idiomas: [], cursos: [] } as unknown as ResumeSections)
  const exps = sec.experiencias ?? []
  const withDesc = exps.filter((e) => wordCount(e.descricao ?? '') >= 8)
  const withNumbers = exps.filter((e) => /\d/.test(e.descricao ?? ''))
  const resumo = sec.resumo?.trim() ?? ''
  const skills = sec.habilidades?.length ?? 0
  const contact = sec.contato ?? {}
  const role = desiredRole?.trim() ?? ''
  const allNorm = resumeComparableText(sec)
  const roleMentioned = role ? containsTerm(allNorm, role) || role.split(/\s+/).some((w) => w.length > 4 && containsTerm(allNorm, w)) : true

  const estrutura = clamp(
    (resumo ? 20 : 0) + (exps.length ? 25 : 0) + (sec.formacao?.length ? 20 : 0) + (skills >= 3 ? 15 : skills * 5) +
      (contact.email || contact.telefone ? 10 : 0) + (sec.idiomas?.length ? 10 : 0),
  )
  const resumoOk = resumo.length >= 120 && resumo.length <= 700
  const clareza = clamp(40 + (resumoOk ? 20 : resumo ? 10 : 0) + (exps.length ? (30 * withDesc.length) / exps.length : 0) + (withNumbers.length ? 10 : 0))
  const palavras = clamp(30 + Math.min(40, skills * 5) + (roleMentioned ? 20 : 0) + ((sec.cursos?.length ?? 0) ? 10 : 0))
  const ats = clamp(estrutura * 0.5 + palavras * 0.3 + (contact.email ? 20 : 10))
  const overall = clamp((estrutura + clareza + palavras + ats) / 4)

  const suggestions: { secao: BasicChange['secao']; titulo: string; explicacao: string; antes: string; depois: string }[] = []
  if (!resumo) {
    suggestions.push({
      secao: 'resumo',
      titulo: 'Crie um resumo profissional',
      explicacao: 'Três linhas no topo ajudam quem lê a entender seu perfil em poucos segundos. Complete as lacunas com suas palavras.',
      antes: '',
      depois: `${role || '[seu cargo]'} com experiência em [suas principais áreas]. ${lacuna('seu diferencial em uma frase')}`,
    })
  } else if (role && !containsTerm(normalize(resumo), role)) {
    suggestions.push({
      secao: 'resumo',
      titulo: 'Coloque o cargo que você procura no resumo',
      explicacao: 'Os sistemas das empresas comparam o resumo com o título das vagas.',
      antes: resumo,
      depois: `Objetivo: ${role}. ${sentence(resumo)}`,
    })
  }
  const semNumero = exps.find((e) => wordCount(e.descricao ?? '') >= 5 && !/\d/.test(e.descricao ?? ''))
  if (semNumero) {
    const antes = semNumero.descricao!.replace(/\s+/g, ' ').trim()
    suggestions.push({
      secao: 'experiencia',
      titulo: `Mostre um resultado com números em ${semNumero.cargo}`,
      explicacao: 'Números mostram o tamanho do seu trabalho (exames por dia, pessoas atendidas, prazos). Use um valor real.',
      antes,
      depois: `${sentence(antes)} ${lacuna('um resultado com número')}`,
    })
  }

  const notes: string[] = []
  if (!resumo) notes.push('falta um resumo no topo')
  if (exps.length && withDesc.length < exps.length) notes.push('algumas experiências estão sem descrição')
  if (skills < 5) notes.push('a lista de habilidades está curta')
  if (!sec.idiomas?.length) notes.push('não há idiomas')
  if (role && !roleMentioned) notes.push('o cargo que você procura não aparece')
  const summary = `Análise básica, sem IA: confere a estrutura do currículo. ${
    notes.length ? `Pontos de atenção: ${notes.join('; ')}.` : 'A estrutura está completa.'
  } Para dicas sob medida, analise de novo em alguns minutos.`

  return {
    overall_score: overall,
    scores: { ats, palavras_chave: palavras, estrutura, clareza, basica: true as const },
    summary: summary.slice(0, 500),
    suggestions,
  }
}
