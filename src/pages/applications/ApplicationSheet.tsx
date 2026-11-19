import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Download, ExternalLink, FileText, PenLine, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { STATUS_META, STATUS_ORDER, type ApplicationStatus } from '@/components/brand/pills'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input, Textarea } from '@/components/ui/input'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { addDays, FOLLOW_UP_DAYS } from '@/lib/application-rules'
import { downloadLetterById, downloadResumeById } from '@/lib/application-pdfs'
import { toISODate } from '@/lib/dates'
import { cleanJobUrl } from '@/lib/links'
import { friendlyDataError } from '@/lib/errors'
import { useLetters } from '@/lib/queries/letters'
import { useResumes } from '@/lib/queries/resumes'
import {
  deleteApplication,
  restoreApplication,
  useSaveApplication,
  type ApplicationRow,
} from '@/lib/queries/applications'
import { useSender } from '@/pages/letters/letter-parts'

export interface DraftApplication {
  company: string
  role: string
  url: string
  status: ApplicationStatus
  applied_on: string
  follow_up_on: string
  notes: string
  resume_id: string
  cover_letter_id: string
}

const empty: DraftApplication = {
  company: '',
  role: '',
  url: '',
  status: 'preparacao',
  applied_on: '',
  follow_up_on: '',
  notes: '',
  resume_id: '',
  cover_letter_id: '',
}

function fromRow(r: ApplicationRow): DraftApplication {
  return {
    company: r.company,
    role: r.role,
    url: r.url ?? '',
    status: r.status,
    applied_on: r.applied_on ?? '',
    follow_up_on: r.follow_up_on ?? '',
    notes: r.notes ?? '',
    resume_id: r.resume_id ?? '',
    cover_letter_id: r.cover_letter_id ?? '',
  }
}

interface Props {
  open: boolean
  onOpenChange: (o: boolean) => void
  /** null = nova candidatura */
  row: ApplicationRow | null
  /** valores iniciais de uma nova candidatura (ex.: vindos de uma carta) */
  initial?: Partial<DraftApplication>
  /** foca o campo de lembrete ao abrir */
  focusFollowUp?: boolean
  onCreated?: (id: string) => void
}

export function ApplicationSheet({ open, onOpenChange, row, initial, focusFollowUp, onCreated }: Props) {
  const save = useSaveApplication()
  const { data: resumes } = useResumes()
  const { data: letters } = useLetters()
  const sender = useSender()
  const [draft, setDraft] = useState<DraftApplication>(empty)
  const [errors, setErrors] = useState<Partial<Record<keyof DraftApplication, string>>>({})
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    if (!open) return
    setDraft(row ? fromRow(row) : { ...empty, ...initial })
    setErrors({})
    if (focusFollowUp) setTimeout(() => document.getElementById('app-follow')?.focus(), 250)
    // abre de novo só quando muda a candidatura
  }, [open, row?.id])

  const set = <K extends keyof DraftApplication>(k: K, v: DraftApplication[K]) => {
    setDraft((d) => ({ ...d, [k]: v }))
    setErrors((e) => ({ ...e, [k]: undefined }))
  }

  function validate() {
    const e: typeof errors = {}
    if (!draft.company.trim()) e.company = 'Digite o nome da empresa.'
    if (!draft.role.trim()) e.role = 'Digite o cargo da vaga.'
    if (draft.url && !/^https?:\/\/\S+\.\S+/.test(draft.url.trim())) e.url = 'O link deve começar com https://'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function submit() {
    if (!validate()) return
    const patch = {
      company: draft.company.trim(),
      role: draft.role.trim(),
      url: draft.url.trim() ? cleanJobUrl(draft.url) : null,
      status: draft.status,
      applied_on: draft.applied_on || null,
      follow_up_on: draft.follow_up_on || null,
      notes: draft.notes.trim() || null,
      resume_id: draft.resume_id || null,
      cover_letter_id: draft.cover_letter_id || null,
      ...(row ? {} : { position: -Math.floor(Date.now() / 1000) }),
    }
    save.mutate(
      { id: row?.id ?? null, patch },
      {
        onSuccess: (id) => {
          toast.success(row ? 'Candidatura atualizada.' : 'Candidatura adicionada!')
          onOpenChange(false)
          if (!row) onCreated?.(id)
        },
        onError: (e) => toast.error(friendlyDataError(e, 'Não conseguimos salvar a candidatura.')),
      },
    )
  }

  function remove() {
    if (!row) return
    deleteApplication(row)
      .then(() => {
        onOpenChange(false)
        toast('Candidatura excluída.', {
          action: {
            label: 'Desfazer',
            onClick: () => restoreApplication(row).catch((e) => toast.error(friendlyDataError(e, 'Não conseguimos recuperar.'))),
          },
        })
      })
      .catch((e) => toast.error(friendlyDataError(e, 'Não conseguimos excluir.')))
  }

  async function downloadBoth() {
    setDownloading(true)
    const company = draft.company || null
    const done: string[] = []
    try {
      if (draft.resume_id) {
        await downloadResumeById(draft.resume_id, sender, company)
        done.push('currículo')
      }
      if (draft.cover_letter_id) {
        await new Promise((r) => setTimeout(r, 400)) // alguns navegadores bloqueiam dois downloads colados
        await downloadLetterById(draft.cover_letter_id, sender, company)
        done.push('carta')
      }
      if (done.length) toast.success(`PDF baixado: ${done.join(' e ')}.`)
    } catch (e) {
      toast.error(e instanceof Error && e.message.length < 140 ? e.message : 'Não conseguimos gerar os PDFs. Tente de novo.')
    } finally {
      setDownloading(false)
    }
  }

  const followHint = draft.status === 'enviada' && !draft.follow_up_on
  const anyDoc = draft.resume_id || draft.cover_letter_id

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        title={row ? row.role : 'Nova candidatura'}
        description={row ? row.company : 'Preencha o que souber; dá para completar depois.'}
        footer={
          <div className="flex items-center justify-between gap-2">
            {row ? (
              <Button variant="ghost" onClick={remove} className="px-3 text-danger hover:text-danger">
                <Trash2 aria-hidden /> Excluir
              </Button>
            ) : (
              <span />
            )}
            <Button onClick={submit} loading={save.isPending}>
              {row ? 'Salvar alterações' : 'Adicionar'}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          {row && anyDoc ? (
            <div className="rounded-card-sm border border-line bg-card p-3">
              <p className="mb-2 text-sm font-medium">Documentos desta candidatura</p>
              <div className="flex flex-wrap gap-2">
                {draft.resume_id && (
                  <Button asChild variant="secondary" size="sm">
                    <Link to={`/curriculo?id=${draft.resume_id}`}>
                      <FileText className="text-terra" aria-hidden /> Abrir currículo
                    </Link>
                  </Button>
                )}
                {draft.cover_letter_id && (
                  <Button asChild variant="secondary" size="sm">
                    <Link to={`/cartas?id=${draft.cover_letter_id}`}>
                      <PenLine className="text-terra" aria-hidden /> Abrir carta
                    </Link>
                  </Button>
                )}
                <Button size="sm" onClick={downloadBoth} loading={downloading}>
                  {!downloading && <Download aria-hidden />}
                  {draft.resume_id && draft.cover_letter_id ? 'Baixar os 2 PDFs' : 'Baixar PDF'}
                </Button>
              </div>
            </div>
          ) : null}

          <Field label="Empresa" htmlFor="app-company" error={errors.company}>
            <Input value={draft.company} onChange={(e) => set('company', e.target.value)} placeholder="Ex.: Natura" />
          </Field>
          <Field label="Cargo" htmlFor="app-role" error={errors.role}>
            <Input value={draft.role} onChange={(e) => set('role', e.target.value)} placeholder="Ex.: Assistente de DP" />
          </Field>
          <div>
            <Field label="Link da vaga" htmlFor="app-url" error={errors.url}>
              <Input type="url" inputMode="url" value={draft.url} onChange={(e) => set('url', e.target.value)} placeholder="https://…" />
            </Field>
            {draft.url && /^https?:\/\/\S+\.\S+/.test(draft.url) && (
              <a
                href={draft.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-flex min-h-touch items-center gap-1.5 text-sm font-medium text-terra-strong underline-offset-[3px] hover:underline"
              >
                <ExternalLink className="size-4" aria-hidden /> Abrir o anúncio da vaga
              </a>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="app-status" className="text-sm font-medium">
              Etapa
            </label>
            <select
              id="app-status"
              value={draft.status}
              onChange={(e) => {
                const s = e.target.value as ApplicationStatus
                set('status', s)
                // ao marcar como enviada, já sugere o lembrete de retorno
                if (s === 'enviada') {
                  const today = toISODate()
                  setDraft((d) => ({
                    ...d,
                    status: s,
                    applied_on: d.applied_on || today,
                    follow_up_on: d.follow_up_on || addDays(today, FOLLOW_UP_DAYS),
                  }))
                }
              }}
              className="min-h-touch rounded-field border border-line-strong bg-card px-3 text-[15px]"
            >
              {STATUS_ORDER.map((s) => (
                <option key={s} value={s}>
                  {STATUS_META[s].label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Data de envio" htmlFor="app-applied">
              <Input type="date" value={draft.applied_on} onChange={(e) => set('applied_on', e.target.value)} />
            </Field>
            <Field
              label="Lembrete de retorno"
              htmlFor="app-follow"
              hint={followHint ? `Sugestão: ${FOLLOW_UP_DAYS} dias depois do envio.` : 'Quando dar um retorno à empresa.'}
            >
              <Input type="date" value={draft.follow_up_on} onChange={(e) => set('follow_up_on', e.target.value)} />
            </Field>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="app-resume" className="text-sm font-medium">
              Versão do currículo usada
            </label>
            <select
              id="app-resume"
              value={draft.resume_id}
              onChange={(e) => set('resume_id', e.target.value)}
              className="min-h-touch rounded-field border border-line-strong bg-card px-3 text-[15px]"
            >
              <option value="">Nenhuma</option>
              {(resumes ?? []).map((r) => (
                <option key={r.id} value={r.id}>
                  {r.title}
                  {r.is_principal ? ' (principal)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="app-letter" className="text-sm font-medium">
              Carta usada
            </label>
            <select
              id="app-letter"
              value={draft.cover_letter_id}
              onChange={(e) => set('cover_letter_id', e.target.value)}
              className="min-h-touch rounded-field border border-line-strong bg-card px-3 text-[15px]"
            >
              <option value="">Nenhuma</option>
              {(letters ?? []).map((l) => (
                <option key={l.id} value={l.id}>
                  {l.jobs ? [l.jobs.title, l.jobs.company].filter(Boolean).join(' — ') : l.title}
                </option>
              ))}
            </select>
          </div>

          <Field label="Anotações" htmlFor="app-notes" hint="Ex.: nome da recrutadora, data da entrevista, perguntas que fizeram.">
            <Textarea rows={4} value={draft.notes} onChange={(e) => set('notes', e.target.value)} />
          </Field>
        </div>
      </SheetContent>
    </Sheet>
  )
}
