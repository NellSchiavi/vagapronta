import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CheckboxProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label: React.ReactNode
  /** some o texto visualmente, mantendo para leitores de tela */
  srOnlyLabel?: boolean
  className?: string
}

/** Caixa de seleção grande (alvo de 44px), com rótulo clicável */
export function Checkbox({ checked, onChange, label, srOnlyLabel, className }: CheckboxProps) {
  return (
    <label className={cn('inline-flex min-h-touch min-w-touch cursor-pointer items-center gap-2.5', className)}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
      <span
        aria-hidden
        className={cn(
          'inline-flex size-6 shrink-0 items-center justify-center rounded-[7px] border-2 transition-colors',
          'peer-focus-visible:ring-2 peer-focus-visible:ring-terra/40 peer-focus-visible:ring-offset-2',
          checked ? 'border-terra-strong bg-terra-strong text-on-accent' : 'border-line-strong bg-card',
        )}
      >
        {checked && <Check className="size-4" strokeWidth={3} />}
      </span>
      <span className={cn('text-[15px]', srOnlyLabel && 'sr-only')}>{label}</span>
    </label>
  )
}
