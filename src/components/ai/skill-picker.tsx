import { Check, Info } from 'lucide-react'
import { cn } from '@/lib/utils'

export function splitSkills(text: string) {
  return text
    .split(/[,;\n]/)
    .map((s) => s.trim().replace(/\.$/, ''))
    .filter(Boolean)
}

/**
 * Habilidades sugeridas pela IA, uma a uma. A pessoa marca só o que realmente sabe fazer:
 * vêm marcadas apenas as que já aparecem no currículo.
 */
export function SkillPicker({
  items,
  selected,
  inResume,
  onChange,
}: {
  items: string[]
  selected: string[]
  inResume: (s: string) => boolean
  onChange: (sel: string[]) => void
}) {
  return (
    <div className="mt-3">
      <p className="flex items-start gap-1.5 text-[13px] text-ink/80">
        <Info className="mt-0.5 size-3.5 shrink-0 text-info" aria-hidden />
        Marcamos as que já aparecem no seu currículo. Marque outras só se você realmente souber fazer.
      </p>
      <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Habilidades sugeridas">
        {items.map((s) => {
          const on = selected.includes(s)
          return (
            <li key={s}>
              <button
                type="button"
                aria-pressed={on}
                onClick={() => onChange(on ? selected.filter((x) => x !== s) : [...selected, s])}
                className={cn(
                  'inline-flex min-h-[40px] items-center gap-1.5 rounded-full border px-3 text-sm transition-colors',
                  on ? 'border-success/40 bg-success-soft text-ink' : 'border-line-strong bg-card text-muted',
                )}
              >
                <span
                  aria-hidden
                  className={cn('inline-flex size-4 items-center justify-center rounded-[4px] border', on ? 'border-success bg-success text-on-accent' : 'border-line-strong')}
                >
                  {on && <Check className="size-3" strokeWidth={3} />}
                </span>
                {s}
                {!inResume(s) && <span className="text-xs text-muted">(novo)</span>}
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
