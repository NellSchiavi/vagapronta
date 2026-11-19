import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowUpRight, Check, FileText, Mail, Send, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { downloadLetterById, downloadResumeById } from '@/lib/application-pdfs'
import { shortDate, toISODate } from '@/lib/dates'
import { friendlyDataError } from '@/lib/errors'
import { addApplicationForJob, markApplicationSent, useJobDocuments } from '@/lib/queries/applications'
import { refreshJobs } from '@/lib/queries/jobs'
import { clearPendingApply, getPendingApply, PENDING_EVENT, setPendingApply, shouldAsk, type PendingApply } from '@/lib/pending-apply'
import { isExampleJob, linkHost, openExternal, safeHttpUrl } from '@/lib/safe-link'
import type { Job } from '@/lib/types'
import { useSender } from '@/pages/letters/letter-parts'

/**
 * "Me candidatar": o app NUNCA se inscreve sozinho. Ele só:
 *  1. oferece os PDFs para anexar (ou adaptar o currículo antes);
 *  2. abre a página ORIGINAL da vaga em nova aba, onde a pessoa se inscreve;
 *  3. ao voltar, pergunta se ela se candidatou (ApplyReturnPrompt).
 */
export function ApplyButton({ job }: { job: Pick<Job, 'id' | 'title' | 'company' | 'url' | 'source' | 'match_notes'> }) {
  const [open, setOpen] = useState(false)
  const url = safeHttpUrl(job.url)
  if (!url || isExampleJob(job)) return null
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Send aria-hidden /> Me candidatar
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        {open && <ApplySheet job={{ id: job.id, title: job.title, company: job.company, url }} onDone={() => setOpen(false)} />}
      </Sheet>
    </>
  )
}

type ApplyJob = Pick<Job, 'id' | 'title' | 'company'> & { url: string }

function ApplySheet({ job, onDone }: { job: ApplyJob; onDone: () => void }) {
  const sender = useSender()
  const { data: docs, isLoading } = useJobDocuments(job.id, true)
  const [busy, setBusy] = useState<'curriculo' | 'carta' | null>(null)
  const [got, setGot] = useState<{ curriculo?: boolean; carta?: boolean }>({})
  const hasDocs = Boolean(docs?.resumeId || docs?.letterId)
  const host = linkHost(job.url)

  async function download(kind: 'curriculo' | 'carta') {
    setBusy(kind)
    try {
      if (kind === 'curriculo' && docs?.resumeId) await downloadResumeById(docs.resumeId, sender, job.company)
      if (kind === 'carta' && docs?.letterId) await downloadLetterById(docs.letterId, sender, job.company)
      setGot((g) => ({ ...g, [kind]: true }))
    } catch (e) {
      toast.error(e instanceof Error && e.message.length < 140 ? e.message : 'Não conseguimos gerar o PDF. Tente de novo.')
    } finally {
      setBusy(null)
    }
  }

  function goToJob() {
    // abre já, ainda no toque (senão o navegador bloqueia a nova aba)
    const openedAt = Date.now()
    if (!openExternal(job.url)) {
      toast.error('Este link de vaga não parece seguro, então não abrimos.')
      return
    }
    onDone()
    // guarda na Preparação para não perder a vaga; a pessoa confirma o envio ao voltar
    addApplicationForJob({ jobId: job.id, resumeId: docs?.resumeId, letterId: docs?.letterId })
      .then(({ id }) => {
        setPendingApply({ applicationId: id, title: job.title, company: job.company, openedAt })
        window.dispatchEvent(new Event(PENDING_EVENT))
        refreshJobs()
      })
      .catch((e) => toast.error(friendlyDataError(e, 'Abrimos a vaga, mas não conseguimos guardar em Candidaturas.')))
  }

  return (
    <SheetContent
      title="Me candidatar"
      description={`${job.title}${job.company ? ` · ${job.company}` : ''}`}
      footer={
        <p className="text-[13px] text-muted">
          A inscrição é feita por você, no site da vaga. O VagaPronta não envia nada em seu nome.
        </p>
      }
    >
      {isLoading ? (
        <p className="text-sm text-muted">Procurando seus arquivos para esta vaga…</p>
      ) : hasDocs ? (
        <div>
          <h3 className="font-sans text-base font-medium">Baixe seus arquivos para anexar</h3>
          <p className="mt-1 text-sm text-muted">O site da vaga vai pedir o currículo (e, às vezes, a carta). Baixe antes de continuar.</p>
          <div className="mt-4 grid gap-2">
            {docs?.resumeId && (
              <Button variant="secondary" loading={busy === 'curriculo'} onClick={() => download('curriculo')}>
                {busy !== 'curriculo' && (got.curriculo ? <Check aria-hidden /> : <FileText aria-hidden />)}
                {got.curriculo ? 'Currículo baixado' : 'Baixar currículo (PDF)'}
              </Button>
            )}
            {docs?.letterId && (
              <Button variant="secondary" loading={busy === 'carta'} onClick={() => download('carta')}>
                {busy !== 'carta' && (got.carta ? <Check aria-hidden /> : <Mail aria-hidden />)}
                {got.carta ? 'Carta baixada' : 'Baixar carta (PDF)'}
              </Button>
            )}
          </div>
          <Button className="mt-5 w-full" onClick={goToJob}>
            Continuar para a vaga <ArrowUpRight aria-hidden />
          </Button>
        </div>
      ) : (
        <div>
          <h3 className="font-sans text-base font-medium">Você ainda não adaptou o currículo para esta vaga</h3>
          <p className="mt-1 text-sm text-muted">
            Um currículo ajustado para a vaga costuma chamar mais atenção. Leva poucos minutos.
          </p>
          <div className="mt-4 grid gap-2">
            <Button asChild>
              <Link to={`/adaptar?vaga=${job.id}`} onClick={onDone}>
                <Sparkles aria-hidden /> Adaptar currículo antes
              </Link>
            </Button>
            <Button variant="secondary" onClick={goToJob}>
              Ir para a vaga assim mesmo <ArrowUpRight aria-hidden />
            </Button>
          </div>
        </div>
      )}
      <p className="mt-5 flex items-start gap-2 text-[13px] text-muted">
        <ArrowUpRight className="mt-0.5 size-3.5 shrink-0" aria-hidden />
        <span>
          A vaga abre em uma nova aba, em <strong className="font-medium text-ink/80 [overflow-wrap:anywhere]">{host}</strong>. Quando voltar aqui, perguntamos se você se candidatou.
        </span>
      </p>
    </SheetContent>
  )
}

/**
 * Quando a pessoa volta ao app depois de abrir o site da vaga, pergunta:
 * "Você se candidatou?". Sim → "Enviada" com lembrete de 7 dias; Ainda não → fica em "Preparação".
 */
export function ApplyReturnPrompt() {
  const navigate = useNavigate()
  const [pending, setPending] = useState<PendingApply | null>(null)
  const [saving, setSaving] = useState(false)

  const check = useCallback(() => {
    if (document.visibilityState !== 'visible') return
    const p = getPendingApply()
    if (shouldAsk(p)) setPending(p)
  }, [])

  useEffect(() => {
    check() // a aba pode ter sido recarregada enquanto a pessoa estava fora
    document.addEventListener('visibilitychange', check)
    window.addEventListener('focus', check)
    window.addEventListener(PENDING_EVENT, check)
    return () => {
      document.removeEventListener('visibilitychange', check)
      window.removeEventListener('focus', check)
      window.removeEventListener(PENDING_EVENT, check)
    }
  }, [check])

  async function answer(applied: boolean) {
    if (!pending) return
    const p = pending
    clearPendingApply()
    if (!applied) {
      setPending(null)
      toast('Tudo bem. A vaga fica em Candidaturas, na coluna Preparação.', {
        action: { label: 'Ver', onClick: () => navigate(`/candidaturas?id=${p.applicationId}`) },
      })
      return
    }
    setSaving(true)
    try {
      const followUp = await markApplicationSent(p.applicationId, toISODate())
      setPending(null)
      toast.success(
        followUp ? `Boa! Movida para Enviada, com lembrete para pedir retorno em ${shortDate(followUp).replace(/\.$/, '')}.` : 'Boa! Movida para Enviada.',
        { action: { label: 'Ver', onClick: () => navigate(`/candidaturas?id=${p.applicationId}`) } },
      )
    } catch (e) {
      toast.error(friendlyDataError(e, 'Não conseguimos atualizar a candidatura. Mude a coluna em Candidaturas.'))
      setPending(null)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet
      open={Boolean(pending)}
      onOpenChange={(o) => {
        // fechar sem responder = "ainda não" (não pergunta de novo)
        if (!o && pending) void answer(false)
      }}
    >
      {pending && (
        <SheetContent title="Você se candidatou?" description={`${pending.title}${pending.company ? ` · ${pending.company}` : ''}`}>
          <p className="text-sm text-muted">Conte para a gente para organizarmos suas candidaturas.</p>
          <div className="mt-4 grid gap-2">
            <Button loading={saving} onClick={() => answer(true)}>
              {!saving && <Check aria-hidden />} Sim, me candidatei
            </Button>
            <Button variant="secondary" disabled={saving} onClick={() => answer(false)}>
              Ainda não
            </Button>
          </div>
          <p className="mt-4 text-[13px] text-muted">
            “Sim” move a vaga para <strong className="font-medium text-ink/80">Enviada</strong> e cria um lembrete para pedir retorno em 7 dias.
            “Ainda não” deixa em <strong className="font-medium text-ink/80">Preparação</strong>.
          </p>
        </SheetContent>
      )}
    </Sheet>
  )
}
