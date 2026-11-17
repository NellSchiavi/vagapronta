import type { CountryCode } from '@/lib/countries'

export type ResumeTemplate = 'classico' | 'moderno' | 'compacto' | 'geometrico'
export type ResumeSource = 'pdf' | 'texto' | 'linkedin' | 'editor' | 'adaptacao'

export interface Experience {
  cargo: string
  empresa: string
  local?: string
  inicio?: string
  fim?: string
  descricao?: string
}

export interface Education {
  curso: string
  instituicao: string
  inicio?: string
  fim?: string
}

export interface ResumeSections {
  contato?: { email?: string; telefone?: string; cidade?: string; linkedin?: string }
  resumo?: string
  experiencias?: Experience[]
  formacao?: Education[]
  habilidades?: string[]
  idiomas?: string[]
  cursos?: string[]
}

/** Conteúdo guardado na coluna resumes.content */
export interface ResumeContent {
  /** texto original (do PDF ou colado) */
  raw_text?: string
  /** seções organizadas; null enquanto o texto ainda não foi organizado */
  sections?: ResumeSections | null
}

export interface Resume {
  id: string
  user_id: string
  title: string
  template: ResumeTemplate
  country: CountryCode
  content: ResumeContent
  source: ResumeSource
  file_path: string | null
  is_principal: boolean
  job_id: string | null
  created_at: string
  updated_at: string
}

/** Texto mínimo para considerar que um currículo foi lido de verdade */
export const MIN_RESUME_CHARS = 200
