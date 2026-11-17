import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface ProgressProps {
  value: number
  label?: string
  showValue?: boolean
  tone?: 'terra' | 'success' | 'info'
  /** mantém o rótulo só para leitores de tela */
  hideLabel?: boolean
  className?: string
}

const toneClass = { terra: 'bg-terra', success: 'bg-success', info: 'bg-info' }

/** Barra de progresso (usada nas notas por critério e no onboarding) */
export function Progress({ value, label, showValue, tone = 'terra', hideLabel, className }: ProgressProps) {
  const v = Math.max(0, Math.min(100, Math.round(value)))
  return (
    <div className={cn('w-full', className)}>
      {!hideLabel && (label || showValue) && (
        <div className="mb-1.5 flex items-baseline justify-between text-sm">
          {label && <span className="text-ink">{label}</span>}
          {showValue && <span className="font-serif text-base font-medium tabular-nums">{v}</span>}
        </div>
      )}
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={v}
        aria-label={label}
        className="h-2 w-full overflow-hidden rounded-full bg-track"
      >
        <motion.div
          className={cn('h-full rounded-full', toneClass[tone])}
          initial={{ width: 0 }}
          animate={{ width: `${v}%` }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
    </div>
  )
}
