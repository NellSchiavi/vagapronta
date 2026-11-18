import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Progresso de uma ação da IA: frases que se alternam enquanto ela trabalha
 * ("Lendo seu currículo…", "Preparando dicas…").
 */
export function AiProgress({ steps, className }: { steps: string[]; className?: string }) {
  const [i, setI] = useState(0)
  useEffect(() => {
    const t = window.setInterval(() => setI((x) => Math.min(x + 1, steps.length - 1)), 2600)
    return () => window.clearInterval(t)
  }, [steps.length])

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn('flex flex-col items-center gap-4 rounded-card border border-terra/20 bg-terra-soft px-6 py-10 text-center', className)}
    >
      <span className="relative inline-flex size-14 items-center justify-center">
        <span className="absolute inset-0 animate-ping rounded-full bg-terra/20" aria-hidden />
        <span className="relative inline-flex size-14 items-center justify-center rounded-full bg-card text-terra">
          <Sparkles className="size-6" aria-hidden />
        </span>
      </span>
      <AnimatePresence mode="wait">
        <motion.p
          key={i}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.25 }}
          className="font-serif text-xl"
        >
          {steps[i]}
        </motion.p>
      </AnimatePresence>
      <div className="flex gap-1.5" aria-hidden>
        {steps.map((_, k) => (
          <span key={k} className={cn('h-1.5 w-6 rounded-full transition-colors', k <= i ? 'bg-terra' : 'bg-terra/20')} />
        ))}
      </div>
      <p className="text-sm text-muted">Isso costuma levar menos de um minuto.</p>
    </div>
  )
}
