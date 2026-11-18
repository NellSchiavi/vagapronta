import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, Hourglass, RotateCw, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { AiTaskStatus } from '@/lib/ai-tasks'
import { cn } from '@/lib/utils'

interface Props {
  steps: string[]
  /** quando a tarefa começou (para continuar de onde estava se a pessoa sair e voltar) */
  startedAt?: number
  status?: AiTaskStatus
  onRetry?: () => void
  className?: string
}

/** tempo típico de cada etapa; a última fica até a resposta chegar */
const STEP_MS = 12_000
/** a barra avança devagar e para em 95% até a resposta chegar */
const progressAt = (ms: number) => Math.min(95, Math.round(95 * (1 - Math.exp(-ms / 25_000))))

/**
 * Progresso de uma ação da IA: etapas com marcação, barra de progresso,
 * aviso de que pode levar até 1 minuto e de que dá para continuar usando o app.
 */
export function AiProgress({ steps, startedAt, status = 'running', onRetry, className }: Props) {
  const [now, setNow] = useState(() => Date.now())
  const [start] = useState(() => startedAt ?? Date.now())
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 500)
    return () => window.clearInterval(t)
  }, [])

  const elapsed = Math.max(0, now - start)
  const current = Math.min(steps.length - 1, Math.floor(elapsed / STEP_MS))
  const pct = progressAt(elapsed)

  if (status === 'slow') {
    return (
      <div role="alert" className={cn('flex flex-col items-center gap-3 rounded-card border border-line bg-card px-6 py-10 text-center', className)}>
        <span className="inline-flex size-14 items-center justify-center rounded-full bg-track text-muted">
          <Hourglass className="size-6" aria-hidden />
        </span>
        <p className="font-serif text-xl">A IA está demorando mais que o normal</p>
        <p className="max-w-md text-[15px] text-muted">
          Às vezes ela fica muito procurada. Você pode tentar de novo agora ou continuar esperando: se a resposta chegar,
          avisamos.
        </p>
        {onRetry && (
          <Button onClick={onRetry} className="mt-2">
            <RotateCw aria-hidden /> Tentar de novo
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className={cn('rounded-card border border-terra/20 bg-terra-soft px-5 py-7 sm:px-8', className)}>
      <div className="flex items-center gap-3">
        <span className="relative inline-flex size-11 shrink-0 items-center justify-center">
          <span className="absolute inset-0 animate-ping rounded-full bg-terra/20" aria-hidden />
          <span className="relative inline-flex size-11 items-center justify-center rounded-full bg-card text-terra">
            <Sparkles className="size-5" aria-hidden />
          </span>
        </span>
        <AnimatePresence mode="wait">
          <motion.p
            key={current}
            role="status"
            aria-live="polite"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25 }}
            className="font-serif text-xl leading-snug"
          >
            {steps[current]}
          </motion.p>
        </AnimatePresence>
      </div>

      <div className="mt-5 h-2 overflow-hidden rounded-full bg-card" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label="Progresso">
        <div className="h-full rounded-full bg-terra transition-[width] duration-500 ease-out" style={{ width: `${pct}%` }} />
      </div>

      <ol className="mt-5 space-y-2">
        {steps.map((s, i) => (
          <li key={s} className={cn('flex items-center gap-2.5 text-[15px]', i > current && 'text-ink/50')}>
            <span
              aria-hidden
              className={cn(
                'inline-flex size-5 shrink-0 items-center justify-center rounded-full',
                i < current ? 'bg-success text-on-accent' : i === current ? 'border-2 border-terra' : 'border-2 border-ink/20',
              )}
            >
              {i < current && <Check className="size-3" strokeWidth={3} />}
            </span>
            {s.replace(/…$/, '')}
            <span className="sr-only">{i < current ? ' (feito)' : i === current ? ' (agora)' : ''}</span>
          </li>
        ))}
      </ol>

      <p className="mt-5 text-sm text-ink/75">
        Pode levar até 1 minuto. Enquanto isso, você pode continuar usando o app: avisamos quando ficar pronto.
      </p>
    </div>
  )
}
