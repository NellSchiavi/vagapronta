import { useMemo, useState } from 'react'
import {
  closestCorners,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { STATUS_META, STATUS_ORDER, StatusPill, type ApplicationStatus } from '@/components/brand/pills'
import type { ApplicationRow } from '@/lib/queries/applications'
import { cn } from '@/lib/utils'
import { ApplicationCard } from './ApplicationCard'

interface BoardProps {
  rows: ApplicationRow[]
  onOpen: (row: ApplicationRow) => void
  onMove: (row: ApplicationRow, status: ApplicationStatus, order?: string[]) => void
}

export function groupByStatus(rows: ApplicationRow[]) {
  const map = Object.fromEntries(STATUS_ORDER.map((s) => [s, [] as ApplicationRow[]])) as Record<ApplicationStatus, ApplicationRow[]>
  for (const r of rows) map[r.status]?.push(r)
  for (const s of STATUS_ORDER) map[s].sort((a, b) => a.position - b.position || (a.updated_at < b.updated_at ? 1 : -1))
  return map
}

// ---------------------------------------------------------------- computador
export function DesktopBoard({ rows, onOpen, onMove }: BoardProps) {
  const columns = useMemo(() => groupByStatus(rows), [rows])
  const [activeId, setActiveId] = useState<string | null>(null)
  const active = rows.find((r) => r.id === activeId) ?? null
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function onDragEnd({ active, over }: DragEndEvent) {
    setActiveId(null)
    if (!over) return
    const row = rows.find((r) => r.id === active.id)
    if (!row) return
    const overId = String(over.id)
    const target: ApplicationStatus = overId.startsWith('col:')
      ? (overId.slice(4) as ApplicationStatus)
      : (rows.find((r) => r.id === overId)?.status ?? row.status)

    const ids = columns[target].map((r) => r.id)
    let order: string[]
    if (target === row.status) {
      const from = ids.indexOf(row.id)
      const to = overId.startsWith('col:') ? ids.length - 1 : ids.indexOf(overId)
      if (from === to) return
      order = arrayMove(ids, from, to)
    } else {
      const at = overId.startsWith('col:') ? ids.length : Math.max(0, ids.indexOf(overId))
      order = [...ids.slice(0, at), row.id, ...ids.slice(at)]
    }
    onMove(row, target, order)
  }

  const label = (id: string | number) => {
    const r = rows.find((x) => x.id === id)
    return r ? `${r.role}, ${r.company}` : 'candidatura'
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={({ active }) => setActiveId(String(active.id))}
      onDragCancel={() => setActiveId(null)}
      onDragEnd={onDragEnd}
      accessibility={{
        screenReaderInstructions: {
          draggable: 'Para mover, aperte espaço, use as setas para escolher o lugar e aperte espaço de novo. Esc cancela.',
        },
        announcements: {
          onDragStart: ({ active }) => `Pegou ${label(active.id)}.`,
          onDragOver: ({ over }) => (over ? `Sobre ${String(over.id).startsWith('col:') ? `a coluna ${STATUS_META[String(over.id).slice(4) as ApplicationStatus].label}` : label(over.id)}.` : 'Fora das colunas.'),
          onDragEnd: ({ over }) => (over ? 'Soltou. Candidatura movida.' : 'Soltou fora das colunas. Nada mudou.'),
          onDragCancel: () => 'Movimento cancelado.',
        },
      }}
    >
      <div className="grid grid-cols-5 gap-3">
        {STATUS_ORDER.map((s) => (
          <Column key={s} status={s} rows={columns[s]} onOpen={onOpen} onMove={onMove} />
        ))}
      </div>
      <DragOverlay>{active ? <ApplicationCard row={active} onOpen={() => {}} onMove={() => {}} dragging compact /> : null}</DragOverlay>
    </DndContext>
  )
}

function Column({ status, rows, onOpen, onMove }: { status: ApplicationStatus } & Omit<BoardProps, 'rows'> & { rows: ApplicationRow[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: `col:${status}` })
  return (
    <section aria-label={`${STATUS_META[status].label}: ${rows.length}`} className="flex min-w-0 flex-col">
      <header className="mb-2 flex items-center justify-between px-1">
        <StatusPill status={status} />
        <span className="rounded-full bg-track px-2 py-0.5 text-xs font-medium tabular-nums text-muted">{rows.length}</span>
      </header>
      <div
        ref={setNodeRef}
        className={cn('flex min-h-[220px] flex-1 flex-col gap-2 rounded-card-sm border border-dashed p-2 transition-colors', isOver ? 'border-terra bg-terra-soft/40' : 'border-transparent bg-track/40')}
      >
        <SortableContext items={rows.map((r) => r.id)} strategy={verticalListSortingStrategy}>
          {rows.map((r) => (
            <SortableCard key={r.id} row={r} onOpen={() => onOpen(r)} onMove={(st) => onMove(r, st)} />
          ))}
        </SortableContext>
        {rows.length === 0 && <p className="px-2 py-6 text-center text-sm text-muted">Arraste uma candidatura para cá</p>}
      </div>
    </section>
  )
}

function SortableCard({ row, onOpen, onMove }: { row: ApplicationRow; onOpen: () => void; onMove: (s: ApplicationStatus) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: row.id })
  return (
    <ApplicationCard
      ref={setNodeRef}
      row={row}
      onOpen={onOpen}
      onMove={onMove}
      compact
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn('cursor-grab active:cursor-grabbing', isDragging && 'opacity-40')}
      {...attributes}
      {...listeners}
      aria-roledescription="candidatura arrastável"
    />
  )
}

// -------------------------------------------------------------------- celular
export function MobileBoard({ rows, onOpen, onMove, tab, onTab }: BoardProps & { tab: ApplicationStatus; onTab: (s: ApplicationStatus) => void }) {
  const columns = useMemo(() => groupByStatus(rows), [rows])
  return (
    <div>
      <div role="tablist" aria-label="Colunas das candidaturas" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-3 [scrollbar-width:none]">
        {STATUS_ORDER.map((s) => {
          const selected = s === tab
          return (
            <button
              key={s}
              role="tab"
              type="button"
              aria-selected={selected}
              aria-controls={`col-${s}`}
              onClick={() => onTab(s)}
              className={cn(
                'inline-flex min-h-touch shrink-0 items-center gap-2 rounded-full border px-3.5 text-sm font-medium transition-colors',
                selected ? 'border-terra bg-terra-soft text-terra-strong' : 'border-line-strong bg-card text-ink',
              )}
            >
              {STATUS_META[s].label}
              <span className={cn('rounded-full px-1.5 text-xs tabular-nums', selected ? 'bg-card' : 'bg-track text-muted')}>{columns[s].length}</span>
            </button>
          )
        })}
      </div>
      <div id={`col-${tab}`} role="tabpanel" aria-label={STATUS_META[tab].label} className="space-y-2.5">
        {columns[tab].map((r) => (
          <ApplicationCard key={r.id} row={r} onOpen={() => onOpen(r)} onMove={(s) => onMove(r, s)} />
        ))}
        {columns[tab].length === 0 && (
          <p className="rounded-card-sm border border-dashed border-line-strong px-4 py-8 text-center text-sm text-muted">
            Nenhuma candidatura em {STATUS_META[tab].label.toLowerCase()} por enquanto.
          </p>
        )}
      </div>
    </div>
  )
}
