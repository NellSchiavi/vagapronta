import { animate, motion, useMotionValue, useTransform } from 'framer-motion'
import { useEffect } from 'react'
import { cn } from '@/lib/utils'

interface ScoreRingProps {
  value: number
  size?: number
  stroke?: number
  label?: string
  className?: string
}

/** Nota do currículo num anel circular animado (terracota sobre #F1E8DC) */
export function ScoreRing({ value, size = 132, stroke = 10, label = 'Nota do currículo', className }: ScoreRingProps) {
  const v = Math.max(0, Math.min(100, Math.round(value)))
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r

  const progress = useMotionValue(0)
  const dash = useTransform(progress, (p) => c - (p / 100) * c)
  const shown = useTransform(progress, (p) => Math.round(p))

  useEffect(() => {
    const controls = animate(progress, v, { duration: 1.1, ease: [0.22, 1, 0.36, 1] })
    return controls.stop
  }, [v, progress])

  return (
    <div
      role="img"
      aria-label={`${label}: ${v} de 100`}
      className={cn('relative inline-flex items-center justify-center', className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-track" />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          style={{ strokeDashoffset: dash }}
          className="stroke-terra"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center" aria-hidden>
        <motion.span className="font-serif font-medium leading-none tabular-nums" style={{ fontSize: size * 0.3 }}>
          {shown}
        </motion.span>
        <span className="mt-1 text-xs text-muted">de 100</span>
      </div>
    </div>
  )
}
