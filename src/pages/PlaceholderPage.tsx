import { Link } from 'react-router-dom'
import { Hammer } from 'lucide-react'
import { EmptyState } from '@/components/brand/empty-state'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/** Tela provisória para as seções que ainda vão ser construídas */
export function PlaceholderPage({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <PageHeader title={title} description={description} />
      <EmptyState
        icon={Hammer}
        title="Estamos preparando esta parte"
        description="Em breve ela fica pronta. Enquanto isso, volte para o Início."
        action={
          <Button asChild variant="secondary">
            <Link to="/">Voltar ao Início</Link>
          </Button>
        }
      />
    </div>
  )
}

/** No celular, "Cartas" fica dentro de "Adaptar": alterna entre as duas */
export function AdaptLettersSwitch({ current }: { current: 'adaptar' | 'cartas' }) {
  const items = [
    { key: 'adaptar', to: '/adaptar', label: 'Adaptar currículo' },
    { key: 'cartas', to: '/cartas', label: 'Cartas' },
  ] as const
  return (
    <nav aria-label="Adaptar ou cartas" className="mb-5 flex gap-1 rounded-[12px] border border-line bg-track/60 p-1 lg:hidden">
      {items.map((i) => (
        <Link
          key={i.key}
          to={i.to}
          aria-current={current === i.key ? 'page' : undefined}
          className={cn(
            'inline-flex min-h-touch flex-1 items-center justify-center rounded-[8px] text-sm font-medium',
            current === i.key ? 'bg-card text-ink shadow-soft' : 'text-muted hover:text-ink',
          )}
        >
          {i.label}
        </Link>
      ))}
    </nav>
  )
}
