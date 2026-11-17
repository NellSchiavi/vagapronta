import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster } from '@/components/ui/toaster'
import { ThemeProvider } from '@/lib/theme'
import { StyleGuidePage } from '@/pages/StyleGuidePage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 60_000, retry: 1, refetchOnWindowFocus: false },
  },
})

export function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          {/* HashRouter: as rotas funcionam no GitHub Pages sem configuração extra */}
          <HashRouter>
            <Routes>
              <Route path="/estilo" element={<StyleGuidePage />} />
              <Route path="*" element={<Navigate to="/estilo" replace />} />
            </Routes>
          </HashRouter>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  )
}
