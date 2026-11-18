import { forwardRef } from 'react'
import { ArrowRightLeft, BellRing, Check, FileText, PenLine } from 'lucide-react'
import { CompanyInitial, STATUS_META, STATUS_ORDER, type ApplicationStatus } from '@/components/brand/pills'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { relativeDay, shortDate, toISODate } from '@/lib/dates'
import type { ApplicationRow } from '@/lib/queries/applications'
import { cn } from '@/lib/utils'

interface Props extends React.HTMLAttributes<HTMLDivElement> {
  row: ApplicationRow
  onOpen: () => void
  onMove: (status: ApplicationStatus) => void
  dragging?: boolean
  /** colunas estreitas (computador): "Mover para…" vira um botão só com ícone */
  compact?: boolean
}

/** Card de uma candidatura no quadro. Toque abre os detalhes; "Mover para…" troca a coluna. */
export const ApplicationCard = forwardRef<HTMLDivElement, Props>(function ApplicationCard(
  { row, onOpen, onMove, dragging, compact, className, ...rest },
  ref,
) {
  const today = toISODate()
  const due = row.follow_up_on && row.follow_up_on <= today
  return (
    <div
      ref={ref}
      {...rest}
      className={cn(
        'group relative rounded-card-sm border border-line bg-card p-3.5 transition-shadow',
        dragging ? 'rotate-1 shadow-soft ring-2 ring-terra/40' : 'hover:border-line-strong',
        className,
      )}
    >
      <button type="button" onClick={onOpen} className="flex w-full items-start gap-3 rounded-[8px] text-left" aria-label={`${row.role} — ${row.company}. Abrir detalhes`}>
        <CompanyInitial name={row.company} className="size-10 text-base" />
        <span className="min-w-0 flex-1">
          <span lang="pt-BR" className="block font-medium leading-snug [overflow-wrap:anywhere] [hyphens:auto]">
            {row.role}
          </span>
          <span className="block truncate text-sm text-muted">{row.company}</span>
        </span>
      </button>

      <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-xs">
        {row.applied_on && <span className="text-muted">Enviada em {shortDate(row.applied_on)}</span>}
        {row.follow_up_on && (
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium',
              due ? 'bg-terra-soft text-terra-strong' : 'bg-track text-muted',
            )}
          >
            <BellRing className="size-3" aria-hidden />
            Retorno {relativeDay(row.follow_up_on, today)}
          </span>
        )}
      </div>

      <div className="mt-2 flex items-center justify-between gap-2">
        <div className="flex min-w-0 flex-wrap gap-1 text-muted">
          {row.resume_id && (
            <span title="Currículo escolhido" className="inline-flex items-center gap-1 rounded-full bg-bg px-2 py-0.5 text-xs">
              <FileText className="size-3" aria-hidden /> Currículo
            </span>
          )}
          {row.cover_letter_id && (
            <span title="Carta escolhida" className="inline-flex items-center gap-1 rounded-full bg-bg px-2 py-0.5 text-xs">
              <PenLine className="size-3" aria-hidden /> Carta
            </span>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger
            className={cn(
              'inline-flex min-h-touch shrink-0 items-center justify-center gap-1.5 rounded-field text-sm font-medium text-terra-strong hover:bg-terra-soft data-[state=open]:bg-terra-soft',
              compact ? 'min-w-touch' : 'px-2.5',
            )}
            onPointerDown={(e) => e.stopPropagation()}
            aria-label={compact ? `Mover ${row.role} para outra coluna` : undefined}
            title={compact ? 'Mover para…' : undefined}
          >
            <ArrowRightLeft className="size-4" aria-hidden />
            {!compact && 'Mover para…'}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel className="text-sm text-muted">Mover para a coluna</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {STATUS_ORDER.map((s) => (
              <DropdownMenuItem key={s} disabled={s === row.status} onSelect={() => onMove(s)}>
                <span className={cn('size-2.5 rounded-full', STATUS_META[s].dot === 'bg-on-accent' ? 'bg-success-strong' : STATUS_META[s].dot)} aria-hidden />
                <span className="flex-1">{STATUS_META[s].label}</span>
                {s === row.status && <Check aria-hidden />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
})
