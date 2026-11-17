import { LogOut } from 'lucide-react'
import { Footer } from '@/components/brand/footer'
import { SiteHeader } from '@/components/brand/site-header'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useAuth } from '@/lib/auth'
import { countryName } from '@/lib/countries'
import { firstName, useProfile } from '@/lib/profile'

/** Tela Início provisória; o painel completo vem com o layout de navegação */
export function HomePage() {
  const { signOut } = useAuth()
  const { data: profile } = useProfile()

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader
        actions={
          <Button variant="ghost" onClick={signOut} className="text-muted">
            <LogOut aria-hidden /> Sair
          </Button>
        }
      />
      <main className="page-container flex-1 py-8 sm:py-12">
        <h1 className="text-[32px]">Olá, {firstName(profile) || 'tudo bem'}!</h1>
        <Card className="mt-6 max-w-xl">
          <dl className="grid gap-3 text-[15px]">
            <div>
              <dt className="text-sm text-muted">Cargo desejado</dt>
              <dd>{profile?.desired_role || '—'}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted">Cidade</dt>
              <dd>{profile?.city || '—'}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted">País do currículo</dt>
              <dd>{profile ? countryName(profile.resume_country) : '—'}</dd>
            </div>
          </dl>
        </Card>
      </main>
      <Footer />
    </div>
  )
}
