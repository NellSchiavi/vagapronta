import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/auth'
import type { Database } from '@/lib/database.types'
import { invokeAi } from '@/lib/ai'
import type { CareerStage, Certification, ProfileLink } from '@/lib/profile'
import { supabase } from '@/lib/supabase'

type PrefsRow = Database['public']['Tables']['job_preferences']['Row']

export type Seniority = 'estagio' | 'trainee' | 'junior' | 'pleno' | 'senior'
export type ContractType = 'clt' | 'pj' | 'estagio' | 'temporario' | 'freelancer'
export type LanguageLevel = 'basico' | 'intermediario' | 'avancado' | 'fluente' | 'nativo'
export interface LanguageSkill {
  idioma: string
  nivel: LanguageLevel
}

/** Sugestões vindas do currículo/LinkedIn (pendentes até a pessoa aceitar) */
export interface ProfileSuggestions {
  telefone?: string | null
  cidade?: string | null
  linkedin?: string | null
  links?: ProfileLink[]
  idiomas?: LanguageSkill[]
  registro?: { conselho: string | null; numero: string | null; regiao: string | null } | null
  especializacoes?: string[]
  certificacoes?: Certification[]
  cargos?: string[]
  areas?: string[]
  nivel?: Seniority | null
  momento?: CareerStage | null
}

export type JobPreferences = Omit<PrefsRow, 'languages' | 'suggestions' | 'seniority' | 'work_modes' | 'contract_types'> & {
  languages: LanguageSkill[]
  suggestions: ProfileSuggestions
  seniority: Seniority[]
  work_modes: ('presencial' | 'hibrido' | 'remoto')[]
  contract_types: ContractType[]
}
export type PreferencesPatch = Partial<Omit<JobPreferences, 'user_id' | 'created_at' | 'updated_at'>>

export const SENIORITY_LABEL: Record<Seniority, string> = {
  estagio: 'Estágio',
  trainee: 'Trainee',
  junior: 'Júnior',
  pleno: 'Pleno',
  senior: 'Sênior',
}
export const CONTRACT_LABEL: Record<ContractType, string> = {
  clt: 'CLT',
  pj: 'PJ',
  estagio: 'Estágio',
  temporario: 'Temporário',
  freelancer: 'Freelancer',
}
export const LANGUAGE_LEVEL_LABEL: Record<LanguageLevel, string> = {
  basico: 'Básico',
  intermediario: 'Intermediário',
  avancado: 'Avançado',
  fluente: 'Fluente',
  nativo: 'Nativo',
}

export function usePreferences() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['preferences', user?.id],
    enabled: Boolean(user),
    queryFn: async (): Promise<JobPreferences> => {
      const { data, error } = await supabase.from('job_preferences').select('*').eq('user_id', user!.id).maybeSingle()
      if (error) throw error
      if (data) return data as unknown as JobPreferences
      const { data: created, error: insErr } = await supabase.from('job_preferences').insert({ user_id: user!.id }).select().single()
      if (insErr) throw insErr
      return created as unknown as JobPreferences
    },
  })
}

export async function updatePreferences(userId: string, patch: PreferencesPatch) {
  const { data, error } = await supabase
    .from('job_preferences')
    .update(patch as unknown as Database['public']['Tables']['job_preferences']['Update'])
    .eq('user_id', userId)
    .select()
    .single()
  if (error) throw error
  return data as unknown as JobPreferences
}

export function useUpdatePreferences() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (patch: PreferencesPatch) => updatePreferences(user!.id, patch),
    onSuccess: (prefs) => {
      qc.setQueryData(['preferences', user?.id], prefs)
      qc.invalidateQueries({ queryKey: ['home', user?.id] })
    },
  })
}

export function suggestProfile(resumeId: string) {
  return invokeAi<{ suggestions: ProfileSuggestions }>('sugerir-perfil', { resume_id: resumeId }).then((r) => r.suggestions)
}

/** Remove das sugestões o que está vazio ou já igual ao que a pessoa tem */
export function pendingSuggestions(s: ProfileSuggestions, current: { phone?: string | null; city?: string | null; linkedin_url?: string | null; career_stage?: string | null; desired_roles: string[]; areas: string[] }) {
  const has = (list: string[], v: string) => list.some((x) => x.toLowerCase() === v.toLowerCase())
  const out: ProfileSuggestions = {}
  if (s.telefone && s.telefone !== current.phone) out.telefone = s.telefone
  if (s.cidade && s.cidade !== current.city) out.cidade = s.cidade
  if (s.linkedin && s.linkedin !== current.linkedin_url) out.linkedin = s.linkedin
  if (s.links?.length) out.links = s.links
  if (s.idiomas?.length) out.idiomas = s.idiomas
  if (s.registro?.conselho) out.registro = s.registro
  if (s.especializacoes?.length) out.especializacoes = s.especializacoes
  if (s.certificacoes?.length) out.certificacoes = s.certificacoes
  const cargos = (s.cargos ?? []).filter((c) => !has(current.desired_roles, c))
  if (cargos.length) out.cargos = cargos
  const areas = (s.areas ?? []).filter((a) => !has(current.areas, a))
  if (areas.length) out.areas = areas
  if (s.nivel) out.nivel = s.nivel
  if (s.momento && s.momento !== current.career_stage) out.momento = s.momento
  return out
}

export type SuggestionKey = keyof ProfileSuggestions

/** Junta listas sem repetir (ignorando maiúsculas/minúsculas) */
function merge<T>(current: T[], add: T[], key: (x: T) => string) {
  const seen = new Set(current.map((x) => key(x).toLowerCase()))
  return [...current, ...add.filter((x) => !seen.has(key(x).toLowerCase()))]
}

/**
 * Transforma uma sugestão aceita em mudanças no perfil e nas preferências.
 * Listas são SOMADAS (nunca apagam o que a pessoa já tinha).
 */
export function acceptSuggestion(
  key: SuggestionKey,
  s: ProfileSuggestions,
  cur: {
    links: ProfileLink[]
    specializations: string[]
    certifications: Certification[]
    desired_roles: string[]
    areas: string[]
    languages: LanguageSkill[]
    seniority: Seniority[]
  },
): { profile: Record<string, unknown>; prefs: Record<string, unknown> } {
  const id = (x: string) => x
  switch (key) {
    case 'telefone':
      return { profile: { phone: s.telefone }, prefs: {} }
    case 'cidade':
      return { profile: { city: s.cidade }, prefs: {} }
    case 'linkedin':
      return { profile: { linkedin_url: s.linkedin }, prefs: {} }
    case 'links':
      return { profile: { links: merge(cur.links, s.links ?? [], (l) => l.url) }, prefs: {} }
    case 'registro':
      return {
        profile: { registry_council: s.registro?.conselho ?? null, registry_number: s.registro?.numero ?? null, registry_region: s.registro?.regiao ?? null },
        prefs: {},
      }
    case 'especializacoes':
      return { profile: { specializations: merge(cur.specializations, s.especializacoes ?? [], id) }, prefs: {} }
    case 'certificacoes':
      return { profile: { certifications: merge(cur.certifications, s.certificacoes ?? [], (c) => c.nome) }, prefs: {} }
    case 'momento':
      return { profile: { career_stage: s.momento }, prefs: {} }
    case 'cargos':
      return { profile: {}, prefs: { desired_roles: merge(cur.desired_roles, s.cargos ?? [], id) } }
    case 'areas':
      return { profile: {}, prefs: { areas: merge(cur.areas, s.areas ?? [], id) } }
    case 'idiomas':
      return { profile: {}, prefs: { languages: merge(cur.languages, s.idiomas ?? [], (l) => l.idioma) } }
    case 'nivel':
      return { profile: {}, prefs: { seniority: s.nivel ? merge(cur.seniority, [s.nivel], id) : cur.seniority } }
  }
}
