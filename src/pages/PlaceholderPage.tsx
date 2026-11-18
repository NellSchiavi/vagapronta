import { Link } from 'react-router-dom'
import { ArrowLeft, Check, type LucideIcon } from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ComingSoonProps {
  title: string
  /** frase curta abaixo do título da página */
  description: string
  icon: LucideIcon
  /** o que a tela vai fazer, em uma frase ("Aqui você vai…") */
  promise: string
  /** até 3 coisas que a pessoa vai poder fazer */
  features: string[]
}

/**
 * Estado "Em breve" das telas que ainda estão sendo construídas.
 * Deixa claro para quem testa que é esperado, e o que vai existir ali.
 */
export function ComingSoonPage({ title, description, icon: Icon, promise, features }: ComingSoonProps) {
  return (
    <div>
      <PageHeader title={title} description={description} />
      <section
        aria-labelledby="em-breve-titulo"
        className="mx-auto flex max-w-xl flex-col items-center rounded-card border border-line bg-card px-6 py-10 text-center sm:px-10"
      >
        <span className="relative mb-5 inline-flex size-16 items-center justify-center rounded-full bg-terra-soft text-terra">
          <Icon className="size-7" aria-hidden />
        </span>
        <span className="rounded-full bg-info-soft px-3 py-1 text-xs font-medium uppercase tracking-wider text-info">
          Em breve
        </span>
        <h2 id="em-breve-titulo" className="mt-3 text-[22px] leading-snug sm:text-[24px]">
          {promise}
        </h2>
        <ul className="mt-5 space-y-2.5 text-left">
          {features.map((f) => (
            <li key={f} className="flex items-start gap-2.5 text-[15px]">
              <span className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-success-soft text-success">
                <Check className="size-3.5" strokeWidth={2.5} aria-hidden />
              </span>
              {f}
            </li>
          ))}
        </ul>
        <p className="mt-6 text-sm text-muted">Esta parte ainda está sendo preparada. Por enquanto, é normal ela estar vazia.</p>
        <Button asChild variant="secondary" className="mt-5">
          <Link to="/">
            <ArrowLeft aria-hidden /> Voltar ao Início
          </Link>
        </Button>
      </section>
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
