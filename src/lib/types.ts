/**
 * Tipos de domínio do app, construídos sobre os tipos gerados do banco
 * (src/lib/database.types.ts — regenere com "npm run db:types").
 * Aqui os campos de texto com valores fixos viram uniões ("nova" | "salva"…).
 */
import type { Database } from '@/lib/database.types'
import type { ApplicationStatus } from '@/components/brand/pills'

type Row<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']

export type { ApplicationStatus }
export type JobSource = 'jobicy' | 'himalayas' | 'arbeitnow' | 'remotive' | 'jooble' | 'usajobs' | 'adzuna' | 'exemplo' | 'link' | 'manual'
export type JobStatus = 'nova' | 'salva' | 'descartada'
export type WorkMode = 'presencial' | 'hibrido' | 'remoto'
export type LetterTone = 'formal' | 'caloroso' | 'direto'

export type ReqStatus = 'atende' | 'parcial' | 'nao_atende'

/** Um requisito da vaga conferido no currículo ORIGINAL */
export interface Requirement {
  requisito: string
  tipo: 'obrigatorio' | 'desejavel'
  categoria: 'experiencia' | 'formacao' | 'registro' | 'ferramenta' | 'idioma' | 'outro'
  status: ReqStatus
  /** trecho do currículo que comprova ("" quando não há) */
  evidencia: string
  /** dica honesta para "parcial" e "nao_atende" */
  dica: string
}

/** Aderência aos requisitos: quanto a pessoa realmente atende ao que a vaga pede (nota principal) */
export interface Adherence {
  nota: number
  /** teto aplicado por requisito obrigatório não atendido (70) ou atendido em parte (85) */
  teto: number | null
  limitada?: boolean
  requisitos: Requirement[]
  /** checklist feito sem IA */
  basica?: boolean
}

export interface MatchNotes {
  pontos_fortes?: string[]
  lacunas?: string[]
  /** compatibilidade estimada pela busca (sem IA) */
  estimada?: boolean
  /** palavras do currículo encontradas no anúncio */
  termos?: string[]
  /** vaga de exemplo (fonte ainda não ligada) */
  exemplo?: boolean
  /** área da vaga (id em areas.ts), calculada na busca */
  area?: string
  /** parecida no nome, mas de outra área (ex.: engenharia biomédica): fica no fim */
  fora_da_area?: boolean
  /** nota de palavras-chave da vaga (quanto o currículo usa os termos do anúncio) */
  palavras?: number
  /** aderência aos requisitos; quando existe, "compatibility" guarda esta nota */
  aderencia?: Adherence
}

export type Job = Omit<Row<'jobs'>, 'source' | 'status' | 'work_mode' | 'match_notes'> & {
  source: JobSource
  status: JobStatus
  work_mode: WorkMode | null
  match_notes: MatchNotes
}

export type Application = Omit<Row<'applications'>, 'status'> & { status: ApplicationStatus }

export type CoverLetter = Omit<Row<'cover_letters'>, 'tone'> & { tone: LetterTone }

export type ResumeSection = 'resumo' | 'experiencia' | 'formacao' | 'habilidades'

export interface AnalysisScores {
  ats: number
  palavras_chave: number
  estrutura: number
  clareza: number
  /** análise básica, sem IA (a IA estava sobrecarregada) */
  basica?: boolean
}

export interface AnalysisSuggestion {
  secao: ResumeSection
  titulo: string
  explicacao: string
  antes: string
  depois: string
  aplicada: boolean
}

export type ResumeAnalysis = Omit<Row<'resume_analyses'>, 'scores' | 'suggestions'> & {
  scores: AnalysisScores
  suggestions: AnalysisSuggestion[]
}

export type AiUsage = Row<'ai_usage'>

/** Carta gerada pela IA (ainda não salva) */
export interface GeneratedLetter {
  titulo: string
  carta: string
  tone: LetterTone
  job_id: string | null
  job_text: string | null
}

export const TONE_HELP: Record<LetterTone, string> = {
  formal: 'Respeitoso e objetivo. Bom para bancos, indústria e órgãos públicos.',
  caloroso: 'Próximo e entusiasmado, sem exageros. Bom para varejo, saúde e educação.',
  direto: 'Frases curtas, vai direto às qualificações.',
}

/** Uma mudança proposta pela adaptação à vaga (mesmo formato aplicável das sugestões) */
export interface AdaptChange {
  secao: ResumeSection
  titulo: string
  motivo: string
  antes: string
  depois: string
  /** pontos percentuais de palavras-chave que a mudança acrescenta */
  impacto: number
  /** palavras-chave da vaga que esta mudança acrescenta ao currículo */
  cobre?: string[]
}

/** Resultado da função adaptar-vaga (nada é salvo até a pessoa confirmar) */
export interface Adaptation {
  vaga: { titulo: string; empresa?: string; local?: string; modalidade?: WorkMode | null; resumo: string }
  /** palavras-chave da vaga: hoje e com todas as mudanças */
  compat_antes: number
  compat_depois: number
  /** aderência aos requisitos (nota principal), sobre o currículo ORIGINAL */
  aderencia?: Adherence | null
  palavras_chave: string[]
  mudancas: AdaptChange[]
  vaga_texto: string
  vaga_url: string | null
  job_id: string | null
  /** análise básica por palavras-chave, sem IA (a IA estava sobrecarregada) */
  basica?: boolean
  aviso?: string
  palavras_presentes?: string[]
  palavras_faltando?: string[]
}

export const WORK_MODE_LABEL: Record<WorkMode, string> = {
  presencial: 'Presencial',
  hibrido: 'Híbrido',
  remoto: 'Remoto',
}

export const TONE_LABEL: Record<LetterTone, string> = {
  formal: 'Formal',
  caloroso: 'Caloroso',
  direto: 'Direto',
}
