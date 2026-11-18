import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import type { CountryCode } from '@/lib/countries'
import type { Database, Json } from '@/lib/database.types'

type ProfileRow = Database['public']['Tables']['profiles']['Row']

export type CareerStage = 'na_area' | 'primeiro_emprego' | 'estudante' | 'mudando_area' | 'voltando'
export interface ProfileLink {
  rotulo: string
  url: string
}
export interface Certification {
  nome: string
  emissor: string | null
  validade: string | null
}

export type Profile = Omit<
  ProfileRow,
  'resume_country' | 'links' | 'certifications' | 'career_stage' | 'avatar_source' | 'preferences'
> & {
  resume_country: CountryCode
  links: ProfileLink[]
  certifications: Certification[]
  career_stage: CareerStage | null
  avatar_source: 'linkedin' | 'upload' | 'removida' | null
  preferences: NonNullable<Json>
}

export type ProfilePatch = Partial<Omit<Profile, 'user_id' | 'created_at' | 'updated_at'>>

export const CAREER_STAGES: { value: CareerStage; label: string; help: string }[] = [
  { value: 'na_area', label: 'Já trabalho na área', help: 'Tenho experiência na profissão que procuro.' },
  { value: 'primeiro_emprego', label: 'Primeiro emprego', help: 'Ainda não tive um emprego formal.' },
  { value: 'estudante', label: 'Estudante / estágio', help: 'Estou estudando e procuro estágio ou primeira vaga.' },
  { value: 'mudando_area', label: 'Mudando de área', help: 'Quero trabalhar numa área diferente da atual.' },
  { value: 'voltando', label: 'Voltando ao mercado', help: 'Fiquei um tempo fora e estou retomando.' },
]

function metaFrom(user: User) {
  const m = user.user_metadata ?? {}
  return {
    full_name: (m.full_name as string) || (m.name as string) || null,
    avatar_url: (m.avatar_url as string) || (m.picture as string) || null,
  }
}

export function useProfile() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['profile', user?.id],
    enabled: Boolean(user),
    queryFn: async (): Promise<Profile> => {
      const { data, error } = await supabase.from('profiles').select('*').eq('user_id', user!.id).maybeSingle()
      if (error) throw error

      const meta = metaFrom(user!)
      if (!data) {
        // perfil ausente (ex.: conta criada antes das migrations): cria agora
        const { data: created, error: insertError } = await supabase
          .from('profiles')
          .insert({ user_id: user!.id, email: user!.email, ...meta })
          .select()
          .single()
        if (insertError) throw insertError
        return created as unknown as Profile
      }

      // entrou depois pelo LinkedIn: completa nome e foto que estavam vazios
      const patch: { avatar_url?: string; full_name?: string } = {}
      if (!data.avatar_url && meta.avatar_url) patch.avatar_url = meta.avatar_url
      if (!data.full_name && meta.full_name) patch.full_name = meta.full_name
      if (Object.keys(patch).length) {
        const { data: updated } = await supabase.from('profiles').update(patch).eq('user_id', user!.id).select().single()
        if (updated) return updated as unknown as Profile
      }
      return data as unknown as Profile
    },
  })
}

export async function updateProfile(userId: string, patch: ProfilePatch) {
  const { data, error } = await supabase
    .from('profiles')
    .update(patch as unknown as Database['public']['Tables']['profiles']['Update'])
    .eq('user_id', userId)
    .select()
    .single()
  if (error) throw error
  return data as unknown as Profile
}

export function useUpdateProfile() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (patch: ProfilePatch) => updateProfile(user!.id, patch),
    onSuccess: (profile) => {
      qc.setQueryData(['profile', user?.id], profile)
      qc.invalidateQueries({ queryKey: ['home', user?.id] })
    },
  })
}

/** Primeiro nome para saudações ("Olá, Nelson!") */
export function firstName(profile?: Pick<Profile, 'full_name'> | null) {
  return profile?.full_name?.trim().split(/\s+/)[0] ?? ''
}

/** Linha do registro profissional, ex.: "CRBM 12345 · 1ª Região (SP)" (vazio se não houver) */
export function registryLine(p?: Pick<Profile, 'registry_council' | 'registry_number' | 'registry_region'> | null) {
  if (!p?.registry_council?.trim()) return ''
  return [[p.registry_council.trim(), p.registry_number?.trim()].filter(Boolean).join(' '), p.registry_region?.trim()]
    .filter(Boolean)
    .join(' · ')
}

/** URL da foto: a guardada no app (link assinado) ou, se não houver, a do LinkedIn */
export function useAvatarUrl(profile?: Pick<Profile, 'avatar_path' | 'avatar_url' | 'avatar_source'> | null) {
  const path = profile?.avatar_path ?? null
  const { data: signed } = useQuery({
    queryKey: ['avatar', path],
    enabled: Boolean(path),
    staleTime: 50 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.storage.from('avatares').createSignedUrl(path!, 3600)
      if (error) throw error
      return data.signedUrl
    },
  })
  if (profile?.avatar_source === 'removida') return null
  return path ? signed ?? null : profile?.avatar_url ?? null
}
