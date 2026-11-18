import { useEffect, useState } from 'react'
import { Sparkles, X } from 'lucide-react'
import { CompanyInitial, MatchPill } from '@/components/brand/pills'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Field } from '@/components/ui/field'
import { Input, Textarea } from '@/components/ui/input'
import { startAiTask } from '@/lib/ai-tasks'
import { useAuth } from '@/lib/auth'
import { adaptResume, useJob } from '@/lib/queries/adapt'
import type { Resume } from '@/lib/resume'
import type { Adaptation } from '@/lib/types'
import { WORK_MODE_LABEL } from '@/lib/types'
import { loadDraft, useAutosaveDraft } from '@/lib/use-draft'

const MIN_TEXT = 150

export const ADAPT_TASK = 'adaptar'
export const ADAPT_STEPS = ['Lendo a vaga…', 'Comparando com a vaga…', 'Escrevendo sugestões…']
export interface AdaptMeta {
  baseId: string
}

interface Props {
  bases: Resume[]
  defaultBaseId: string
  jobId: string | null
  onClearJob: () => void
}

export function AdaptForm({ bases, defaultBaseId, jobId, onClearJob }: Props) {
  const { user } = useAuth()
  const draftKey = user ? `vp-adaptar-${user.id}` : null
  const [draft, setDraft] = useState(() => loadDraft<{ text: string; url: string }>(draftKey ?? '') ?? { text: '', url: '' })
  const [baseId, setBaseId] = useState(defaultBaseId)
  const [errors, setErrors] = useState<{ text?: string; url?: string }>({})
  const { data: job } = useJob(jobId)
  useAutosaveDraft(draftKey, draft)
  // com uma vaga escolhida, o campo começa com a descrição salva (que às vezes é resumida)
  const [jobFullText, setJobFullText] = useState('')
  useEffect(() => {
    if (job) setJobFullText(job.description ?? '')
  }, [job])

  useEffect(() => setErrors({}), [draft.text, draft.url, jobFullText])

  function submit() {
    if (!jobId) {
      const text = draft.text.trim()
      const url = draft.url.trim()
      if (!text && !url) return setErrors({ text: 'Cole o texto do anúncio ou o link da vaga.' })
      if (url && !/^https?:\/\/\S+\.\S+/i.test(url)) return setErrors({ url: 'Esse link parece incompleto. Ele deve começar com https://' })
      if (!url && text.length < MIN_TEXT) {
        return setErrors({ text: 'O anúncio está muito curto. Cole o texto completo, com as responsabilidades e os requisitos.' })
      }
    }
    const args = jobId
      ? { resumeId: baseId, jobId, jobText: jobFullText.trim() }
      : { resumeId: baseId, jobId: null, jobText: draft.text.trim(), jobUrl: draft.text.trim() ? '' : draft.url.trim() }
    startAiTask<Adaptation, AdaptMeta>({
      key: ADAPT_TASK,
      label: 'Adaptando seu currículo à vaga',
      path: '/adaptar',
      readyText: 'A adaptação para a vaga ficou pronta',
      meta: { baseId },
      run: () => adaptResume(args),
      // erros do anúncio aparecem no próprio campo, quando a pessoa está na tela
      onError: (e) => {
        if (e.code === 'link_ilegivel' || e.code === 'link_invalido') {
          setErrors({ url: e.message })
          setTimeout(() => document.getElementById('adapt-text')?.focus(), 50)
          return true
        }
        if (e.code === 'vaga_curta') {
          setErrors({ text: e.message })
          setTimeout(() => document.getElementById(jobId ? 'adapt-job-text' : 'adapt-text')?.focus(), 50)
          return true
        }
      },
    })
  }

  return (
    <Card className="p-5 sm:p-8">
      <h2 className="text-[22px]">{jobId ? 'Vaga escolhida' : 'Qual é a vaga?'}</h2>

      {jobId ? (
        job ? (
          <div className="mt-4 flex items-center gap-3 rounded-card-sm border border-line bg-bg p-4">
            <CompanyInitial name={job.company ?? job.title} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{job.title}</p>
              <p className="truncate text-sm text-muted">
                {[job.company, job.location, job.work_mode ? WORK_MODE_LABEL[job.work_mode] : null].filter(Boolean).join(' · ')}
              </p>
            </div>
            {job.compatibility !== null && <MatchPill value={job.compatibility} className="hidden sm:inline-flex" />}
            <Button variant="ghost" size="icon" onClick={onClearJob} aria-label="Usar outra vaga">
              <X aria-hidden />
            </Button>
          </div>
        ) : (
          <p className="mt-3 text-muted">Carregando a vaga…</p>
        )
      ) : null}

      {jobId && job && (
        <Field
          className="mt-4"
          label="Anúncio completo da vaga"
          htmlFor="adapt-job-text"
          hint="Se o texto abaixo estiver resumido, cole o anúncio completo: a adaptação fica bem melhor."
          error={errors.text}
        >
          <Textarea rows={6} value={jobFullText} onChange={(e) => setJobFullText(e.target.value)} />
        </Field>
      )}

      {!jobId && (
        <div className="mt-5 space-y-4">
          <Field
            label="Cole aqui o anúncio da vaga"
            htmlFor="adapt-text"
            hint="Copie tudo: o cargo, as responsabilidades e os requisitos."
            error={errors.text}
          >
            <Textarea
              rows={9}
              value={draft.text}
              onChange={(e) => setDraft((d) => ({ ...d, text: e.target.value }))}
              placeholder={'Analista de RH Jr\nResponsabilidades:\n• Conduzir processos seletivos…\nRequisitos:\n• …'}
            />
          </Field>

          <div className="flex items-center gap-3 text-sm text-muted" role="separator" aria-label="ou">
            <span className="h-px flex-1 bg-line" /> ou <span className="h-px flex-1 bg-line" />
          </div>

          <Field
            label="O link da vaga"
            htmlFor="adapt-url"
            hint="Se não conseguirmos ler o link, vamos pedir o texto do anúncio."
            error={errors.url}
          >
            <Input
              type="url"
              inputMode="url"
              autoComplete="off"
              placeholder="https://www.exemplo.com/vaga/123"
              value={draft.url}
              onChange={(e) => setDraft((d) => ({ ...d, url: e.target.value }))}
            />
          </Field>
          {draft.text.trim() && draft.url.trim() && (
            <p className="text-[13px] text-muted">Como você colou o texto, vamos usar o texto (o link fica guardado na vaga).</p>
          )}
        </div>
      )}

      {bases.length > 1 && (
        <div className="mt-5 flex flex-col gap-1.5">
          <label htmlFor="adapt-base" className="text-sm font-medium">
            Currículo de partida
          </label>
          <select
            id="adapt-base"
            value={baseId}
            onChange={(e) => setBaseId(e.target.value)}
            className="min-h-touch rounded-field border border-line-strong bg-card px-3 text-[15px]"
          >
            {bases.map((b) => (
              <option key={b.id} value={b.id} disabled={!b.content.sections}>
                {b.title}
                {b.is_principal ? ' (principal)' : ''}
                {!b.content.sections ? ' — organize antes' : ''}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="mt-6 flex justify-end">
        <Button size="lg" onClick={submit} className="w-full sm:w-auto" disabled={Boolean(jobId) && !job}>
          <Sparkles aria-hidden /> Adaptar meu currículo
        </Button>
      </div>
    </Card>
  )
}
