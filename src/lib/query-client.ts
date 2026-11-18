import { QueryClient } from '@tanstack/react-query'

/** Cliente de cache único (também usado fora dos componentes, ex.: tarefas de IA) */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 60_000, retry: 1, refetchOnWindowFocus: false },
  },
})
