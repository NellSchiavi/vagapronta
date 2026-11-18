import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import type { CountryCode } from '@/lib/countries'
import type { Json } from '@/lib/database.types'

export interface Profile {
  user_id: string
  full_name: string | null
  email: string | null
  avatar_url: string | null
  desired_role: string | null
  city: string | null
  resume_country: CountryCode
  preferences: NonNullable<Json>
  onboarded_at: string | null
  created_at: string
  updated_at: string
}

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
        return created as Profile
      }

      // entrou depois pelo LinkedIn: completa nome e foto que estavam vazios
      const patch: Partial<Profile> = {}
      if (!data.avatar_url && meta.avatar_url) patch.avatar_url = meta.avatar_url
      if (!data.full_name && meta.full_name) patch.full_name = meta.full_name
      if (Object.keys(patch).length) {
        const { data: updated } = await supabase
          .from('profiles')
          .update(patch)
          .eq('user_id', user!.id)
          .select()
          .single()
        if (updated) return updated as Profile
      }
      return data as Profile
    },
  })
}

export function useUpdateProfile() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (patch: Partial<Omit<Profile, 'user_id' | 'created_at' | 'updated_at'>>) => {
      const { data, error } = await supabase
        .from('profiles')
        .update(patch)
        .eq('user_id', user!.id)
        .select()
        .single()
      if (error) throw error
      return data as Profile
    },
    onSuccess: (profile) => qc.setQueryData(['profile', user?.id], profile),
  })
}

/** Primeiro nome para saudações ("Olá, Nelson!") */
export function firstName(profile?: Pick<Profile, 'full_name'> | null) {
  return profile?.full_name?.trim().split(/\s+/)[0] ?? ''
}
