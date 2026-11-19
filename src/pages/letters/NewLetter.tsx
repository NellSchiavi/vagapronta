import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Download, PenLine, RotateCw, Save, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { AiProgress } from '@/components/ai/ai-progress'
import { AiUsageNote } from '@/components/ai/ai-usage-note'
import { downloadLetterPdf, letterFileName } from '@/components/pdf/letter-pdf'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Field } from '@/components/ui/field'
import { Textarea } from '@/components/ui/input'
import { clearAiTask, startAiTask, updateAiTaskResult, useAiTask } from '@/lib/ai-tasks'
import { friendlyDataError } from '@/lib/errors'
import { hasGaps } from '@/lib/gaps'
import { generateLetter, useCreateLetter, useLetterJobs } from '@/lib/queries/letters'
import { useResumes } from '@/lib/queries/resumes'
import { TONE_LABEL, type GeneratedLetter, type LetterTone } from '@/lib/types'
import { LetterGapsNotice, LetterSheet, pdfData, ToneSelector, useSender } from './letter-parts'

export const LETTER_TASK = 'carta'
const REDO_TASK = 'carta:refazer'
const STEPS = ['Lendo a vaga…', 'Escolhendo suas experiências que combinam…', 'Escrevendo a carta…']

export interface LetterMeta {
  resumeId: string
  jobId: string | null
  jobText: string
  company: string | null
}

function startLetter(meta: LetterMeta, tone: LetterTone, onFieldError?: (msg: string) => void) {
  startAiTask<GeneratedLetter, LetterMeta>({
    key: LETTER_TASK,
    label: 'Escrevendo sua carta',
    path: '/cartas?nova=1',
    readyText: 'Sua carta ficou pronta',
    meta,
    run: () => generateLetter({ resumeId: meta.resumeId, tone, jobId: meta.jobId, jobText: meta.jobText }),
    onError: (e) => {
      if (e.code === 'vaga_curta' && onFieldError) {
        onFieldError(e.message)
        return true
      }
    },
  })
}

/** "Gerar de novo" num rascunho: troca o texto e permite desfazer */
function redoLetter(meta: LetterMeta, tone: LetterTone) {
  startAiTask<GeneratedLetter>({
    key: REDO_TASK,
    label: 'Escrevendo outra versão da carta',
    path: '/cartas?nova=1',
    readyText: 'A nova versão da carta ficou pronta',
    clearOnSuccess: true,
    run: () => generateLetter({ resumeId: meta.resumeId, tone, jobId: meta.jobId, jobText: meta.jobText }),
    onSuccess: (letter) => {
      let previous: GeneratedLetter | undefined
      updateAiTaskResult<GeneratedLetter>(LETTER_TASK, (prev) => {
        previous = prev
        return letter
      })
      toast.success(`Nova versão no tom ${TONE_LABEL[letter.tone].toLowerCase()}.`, {
        action: previous
          ? { label: 'Desfazer', onClick: () => updateAiTaskResult<GeneratedLetter>(LETTER_TASK, () => previous!) }
          : undefined,
      })
    },
  })
}

export function NewLetter() {
  const task = useAiTask<GeneratedLetter, LetterMeta>(LETTER_TASK)
  if (task && task.status !== 'done') {
    return <AiProgress steps={STEPS} startedAt={task.startedAt} status={task.status} retryAt={task.retryAt} onRetry={task.retry} />
  }
  if (task?.status === 'done' && task.result && task.meta) return <DraftLetter letter={task.result} meta={task.meta} />
  return <LetterForm />
}

function LetterForm() {
  const [params, setParams] = useSearchParams()
  const { data: jobs, isLoading: loadingJobs } = useLetterJobs()
  const { data: resumes } = useResumes()
  const bases = (resumes ?? []).filter((r) => !r.job_id)
  const principal = bases.find((r) => r.is_principal) ?? bases[0]

  const [jobChoice, setJobChoice] = useState<string>(params.get('vaga') ?? '')
  const [jobText, setJobText] = useState('')
  const [tone, setTone] = useState<LetterTone>('caloroso')
  const [resumeId, setResumeId] = useState('')
  const [error, setError] = useState<string>()

  // escolhe a vaga inicial e o currículo mais indicado (a versão adaptada para a vaga, se existir)
  useEffect(() => {
    if (!jobs) return
    const choice = jobChoice || (jobs[0]?.id ?? 'outra')
    if (choice !== jobChoice) setJobChoice(choice)
    const job = jobs.find((j) => j.id === choice)
    setResumeId(job?.adaptedResume?.id ?? principal?.id ?? '')
  }, [jobs, jobChoice, principal?.id])

  useEffect(() => setError(undefined), [jobChoice, jobText])

  if (!principal) {
    return (
      <Card className="p-6">
        <p>Para criar uma carta, primeiro envie seu currículo na tela Currículo.</p>
      </Card>
    )
  }

  const job = jobs?.find((j) => j.id === jobChoice)

  function submit() {
    if (jobChoice === 'outra' && jobText.trim().length < 80) {
      setError('Cole o texto do anúncio da vaga (com as responsabilidades e requisitos).')
      document.getElementById('letter-job-text')?.focus()
      return
    }
    startLetter(
      {
        resumeId: resumeId || principal!.id,
        jobId: job ? job.id : null,
        jobText: jobChoice === 'outra' ? jobText.trim() : '',
        company: job?.company ?? null,
      },
      tone,
      (msg) => setError(msg),
    )
  }

  return (
    <Card className="p-5 sm:p-8">
      <h2 className="text-[22px]">Nova carta de apresentação</h2>
      <p className="mt-1 text-muted">A IA escreve uma carta para a vaga, usando as suas experiências reais. Você revisa e edita antes de salvar.</p>

      <div className="mt-6 space-y-5">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="letter-job" className="text-sm font-medium">
            Para qual vaga?
          </label>
          <select
            id="letter-job"
            value={jobChoice}
            onChange={(e) => {
              setJobChoice(e.target.value)
              if (params.get('vaga')) setParams({ nova: '1' }, { replace: true })
            }}
            disabled={loadingJobs}
            className="min-h-touch rounded-field border border-line-strong bg-card px-3 text-[15px]"
          >
            {(jobs ?? []).map((j) => (
              <option key={j.id} value={j.id}>
                {[j.title, j.company].filter(Boolean).join(' — ')}
                {j.adaptedResume ? ' (currículo adaptado)' : ''}
              </option>
            ))}
            <option value="outra">Outra vaga (colar o anúncio)</option>
          </select>
        </div>

        {jobChoice === 'outra' && (
          <Field label="Cole o anúncio da vaga" htmlFor="letter-job-text" error={error}>
            <Textarea rows={7} value={jobText} onChange={(e) => setJobText(e.target.value)} placeholder="Cargo, empresa, responsabilidades e requisitos…" />
          </Field>
        )}
        {jobChoice !== 'outra' && error && (
          <p role="alert" className="text-[13px] text-danger">
            {error}
          </p>
        )}

        <ToneSelector value={tone} onChange={setTone} />

        {(resumes ?? []).length > 1 && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="letter-resume" className="text-sm font-medium">
              Currículo usado na carta
            </label>
            <select
              id="letter-resume"
              value={resumeId}
              onChange={(e) => setResumeId(e.target.value)}
              className="min-h-touch rounded-field border border-line-strong bg-card px-3 text-[15px]"
            >
              {(resumes ?? []).map((r) => (
                <option key={r.id} value={r.id}>
                  {r.title}
                  {r.is_principal ? ' (principal)' : r.job_id ? ' (adaptado)' : ''}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="mt-6 flex flex-col-reverse items-center gap-3 sm:flex-row sm:justify-end">
        <AiUsageNote />
        <Button size="lg" onClick={submit} className="w-full sm:w-auto">
          <PenLine aria-hidden /> Escrever carta
        </Button>
      </div>
    </Card>
  )
}

function DraftLetter({ letter, meta }: { letter: GeneratedLetter; meta: LetterMeta }) {
  const [, setParams] = useSearchParams()
  const sender = useSender()
  const create = useCreateLetter()
  const redo = useAiTask(REDO_TASK)
  const [tone, setTone] = useState<LetterTone>(letter.tone)
  const [downloading, setDownloading] = useState(false)
  const text = letter.carta
  const setText = (v: string) => updateAiTaskResult<GeneratedLetter>(LETTER_TASK, (p) => ({ ...p, carta: v }))

  function save() {
    create.mutate(
      { job_id: meta.jobId, resume_id: meta.resumeId, title: letter.titulo, tone: letter.tone, content: text.trim() },
      {
        onSuccess: (id) => {
          clearAiTask(LETTER_TASK)
          setParams({ id }, { replace: true })
          toast.success('Carta salva!', { description: 'Ela fica guardada na lista de cartas.' })
        },
        onError: (e) => toast.error(friendlyDataError(e, 'Não conseguimos salvar a carta.')),
      },
    )
  }

  async function download() {
    setDownloading(true)
    try {
      await downloadLetterPdf(pdfData(sender, text, meta.company), letterFileName(meta.company, sender.name))
    } catch {
      toast.error('Não conseguimos gerar o PDF. Tente de novo.')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="space-y-5">
      <Card className="flex flex-col gap-1 border-terra/20 bg-terra-soft p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-terra-strong">Rascunho · ainda não salvo</p>
          <p className="font-serif text-lg leading-snug">{letter.titulo}</p>
        </div>
        <span className="self-start rounded-full bg-card px-2.5 py-1 text-xs font-medium sm:self-auto">Tom {TONE_LABEL[letter.tone].toLowerCase()}</span>
      </Card>

      <LetterGapsNotice text={text} />
      <LetterSheet value={text} onChange={setText} sender={sender} company={meta.company} />

      <Card className="space-y-4 p-5">
        <ToneSelector value={tone} onChange={setTone} />
        <Button variant="secondary" onClick={() => redoLetter(meta, tone)} loading={Boolean(redo)} className="w-full sm:w-auto">
          {!redo && <RotateCw aria-hidden />} {redo ? 'Escrevendo outra versão…' : 'Gerar de novo'}
        </Button>
        {redo && <p className="text-[13px] text-muted">Pode levar até 1 minuto. Você pode continuar editando ou usar outras telas.</p>}
      </Card>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
        <Button variant="ghost" onClick={() => clearAiTask(LETTER_TASK)} className="text-muted">
          <Trash2 aria-hidden /> Descartar
        </Button>
        <div className="flex flex-col-reverse gap-2 sm:flex-row">
          <Button variant="secondary" onClick={download} loading={downloading} disabled={hasGaps(text)}>
            {!downloading && <Download aria-hidden />} Baixar PDF
          </Button>
          <Button size="lg" onClick={save} loading={create.isPending} disabled={text.trim().length < 50}>
            {!create.isPending && <Save aria-hidden />} Salvar carta
          </Button>
        </div>
      </div>
    </div>
  )
}
