import { Link, Outlet, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { AiTasksIndicator } from '@/components/ai/ai-tasks-indicator'
import { Footer } from '@/components/brand/footer'
import { Logo } from '@/components/brand/logo'
import { cn } from '@/lib/utils'
import { ApplyReturnPrompt } from '@/pages/jobs/ApplyFlow'
import { isActive, NAV_ITEMS } from './nav-items'
import { SidebarUserMenu, TopBarUserMenu } from './user-menu'

/**
 * Estrutura das telas logadas:
 * - computador (lg+): barra lateral à esquerda com logo, menu e conta embaixo
 * - celular/tablet: barra superior com logo e avatar + menu inferior com 5 itens
 * O rodapé fica sempre no fim do conteúdo, acima do menu inferior.
 */
export function AppLayout() {
  const { pathname } = useLocation()

  return (
    <div className="min-h-dvh">
      <a
        href="#conteudo"
        className="sr-only z-50 rounded-field bg-card px-4 py-3 font-medium focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Pular para o conteúdo
      </a>

      <Sidebar pathname={pathname} />
      <MobileTopBar />

      <div className="flex min-h-dvh flex-col pb-[calc(4.25rem+env(safe-area-inset-bottom))] lg:pb-0 lg:pl-64">
        <main id="conteudo" tabIndex={-1} className="page-container flex-1 py-6 outline-none sm:py-8 lg:py-10">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            <Outlet />
          </motion.div>
        </main>
        <Footer />
      </div>

      <BottomNav pathname={pathname} />
      {/* ao voltar do site de uma vaga: "Você se candidatou?" */}
      <ApplyReturnPrompt />
    </div>
  )
}

function Sidebar({ pathname }: { pathname: string }) {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-line bg-card lg:flex">
      <div className="flex min-h-16 items-center px-5 py-4">
        <Link to="/" aria-label="VagaPronta — Início" className="rounded-field">
          <Logo size={32} />
        </Link>
      </div>

      <nav aria-label="Menu principal" className="flex-1 overflow-y-auto px-3 py-2">
        <ul className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item, pathname, true)
            return (
              <li key={item.to}>
                <Link
                  to={item.to}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex min-h-touch items-center gap-3 rounded-field px-3 text-[15px] transition-colors',
                    active ? 'bg-terra-soft font-medium text-terra-strong' : 'text-ink hover:bg-track/60',
                  )}
                >
                  <item.icon className={cn('size-5', active ? 'text-terra-strong' : 'text-muted')} aria-hidden />
                  {item.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      <AiTasksIndicator className="px-3 pb-3" />
      <div className="border-t border-line p-3">
        <SidebarUserMenu />
      </div>
    </aside>
  )
}

function MobileTopBar() {
  return (
    <header
      className="sticky top-0 z-30 border-b border-line bg-bg lg:hidden"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div className="page-container flex min-h-16 items-center justify-between gap-4 py-2.5">
        <Link to="/" aria-label="VagaPronta — Início" className="rounded-field">
          <Logo size={30} />
        </Link>
        <div className="flex items-center gap-2">
          <AiTasksIndicator compact />
          <TopBarUserMenu />
        </div>
      </div>
    </header>
  )
}

function BottomNav({ pathname }: { pathname: string }) {
  return (
    <nav
      aria-label="Menu principal"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-card lg:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {/* itens com a largura do próprio conteúdo e espaço igual entre eles:
          "Candidaturas" cabe inteiro mesmo em telas de 320px */}
      <ul className="mx-auto flex max-w-xl justify-around px-1">
        {NAV_ITEMS.filter((i) => i.mobile).map((item) => {
          const active = isActive(item, pathname, false)
          return (
            <li key={item.to} className="min-w-[56px]">
              <Link
                to={item.to}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex min-h-[64px] flex-col items-center justify-center gap-1 whitespace-nowrap px-1 text-[11.5px] leading-none transition-colors',
                  active ? 'font-medium text-terra-strong' : 'text-muted hover:text-ink',
                )}
              >
                <span
                  className={cn(
                    'inline-flex h-8 w-14 items-center justify-center rounded-full transition-colors',
                    active && 'bg-terra-soft',
                  )}
                >
                  <item.icon className="size-[22px]" strokeWidth={active ? 2.25 : 1.85} aria-hidden />
                </span>
                <span>{item.short}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
