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
import { AdaptLettersSwitch, PlaceholderPage } from '@/pages/PlaceholderPage'
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
                        <Route
                          path="/curriculo"
                          element={<PlaceholderPage title="Currículo" description="Sua nota, sugestões de melhoria e as versões do seu currículo." />}
                        />
                        <Route
                          path="/adaptar"
                          element={
                            <>
                              <AdaptLettersSwitch current="adaptar" />
                              <PlaceholderPage title="Adaptar à vaga" description="Cole o anúncio de uma vaga e deixe seu currículo com a cara dela." />
                            </>
                          }
                        />
                        <Route
                          path="/cartas"
                          element={
                            <>
                              <AdaptLettersSwitch current="cartas" />
                              <PlaceholderPage title="Cartas de apresentação" description="Cartas feitas para cada vaga, no tom que você preferir." />
                            </>
                          }
                        />
                        <Route path="/vagas" element={<PlaceholderPage title="Vagas" description="Vagas com o seu perfil, encontradas todos os dias." />} />
                        <Route
                          path="/candidaturas"
                          element={<PlaceholderPage title="Candidaturas" description="Acompanhe cada candidatura, da preparação até a oferta." />}
                        />
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
