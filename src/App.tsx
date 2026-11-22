import { Suspense } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@/lib/query-client'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster } from '@/components/ui/toaster'
import { AuthProvider } from '@/lib/auth'
import { isSupabaseConfigured } from '@/lib/supabase'
import { ThemeProvider } from '@/lib/theme'
import { FullPageLoader, PublicOnly, RequireAuth, RequireOnboarded } from '@/routes/guards'
import { AppLayout } from '@/components/layout/AppLayout'
import { LoginPage } from '@/pages/login/LoginPage'
import { SetupMissingPage } from '@/pages/SetupMissingPage'
import { lazyPage } from '@/routes/lazy-page'

// cada tela é um arquivo separado no build: o celular baixa só o que abrir
const HomePage = lazyPage(() => import('@/pages/home/HomePage'), 'HomePage')
const AdaptPage = lazyPage(() => import('@/pages/adapt/AdaptPage'), 'AdaptPage')
const ApplicationsPage = lazyPage(() => import('@/pages/applications/ApplicationsPage'), 'ApplicationsPage')
const JobsPage = lazyPage(() => import('@/pages/jobs/JobsPage'), 'JobsPage')
const LettersPage = lazyPage(() => import('@/pages/letters/LettersPage'), 'LettersPage')
const ProfilePage = lazyPage(() => import('@/pages/profile/ProfilePage'), 'ProfilePage')
const InstallButtonPage = lazyPage(() => import('@/pages/InstallButtonPage'), 'InstallButtonPage')
const ResumePage = lazyPage(() => import('@/pages/resume/ResumePage'), 'ResumePage')
const ResumeEditorPage = lazyPage(() => import('@/pages/resume/editor/ResumeEditorPage'), 'ResumeEditorPage')
const OnboardingPage = lazyPage(() => import('@/pages/onboarding/OnboardingPage'), 'OnboardingPage')
const StyleGuidePage = lazyPage(() => import('@/pages/StyleGuidePage'), 'StyleGuidePage')


export function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          {/* HashRouter: as rotas funcionam no GitHub Pages sem configuração extra */}
          <HashRouter>
            <Suspense fallback={<FullPageLoader />}>
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
            </Suspense>
          </HashRouter>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  )
}
