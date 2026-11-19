import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowRight, FileText, Sparkles } from 'lucide-react'
import { AiProgress } from '@/components/ai/ai-progress'
import { EmptyState } from '@/components/brand/empty-state'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { LoadingCards } from '@/components/ui/skeleton'
import { clearAiTask, useAiTask } from '@/lib/ai-tasks'
import { useResumes } from '@/lib/queries/resumes'
import type { SavedAdaptation } from '@/lib/queries/adapt'
import type { Adaptation } from '@/lib/types'
import { AdaptLettersSwitch } from '@/pages/PlaceholderPage'
import { ADAPT_STEPS, ADAPT_TASK, AdaptForm, type AdaptMeta } from './AdaptForm'
import { AdaptResult } from './AdaptResult'
import { AdaptSaved } from './AdaptSaved'

export function AdaptPage() {
  const { data: resumes, isLoading } = useResumes()
  const [params, setParams] = useSearchParams()
  const [saved, setSaved] = useState<SavedAdaptation | null>(null)
  // a adaptação roda em segundo plano: o resultado fica guardado aqui até ser salvo ou descartado
  const task = useAiTask<Adaptation, AdaptMeta>(ADAPT_TASK)
  const jobId = params.get('vaga')

  // só currículos "de base" (não as versões já adaptadas para outra vaga)
  const bases = useMemo(() => (resumes ?? []).filter((r) => !r.job_id), [resumes])
  const principal = bases.find((r) => r.is_principal) ?? bases[0]

  function body() {
    if (isLoading) return <LoadingCards count={2} />
    if (!principal) {
      return (
        <EmptyState
          icon={FileText}
          title="Envie seu currículo primeiro"
          description="Para adaptar seu currículo a uma vaga, ele precisa estar no VagaPronta."
          action={
            <Button asChild>
              <Link to="/curriculo">Enviar currículo</Link>
            </Button>
          }
        />
      )
    }
    if (!principal.content.sections) {
      return (
        <Card className="flex flex-col items-start gap-4 border-terra/20 bg-terra-soft p-5 sm:flex-row sm:items-center sm:gap-6 sm:p-8">
          <span className="inline-flex size-14 shrink-0 items-center justify-center rounded-full bg-card text-terra">
            <Sparkles className="size-6" aria-hidden />
          </span>
          <div className="flex-1">
            <h2 className="text-[22px]">Organize seu currículo primeiro</h2>
            <p className="mt-1.5 text-ink/80">Leva menos de um minuto. Depois disso, a adaptação consegue mexer em cada parte dele.</p>
          </div>
          <Button asChild size="lg" className="w-full sm:w-auto">
            <Link to="/curriculo">
              Organizar com IA <ArrowRight aria-hidden />
            </Link>
          </Button>
        </Card>
      )
    }
    if (saved) {
      return (
        <AdaptSaved
          saved={saved}
          onAnother={() => {
            setParams({}, { replace: true })
            setSaved(null)
          }}
        />
      )
    }
    if (task && task.status !== 'done') {
      return <AiProgress steps={ADAPT_STEPS} startedAt={task.startedAt} status={task.status} retryAt={task.retryAt} onRetry={task.retry} />
    }
    if (task?.status === 'done' && task.result) {
      return (
        <AdaptResult
          adaptation={task.result}
          base={bases.find((b) => b.id === task.meta?.baseId) ?? principal}
          onDiscard={() => clearAiTask(ADAPT_TASK)}
          onSaved={(s) => {
            clearAiTask(ADAPT_TASK)
            setSaved(s)
            window.scrollTo({ top: 0, behavior: 'smooth' })
          }}
          onUndone={() => setSaved(null)}
        />
      )
    }
    return (
      <AdaptForm
        bases={bases}
        defaultBaseId={principal.id}
        jobId={jobId}
        initialUrl={params.get('link')}
        initialText={params.get('texto')}
        onInitialUsed={() => {
          const next = new URLSearchParams(params)
          next.delete('link')
          next.delete('texto')
          setParams(next, { replace: true })
        }}
        onClearJob={() => setParams({}, { replace: true })}
      />
    )
  }

  return (
    <div>
      <AdaptLettersSwitch current="adaptar" />
      <PageHeader title="Adaptar à vaga" description="Cole o anúncio de uma vaga e veja como deixar seu currículo com a cara dela." />
      {body()}
    </div>
  )
}
