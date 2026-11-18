import { startAiTask } from '@/lib/ai-tasks'
import { queryClient } from '@/lib/query-client'
import { asJson, supabase } from '@/lib/supabase'
import { pendingSuggestions, suggestProfile, type ProfileSuggestions } from '@/lib/queries/preferences'

export const SUGGEST_TASK = 'sugerir-perfil'

/**
 * Lê o currículo em segundo plano e guarda as SUGESTÕES pendentes
 * (nada é aplicado ao perfil sem a pessoa aceitar).
 */
export function startProfileSuggestions(resumeId: string, userId: string) {
  startAiTask<ProfileSuggestions>({
    key: SUGGEST_TASK,
    label: 'Buscando sugestões para o seu perfil',
    path: '/perfil',
    readyText: 'Sugestões para o seu perfil prontas',
    clearOnSuccess: true,
    run: () => suggestProfile(resumeId),
    onSuccess: async (s) => {
      const [{ data: prof }, { data: prefs }] = await Promise.all([
        supabase.from('profiles').select('phone, city, linkedin_url, career_stage').eq('user_id', userId).single(),
        supabase.from('job_preferences').select('desired_roles, areas, suggestions').eq('user_id', userId).single(),
      ])
      const pending = pendingSuggestions(s, {
        phone: prof?.phone,
        city: prof?.city,
        linkedin_url: prof?.linkedin_url,
        career_stage: prof?.career_stage,
        desired_roles: prefs?.desired_roles ?? [],
        areas: prefs?.areas ?? [],
      })
      await supabase
        .from('job_preferences')
        .update({ suggestions: asJson({ ...((prefs?.suggestions as object) ?? {}), ...pending }) })
        .eq('user_id', userId)
      queryClient.invalidateQueries({ queryKey: ['preferences'] })
    },
  })
}
