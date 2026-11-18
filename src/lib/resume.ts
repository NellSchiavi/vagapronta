import type { CountryCode } from '@/lib/countries'

export type ResumeTemplate = 'classico' | 'moderno' | 'compacto' | 'geometrico'
export type ResumeSource = 'pdf' | 'texto' | 'linkedin' | 'editor' | 'adaptacao'

export interface Experience {
  cargo: string
  empresa: string
  local?: string
  inicio?: string
  /** null = emprego atual */
  fim?: string | null
  descricao?: string
}

export interface Education {
  curso: string
  instituicao: string
  inicio?: string
  fim?: string | null
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

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/** Todo o texto do currículo (seções + original), normalizado para busca */
export function resumeSearchText(c: ResumeContent) {
  const s = c.sections
  const parts = [
    c.raw_text ?? '',
    s?.resumo ?? '',
    ...(s?.experiencias ?? []).flatMap((e) => [e.cargo, e.empresa, e.descricao ?? '']),
    ...(s?.formacao ?? []).flatMap((f) => [f.curso, f.instituicao]),
    ...(s?.habilidades ?? []),
    ...(s?.cursos ?? []),
    ...(s?.idiomas ?? []),
  ]
  return norm(parts.join(' \n '))
}

/** A habilidade (ou termo) aparece em algum lugar do currículo? */
export function mentionedInResume(term: string, searchText: string) {
  const t = norm(term.replace(/\(.*?\)/g, '')).trim()
  return t.length > 1 && searchText.includes(t)
}

/** Texto mínimo para considerar que um currículo foi lido de verdade */
export const MIN_RESUME_CHARS = 200
