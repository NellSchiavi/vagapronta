import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Logo } from '@/components/brand/logo'
import { ThemeToggle } from '@/components/brand/theme-toggle'
import { cn } from '@/lib/utils'

/**
 * Cabeçalho fixo no topo, com o fundo da página e borda inferior fina.
 * Usa o mesmo container do conteúdo, então o logo fica alinhado aos títulos.
 */
export function SiteHeader({ actions, className }: { actions?: ReactNode; className?: string }) {
  return (
    <header
      className={cn('sticky top-0 z-30 border-b border-line bg-bg', className)}
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div className="page-container flex min-h-16 items-center justify-between gap-4 py-4">
        <Link to="/" aria-label="VagaPronta — página inicial" className="rounded-field">
          <Logo size={32} />
        </Link>
        <div className="flex items-center gap-2">
          {actions}
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
