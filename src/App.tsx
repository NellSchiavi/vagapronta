import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster } from '@/components/ui/toaster'
import { AuthProvider } from '@/lib/auth'
import { isSupabaseConfigured } from '@/lib/supabase'
import { ThemeProvider } from '@/lib/theme'
import { PublicOnly, RequireAuth, RequireOnboarded } from '@/routes/guards'
import { AppLayout } from '@/components/layout/AppLayout'
import { HomePage } from '@/pages/home/HomePage'
import {
  AdaptComingSoon,
  ApplicationsComingSoon,
  JobsComingSoon,
  LettersComingSoon,
} from '@/pages/coming-soon'
import { ResumePage } from '@/pages/resume/ResumePage'
import { LoginPage } from '@/pages/login/LoginPage'
import { OnboardingPage } from '@/pages/onboarding/OnboardingPage'
import { SetupMissingPage } from '@/pages/SetupMissingPage'
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
            {isSupabaseConfigured ? (
              <AuthProvider>
                <Routes>
                  <Route path="/estilo" element={<StyleGuidePage />} />
                  <Route element={<PublicOnly />}>
                    <Route path="/entrar" element={<LoginPage />} />
                  </Route>
                  <Route element={<RequireAuth />}>
                    <Route path="/boas-vindas" element={<OnboardingPage />} />
                    <Route element={<RequireOnboarded />}>
                      <Route element={<AppLayout />}>
                        <Route path="/" element={<HomePage />} />
                        <Route path="/curriculo" element={<ResumePage />} />
                        <Route path="/adaptar" element={<AdaptComingSoon />} />
                        <Route path="/cartas" element={<LettersComingSoon />} />
                        <Route path="/vagas" element={<JobsComingSoon />} />
                        <Route path="/candidaturas" element={<ApplicationsComingSoon />} />
                      </Route>
                    </Route>
                  </Route>
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </AuthProvider>
            ) : (
              <Routes>
                <Route path="/estilo" element={<StyleGuidePage />} />
                <Route path="*" element={<SetupMissingPage />} />
              </Routes>
            )}
          </HashRouter>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  )
}
