import { Sparkles } from 'lucide-react'
import { useAiUsage } from '@/lib/queries/ai-usage'
import { cn } from '@/lib/utils'

/** "Restam 35 usos de IA hoje": discreto, perto dos botões que usam a IA */
export function AiUsageNote({ className }: { className?: string }) {
  const { data } = useAiUsage()
  if (!data) return null
  const { remaining } = data
  const text =
    remaining === 0
      ? 'Os usos de IA de hoje acabaram. Amanhã libera de novo.'
      : `Resta${remaining === 1 ? '' : 'm'} ${remaining} uso${remaining === 1 ? '' : 's'} de IA hoje`
  return (
    <p className={cn('inline-flex items-center gap-1.5 text-xs text-muted', className)}>
      <Sparkles className="size-3.5 shrink-0" aria-hidden />
      {text}
    </p>
  )
}
