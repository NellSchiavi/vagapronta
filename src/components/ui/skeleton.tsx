import { cn } from '@/lib/utils'

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn('skeleton h-4 w-full', className)} />
}

/** Bloco de carregamento com texto acessível para leitores de tela */
export function LoadingCards({ count = 3, label = 'Carregando…' }: { count?: number; label?: string }) {
  return (
    <div role="status" aria-live="polite" className="grid gap-3">
      <span className="sr-only">{label}</span>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-card border border-line bg-card p-5">
          <Skeleton className="mb-3 h-5 w-2/5" />
          <Skeleton className="mb-2 w-full" />
          <Skeleton className="w-3/4" />
        </div>
      ))}
    </div>
  )
}
