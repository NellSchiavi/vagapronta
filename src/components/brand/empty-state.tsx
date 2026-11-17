import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: ReactNode
  action?: ReactNode
  className?: string
}

/** Estado vazio convidativo: ícone, frase calorosa e um botão para começar */
export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center rounded-card border border-dashed border-line-strong bg-card px-6 py-10 text-center',
        className,
      )}
    >
      <span className="mb-4 inline-flex size-14 items-center justify-center rounded-full bg-terra-soft text-terra">
        <Icon className="size-6" aria-hidden />
      </span>
      <h3 className="text-xl">{title}</h3>
      {description && <p className="mt-1.5 max-w-sm text-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
