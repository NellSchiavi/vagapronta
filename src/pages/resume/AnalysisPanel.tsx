import { useRef } from 'react'
import { ArrowDown, ArrowUp, Check, Copy, RotateCw, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { AiProgress } from '@/components/ai/ai-progress'
import { ScoreRing } from '@/components/brand/score-ring'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { LoadingCards } from '@/components/ui/skeleton'
import { AtsTerm } from '@/components/ui/tooltip'
import { showAiError } from '@/lib/ai'
import { applySuggestion } from '@/lib/apply-suggestion'
import { friendlyDataError } from '@/lib/errors'
import type { Resume, ResumeContent } from '@/lib/resume'
import { useAnalyses, useAnalyzeResume, useDeleteAnalysis, useSetSuggestionApplied } from '@/lib/queries/resumes'
import type { AnalysisSuggestion, ResumeAnalysis, ResumeSection } from '@/lib/types'
import { cn } from '@/lib/utils'
import { ResumeSnapshot } from './ResumeSnapshot'

const SECTION_LABEL: Record<ResumeSection, string> = {
  resumo: 'Resumo',
  experiencia: 'Experiência',
  formacao: 'Formação',
  habilidades: 'Habilidades',
}
const SECTION_ORDER: ResumeSection[] = ['resumo', 'experiencia', 'formacao', 'habilidades']

const ANALYZE_STEPS = [
  'Lendo seu currículo…',
  'Comparando com o que as empresas procuram…',
  'Conferindo as palavras-chave…',
  'Preparando dicas para você…',
]

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' })

export function AnalysisPanel({ resume }: { resume: Resume }) {
  const { data: analyses, isLoading } = useAnalyses(resume.id)
  const analyze = useAnalyzeResume()
  const remove = useDeleteAnalysis()
  const setApplied = useSetSuggestionApplied()
  const latest = analyses?.[0]
  const latestRef = useRef(latest)
  latestRef.current = latest

  function run() {
    analyze.mutate(resume.id, {
      onSuccess: (a) => {
        toast.success(`Pronto! Sua nota é ${a.overall_score}.`, {
          description: 'A análise foi guardada no seu histórico.',
          action: { label: 'Desfazer', onClick: () => remove.mutate(a) },
        })
        window.scrollTo({ top: 0, behavior: 'smooth' })
      },
      onError: showAiError,
    })
  }

  function apply(index: number) {
    const analysis = latestRef.current
    if (!analysis || !resume.content.sections) return
    const s = analysis.suggestions[index]
    const result = applySuggestion(resume.content.sections, s)
    if (!result.ok) {
      toast.error(result.reason, { description: 'Você pode copiar a sugestão e ajustar no editor.' })
      return
    }
    const before: ResumeContent = resume.content
    setApplied.mutate(
      { analysis, index, applied: true, resume, content: { ...before, sections: result.sections } },
      {
        onSuccess: () =>
          toast.success('Sugestão aplicada no seu currículo.', {
            id: 'aplicar-sugestao', // só a última aplicação pode ser desfeita
            description: 'Analise de novo quando quiser ver a nova nota.',
            action: {
              label: 'Desfazer',
              onClick: () =>
                setApplied.mutate(
                  { analysis: latestRef.current!, index, applied: false, resume, content: before },
                  { onSuccess: () => toast('Sugestão desfeita.') },
                ),
            },
          }),
        onError: (e) => toast.error(friendlyDataError(e, 'Não conseguimos aplicar a sugestão.')),
      },
    )
  }

  if (isLoading) return <LoadingCards count={2} label="Carregando a análise…" />
  if (analyze.isPending) return <AiProgress steps={ANALYZE_STEPS} />

  if (!latest) {
    return (
      <div className="space-y-6">
        <Card className="flex flex-col items-start gap-4 border-terra/20 bg-terra-soft p-5 sm:flex-row sm:items-center sm:gap-6 sm:p-8">
          <span className="inline-flex size-14 shrink-0 items-center justify-center rounded-full bg-card text-terra">
            <Sparkles className="size-6" aria-hidden />
          </span>
          <div className="flex-1">
            <h2 className="text-[22px]">Descubra a nota do seu currículo</h2>
            <p className="mt-1.5 text-ink/80">
              Você recebe uma nota de 0 a 100, vê se ele passa nos filtros das empresas e ganha dicas do que melhorar.
            </p>
          </div>
          <Button size="lg" onClick={run} className="w-full sm:w-auto">
            <Sparkles aria-hidden /> Analisar meu currículo
          </Button>
        </Card>
        <SnapshotCard resume={resume} open />
      </div>
    )
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
        <Card className="flex flex-col items-center gap-4 p-6 text-center sm:flex-row sm:text-left">
          <ScoreRing value={latest.overall_score} size={132} />
          <div className="flex-1">
            <p className="text-sm text-muted">Analisado em {fmtDate(latest.created_at)}</p>
            <p className="mt-1.5 text-[15px] leading-relaxed">{latest.summary}</p>
            <Button className="mt-4" onClick={run}>
              <RotateCw aria-hidden /> Analisar de novo
            </Button>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-[19px]">Por critério</h2>
          <div className="mt-4 space-y-4">
            <div>
              <div className="mb-1.5 flex items-baseline justify-between text-sm">
                <span>
                  Compatibilidade com <AtsTerm />
                </span>
                <span className="font-serif text-base font-medium tabular-nums">{latest.scores.ats}</span>
              </div>
              <Progress value={latest.scores.ats} label="Compatibilidade com ATS" hideLabel tone="info" />
            </div>
            <Progress label="Palavras-chave" value={latest.scores.palavras_chave} showValue />
            <Progress label="Estrutura" value={latest.scores.estrutura} showValue tone="success" />
            <Progress label="Clareza" value={latest.scores.clareza} showValue />
          </div>
        </Card>
      </div>

      <Suggestions analysis={latest} onApply={apply} busy={setApplied.isPending} />

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <History analyses={analyses!} />
        <SnapshotCard resume={resume} />
      </div>
    </div>
  )
}

function Suggestions({ analysis, onApply, busy }: { analysis: ResumeAnalysis; onApply: (i: number) => void; busy: boolean }) {
  const items = analysis.suggestions.map((s, index) => ({ s, index }))
  const pending = items.filter((x) => !x.s.aplicada).length
  if (!items.length) {
    return (
      <Card className="p-6">
        <h2 className="text-[19px]">Sugestões</h2>
        <p className="mt-2 text-muted">Nenhuma sugestão desta vez. Seu currículo está muito bem!</p>
      </Card>
    )
  }
  return (
    <section aria-labelledby="sugestoes-titulo">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 id="sugestoes-titulo" className="text-[22px]">
          Sugestões para melhorar
        </h2>
        <p className="text-sm text-muted">{pending ? `${pending} para revisar` : 'Todas aplicadas!'}</p>
      </div>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {[...items]
          .sort((a, b) => SECTION_ORDER.indexOf(a.s.secao) - SECTION_ORDER.indexOf(b.s.secao))
          .map(({ s, index }) => (
            <SuggestionCard key={index} s={s} onApply={() => onApply(index)} busy={busy} />
          ))}
      </div>
    </section>
  )
}

function SuggestionCard({ s, onApply, busy }: { s: AnalysisSuggestion; onApply: () => void; busy: boolean }) {
  const isAddition = !s.antes || s.secao === 'habilidades' || s.secao === 'formacao'
  return (
    <Card className={cn('flex flex-col p-5', s.aplicada && 'border-success/30 bg-success-soft/40')}>
      <p className="mb-2 self-start rounded-full bg-track px-2.5 py-0.5 text-xs font-medium uppercase tracking-wider text-muted">
        {SECTION_LABEL[s.secao]}
      </p>
      <p className="font-medium">{s.titulo}</p>
      <p className="mt-1 text-sm text-muted">{s.explicacao}</p>

      {!isAddition && (
        <div className="mt-3 rounded-[10px] bg-track/60 p-3 text-sm">
          <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted">Hoje</p>
          <p className="text-ink/75">{s.antes}</p>
        </div>
      )}
      <div className="mt-2 rounded-[10px] bg-success-soft p-3 text-sm">
        <p className="mb-1 text-xs font-medium uppercase tracking-wider text-success">
          {isAddition ? (s.secao === 'habilidades' ? 'Acrescentar' : 'Sugestão') : 'Fica assim'}
        </p>
        <p className="text-ink">{s.depois}</p>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {s.aplicada ? (
          <span className="inline-flex min-h-touch items-center gap-1.5 text-sm font-medium text-success">
            <Check className="size-4" aria-hidden /> Aplicada no currículo
          </span>
        ) : (
          <Button size="sm" onClick={onApply} disabled={busy}>
            <Check aria-hidden /> Aplicar sugestão
          </Button>
        )}
        <Button
          size="sm"
          variant="ghost"
          className="text-muted"
          onClick={() =>
            navigator.clipboard
              ?.writeText(s.depois)
              .then(() => toast.success('Texto copiado.'))
              .catch(() => toast.error('Não conseguimos copiar. Selecione o texto e copie manualmente.'))
          }
        >
          <Copy aria-hidden /> Copiar
        </Button>
      </div>
    </Card>
  )
}

function History({ analyses }: { analyses: ResumeAnalysis[] }) {
  const rows = analyses.slice(0, 8)
  return (
    <Card className="p-6">
      <h2 className="text-[19px]">Evolução da nota</h2>
      {rows.length < 2 && <p className="mt-1 text-sm text-muted">Analise de novo depois de aplicar as sugestões para ver sua nota subir.</p>}
      <ol className="mt-4 space-y-3">
        {rows.map((a, i) => {
          const prev = analyses[i + 1]
          const delta = prev ? a.overall_score - prev.overall_score : null
          return (
            <li key={a.id} className="flex items-center gap-3">
              <span className="w-[86px] shrink-0 text-sm text-muted">{fmtDate(a.created_at).replace(/ de \d{4}$/, '')}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-track" aria-hidden>
                <div className={cn('h-full rounded-full', i === 0 ? 'bg-terra' : 'bg-terra/40')} style={{ width: `${a.overall_score}%` }} />
              </div>
              <span className="w-8 text-right font-serif font-medium tabular-nums">{a.overall_score}</span>
              <span className="w-12 text-right text-sm">
                {delta !== null && delta !== 0 && (
                  <span className={cn('inline-flex items-center', delta > 0 ? 'text-success' : 'text-danger')}>
                    {delta > 0 ? <ArrowUp className="size-3.5" aria-hidden /> : <ArrowDown className="size-3.5" aria-hidden />}
                    {Math.abs(delta)}
                    <span className="sr-only">{delta > 0 ? ' pontos a mais' : ' pontos a menos'}</span>
                  </span>
                )}
              </span>
            </li>
          )
        })}
      </ol>
    </Card>
  )
}

function SnapshotCard({ resume, open = false }: { resume: Resume; open?: boolean }) {
  if (!resume.content.sections) return null
  return (
    <Card className="p-0">
      <details open={open} className="group">
        <summary className="flex min-h-[56px] cursor-pointer items-center justify-between gap-3 px-6 py-3 marker:content-none">
          <span className="font-serif text-[19px]">Como está seu currículo</span>
          <span className="text-sm text-terra-strong group-open:hidden">Ver</span>
          <span className="hidden text-sm text-terra-strong group-open:inline">Esconder</span>
        </summary>
        <div className="px-6 pb-6">
          <ResumeSnapshot sections={resume.content.sections} />
        </div>
      </details>
    </Card>
  )
}
