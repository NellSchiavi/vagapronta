import { cn } from '@/lib/utils'

export type ApplicationStatus = 'preparacao' | 'enviada' | 'entrevista' | 'oferta' | 'recusada'

export const STATUS_META: Record<ApplicationStatus, { label: string; className: string; dot: string }> = {
  preparacao: { label: 'Preparação', className: 'bg-terra-soft text-terra-strong', dot: 'bg-terra' },
  enviada: { label: 'Enviada', className: 'bg-info-soft text-info', dot: 'bg-info' },
  entrevista: { label: 'Entrevista', className: 'bg-success-soft text-success', dot: 'bg-success' },
  oferta: { label: 'Oferta', className: 'bg-success-strong text-on-accent', dot: 'bg-on-accent' },
  recusada: { label: 'Recusada', className: 'bg-neutral-soft text-neutral', dot: 'bg-neutral' },
}

export const STATUS_ORDER: ApplicationStatus[] = ['preparacao', 'enviada', 'entrevista', 'oferta', 'recusada']

const pillBase = 'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium'

export function StatusPill({ status, className }: { status: ApplicationStatus; className?: string }) {
  const meta = STATUS_META[status]
  return (
    <span className={cn(pillBase, meta.className, className)}>
      <span className={cn('size-1.5 rounded-full', meta.dot)} aria-hidden />
      {meta.label}
    </span>
  )
}

/** Compatibilidade da vaga: verde acima de 85%, terracota abaixo */
export function MatchPill({ value, className }: { value: number; className?: string }) {
  const high = value > 85
  return (
    <span
      className={cn(pillBase, high ? 'bg-success-soft text-success' : 'bg-terra-soft text-terra-strong', className)}
      aria-label={`Compatibilidade de ${value}%`}
    >
      {value}% compatível
    </span>
  )
}

/** Inicial da empresa num quadrado azul suave */
export function CompanyInitial({ name, className }: { name: string; className?: string }) {
  const initial = name.trim().charAt(0).toUpperCase() || '?'
  return (
    <span
      aria-hidden
      className={cn(
        'inline-flex size-11 shrink-0 items-center justify-center rounded-[10px] bg-info-soft font-serif text-lg font-medium text-info',
        className,
      )}
    >
      {initial}
    </span>
  )
}
