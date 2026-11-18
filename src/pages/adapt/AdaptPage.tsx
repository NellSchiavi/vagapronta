import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowRight, FileText, Sparkles } from 'lucide-react'
import { EmptyState } from '@/components/brand/empty-state'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { LoadingCards } from '@/components/ui/skeleton'
import { useResumes } from '@/lib/queries/resumes'
import type { SavedAdaptation } from '@/lib/queries/adapt'
import type { Adaptation } from '@/lib/types'
import { AdaptLettersSwitch } from '@/pages/PlaceholderPage'
import { AdaptForm } from './AdaptForm'
import { AdaptResult } from './AdaptResult'
import { AdaptSaved } from './AdaptSaved'

type Stage = { kind: 'form' } | { kind: 'result'; adaptation: Adaptation; baseId: string } | { kind: 'saved'; saved: SavedAdaptation }

export function AdaptPage() {
  const { data: resumes, isLoading } = useResumes()
  const [params, setParams] = useSearchParams()
  const [stage, setStage] = useState<Stage>({ kind: 'form' })
  const jobId = params.get('vaga')

  // só currículos "de base" (não as versões já adaptadas para outra vaga)
  const bases = useMemo(() => (resumes ?? []).filter((r) => !r.job_id), [resumes])
  const principal = bases.find((r) => r.is_principal) ?? bases[0]

  return (
    <div>
      <AdaptLettersSwitch current="adaptar" />
      <PageHeader
        title="Adaptar à vaga"
        description="Cole o anúncio de uma vaga e veja como deixar seu currículo com a cara dela."
      />

      {isLoading ? (
        <LoadingCards count={2} />
      ) : !principal ? (
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
      ) : !principal.content.sections ? (
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
      ) : stage.kind === 'form' ? (
        <AdaptForm
          bases={bases}
          defaultBaseId={principal.id}
          jobId={jobId}
          onClearJob={() => setParams({}, { replace: true })}
          onResult={(adaptation, baseId) => {
            setStage({ kind: 'result', adaptation, baseId })
            window.scrollTo({ top: 0, behavior: 'smooth' })
          }}
        />
      ) : stage.kind === 'result' ? (
        <AdaptResult
          adaptation={stage.adaptation}
          base={bases.find((b) => b.id === stage.baseId) ?? principal}
          onDiscard={() => setStage({ kind: 'form' })}
          onSaved={(saved) => {
            setStage({ kind: 'saved', saved })
            window.scrollTo({ top: 0, behavior: 'smooth' })
          }}
          onUndone={() => setStage({ kind: 'form' })}
        />
      ) : (
        <AdaptSaved
          saved={stage.saved}
          onAnother={() => {
            setParams({}, { replace: true })
            setStage({ kind: 'form' })
          }}
        />
      )}
    </div>
  )
}
