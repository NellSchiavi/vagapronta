import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { Check, Loader2, Plus, Sparkles, X } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export type SaveState = 'idle' | 'saving' | 'saved' | 'error'

/**
 * Salvamento automático: grava `value` com um pequeno atraso depois da última mudança.
 * Não grava na primeira renderização nem quando nada mudou.
 */
export function useAutosave<T>(value: T, save: (v: T) => Promise<unknown>, delay = 800): SaveState {
  const [state, setState] = useState<SaveState>('idle')
  const last = useRef(JSON.stringify(value))
  const saveRef = useRef(save)
  saveRef.current = save
  useEffect(() => {
    const json = JSON.stringify(value)
    if (json === last.current) return
    setState('saving')
    const t = window.setTimeout(() => {
      saveRef
        .current(value)
        .then(() => {
          last.current = json
          setState('saved')
        })
        .catch(() => setState('error'))
    }, delay)
    return () => window.clearTimeout(t)
  }, [value, delay])
  return state
}

export function SaveStatus({ state }: { state: SaveState }) {
  return (
    <span aria-live="polite" className="inline-flex items-center gap-1 text-xs text-muted">
      {state === 'saving' && (
        <>
          <Loader2 className="size-3 animate-spin" aria-hidden /> Salvando…
        </>
      )}
      {state === 'saved' && (
        <>
          <Check className="size-3 text-success" aria-hidden /> Salvo
        </>
      )}
      {state === 'error' && <span className="text-danger">Não salvou. Confira sua internet.</span>}
    </span>
  )
}

export function SectionCard({
  id,
  title,
  description,
  status,
  children,
}: {
  id: string
  title: string
  description?: ReactNode
  status?: SaveState
  children: ReactNode
}) {
  return (
    <Card id={id} className="scroll-mt-24 p-5 sm:p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-[21px] leading-snug">{title}</h2>
          {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
        </div>
        {status && <SaveStatus state={status} />}
      </div>
      <div className="space-y-5">{children}</div>
    </Card>
  )
}

/** Selo "sugerido" com botão para aceitar a sugestão ali mesmo */
export function SuggestedBadge({ value, onAccept, onDismiss }: { value: ReactNode; onAccept: () => void; onDismiss: () => void }) {
  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-2 rounded-field border border-info/25 bg-info-soft px-3 py-2 text-sm">
      <span className="inline-flex items-center gap-1 rounded-full bg-card px-2 py-0.5 text-xs font-medium text-info">
        <Sparkles className="size-3" aria-hidden /> sugerido
      </span>
      <span className="min-w-0 flex-1 break-words">{value}</span>
      <button type="button" onClick={onAccept} className="min-h-[36px] rounded-field px-2 font-medium text-info hover:underline">
        Usar
      </button>
      <button type="button" onClick={onDismiss} className="min-h-[36px] rounded-field px-2 text-muted hover:underline">
        Ignorar
      </button>
    </div>
  )
}

interface ChipsProps {
  id: string
  label: string
  hint?: string
  values: string[]
  onChange: (v: string[]) => void
  placeholder?: string
  /** atalhos para adicionar com um toque */
  suggestions?: string[]
  /** sugestões vindas da IA (com selo "sugerido") */
  aiSuggestions?: string[]
}

/** Lista de itens em "chips": digite e aperte Enter (ou vírgula) para adicionar */
export function ChipsInput({ id, label, hint, values, onChange, placeholder, suggestions = [], aiSuggestions = [] }: ChipsProps) {
  const [text, setText] = useState('')
  const hintId = useId()
  const has = (v: string) => values.some((x) => x.toLowerCase() === v.toLowerCase())
  const add = (raw: string) => {
    const items = raw
      .split(/[,;\n]/)
      .map((s) => s.trim())
      .filter((s) => s && !has(s))
    if (items.length) onChange([...values, ...items])
    setText('')
  }
  const quick = suggestions.filter((s) => !has(s))
  const ai = aiSuggestions.filter((s) => !has(s))

  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      {hint && (
        <p id={hintId} className="text-[13px] text-muted">
          {hint}
        </p>
      )}
      {values.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-1.5" aria-label={`${label}: itens adicionados`}>
          {values.map((v) => (
            <li key={v} className="inline-flex items-center gap-1 rounded-full bg-terra-soft py-1 pl-3 pr-1 text-sm text-ink">
              {v}
              <button
                type="button"
                onClick={() => onChange(values.filter((x) => x !== v))}
                className="inline-flex size-7 items-center justify-center rounded-full text-muted hover:bg-card hover:text-ink"
                aria-label={`Remover ${v}`}
              >
                <X className="size-3.5" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-2 flex gap-2">
        <input
          id={id}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault()
              add(text)
            }
          }}
          onBlur={() => text.trim() && add(text)}
          placeholder={placeholder ?? 'Digite e aperte Enter'}
          aria-describedby={hint ? hintId : undefined}
          className="min-h-touch w-full flex-1 rounded-field border border-line-strong bg-card px-3.5 text-[15px] placeholder:text-muted/80 focus-visible:border-terra focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terra/30"
        />
        <button
          type="button"
          onClick={() => add(text)}
          disabled={!text.trim()}
          className="inline-flex min-h-touch shrink-0 items-center gap-1 rounded-field border border-line-strong bg-card px-3 text-sm font-medium disabled:opacity-50"
        >
          <Plus className="size-4" aria-hidden /> Adicionar
        </button>
      </div>
      {(ai.length > 0 || quick.length > 0) && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {ai.map((s) => (
            <button
              key={`ai-${s}`}
              type="button"
              onClick={() => onChange([...values, s])}
              className="inline-flex min-h-[36px] items-center gap-1 rounded-full border border-info/30 bg-info-soft px-3 text-sm text-info"
            >
              <Sparkles className="size-3.5" aria-hidden /> {s}
              <span className="sr-only"> (sugerido, toque para adicionar)</span>
            </button>
          ))}
          {quick.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onChange([...values, s])}
              className="inline-flex min-h-[36px] items-center gap-1 rounded-full border border-line-strong bg-card px-3 text-sm text-muted hover:text-ink"
            >
              <Plus className="size-3.5" aria-hidden /> {s}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/** Escolha de várias opções em botões (ex.: modalidade, nível) */
export function ToggleChips<T extends string>({
  id,
  label,
  options,
  values,
  onChange,
  single = false,
}: {
  id: string
  label: string
  options: { value: T; label: string }[]
  values: T[]
  onChange: (v: T[]) => void
  single?: boolean
}) {
  return (
    <fieldset id={id} className="scroll-mt-24">
      <legend className="text-sm font-medium">{label}</legend>
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((o) => {
          const on = values.includes(o.value)
          return (
            <button
              key={o.value}
              type="button"
              aria-pressed={on}
              onClick={() => onChange(single ? (on ? [] : [o.value]) : on ? values.filter((v) => v !== o.value) : [...values, o.value])}
              className={cn(
                'inline-flex min-h-touch items-center gap-1.5 rounded-full border px-4 text-sm font-medium transition-colors',
                on ? 'border-terra bg-terra-soft text-terra-strong' : 'border-line-strong bg-card text-ink hover:border-terra/60',
              )}
            >
              {on && <Check className="size-4" aria-hidden />}
              {o.label}
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}

/** Interruptor liga/desliga com texto */
export function SwitchRow({ id, label, help, checked, onChange }: { id: string; label: string; help?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <label htmlFor={id} className="min-w-0 cursor-pointer">
        <span className="block text-[15px] font-medium">{label}</span>
        {help && <span className="block text-sm text-muted">{help}</span>}
      </label>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors',
          'before:absolute before:-inset-2 before:content-[""]', // área de toque maior
          checked ? 'bg-terra-strong' : 'bg-line-strong',
        )}
      >
        <span className={cn('inline-block size-5 rounded-full bg-white shadow transition-transform', checked ? 'translate-x-6' : 'translate-x-1')} />
      </button>
    </div>
  )
}
