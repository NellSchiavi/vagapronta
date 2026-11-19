import { useEffect, useMemo, useRef, useState } from 'react'
import { AlertCircle, ArrowUpRight, Info, RotateCw, Sparkles, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { AiUsageNote } from '@/components/ai/ai-usage-note'
import { CompanyInitial, MatchPill } from '@/components/brand/pills'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Field } from '@/components/ui/field'
import { Input, Textarea } from '@/components/ui/input'
import { clearAiTaskError, startAiTask, useAiTaskError } from '@/lib/ai-tasks'
import { useAuth } from '@/lib/auth'
import { blockedSite, cleanJobUrl } from '@/lib/links'
import { adaptResume, useJob } from '@/lib/queries/adapt'
import type { Resume } from '@/lib/resume'
import type { Adaptation } from '@/lib/types'
import { WORK_MODE_LABEL } from '@/lib/types'
import { loadDraft, useAutosaveDraft } from '@/lib/use-draft'
import { cn } from '@/lib/utils'

const MIN_TEXT = 150

export const ADAPT_TASK = 'adaptar'
export const ADAPT_STEPS = ['Lendo a vaga…', 'Comparando com a vaga…', 'Escrevendo sugestões…']
export interface AdaptMeta {
  baseId: string
}

/** erros que pertencem a um campo (o resto aparece num aviso com "Tentar de novo") */
const URL_CODES = new Set(['link_ilegivel', 'link_invalido', 'site_bloqueado'])
const TEXT_CODES = new Set(['vaga_curta'])
/** texto do anúncio editado por vaga (memória da sessão) */
const jobTextMemory = new Map<string, string>()
const CALM_CODES = (code: string) => code === 'limite_diario' || code.startsWith('ia_limite')

interface Props {
  bases: Resume[]
  defaultBaseId: string
  jobId: string | null
  /** link vindo de "Achou uma vaga? Cole o link" (tela Vagas) ou do botão de favoritos */
  initialUrl?: string | null
  /** texto vindo do botão de favoritos (o que estava visível na página da vaga) */
  initialText?: string | null
  /** o link/texto inicial já foi usado (a tela tira da barra de endereço) */
  onInitialUsed?: () => void
  onClearJob: () => void
}

export function AdaptForm({ bases, defaultBaseId, jobId, initialUrl, initialText, onInitialUsed, onClearJob }: Props) {
  const { user } = useAuth()
  const draftKey = user ? `vp-adaptar-${user.id}` : null
  const [draft, setDraft] = useState(() =>
    initialUrl || initialText
      ? { text: initialText ?? '', url: initialUrl ? cleanJobUrl(initialUrl) : '' }
      : (loadDraft<{ text: string; url: string }>(draftKey ?? '') ?? { text: '', url: '' }),
  )
  const [baseId, setBaseId] = useState(defaultBaseId)
  const [errors, setErrors] = useState<{ text?: string; url?: string }>({})
  const { data: job } = useJob(jobId)
  const aiError = useAiTaskError(ADAPT_TASK)
  useAutosaveDraft(draftKey, draft)
  // com uma vaga escolhida, o campo começa com a descrição salva (que às vezes é resumida);
  // o que a pessoa editar fica guardado enquanto o app estiver aberto (sobrevive a um erro da IA)
  const [jobFullText, setJobFullTextState] = useState(() => (jobId ? (jobTextMemory.get(jobId) ?? job?.description ?? '') : ''))
  const setJobFullText = (v: string) => {
    if (jobId) jobTextMemory.set(jobId, v)
    setJobFullTextState(v)
  }
  useEffect(() => {
    if (job && jobId && !jobTextMemory.has(jobId)) setJobFullTextState(job.description ?? '')
  }, [job, jobId])

  // o link/texto de entrada vira rascunho: se o formulário remontar (ex.: depois de um erro), nada se perde
  useEffect(() => {
    if (!(initialUrl || initialText)) return
    try {
      if (draftKey) localStorage.setItem(draftKey, JSON.stringify(draft))
    } catch {
      /* sem armazenamento: segue sem rascunho */
    }
    onInitialUsed?.()
    // só na primeira vez
  }, [])

  // mexeu no formulário: o erro anterior deixa de valer (montar o formulário de novo não conta como edição)
  const fieldsKey = JSON.stringify([draft.text, draft.url, jobFullText, baseId])
  const lastFields = useRef(fieldsKey)
  useEffect(() => {
    if (lastFields.current === fieldsKey) return
    lastFields.current = fieldsKey
    setErrors({})
    clearAiTaskError(ADAPT_TASK)
  }, [fieldsKey])

  // LinkedIn, Indeed…: avisa ANTES de qualquer chamada que é preciso colar o texto
  const blocked = useMemo(() => (draft.url.trim() ? blockedSite(draft.url) : null), [draft.url])
  const cleanUrl = useMemo(() => (draft.url.trim() ? cleanJobUrl(draft.url) : ''), [draft.url])

  // erro da última tentativa (guardado mesmo depois de o progresso sumir)
  const urlError = errors.url ?? (aiError && URL_CODES.has(aiError.code) ? aiError.message : undefined)
  const textError = errors.text ?? (aiError && TEXT_CODES.has(aiError.code) ? aiError.message : undefined)
  const bannerError = aiError && !URL_CODES.has(aiError.code) && !TEXT_CODES.has(aiError.code) ? aiError : null

  function focusText() {
    setTimeout(() => document.getElementById(jobId ? 'adapt-job-text' : 'adapt-text')?.focus(), 50)
  }

  function submit() {
    if (!jobId) {
      const text = draft.text.trim()
      const url = draft.url.trim()
      if (!text && !url) return setErrors({ text: 'Cole o texto do anúncio ou o link da vaga.' })
      if (url && !/^(https?:\/\/)?\S+\.\S+/i.test(url)) return setErrors({ url: 'Esse link parece incompleto. Ele deve começar com https://' })
      // site que não deixa ler: nem chama o servidor (não gasta cota)
      if (!text && blocked) {
        setErrors({ text: blocked.message })
        return focusText()
      }
      if (!url && text.length < MIN_TEXT) {
        return setErrors({ text: 'O anúncio está muito curto. Cole o texto completo, com as responsabilidades e os requisitos.' })
      }
    }
    const args = jobId
      ? { resumeId: baseId, jobId, jobText: jobFullText.trim() }
      : // o link (limpo) vai sempre: fica guardado na vaga para o "Me candidatar"; com texto, o servidor nem abre o link
        { resumeId: baseId, jobId: null, jobText: draft.text.trim(), jobUrl: cleanUrl }
    startAiTask<Adaptation, AdaptMeta>({
      key: ADAPT_TASK,
      label: 'Adaptando seu currículo à vaga',
      path: '/adaptar',
      readyText: 'A adaptação para a vaga ficou pronta',
      meta: { baseId },
      keepError: true,
      run: () => adaptResume(args),
      // na tela, o erro aparece junto do formulário (e não só num aviso que some)
      onError: (e) => {
        if (URL_CODES.has(e.code) || TEXT_CODES.has(e.code)) focusText()
        return true
      },
    })
  }

  return (
    <Card className="p-5 sm:p-8">
      <h2 className="text-[22px]">{jobId ? 'Vaga escolhida' : 'Qual é a vaga?'}</h2>

      {bannerError && (
        <div
          role="alert"
          className={cn(
            'mt-4 flex flex-col gap-3 rounded-card-sm border p-4 sm:flex-row sm:items-center',
            CALM_CODES(bannerError.code) ? 'border-line bg-track/60' : 'border-danger/30 bg-danger-soft',
          )}
        >
          <AlertCircle className={cn('size-5 shrink-0', CALM_CODES(bannerError.code) ? 'text-muted' : 'text-danger')} aria-hidden />
          <p className="flex-1 text-[15px]">
            {bannerError.message}
            {bannerError.code !== 'limite_diario' && bannerError.code !== 'ia_limite_dia' && (
              <span className="mt-0.5 block text-sm text-muted">Seu texto continua aqui. Pode editar e tentar de novo.</span>
            )}
          </p>
          {bannerError.code !== 'limite_diario' && bannerError.code !== 'ia_limite_dia' && (
            <Button variant="secondary" onClick={submit} className="shrink-0">
              <RotateCw aria-hidden /> Tentar de novo
            </Button>
          )}
        </div>
      )}

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
          error={textError}
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
            error={textError}
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
            error={urlError}
          >
            <Input
              type="url"
              inputMode="url"
              autoComplete="off"
              placeholder="https://www.exemplo.com/vaga/123"
              value={draft.url}
              onChange={(e) => setDraft((d) => ({ ...d, url: e.target.value }))}
              onBlur={() => cleanUrl && cleanUrl !== draft.url.trim() && setDraft((d) => ({ ...d, url: cleanUrl }))}
            />
          </Field>
          {blocked && !draft.text.trim() && textError !== blocked.message && (
            <div className="flex items-start gap-2.5 rounded-card-sm border border-line bg-track/60 p-3 text-sm" role="status">
              <Info className="mt-0.5 size-4 shrink-0 text-terra" aria-hidden />
              <div>
                <p>{blocked.message}</p>
                <a href={cleanUrl} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 font-medium text-terra-strong underline underline-offset-2">
                  Abrir a vaga no {blocked.name} <ArrowUpRight className="size-3.5" aria-hidden />
                </a>
              </div>
            </div>
          )}
          <p className="hidden text-[13px] text-muted lg:block">
            Usa o computador?{' '}
            <Link to="/instalar-botao" className="font-medium text-terra-strong underline underline-offset-2">
              Instale o botão “Enviar para o VagaPronta”
            </Link>{' '}
            e traga a vaga do LinkedIn, Gupy ou Indeed com um clique.
          </p>
          {draft.text.trim() && draft.url.trim() && (
            <p className="text-[13px] text-muted">Como você colou o texto, vamos usar o texto. O link fica guardado na vaga para o “Me candidatar”.</p>
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

      <div className="mt-6 flex flex-col-reverse items-center gap-3 sm:flex-row sm:justify-end">
        <AiUsageNote />
        <Button size="lg" onClick={submit} className="w-full sm:w-auto" disabled={Boolean(jobId) && !job}>
          <Sparkles aria-hidden /> Adaptar meu currículo
        </Button>
      </div>
    </Card>
  )
}
