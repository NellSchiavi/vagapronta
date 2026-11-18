import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ArrowLeft, Check, Download, Loader2, RotateCw, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { AiProgress } from '@/components/ai/ai-progress'
import { downloadLetterPdf, letterFileName } from '@/components/pdf/letter-pdf'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { LoadingCards } from '@/components/ui/skeleton'
import { clearAiTask, startAiTask, useAiTask } from '@/lib/ai-tasks'
import { friendlyDataError } from '@/lib/errors'
import { hasGaps } from '@/lib/gaps'
import { generateLetter, restoreLetter, useDeleteLetter, useLetter, useUpdateLetter, type LetterRow } from '@/lib/queries/letters'
import { TONE_LABEL, type GeneratedLetter, type LetterTone } from '@/lib/types'
import { AddToApplicationsButton } from '@/pages/applications/AddToApplicationsButton'
import { LetterGapsNotice, LetterSheet, pdfData, ToneSelector, useSender } from './letter-parts'

const REDO_STEPS = ['Relendo a vaga…', 'Escolhendo outras experiências…', 'Escrevendo a nova versão…']

export function LetterEditor({ id }: { id: string }) {
  const { data: letter, isLoading } = useLetter(id)
  if (isLoading) return <LoadingCards count={2} label="Carregando a carta…" />
  if (!letter) {
    return (
      <Card className="p-6">
        <p>Não encontramos essa carta. Ela pode ter sido excluída.</p>
      </Card>
    )
  }
  return <Editor key={letter.id} letter={letter} />
}

function Editor({ letter }: { letter: LetterRow }) {
  const [, setParams] = useSearchParams()
  const sender = useSender()
  const update = useUpdateLetter()
  const remove = useDeleteLetter()
  const [text, setText] = useState(letter.content)
  const [tone, setTone] = useState<LetterTone>(letter.tone)
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [downloading, setDownloading] = useState(false)
  const company = letter.jobs?.company ?? null
  const redoKey = `carta:${letter.id}`
  const redo = useAiTask<GeneratedLetter>(redoKey)
  const lastSaved = useRef(letter.content)

  // salvamento automático: grava 1 segundo depois de parar de digitar
  useEffect(() => {
    if (text === lastSaved.current) return
    setSaveState('saving')
    const t = window.setTimeout(() => {
      update.mutate(
        { id: letter.id, content: text },
        {
          onSuccess: () => {
            lastSaved.current = text
            setSaveState('saved')
          },
          onError: (e) => {
            setSaveState('idle')
            toast.error(friendlyDataError(e, 'Não conseguimos salvar suas alterações.'))
          },
        },
      )
    }, 1000)
    return () => window.clearTimeout(t)
    // só o texto dispara o salvamento; `update` e `letter.id` não mudam durante a edição
  }, [text])

  function regenerate() {
    startAiTask<GeneratedLetter>({
      key: redoKey,
      label: 'Escrevendo outra versão da carta',
      path: `/cartas?id=${letter.id}`,
      readyText: 'A nova versão da carta ficou pronta',
      run: () => generateLetter({ resumeId: letter.resume_id ?? '', tone, jobId: letter.job_id }),
    })
  }

  /** só troca o texto quando a pessoa escolhe "Usar esta versão" */
  function applyNewVersion(next: GeneratedLetter) {
    const previous = text
    const previousTone = letter.tone
    setText(next.carta)
    update.mutate({ id: letter.id, tone: next.tone })
    clearAiTask(redoKey)
    toast.success('Nova versão aplicada.', {
      action: {
        label: 'Desfazer',
        onClick: () => {
          setText(previous)
          update.mutate({ id: letter.id, tone: previousTone })
        },
      },
    })
  }

  function del() {
    remove.mutate(letter, {
      onSuccess: (deleted) => {
        setParams({}, { replace: true })
        toast('Carta excluída.', {
          action: {
            label: 'Desfazer',
            onClick: () =>
              restoreLetter(deleted)
                .then(() => setParams({ id: deleted.id }, { replace: true }))
                .catch((e) => toast.error(friendlyDataError(e, 'Não conseguimos recuperar a carta.'))),
          },
        })
      },
      onError: (e) => toast.error(friendlyDataError(e, 'Não conseguimos excluir a carta.')),
    })
  }

  async function download() {
    setDownloading(true)
    try {
      await downloadLetterPdf(pdfData(sender, text, company), letterFileName(company, sender.name))
    } catch {
      toast.error('Não conseguimos gerar o PDF. Tente de novo.')
    } finally {
      setDownloading(false)
    }
  }

  const title = letter.jobs ? [letter.jobs.title, letter.jobs.company].filter(Boolean).join(' — ') : letter.title

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button variant="ghost" onClick={() => setParams({}, { replace: true })} className="-ml-3 text-muted">
          <ArrowLeft aria-hidden /> Todas as cartas
        </Button>
        <p className="flex items-center gap-1.5 text-sm text-muted" aria-live="polite">
          {saveState === 'saving' ? (
            <>
              <Loader2 className="size-3.5 animate-spin" aria-hidden /> Salvando…
            </>
          ) : saveState === 'saved' ? (
            <>
              <Check className="size-3.5 text-success" aria-hidden /> Alterações salvas
            </>
          ) : null}
        </p>
      </div>

      <div>
        <h2 className="text-[24px] leading-snug">{title}</h2>
        <p className="text-sm text-muted">Tom {TONE_LABEL[letter.tone].toLowerCase()}</p>
      </div>

      <LetterGapsNotice text={text} />
      <LetterSheet value={text} onChange={setText} sender={sender} company={company} />

      {redo && redo.status !== 'done' ? (
        <AiProgress steps={REDO_STEPS} startedAt={redo.startedAt} status={redo.status} onRetry={redo.retry} />
      ) : redo?.status === 'done' && redo.result ? (
        <Card className="border-terra/30 p-5">
          <p className="text-sm font-medium text-terra-strong">Nova versão · tom {TONE_LABEL[redo.result.tone].toLowerCase()}</p>
          <p className="mt-2 max-h-72 overflow-y-auto whitespace-pre-line rounded-card-sm bg-bg p-4 font-serif text-[16px] leading-relaxed">
            {redo.result.carta}
          </p>
          <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="ghost" onClick={() => clearAiTask(redoKey)}>
              Manter a atual
            </Button>
            <Button onClick={() => applyNewVersion(redo.result!)}>Usar esta versão</Button>
          </div>
        </Card>
      ) : (
        <Card className="space-y-4 p-5">
          <ToneSelector value={tone} onChange={setTone} />
          <Button variant="secondary" onClick={regenerate} className="w-full sm:w-auto" disabled={!letter.resume_id}>
            <RotateCw aria-hidden /> Gerar de novo
          </Button>
          <p className="text-[13px] text-muted">A versão atual continua aqui até você escolher a nova.</p>
        </Card>
      )}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
        <Button variant="ghost" onClick={del} loading={remove.isPending} className="text-danger hover:text-danger">
          {!remove.isPending && <Trash2 aria-hidden />} Excluir carta
        </Button>
        <div className="flex flex-col-reverse gap-2 sm:flex-row">
          <AddToApplicationsButton
            variant="secondary"
            size="lg"
            jobId={letter.job_id}
            letterId={letter.id}
            resumeId={letter.resume_id}
            fallback={{ role: letter.title.split(' — ')[0], company: letter.title.split(' — ')[1] }}
          />
          <Button size="lg" onClick={download} loading={downloading} disabled={hasGaps(text)}>
            {!downloading && <Download aria-hidden />} Baixar PDF
          </Button>
        </div>
      </div>
      {hasGaps(text) && <p className="text-right text-[13px] text-warn">Complete as lacunas para baixar o PDF.</p>}
    </div>
  )
}
