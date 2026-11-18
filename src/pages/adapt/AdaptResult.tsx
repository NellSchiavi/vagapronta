import { useEffect, useState } from 'react'
import { animate, motion, useMotionValue, useTransform } from 'framer-motion'
import { ArrowRight, Check, RotateCcw, Save } from 'lucide-react'
import { toast } from 'sonner'
import { GapEditor, GapText } from '@/components/ai/gap-text'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { friendlyDataError } from '@/lib/errors'
import { hasGaps } from '@/lib/gaps'
import { estimatedAfter, useSaveAdaptation, type SavedAdaptation } from '@/lib/queries/adapt'
import type { Resume } from '@/lib/resume'
import { WORK_MODE_LABEL, type Adaptation, type ResumeSection } from '@/lib/types'
import { cn } from '@/lib/utils'

const SECTION_LABEL: Record<ResumeSection, string> = {
  resumo: 'Resumo',
  experiencia: 'Experiência',
  formacao: 'Formação',
  habilidades: 'Habilidades',
}

function AnimatedPct({ value, className }: { value: number; className?: string }) {
  const mv = useMotionValue(value)
  const text = useTransform(mv, (v) => `${Math.round(v)}%`)
  useEffect(() => {
    const c = animate(mv, value, { duration: 0.6, ease: 'easeOut' })
    return c.stop
  }, [value, mv])
  return <motion.span className={className}>{text}</motion.span>
}

interface Props {
  adaptation: Adaptation
  base: Resume
  onDiscard: () => void
  onSaved: (s: SavedAdaptation) => void
  /** chamado quando a pessoa desfaz o salvamento pelo aviso */
  onUndone: () => void
}

export function AdaptResult({ adaptation: a, base, onDiscard, onSaved, onUndone }: Props) {
  const [accepted, setAccepted] = useState<boolean[]>(() => a.mudancas.map(() => true))
  // texto final de cada mudança (a pessoa completa as lacunas como "[X]%")
  const [edits, setEdits] = useState<string[]>(() => a.mudancas.map((m) => m.depois))
  const { save, undo } = useSaveAdaptation()
  const after = estimatedAfter(a, accepted)
  const count = accepted.filter(Boolean).length
  const allOn = count === a.mudancas.length
  const pendingGaps = a.mudancas.filter((_, i) => accepted[i] && hasGaps(edits[i])).length

  function doSave() {
    save.mutate(
      { base, adaptation: a, accepted, edits },
      {
        onSuccess: (s) => {
          toast.success('Nova versão salva!', {
            description: s.skipped
              ? `${s.skipped} mudança(s) não puderam ser aplicadas porque o trecho original mudou.`
              : `"${s.title}" está na tela Currículo.`,
            action: {
              label: 'Desfazer',
              // mutateAsync: esta tela já saiu quando a pessoa toca em Desfazer,
              // e os callbacks de mutate() não rodam em componente desmontado
              onClick: () =>
                undo
                  .mutateAsync(s)
                  .then(() => {
                    toast('Versão desfeita. Nada foi alterado no seu currículo.')
                    onUndone()
                  })
                  .catch((e) => toast.error(friendlyDataError(e, 'Não conseguimos desfazer.'))),
            },
          })
          onSaved(s)
        },
        onError: (e) => toast.error(friendlyDataError(e, 'Não conseguimos salvar a nova versão.')),
      },
    )
  }

  const meta = [a.vaga.empresa, a.vaga.local, a.vaga.modalidade ? WORK_MODE_LABEL[a.vaga.modalidade] : null].filter(Boolean).join(' · ')

  return (
    <div className="space-y-6">
      <Card className="p-5 sm:p-6">
        <p className="text-sm font-medium text-terra-strong">Vaga</p>
        <h2 className="mt-0.5 text-[22px] leading-snug">{a.vaga.titulo}</h2>
        {meta && <p className="text-muted">{meta}</p>}
        {a.vaga.resumo && <p className="mt-2 text-[15px]">{a.vaga.resumo}</p>}

        <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-card-sm bg-bg p-4 text-center sm:max-w-md">
          <div>
            <p className="text-sm text-muted">Hoje</p>
            <p className="font-serif text-[34px] font-medium leading-tight tabular-nums text-ink/70">{a.compat_antes}%</p>
          </div>
          <ArrowRight className="size-6 text-terra" aria-hidden />
          <div>
            <p className="text-sm text-muted">Com as mudanças</p>
            <AnimatedPct
              value={after}
              className={cn('font-serif text-[34px] font-medium leading-tight tabular-nums', after > 85 ? 'text-success' : 'text-terra-strong')}
            />
          </div>
        </div>
        <p className="sr-only" aria-live="polite">
          Compatibilidade: hoje {a.compat_antes}%, com as mudanças marcadas {after}%.
        </p>
        <p className="mt-2 text-[13px] text-muted">Compatibilidade estimada pela IA. Ela muda conforme você marca ou desmarca as mudanças.</p>

        {a.palavras_chave.length > 0 && (
          <div className="mt-4">
            <p className="text-sm font-medium">Palavras-chave da vaga</p>
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {a.palavras_chave.map((k) => (
                <li key={k} className="rounded-full bg-info-soft px-2.5 py-1 text-sm text-info">
                  {k}
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      <section aria-labelledby="mudancas-titulo">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="mudancas-titulo" className="text-[22px]">
            Mudanças sugeridas
          </h2>
          <button
            type="button"
            onClick={() => setAccepted(a.mudancas.map(() => !allOn))}
            className="min-h-touch text-sm font-medium text-terra-strong underline-offset-[3px] hover:underline"
          >
            {allOn ? 'Desmarcar todas' : 'Marcar todas'}
          </button>
        </div>
        <p className="mb-4 text-sm text-muted">Marque as que você aceita. Nada muda no seu currículo principal: vamos criar uma versão nova para esta vaga.</p>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {a.mudancas.map((m, i) => (
            <Card key={i} className={cn('flex flex-col p-5 transition-colors', accepted[i] ? 'border-terra/40' : 'opacity-75')}>
              <div className="flex items-start gap-2">
                <Checkbox
                  checked={accepted[i]}
                  onChange={(v) => setAccepted((arr) => arr.map((x, k) => (k === i ? v : x)))}
                  label={`Aceitar: ${m.titulo}`}
                  srOnlyLabel
                  className="-ml-2 -mt-2.5 justify-center"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-track px-2.5 py-0.5 text-xs font-medium uppercase tracking-wider text-muted">
                      {SECTION_LABEL[m.secao]}
                    </span>
                    {m.impacto > 0 && (
                      <span className="rounded-full bg-success-soft px-2 py-0.5 text-xs font-medium text-success">+{m.impacto}%</span>
                    )}
                  </div>
                  <p className="mt-1.5 font-medium">{m.titulo}</p>
                  <p className="mt-0.5 text-sm text-muted">{m.motivo}</p>
                </div>
              </div>
              {m.antes && m.secao !== 'habilidades' && (
                <div className="mt-3 rounded-[10px] bg-track/60 p-3 text-sm">
                  <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted">Hoje</p>
                  <p className="text-ink/75">{m.antes}</p>
                </div>
              )}
              <div className="mt-2 rounded-[10px] bg-success-soft p-3 text-sm">
                <p className="mb-1 text-xs font-medium uppercase tracking-wider text-success">
                  {m.secao === 'habilidades' ? 'Acrescentar' : m.antes ? 'Fica assim' : 'Novo'}
                </p>
                <p>
                  <GapText text={m.depois} />
                </p>
              </div>
              {accepted[i] && hasGaps(m.depois) && (
                <GapEditor value={edits[i]} onChange={(v) => setEdits((arr) => arr.map((x, k) => (k === i ? v : x)))} />
              )}
            </Card>
          ))}
        </div>
      </section>

      <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-20 -mx-4 border-t border-line bg-bg/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-card sm:border lg:bottom-4">
        <div className="flex items-center justify-between gap-2">
          <Button variant="ghost" onClick={onDiscard} className="shrink-0 px-3">
            <RotateCcw aria-hidden /> Descartar
          </Button>
          <div className="flex min-w-0 flex-1 items-center justify-end gap-3">
            <p className="hidden text-sm text-muted sm:block">
              {count} de {a.mudancas.length} {a.mudancas.length === 1 ? 'mudança' : 'mudanças'}
            </p>
            <Button size="lg" onClick={doSave} loading={save.isPending} disabled={count === 0 || pendingGaps > 0} className="flex-1 sm:flex-none">
              {!save.isPending && <Save aria-hidden />} Salvar nova versão
            </Button>
          </div>
        </div>
        {count === 0 ? (
          <p className="mt-1 flex items-center gap-1 text-[13px] text-muted">
            <Check className="size-3.5" aria-hidden /> Marque ao menos uma mudança para salvar.
          </p>
        ) : pendingGaps > 0 ? (
          <p className="mt-1 text-[13px] text-warn">
            Complete as lacunas em amarelo ({pendingGaps} {pendingGaps === 1 ? 'mudança' : 'mudanças'}) ou desmarque-as para salvar.
          </p>
        ) : null}
      </div>
    </div>
  )
}
