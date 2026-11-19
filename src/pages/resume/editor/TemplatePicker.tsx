import { Check } from 'lucide-react'
import { TEMPLATES } from '@/components/pdf/resume-pdf'
import type { ResumeTemplate } from '@/lib/resume'
import { cn } from '@/lib/utils'

/** Miniatura simples de cada modelo (só para escolher; a prévia mostra o PDF de verdade) */
function Thumb({ id }: { id: ResumeTemplate }) {
  const lines = (n: number, gap = 'gap-[3px]') => (
    <span className={cn('flex flex-col', gap)}>
      {Array.from({ length: n }, (_, i) => (
        <span key={i} className={cn('block h-[2px] rounded bg-ink/15', i % 3 === 2 ? 'w-2/3' : 'w-full')} />
      ))}
    </span>
  )
  return (
    <span aria-hidden className="relative block aspect-[210/297] w-full overflow-hidden rounded-[4px] bg-white ring-1 ring-line">
      {id === 'moderno' && <span className="block h-[22%] bg-terra" />}
      {id === 'geometrico' && (
        <>
          <span className="absolute -right-3 -top-3 size-9 rounded-full bg-terra-soft" />
          <span className="absolute right-4 top-3 size-2.5 rotate-45 bg-terra" />
        </>
      )}
      <span className={cn('flex flex-col', id === 'compacto' ? 'gap-1.5 p-1.5' : 'gap-2 p-2.5', id === 'moderno' && 'pt-2')}>
        {id !== 'moderno' && <span className={cn('block rounded bg-ink/70', id === 'compacto' ? 'h-[4px] w-1/2' : 'h-[5px] w-3/5')} />}
        {id === 'classico' && <span className="block h-[2px] w-4 bg-terra" />}
        {id === 'compacto' && <span className="block h-px w-full bg-terra" />}
        {[0, 1, 2].map((k) => (
          <span key={k} className="flex flex-col gap-1">
            <span className={cn('flex items-center gap-1', id === 'moderno' && 'text-terra')}>
              {id === 'geometrico' && <span className="size-[4px] rotate-45 bg-terra" />}
              <span className={cn('block h-[3px] w-1/3 rounded', id === 'moderno' ? 'bg-terra' : 'bg-ink/50')} />
            </span>
            {lines(id === 'compacto' ? 4 : 3, id === 'compacto' ? 'gap-[2px]' : 'gap-[3px]')}
          </span>
        ))}
      </span>
    </span>
  )
}

export function TemplatePicker({ value, onChange }: { value: ResumeTemplate; onChange: (t: ResumeTemplate) => void }) {
  return (
    <div role="radiogroup" aria-label="Modelo do currículo" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {TEMPLATES.map((t) => {
        const active = t.id === value
        return (
          <button
            key={t.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(t.id)}
            className={cn(
              'flex flex-col gap-2 rounded-card-sm border p-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terra/40',
              active ? 'border-terra-strong bg-terra-soft/50' : 'border-line-strong bg-card hover:border-terra/60',
            )}
          >
            <span className="mx-auto block w-[64%]">
              <Thumb id={t.id} />
            </span>
            <span className="flex items-center justify-between gap-1">
              <span className="text-sm font-medium">{t.name}</span>
              {active && <Check className="size-4 text-terra-strong" aria-hidden />}
            </span>
            <span className="text-xs leading-snug text-muted">{t.description}</span>
          </button>
        )
      })}
    </div>
  )
}
