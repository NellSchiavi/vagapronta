import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

/** padrão do servidor (AI_DAILY_LIMIT) enquanto a pessoa ainda não usou a IA hoje */
const DEFAULT_LIMIT = 40

/** Data de hoje no horário de Brasília (a cota vira à meia-noite daqui) */
export function todayInBrasilia(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(now)
}

/** Quantos usos de IA restam hoje (as chamadas que falham não contam) */
export function useAiUsage() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['ai-usage', user?.id],
    enabled: Boolean(user),
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_usage')
        .select('day, calls, daily_limit')
        .order('day', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (error) throw error
      const limit = data?.daily_limit ?? DEFAULT_LIMIT
      const used = data && data.day === todayInBrasilia() ? data.calls : 0
      return { used, limit, remaining: Math.max(0, limit - used) }
    },
  })
}
