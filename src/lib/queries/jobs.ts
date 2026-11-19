import { useQuery } from '@tanstack/react-query'
import { invokeAi } from '@/lib/ai'
import { useAuth } from '@/lib/auth'
import { queryClient } from '@/lib/query-client'
import { supabase } from '@/lib/supabase'
import type { Job } from '@/lib/types'
import { rankScore } from '../../../supabase/functions/_shared/destinos'

export { rankScore }

/** Vagas sugeridas (novas e salvas), da mais recente para a mais antiga */
export function useSuggestedJobs() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['jobs', user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .in('status', ['nova', 'salva'])
        .not('destination', 'is', null)
        .order('created_at', { ascending: false })
        .limit(200)
      if (error) throw error
      return data as unknown as Job[]
    },
  })
}

export interface SearchRun {
  created_at: string
  inserted: number
  mode: 'real' | 'exemplo'
  trigger: 'agendada' | 'manual'
}

export function useLastSearch() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['last-search', user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('job_search_runs')
        .select('created_at, inserted, mode, trigger')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (error) throw error
      return data as SearchRun | null
    },
  })
}

export interface SearchResult {
  found: number
  inserted: number
  sources: Record<string, number>
  failed: string[]
  mode: 'real' | 'exemplo'
}

export async function runJobSearch() {
  const r = await invokeAi<SearchResult>('buscar-vagas', {})
  refreshJobs()
  return r
}

export function refreshJobs() {
  queryClient.invalidateQueries({ queryKey: ['jobs'] })
  queryClient.invalidateQueries({ queryKey: ['last-search'] })
  queryClient.invalidateQueries({ queryKey: ['home'] })
}

/** Descarta (ou desfaz o descarte). A vaga descartada não volta nas próximas buscas. */
export async function setJobStatus(id: string, status: Job['status']) {
  queryClient.setQueriesData<Job[]>({ queryKey: ['jobs'] }, (old) =>
    old ? (status === 'descartada' ? old.filter((j) => j.id !== id) : old.map((j) => (j.id === id ? { ...j, status } : j))) : old,
  )
  const { error } = await supabase.from('jobs').update({ status }).eq('id', id)
  if (error) {
    refreshJobs()
    throw error
  }
  queryClient.invalidateQueries({ queryKey: ['home'] })
}

/** Créditos das fontes (exigidos pelos termos de uso) */
export const SOURCE_LABEL: Record<string, string> = {
  jobicy: 'Jobicy',
  himalayas: 'Himalayas',
  arbeitnow: 'Arbeitnow',
  remotive: 'Remotive',
  jooble: 'Jooble',
  adzuna: 'Adzuna',
  usajobs: 'USAJOBS',
  exemplo: 'Exemplo',
  link: 'Link',
  manual: 'Manual',
}
