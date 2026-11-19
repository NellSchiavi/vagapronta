import { Check, Loader2, Sparkles, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { clearAiTask, startAiTask, useAiTask } from '@/lib/ai-tasks'
import { hasGaps } from '@/lib/gaps'
import { improveSection, type ImproveKind, type ImproveSuggestion } from '@/lib/queries/resumes'

interface Props {
  /** chave única da parte (ex.: "melhorar:<id>:experiencia:2") */
  taskKey: string
  kind: ImproveKind
  /** texto atual da parte */
  text: string
  /** cargo que a pessoa procura (ajuda a IA a escolher o que destacar) */
  targetRole?: string
  context?: { cargo?: string; empresa?: string }
  path: string
  /** usa a sugestão; devolve o texto anterior para o "Desfazer" */
  onUse: (text: string) => void
  onUndo: (previous: string) => void
}

/**
 * "Melhorar com IA" de uma parte do currículo. A IA só SUGERE: nada muda até a
 * pessoa tocar em "Usar esta versão" (e ainda dá para desfazer).
 */
export function ImproveWithAi({ taskKey, kind, text, targetRole, context, path, onUse, onUndo }: Props) {
  const task = useAiTask<ImproveSuggestion>(taskKey)
  const running = task && task.status !== 'done'
  const suggestion = task?.status === 'done' ? task.result : undefined
  const tooShort = text.trim().length < 15

  function run() {
    startAiTask<ImproveSuggestion>({
      key: taskKey,
      label: 'Melhorando uma parte do currículo',
      path,
      readyText: 'A sugestão da IA para o seu currículo ficou pronta.',
      run: () =>
        improveSection({
          tipo: kind,
          texto: text,
          cargo_alvo: targetRole,
          contexto: context,
        }),
    })
  }

  function use() {
    if (!suggestion) return
    const previous = text
    onUse(suggestion.texto)
    clearAiTask(taskKey)
    toast.success('Pronto, usamos a versão da IA.', {
      action: { label: 'Desfazer', onClick: () => onUndo(previous) },
    })
  }

  if (suggestion) {
    return (
      <div className="mt-2 rounded-card-sm border border-terra/30 bg-terra-soft/40 p-3" role="region" aria-label="Sugestão da IA">
        <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-terra-strong">
          <Sparkles className="size-3.5" aria-hidden /> Sugestão da IA
        </p>
        <p className="mt-1.5 whitespace-pre-line text-[15px] leading-relaxed">{suggestion.texto}</p>
        {suggestion.dica && <p className="mt-1.5 text-[13px] text-muted">{suggestion.dica}</p>}
        {hasGaps(suggestion.texto) && (
          <p className="mt-1.5 rounded-[8px] bg-warn-soft px-2.5 py-1.5 text-[13px] text-warn">
            O que está entre [colchetes] é para você completar com o seu dado real (ou apagar) depois de usar.
          </p>
        )}
        <p className="mt-1.5 text-[13px] text-muted">Confira: a IA pode errar. Mude o que quiser depois de usar.</p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <Button size="sm" onClick={use}>
            <Check aria-hidden /> Usar esta versão
          </Button>
          <Button size="sm" variant="ghost" onClick={() => clearAiTask(taskKey)}>
            <X aria-hidden /> Manter a minha
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="mt-1.5">
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="-ml-2 text-terra-strong"
        onClick={run}
        disabled={running || tooShort}
        title={tooShort ? 'Escreva um pouco mais antes de pedir ajuda à IA' : undefined}
      >
        {running ? <Loader2 className="animate-spin" aria-hidden /> : <Sparkles aria-hidden />}
        {task?.status === 'waiting' ? 'Muita gente usando a IA, tentando de novo…' : running ? 'Melhorando…' : 'Melhorar com IA'}
      </Button>
    </div>
  )
}
