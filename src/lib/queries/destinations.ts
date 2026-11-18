import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/lib/auth'
import type { CountryCode } from '@/lib/paises'
import { queryClient } from '@/lib/query-client'
import { supabase } from '@/lib/supabase'

/** "Onde quero trabalhar": códigos em ordem de preferência (1º primeiro) */
export function useDestinations() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['destinations', user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await supabase.from('job_destinations').select('country_code, priority').order('priority')
      if (error) throw error
      return data.map((d) => d.country_code as CountryCode)
    },
  })
}

/** Grava a lista inteira na ordem dada (a prioridade é a posição) */
export async function saveDestinations(codes: CountryCode[]) {
  const unique = [...new Set(codes)]
  const { error } = await supabase.rpc('set_job_destinations', { p_codes: unique })
  if (error) throw error
  queryClient.setQueriesData({ queryKey: ['destinations'] }, unique)
}
