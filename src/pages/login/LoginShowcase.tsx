import { motion } from 'framer-motion'
import { TrendingUp } from 'lucide-react'
import { ScoreRing } from '@/components/brand/score-ring'

/** Painel ilustrativo do login (só no desktop) */
export function LoginShowcase() {
  return (
    <aside aria-hidden className="relative hidden overflow-hidden bg-terra-soft lg:flex lg:items-center lg:justify-center">
      {/* formas decorativas suaves */}
      <div className="absolute -right-24 -top-24 size-80 rounded-full bg-terra/10" />
      <div className="absolute -bottom-32 -left-16 size-96 rounded-full bg-terra/[0.07]" />

      <motion.div
        initial={{ opacity: 0, y: 24, rotate: 0 }}
        animate={{ opacity: 1, y: 0, rotate: -4 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
        className="relative w-[340px] rounded-card border border-line bg-card p-7 shadow-soft"
      >
        <p className="text-sm font-medium text-muted">Nota do currículo</p>
        <div className="mt-4 flex items-center gap-5">
          <ScoreRing value={89} size={112} stroke={9} />
          <div>
            <p className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-success-soft px-2.5 py-1 text-sm font-medium text-success">
              <TrendingUp className="size-4" />
              +25 após adaptar
            </p>
            <p className="mt-2 text-sm text-muted">Antes: 64</p>
          </div>
        </div>

        <div className="mt-6 space-y-2.5">
          {[92, 78, 64].map((w, i) => (
            <div key={i} className="h-2 rounded-full bg-track" style={{ width: `${w}%` }} />
          ))}
        </div>

        <div className="mt-6 flex items-center gap-3 rounded-card-sm bg-bg p-3">
          <span className="inline-flex size-9 items-center justify-center rounded-[10px] bg-info-soft font-serif text-info">M</span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">Analista de RH jr</p>
            <p className="text-xs text-muted">Magalu · São Paulo</p>
          </div>
          <span className="rounded-full bg-success-soft px-2 py-0.5 text-xs font-medium text-success">89%</span>
        </div>
      </motion.div>
    </aside>
  )
}
