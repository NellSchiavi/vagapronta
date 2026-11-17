import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { LogoMark } from '@/components/brand/logo'
import { useAuth } from '@/lib/auth'
import { useProfile } from '@/lib/profile'

export function FullPageLoader({ label = 'Carregando…' }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" className="flex min-h-dvh flex-col items-center justify-center gap-4">
      <LogoMark size={44} className="animate-pulse" />
      <span className="text-sm text-muted">{label}</span>
    </div>
  )
}

/** Só deixa passar quem está logado */
export function RequireAuth() {
  const { session, loading } = useAuth()
  const location = useLocation()
  if (loading) return <FullPageLoader />
  if (!session) return <Navigate to="/entrar" replace state={{ from: location.pathname }} />
  return <Outlet />
}

/** Manda para o onboarding quem ainda não concluiu os 3 passos */
export function RequireOnboarded() {
  const { data: profile, isLoading } = useProfile()
  if (isLoading) return <FullPageLoader label="Preparando seu espaço…" />
  if (profile && !profile.onboarded_at) return <Navigate to="/boas-vindas" replace />
  return <Outlet />
}

/** Login: quem já entrou vai direto para o app */
export function PublicOnly() {
  const { session, loading } = useAuth()
  if (loading) return <FullPageLoader />
  if (session) return <Navigate to="/" replace />
  return <Outlet />
}
