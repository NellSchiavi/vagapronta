/**
 * Tipos de domínio do app, construídos sobre os tipos gerados do banco
 * (src/lib/database.types.ts — regenere com "npm run db:types").
 * Aqui os campos de texto com valores fixos viram uniões ("nova" | "salva"…).
 */
import type { Database } from '@/lib/database.types'
import type { ApplicationStatus } from '@/components/brand/pills'

type Row<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']

export type { ApplicationStatus }
export type JobSource = 'adzuna' | 'remotive' | 'manual'
export type JobStatus = 'nova' | 'salva' | 'descartada'
export type WorkMode = 'presencial' | 'hibrido' | 'remoto'
export type LetterTone = 'formal' | 'caloroso' | 'direto'

export interface MatchNotes {
  pontos_fortes?: string[]
  lacunas?: string[]
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

/** Uma mudança proposta pela adaptação à vaga (mesmo formato aplicável das sugestões) */
export interface AdaptChange {
  secao: ResumeSection
  titulo: string
  motivo: string
  antes: string
  depois: string
  /** pontos percentuais de compatibilidade que a mudança acrescenta */
  impacto: number
}

/** Resultado da função adaptar-vaga (nada é salvo até a pessoa confirmar) */
export interface Adaptation {
  vaga: { titulo: string; empresa?: string; local?: string; modalidade?: WorkMode | null; resumo: string }
  compat_antes: number
  compat_depois: number
  palavras_chave: string[]
  mudancas: AdaptChange[]
  vaga_texto: string
  vaga_url: string | null
  job_id: string | null
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
