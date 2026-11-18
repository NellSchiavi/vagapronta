import { useLocation } from 'react-router-dom'
import { CheckCircle2, Loader2 } from 'lucide-react'
import { goTo, useAllAiTasks } from '@/lib/ai-tasks'
import { cn } from '@/lib/utils'

/**
 * Mostra no menu o que a IA está fazendo (ou o que ficou pronto para conferir),
 * para a pessoa poder navegar à vontade e voltar quando quiser.
 */
export function AiTasksIndicator({ compact = false, className }: { compact?: boolean; className?: string }) {
  const tasks = useAllAiTasks()
  const { pathname } = useLocation()
  // na própria tela da tarefa o progresso já aparece grande
  const visible = tasks.filter((t) => t.path.split('?')[0] !== pathname)
  if (!visible.length) return null

  return (
    <div className={cn('flex flex-col gap-1', className)} aria-live="polite">
      {visible.map((t) => {
        const done = t.status === 'done'
        return (
          <button
            key={t.key}
            type="button"
            onClick={() => goTo(t.path)}
            className={cn(
              'inline-flex min-h-touch items-center gap-2 rounded-full border px-3 text-left text-sm font-medium transition-colors',
              done ? 'border-success/30 bg-success-soft text-success' : 'border-terra/25 bg-terra-soft text-terra-strong',
            )}
          >
            {done ? <CheckCircle2 className="size-4 shrink-0" aria-hidden /> : <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />}
            {compact ? (
              <span>{done ? 'Pronto' : 'IA…'}</span>
            ) : (
              <span className="truncate">{done ? `${t.label}: pronto para conferir` : `${t.label}…`}</span>
            )}
            <span className="sr-only">{compact ? `${t.label}${done ? ': pronto para conferir' : ' em andamento'}. Toque para ver.` : 'Toque para ver.'}</span>
          </button>
        )
      })}
    </div>
  )
}
