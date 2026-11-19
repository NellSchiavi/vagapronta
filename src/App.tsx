import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@/lib/query-client'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster } from '@/components/ui/toaster'
import { AuthProvider } from '@/lib/auth'
import { isSupabaseConfigured } from '@/lib/supabase'
import { ThemeProvider } from '@/lib/theme'
import { PublicOnly, RequireAuth, RequireOnboarded } from '@/routes/guards'
import { AppLayout } from '@/components/layout/AppLayout'
import { HomePage } from '@/pages/home/HomePage'
import { AdaptPage } from '@/pages/adapt/AdaptPage'
import { ApplicationsPage } from '@/pages/applications/ApplicationsPage'
import { JobsPage } from '@/pages/jobs/JobsPage'
import { LettersPage } from '@/pages/letters/LettersPage'
import { ProfilePage } from '@/pages/profile/ProfilePage'
import { InstallButtonPage } from '@/pages/InstallButtonPage'
import { ResumePage } from '@/pages/resume/ResumePage'
import { ResumeEditorPage } from '@/pages/resume/editor/ResumeEditorPage'
import { LoginPage } from '@/pages/login/LoginPage'
import { OnboardingPage } from '@/pages/onboarding/OnboardingPage'
import { SetupMissingPage } from '@/pages/SetupMissingPage'
import { StyleGuidePage } from '@/pages/StyleGuidePage'


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
                        <Route path="/curriculo/editar" element={<ResumeEditorPage />} />
                        <Route path="/adaptar" element={<AdaptPage />} />
                        <Route path="/cartas" element={<LettersPage />} />
                        <Route path="/vagas" element={<JobsPage />} />
                        <Route path="/candidaturas" element={<ApplicationsPage />} />
                        <Route path="/perfil" element={<ProfilePage />} />
                        <Route path="/instalar-botao" element={<InstallButtonPage />} />
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
