import { Link } from 'react-router-dom'
import { ExternalLink, FlaskConical, Globe2, Languages, MapPin, Plane, Sparkles, X } from 'lucide-react'
import { toast } from 'sonner'
import { CompanyInitial, MatchPill } from '@/components/brand/pills'
import { Button } from '@/components/ui/button'
import { countryInfo } from '@/lib/paises'
import { relativeDay } from '@/lib/dates'
import { friendlyDataError } from '@/lib/errors'
import { setJobStatus, SOURCE_LABEL } from '@/lib/queries/jobs'
import { WORK_MODE_LABEL, type Job } from '@/lib/types'
import { cn } from '@/lib/utils'
import { AddToApplicationsButton } from '@/pages/applications/AddToApplicationsButton'

const LANG: Record<string, string> = { en: 'inglês', de: 'alemão', es: 'espanhol', fr: 'francês', it: 'italiano', pt: 'português', nl: 'holandês' }

interface Warning {
  icon: typeof Languages
  text: string
  tone: 'info' | 'good' | 'warn'
}

/** Avisos para vagas no exterior: idioma, visto e remoto a partir do Brasil */
export function jobWarnings(job: Pick<Job, 'destination' | 'language_required' | 'visa_sponsorship' | 'remote_from_brazil' | 'work_mode'>): Warning[] {
  const out: Warning[] = []
  const abroad = job.destination !== 'BR'
  if (job.language_required && job.language_required !== 'pt') {
    out.push({ icon: Languages, text: `Idioma pedido: ${LANG[job.language_required] ?? job.language_required}`, tone: 'info' })
  }
  if (job.remote_from_brazil === true && abroad) out.push({ icon: Globe2, text: 'Remoto: aceita quem mora no Brasil', tone: 'good' })
  if (job.remote_from_brazil === false) out.push({ icon: Globe2, text: 'Remoto, mas não aceita quem mora no Brasil', tone: 'warn' })
  if (abroad && job.work_mode !== 'remoto') {
    if (job.visa_sponsorship === true) out.push({ icon: Plane, text: 'Oferece visto ou ajuda de mudança', tone: 'good' })
    else if (job.visa_sponsorship === false) out.push({ icon: Plane, text: 'Não oferece visto', tone: 'warn' })
    else out.push({ icon: Plane, text: 'Visto: o anúncio não diz. Confirme antes de se candidatar', tone: 'info' })
  }
  return out
}

const TONE = {
  info: 'bg-track text-ink/80',
  good: 'bg-success-soft text-success',
  warn: 'bg-warn-soft text-warn',
}

export function JobCard({ job, priority }: { job: Job; priority: number | null }) {
  const example = Boolean(job.match_notes?.exemplo)
  const warnings = jobWarnings(job)
  const source = SOURCE_LABEL[job.source] ?? job.source
  const where = [job.company, job.location].filter(Boolean).join(' · ')

  async function discard() {
    try {
      await setJobStatus(job.id, 'descartada')
      toast('Vaga descartada. Ela não volta nas próximas buscas.', {
        action: { label: 'Desfazer', onClick: () => void setJobStatus(job.id, job.status) },
      })
    } catch (e) {
      toast.error(friendlyDataError(e, 'Não conseguimos descartar a vaga.'))
    }
  }

  return (
    <article className="rounded-card border border-line bg-card p-4 sm:p-5" aria-labelledby={`vaga-${job.id}`}>
      <div className="flex items-start gap-3">
        <CompanyInitial name={job.company ?? job.title} className="size-11 text-base" />
        <div className="min-w-0 flex-1">
          <h3 id={`vaga-${job.id}`} className="font-sans text-[17px] font-medium leading-snug [overflow-wrap:anywhere]">
            {job.title}
          </h3>
          {where && <p className="mt-0.5 text-sm text-muted [overflow-wrap:anywhere]">{where}</p>}
        </div>
        <Button variant="ghost" size="icon" onClick={discard} aria-label={`Descartar a vaga ${job.title}`} className="-mr-2 -mt-1 shrink-0 text-muted">
          <X className="size-5" aria-hidden />
        </Button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs">
        {job.compatibility != null && <MatchPill value={job.compatibility} />}
        {job.destination && (
          <span className="inline-flex items-center gap-1 rounded-full bg-terra-soft px-2.5 py-1 font-medium text-terra-strong">
            <MapPin className="size-3" aria-hidden />
            {priority ? `${priority}º · ` : ''}
            {countryInfo(job.destination).name}
          </span>
        )}
        {job.work_mode && <span className="rounded-full bg-track px-2.5 py-1 font-medium text-ink/80">{WORK_MODE_LABEL[job.work_mode]}</span>}
        {example && (
          <span className="inline-flex items-center gap-1 rounded-full bg-warn-soft px-2.5 py-1 font-medium text-warn">
            <FlaskConical className="size-3" aria-hidden /> Vaga de exemplo
          </span>
        )}
      </div>

      {warnings.length > 0 && (
        <ul className="mt-3 space-y-1.5" aria-label="Avisos sobre esta vaga">
          {warnings.map((w) => (
            <li key={w.text} className={cn('flex items-start gap-2 rounded-[8px] px-2.5 py-1.5 text-[13px]', TONE[w.tone])}>
              <w.icon className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              {w.text}
            </li>
          ))}
        </ul>
      )}

      {job.match_notes?.termos?.length ? (
        <p className="mt-3 text-[13px] text-muted">
          <span className="font-medium text-ink/80">Combina com seu currículo:</span> {job.match_notes.termos.slice(0, 6).join(', ')}
        </p>
      ) : null}
      {job.salary && <p className="mt-1 text-[13px] text-muted">Salário: {job.salary}</p>}

      <div className="mt-4 grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">
        <Button asChild>
          <Link to={`/adaptar?vaga=${job.id}`}>
            <Sparkles aria-hidden /> Adaptar currículo
          </Link>
        </Button>
        <AddToApplicationsButton jobId={job.id} variant="secondary" label="Candidatar" />
        {job.url && (
          <Button asChild variant="ghost">
            <a href={job.url} target="_blank" rel="noopener noreferrer">
              <ExternalLink aria-hidden /> Ver anúncio
            </a>
          </Button>
        )}
      </div>

      <p className="mt-3 flex flex-wrap items-center gap-x-2 text-xs text-muted">
        {example ? (
          <span>Exemplo para testar a tela: a fonte com chave ainda não foi ligada.</span>
        ) : (
          <>
            <span>
              via{' '}
              {job.source_url ? (
                <a href={job.source_url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-ink">
                  {source}
                </a>
              ) : (
                source
              )}
            </span>
            {job.published_at && <span>· publicada {relativeDay(job.published_at.slice(0, 10))}</span>}
            {job.match_notes?.estimada && <span>· compatibilidade estimada</span>}
          </>
        )}
      </p>
    </article>
  )
}
