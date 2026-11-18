import { Link } from 'react-router-dom'
import { ArrowRight, BellRing, CalendarClock, FileText, PartyPopper, RefreshCw, Search, Sparkles, TrendingDown, TrendingUp } from 'lucide-react'
import { CompanyInitial, MatchPill, StatusPill, type ApplicationStatus } from '@/components/brand/pills'
import { ScoreRing } from '@/components/brand/score-ring'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { relativeDay, toISODate } from '@/lib/dates'
import { friendlyDataError } from '@/lib/errors'
import { greetingFor, plural } from '@/lib/greeting'
import type { NextStep } from '@/lib/next-step'
import { firstName, useProfile } from '@/lib/profile'
import { useHomeData, type HomeData } from '@/lib/queries/home'
import { WORK_MODE_LABEL } from '@/lib/types'
import { cn } from '@/lib/utils'

export function HomePage() {
  const { data: profile } = useProfile()
  const { data, isLoading, error, refetch, isRefetching } = useHomeData()
  const name = firstName(profile)

  return (
    <div className="space-y-6 sm:space-y-8">
      <header>
        <h1 className="text-[30px] leading-tight sm:text-[36px]">
          {greetingFor()}
          {name ? `, ${name}` : ''}!
        </h1>
        <div className="mt-1.5 text-[16px] text-muted" aria-live="polite">
          {data ? <p>{contextLine(data)}</p> : isLoading ? <Skeleton className="mt-1 h-5 w-64 max-w-full" /> : null}
        </div>
      </header>

      {error ? (
        <Card role="alert" className="border-danger/30 bg-danger-soft">
          <p>{friendlyDataError(error, 'Não conseguimos carregar seu painel.')}</p>
          <Button variant="secondary" className="mt-3" onClick={() => refetch()} loading={isRefetching}>
            <RefreshCw aria-hidden /> Tentar de novo
          </Button>
        </Card>
      ) : isLoading || !data ? (
        <HomeSkeleton />
      ) : (
        <>
          <NextStepCard step={data.nextStep} />
          <Metrics data={data} />
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <TopJobs data={data} />
            <FollowUps data={data} />
          </div>
        </>
      )}
    </div>
  )
}

function contextLine(d: HomeData) {
  if (!d.hasResume) return 'Vamos começar? Em poucos minutos seu currículo fica pronto para as vagas.'
  if (d.newHighMatchToday > 0) {
    return d.newHighMatchToday === 1
      ? 'Você tem 1 vaga nova com alta compatibilidade hoje.'
      : `Você tem ${d.newHighMatchToday} vagas novas com alta compatibilidade hoje.`
  }
  if (d.overdueFollowUps > 0) {
    return `Você tem ${plural(d.overdueFollowUps, 'retorno', 'retornos')} para dar hoje.`
  }
  if (d.interviews > 0) return `Você tem ${plural(d.interviews, 'entrevista', 'entrevistas')} em andamento. Boa sorte!`
  return 'Que bom te ver por aqui. Vamos dar mais um passo hoje?'
}

const NEXT_ICON = {
  upload: FileText,
  analyze: Sparkles,
  improve: TrendingUp,
  'follow-up': BellRing,
  adapt: Sparkles,
  cheer: PartyPopper,
} as const

function NextStepCard({ step }: { step: NextStep }) {
  const Icon = NEXT_ICON[step.kind]
  return (
    <section
      aria-labelledby="next-step-title"
      className="flex flex-col gap-4 rounded-card border border-terra/20 bg-terra-soft p-5 sm:flex-row sm:items-center sm:gap-5 sm:p-6"
    >
      <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-full bg-card text-terra">
        <Icon className="size-6" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-terra-strong">Próximo passo sugerido</p>
        <h2 id="next-step-title" className="mt-0.5 text-[21px] leading-snug sm:text-[23px]">
          {step.title}
        </h2>
        <p className="mt-1 text-[15px] text-ink/80">{step.description}</p>
      </div>
      <Button asChild size="lg" className="shrink-0">
        <Link to={step.action.to}>
          {step.action.label} <ArrowRight aria-hidden />
        </Link>
      </Button>
    </section>
  )
}

function Metrics({ data }: { data: HomeData }) {
  return (
    <section aria-label="Seus números" className="grid grid-cols-3 gap-2.5 sm:gap-4">
      <Link
        to="/curriculo"
        className="group flex flex-col rounded-card border border-line bg-card p-3.5 transition-colors hover:border-line-strong sm:p-5 lg:flex-row lg:items-center lg:gap-4"
      >
        {data.score !== null && <ScoreRing value={data.score} size={76} stroke={7} className="hidden lg:inline-flex" />}
        <div className="min-w-0">
          <p className="text-[12.5px] leading-tight text-muted sm:text-sm">Nota do currículo</p>
          <p className="mt-1 font-serif text-[30px] font-medium leading-none tabular-nums sm:text-[40px] lg:hidden">
            {data.score ?? '—'}
          </p>
          {data.score === null ? (
            <p className="mt-1.5 text-[12.5px] text-terra-strong sm:mt-1 sm:text-sm">
              {data.hasResume ? 'Analisar agora' : 'Envie seu currículo'}
            </p>
          ) : (
            data.scoreDelta !== null && data.scoreDelta !== 0 && (
              <p
                className={cn(
                  'mt-1.5 inline-flex items-center gap-1 text-[12.5px] sm:mt-1 sm:text-sm',
                  data.scoreDelta > 0 ? 'text-success' : 'text-danger',
                )}
              >
                {data.scoreDelta > 0 ? <TrendingUp className="size-3.5" aria-hidden /> : <TrendingDown className="size-3.5" aria-hidden />}
                {data.scoreDelta > 0 ? '+' : ''}
                {data.scoreDelta}
                <span className="hidden lg:inline">&nbsp;desde a última análise</span>
              </p>
            )
          )}
        </div>
      </Link>

      <MetricCard
        to="/candidaturas"
        label="Candidaturas"
        value={data.applications}
        hint={data.applications === 0 ? 'Nenhuma ainda' : data.awaiting ? `${data.awaiting} aguardando` : undefined}
      />
      <MetricCard
        to="/candidaturas"
        label="Entrevistas"
        value={data.interviews}
        hint={data.offers ? plural(data.offers, 'oferta!', 'ofertas!') : data.interviews === 0 ? 'Nenhuma ainda' : undefined}
        highlight={data.offers > 0}
      />
    </section>
  )
}

function MetricCard({ to, label, value, hint, highlight }: { to: string; label: string; value: number; hint?: string; highlight?: boolean }) {
  return (
    <Link to={to} className="flex flex-col rounded-card border border-line bg-card p-3.5 transition-colors hover:border-line-strong sm:p-5">
      <p className="text-[12.5px] leading-tight text-muted sm:text-sm">{label}</p>
      <p className="mt-1 font-serif text-[30px] font-medium leading-none tabular-nums sm:text-[40px]">{value}</p>
      {hint && (
        <p className={cn('mt-1.5 text-[12.5px] sm:text-sm', highlight ? 'font-medium text-success' : 'text-muted')}>{hint}</p>
      )}
    </Link>
  )
}

function SectionCard({ title, link, children }: { title: string; link?: { to: string; label: string }; children: React.ReactNode }) {
  return (
    <Card className="p-0">
      <div className="flex items-center justify-between gap-3 px-5 pb-2 pt-4">
        <h2 className="text-[19px]">{title}</h2>
        {link && (
          <Link to={link.to} className="inline-flex min-h-touch items-center gap-1 text-sm font-medium text-terra-strong hover:underline">
            {link.label} <ArrowRight className="size-4" aria-hidden />
          </Link>
        )}
      </div>
      {children}
    </Card>
  )
}

function TopJobs({ data }: { data: HomeData }) {
  if (!data.topJobs.length) {
    return (
      <SectionCard title="Vagas para você">
        <EmptyBlock
          icon={Search}
          text="Todos os dias o VagaPronta procura vagas com o seu perfil. Elas aparecem aqui."
          action={{ to: '/vagas', label: 'Procurar vagas agora' }}
        />
      </SectionCard>
    )
  }
  return (
    <SectionCard title="Vagas para você" link={{ to: '/vagas', label: 'Ver todas' }}>
      <ul className="divide-y divide-line px-2 pb-2">
        {data.topJobs.map((j) => (
          <li key={j.id}>
            <Link to={`/vagas?id=${j.id}`} className="flex items-center gap-3 rounded-field px-3 py-3 hover:bg-bg">
              <CompanyInitial name={j.company ?? j.title} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{j.title}</p>
                <p className="truncate text-sm text-muted">
                  {[j.company, j.work_mode === 'remoto' ? 'Remoto' : j.location].filter(Boolean).join(' · ')}
                  {j.work_mode && j.work_mode !== 'remoto' ? ` · ${WORK_MODE_LABEL[j.work_mode]}` : ''}
                </p>
              </div>
              {j.compatibility !== null && <MatchPill value={j.compatibility} className="hidden sm:inline-flex" />}
              {j.compatibility !== null && (
                <span
                  className={cn(
                    'rounded-full px-2 py-0.5 text-xs font-medium sm:hidden',
                    j.compatibility > 85 ? 'bg-success-soft text-success' : 'bg-terra-soft text-terra-strong',
                  )}
                >
                  {j.compatibility}%
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </SectionCard>
  )
}

function FollowUps({ data }: { data: HomeData }) {
  const today = toISODate()
  if (!data.upcomingFollowUps.length) {
    return (
      <SectionCard title="Próximos retornos">
        <EmptyBlock
          icon={CalendarClock}
          text={
            data.applications
              ? 'Nenhum lembrete marcado. Num card de candidatura, você pode marcar quando dar um retorno.'
              : 'Quando você se candidatar, pode marcar lembretes para dar um retorno à empresa.'
          }
          action={{ to: '/candidaturas', label: 'Ver candidaturas' }}
        />
      </SectionCard>
    )
  }
  return (
    <SectionCard title="Próximos retornos" link={{ to: '/candidaturas', label: 'Candidaturas' }}>
      <ul className="divide-y divide-line px-2 pb-2">
        {data.upcomingFollowUps.map((a) => {
          const due = a.follow_up_on <= today
          return (
            <li key={a.id}>
              <Link to={`/candidaturas?id=${a.id}`} className="flex items-center gap-3 rounded-field px-3 py-3 hover:bg-bg">
                <span
                  className={cn(
                    'inline-flex size-11 shrink-0 items-center justify-center rounded-[10px]',
                    due ? 'bg-terra-soft text-terra' : 'bg-track text-muted',
                  )}
                  aria-hidden
                >
                  <BellRing className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{a.company}</p>
                  <p className="truncate text-sm text-muted">{a.role}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className={cn('text-sm', due ? 'font-medium text-terra-strong' : 'text-muted')}>
                    {due && a.follow_up_on < today ? `atrasado (${relativeDay(a.follow_up_on, today)})` : relativeDay(a.follow_up_on, today)}
                  </span>
                  <StatusPill status={a.status as ApplicationStatus} className="hidden sm:inline-flex" />
                </div>
              </Link>
            </li>
          )
        })}
      </ul>
    </SectionCard>
  )
}

function EmptyBlock({ icon: Icon, text, action }: { icon: typeof Search; text: string; action: { to: string; label: string } }) {
  return (
    <div className="flex flex-col items-start gap-3 px-5 pb-5 pt-1">
      <div className="flex items-start gap-3">
        <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-track text-muted" aria-hidden>
          <Icon className="size-5" />
        </span>
        <p className="text-[15px] text-muted">{text}</p>
      </div>
      <Button asChild variant="secondary" size="sm">
        <Link to={action.to}>{action.label}</Link>
      </Button>
    </div>
  )
}

function HomeSkeleton() {
  return (
    <div role="status" aria-live="polite" className="space-y-6">
      <span className="sr-only">Carregando seu painel…</span>
      <Skeleton className="h-36 rounded-card sm:h-28" />
      <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-24 rounded-card sm:h-28" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Skeleton className="h-56 rounded-card" />
        <Skeleton className="h-56 rounded-card" />
      </div>
    </div>
  )
}
