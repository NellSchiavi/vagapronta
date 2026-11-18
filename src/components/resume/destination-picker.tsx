import { Check, ChevronDown, ChevronUp, GripVertical, X } from 'lucide-react'
import { closestCenter, DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { countryInfo, FEATURED, type CountryCode, type CountryInfo } from '@/lib/paises'
import { cn } from '@/lib/utils'
import { OtherCountrySearch } from './country-picker'

const ord = (i: number) => `${i + 1}º`

interface Props {
  value: CountryCode[]
  onChange: (v: CountryCode[]) => void
}

/**
 * "Onde quero trabalhar": escolha de vários destinos (países ou a região Europa)
 * e, com 2 ou mais, a ordem de preferência (arrastar no computador; subir/descer no celular).
 */
export function DestinationPicker({ value, onChange }: Props) {
  const toggle = (code: CountryCode) => onChange(value.includes(code) ? value.filter((c) => c !== code) : [...value, code])
  const extras = value.filter((c) => !FEATURED.some((f) => f.code === c)).map(countryInfo)
  const cards = [...FEATURED, ...extras]

  return (
    <div className="space-y-5">
      <fieldset>
        <legend className="sr-only">Destinos (pode escolher mais de um)</legend>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {cards.map((c) => (
            <DestinationCard key={c.code} c={c} position={value.indexOf(c.code)} onToggle={() => toggle(c.code)} />
          ))}
        </div>
      </fieldset>

      <OtherCountrySearch value={value} onSelect={toggle} />

      {value.length >= 2 && <PreferenceOrder value={value} onChange={onChange} />}
      {value.length === 0 && (
        <p role="alert" className="text-[13px] text-danger">
          Escolha pelo menos um lugar onde você quer trabalhar.
        </p>
      )}
    </div>
  )
}

function DestinationCard({ c, position, onToggle }: { c: CountryInfo; position: number; onToggle: () => void }) {
  const checked = position >= 0
  return (
    <label
      className={cn(
        'relative flex cursor-pointer gap-3 rounded-card-sm border bg-card p-4 transition-colors focus-within:ring-2 focus-within:ring-terra/40',
        checked ? 'border-terra bg-terra-soft/50' : 'border-line-strong hover:border-terra/60',
      )}
    >
      <input type="checkbox" checked={checked} onChange={onToggle} className="sr-only" />
      <span
        aria-hidden
        className={cn(
          'mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-[6px] border-2',
          checked ? 'border-terra-strong bg-terra-strong text-on-accent' : 'border-line-strong',
        )}
      >
        {checked && <Check className="size-3" strokeWidth={3} />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2 font-medium">
          {c.name}
          {checked && <span className="rounded-full bg-terra-strong px-2 py-0.5 text-xs text-on-accent">{ord(position)}</span>}
        </span>
        <span className="mt-0.5 block text-sm text-muted">{c.summary}</span>
      </span>
    </label>
  )
}

function PreferenceOrder({ value, onChange }: Props) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }))
  const move = (from: number, to: number) => onChange(arrayMove(value, from, to))
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return
    move(value.indexOf(active.id as CountryCode), value.indexOf(over.id as CountryCode))
  }
  return (
    <section aria-labelledby="ordem-titulo" className="rounded-card-sm border border-line bg-bg p-4">
      <h3 id="ordem-titulo" className="font-sans text-[15px] font-medium">
        Ordene por preferência
      </h3>
      <p className="mt-0.5 text-sm text-muted">Vamos focar mais nas vagas do 1º lugar, mas sem deixar os outros de fora.</p>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={onDragEnd}
        accessibility={{
          screenReaderInstructions: { draggable: 'Aperte espaço para pegar, use as setas para mudar a posição e espaço para soltar.' },
        }}
      >
        <SortableContext items={value} strategy={verticalListSortingStrategy}>
          <ol className="mt-3 space-y-2">
            {value.map((code, i) => (
              <OrderItem
                key={code}
                code={code}
                index={i}
                last={i === value.length - 1}
                onUp={() => move(i, i - 1)}
                onDown={() => move(i, i + 1)}
                onRemove={() => onChange(value.filter((c) => c !== code))}
              />
            ))}
          </ol>
        </SortableContext>
      </DndContext>
    </section>
  )
}

function OrderItem({
  code,
  index,
  last,
  onUp,
  onDown,
  onRemove,
}: {
  code: CountryCode
  index: number
  last: boolean
  onUp: () => void
  onDown: () => void
  onRemove: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: code })
  const name = countryInfo(code).name
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn('flex items-center gap-1.5 rounded-field border border-line bg-card py-1 pl-2 pr-0.5', isDragging && 'z-10 shadow-soft ring-2 ring-terra/40')}
    >
      <button
        type="button"
        className="hidden size-11 shrink-0 cursor-grab items-center justify-center rounded-field text-muted hover:bg-track active:cursor-grabbing lg:inline-flex"
        aria-label={`Arrastar ${name} para mudar a posição`}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-5" aria-hidden />
      </button>
      <span className="inline-flex h-7 min-w-8 shrink-0 items-center justify-center rounded-full bg-terra-strong px-1.5 font-serif text-sm text-on-accent">{ord(index)}</span>
      <span className="min-w-0 flex-1 break-words text-[15px] font-medium leading-tight">{name}</span>
      <button type="button" onClick={onUp} disabled={index === 0} className="inline-flex size-11 items-center justify-center rounded-field text-ink hover:bg-track disabled:opacity-30" aria-label={`Subir ${name}`}>
        <ChevronUp className="size-5" aria-hidden />
      </button>
      <button type="button" onClick={onDown} disabled={last} className="inline-flex size-11 items-center justify-center rounded-field text-ink hover:bg-track disabled:opacity-30" aria-label={`Descer ${name}`}>
        <ChevronDown className="size-5" aria-hidden />
      </button>
      <button type="button" onClick={onRemove} className="inline-flex size-11 items-center justify-center rounded-field text-muted hover:bg-track" aria-label={`Tirar ${name} da lista`}>
        <X className="size-4" aria-hidden />
      </button>
    </li>
  )
}
