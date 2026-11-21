import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowRight, Check, Loader2, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { LoadingCards } from '@/components/ui/skeleton'
import { useAiTask } from '@/lib/ai-tasks'
import { useAuth } from '@/lib/auth'
import { queryClient } from '@/lib/query-client'
import { profileCompleteness } from '@/lib/profile-completeness'
import { updateProfile, useProfile, type Profile, type ProfilePatch } from '@/lib/profile'
import {
  acceptSuggestion,
  updatePreferences,
  usePreferences,
  type JobPreferences,
  type PreferencesPatch,
  type SuggestionKey,
} from '@/lib/queries/preferences'
import { useResumes } from '@/lib/queries/resumes'
import { AccountSection, NotificationsSection } from './AccountSection'
import { PhotoBlock } from './PhotoCard'
import { SectionCard, useAutosave } from './profile-ui'
import { DestinationPicker } from '@/components/resume/destination-picker'
import { saveDestinations, useDestinations } from '@/lib/queries/destinations'
import type { CountryCode } from '@/lib/paises'
import { CareerSection, PersonalSection, QualificationsSection, SearchSection, type PrefsDraft, type ProfileDraft } from './sections'
import { startProfileSuggestions, SUGGEST_TASK } from './suggest'

const NAV = [
  ['dados', 'Dados pessoais'],
  ['momento', 'Momento'],
  ['qualificacoes', 'Registro e certificações'],
  ['destinos', 'Onde quero trabalhar'],
  ['procura', 'O que procuro'],
  ['notificacoes', 'Notificações'],
  ['conta', 'Conta'],
] as const

export function ProfilePage() {
  const { data: profile } = useProfile()
  const { data: prefs } = usePreferences()
  return (
    <div>
      <PageHeader title="Meu perfil" description="Tudo aqui pode ser editado por você. Só o nome é obrigatório." />
      {profile && prefs ? <ProfileEditor profile={profile} prefs={prefs} /> : <LoadingCards count={3} label="Carregando seu perfil…" />}
    </div>
  )
}

function toProfileDraft(p: Profile): ProfileDraft {
  return {
    full_name: p.full_name ?? '',
    phone: p.phone ?? '',
    contact_email: p.contact_email ?? '',
    city: p.city ?? '',
    residence_country: p.residence_country ?? 'BR',
    birth_date: p.birth_date ?? '',
    citizenships: p.citizenships ?? [],
    linkedin_url: p.linkedin_url ?? '',
    links: p.links ?? [],
    career_stage: p.career_stage,
    study_course: p.study_course ?? '',
    study_institution: p.study_institution ?? '',
    study_period: p.study_period ?? '',
    study_expected_end: p.study_expected_end ?? '',
    registry_council: p.registry_council ?? '',
    registry_number: p.registry_number ?? '',
    registry_region: p.registry_region ?? '',
    specializations: p.specializations ?? [],
    certifications: p.certifications ?? [],
    notify_daily_jobs: p.notify_daily_jobs,
    notify_follow_up: p.notify_follow_up,
  }
}

function toPrefsDraft(p: JobPreferences): PrefsDraft {
  return {
    desired_roles: p.desired_roles,
    areas: p.areas,
    seniority: p.seniority,
    work_modes: p.work_modes,
    cities: p.cities,
    open_to_relocate: p.open_to_relocate,
    contract_types: p.contract_types,
    salary_min: p.salary_min?.toString() ?? '',
    salary_max: p.salary_max?.toString() ?? '',
    salary_currency: p.salary_currency,
    keywords_include: p.keywords_include,
    keywords_exclude: p.keywords_exclude,
    blocked_companies: p.blocked_companies,
    languages: p.languages ?? [],
    suggestions: p.suggestions ?? {},
  }
}

const orNull = (s: string) => (s.trim() ? s.trim() : null)

/** "Onde quero trabalhar" (lista ordenada), separada do formato do currículo */
function DestinationsSection() {
  const { data } = useDestinations()
  if (!data) return null
  return <DestinationsEditor initial={data.length ? data : ['BR']} />
}

function DestinationsEditor({ initial }: { initial: CountryCode[] }) {
  const [list, setList] = useState<CountryCode[]>(initial)
  // lista vazia não é gravada (precisa de pelo menos um destino)
  const status = useAutosave(list, async (codes) => {
    if (codes.length) await saveDestinations(codes)
  })
  return (
    <SectionCard
      id="destinos"
      title="Onde quero trabalhar"
      description="Escolha um ou mais lugares e ordene por preferência. O formato do currículo segue o país de cada vaga."
      status={status}
    >
      <DestinationPicker value={list} onChange={setList} />
    </SectionCard>
  )
}

function ProfileEditor({ profile, prefs }: { profile: Profile; prefs: JobPreferences }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { data: resumes } = useResumes()
  const suggestTask = useAiTask(SUGGEST_TASK)
  const [d, setD] = useState<ProfileDraft>(() => toProfileDraft(profile))
  const [p, setP] = useState<PrefsDraft>(() => toPrefsDraft(prefs))
  const setProfile = (x: Partial<ProfileDraft>) => setD((o) => ({ ...o, ...x }))
  const setPrefs = (x: Partial<PrefsDraft>) => setP((o) => ({ ...o, ...x }))

  // quando chegam sugestões novas (tarefa em segundo plano), atualiza só elas
  useEffect(() => setP((o) => ({ ...o, suggestions: prefs.suggestions ?? {} })), [prefs.suggestions])

  const nameError = d.full_name.trim() ? undefined : 'Digite seu nome. É o único campo obrigatório.'

  const profileStatus = useAutosave(d, async (x) => {
    const patch: ProfilePatch = {
      phone: orNull(x.phone),
      contact_email: orNull(x.contact_email),
      city: orNull(x.city),
      residence_country: x.residence_country,
      birth_date: orNull(x.birth_date),
      citizenships: x.citizenships,
      linkedin_url: orNull(x.linkedin_url),
      links: x.links.filter((l) => l.url.trim()),
      career_stage: x.career_stage,
      study_course: orNull(x.study_course),
      study_institution: orNull(x.study_institution),
      study_period: orNull(x.study_period),
      study_expected_end: orNull(x.study_expected_end),
      registry_council: orNull(x.registry_council),
      registry_number: orNull(x.registry_number),
      registry_region: orNull(x.registry_region),
      specializations: x.specializations,
      certifications: x.certifications.filter((c) => c.nome.trim()),
      notify_daily_jobs: x.notify_daily_jobs,
      notify_follow_up: x.notify_follow_up,
      ...(x.full_name.trim() ? { full_name: x.full_name.trim() } : {}), // nome vazio não é gravado
    }
    const saved = await updateProfile(user!.id, patch)
    queryClient.setQueryData(['profile', user?.id], saved)
    queryClient.invalidateQueries({ queryKey: ['home'] })
  })

  const prefsStatus = useAutosave(p, async (x) => {
    const min = x.salary_min ? Number(x.salary_min) : null
    const max = x.salary_max ? Number(x.salary_max) : null
    const patch: PreferencesPatch = {
      ...x,
      salary_min: min,
      salary_max: min !== null && max !== null && min > max ? null : max,
      languages: x.languages.filter((l) => l.idioma.trim()),
    }
    const saved = await updatePreferences(user!.id, patch)
    queryClient.setQueryData(['preferences', user?.id], saved)
    // o primeiro cargo desejado também fica no perfil (usado em telas e na IA)
    if ((x.desired_roles[0] ?? null) !== (profile.desired_role ?? null)) {
      const prof = await updateProfile(user!.id, { desired_role: x.desired_roles[0] ?? null })
      queryClient.setQueryData(['profile', user?.id], prof)
    }
    queryClient.invalidateQueries({ queryKey: ['home'] })
  })

  // sugestões: aceitar preenche o rascunho (e o salvamento automático grava)
  const sugg = p.suggestions
  const dropSuggestion = (k: SuggestionKey) => setP((o) => ({ ...o, suggestions: Object.fromEntries(Object.entries(o.suggestions).filter(([key]) => key !== k)) }))
  function accept(k: SuggestionKey) {
    const res = acceptSuggestion(k, sugg, {
      links: d.links,
      specializations: d.specializations,
      certifications: d.certifications,
      desired_roles: p.desired_roles,
      areas: p.areas,
      languages: p.languages,
      seniority: p.seniority,
    })
    if (Object.keys(res.profile).length) setD((o) => ({ ...o, ...(res.profile as Partial<ProfileDraft>) }))
    setP((o) => ({ ...o, ...(res.prefs as Partial<PrefsDraft>), suggestions: Object.fromEntries(Object.entries(o.suggestions).filter(([key]) => key !== k)) }))
  }
  const pendingKeys = Object.keys(sugg) as SuggestionKey[]
  function acceptAll() {
    pendingKeys.forEach((k) => accept(k))
    toast.success('Sugestões aplicadas. Você pode mudar qualquer campo quando quiser.')
  }

  const completeness = profileCompleteness({ full_name: d.full_name, city: d.city, desired_roles: p.desired_roles, work_modes: p.work_modes, cities: p.cities })

  // ?campo=… leva direto ao campo que falta
  useEffect(() => {
    const campo = params.get('campo')
    if (!campo) return
    setTimeout(() => {
      const el = document.getElementById(campo)
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      const focusable = el?.matches('input,button,select,textarea') ? el : el?.querySelector<HTMLElement>('input,button,select,textarea')
      ;(focusable as HTMLElement | null)?.focus({ preventScroll: true })
    }, 300)
  }, [params])

  const fromOnboarding = params.get('origem') === 'onboarding'
  const principal = resumes?.find((r) => r.is_principal)
  const sugProps = { sugg, accept, dismiss: dropSuggestion }

  return (
    <div className="space-y-5">
      {fromOnboarding && (
        <Card className="flex flex-col gap-3 border-terra/20 bg-terra-soft p-5 sm:flex-row sm:items-center">
          <div className="flex-1">
            <p className="font-serif text-xl">Quase lá! Quer revisar seu perfil?</p>
            <p className="mt-1 text-[15px] text-ink/80">
              {suggestTask && suggestTask.status !== 'done'
                ? 'Estamos procurando sugestões no seu currículo. Você pode revisar agora ou depois.'
                : 'Confira as sugestões e complete o que quiser. Nada aqui é obrigatório além do nome.'}
            </p>
          </div>
          <Button size="lg" variant="secondary" onClick={() => navigate('/', { replace: true })} className="shrink-0">
            Fazer isso depois <ArrowRight aria-hidden />
          </Button>
        </Card>
      )}

      <Card className="p-5">
        <div className="flex items-baseline justify-between gap-3">
          <p className="font-medium">Perfil {completeness.percent}% completo</p>
          {completeness.percent === 100 && (
            <span className="inline-flex items-center gap-1 text-sm text-success">
              <Check className="size-4" aria-hidden /> Tudo certo para receber boas vagas
            </span>
          )}
        </div>
        <Progress value={completeness.percent} label="Perfil completo" hideLabel tone={completeness.percent === 100 ? 'success' : 'terra'} className="mt-2" />
        {completeness.missing.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted">Falta:</span>
            {completeness.missing.map((m) => (
              <button
                key={m.field}
                type="button"
                onClick={() => {
                  const el = document.getElementById(m.field)
                  el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                  const target = (el?.matches('input') ? el : el?.querySelector('input,button')) as HTMLElement | null
                  target?.focus({ preventScroll: true })
                }}
                className="min-h-[36px] rounded-full border border-terra/30 bg-terra-soft px-3 font-medium text-terra-strong"
              >
                {m.label}
              </button>
            ))}
          </div>
        )}
        <p className="mt-2 text-[13px] text-muted">Só contam os itens essenciais para a busca de vagas. Os campos opcionais nunca baixam a porcentagem.</p>
      </Card>

      {pendingKeys.length > 0 ? (
        <Card className="flex flex-col gap-3 border-info/25 bg-info-soft/60 p-5 sm:flex-row sm:items-center">
          <Sparkles className="size-6 shrink-0 text-info" aria-hidden />
          <div className="flex-1">
            <p className="font-medium">Encontramos {pendingKeys.length === 1 ? '1 sugestão' : `${pendingKeys.length} sugestões`} no seu currículo</p>
            <p className="text-sm text-ink/80">Elas aparecem com o selo “sugerido” nos campos. Aceite uma a uma ou todas de uma vez.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setPrefs({ suggestions: {} })}>
              Ignorar todas
            </Button>
            <Button onClick={acceptAll}>Aceitar todas</Button>
          </div>
        </Card>
      ) : suggestTask && suggestTask.status !== 'done' ? (
        <p className="flex items-center gap-2 text-sm text-muted" role="status">
          <Loader2 className="size-4 animate-spin" aria-hidden /> Procurando sugestões no seu currículo…
        </p>
      ) : principal ? (
        <Button variant="link" className="text-sm" onClick={() => startProfileSuggestions(principal.id, user!.id)}>
          <Sparkles className="size-4" aria-hidden /> Buscar sugestões no meu currículo
        </Button>
      ) : null}

      <nav aria-label="Seções do perfil" className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none]">
        {NAV.map(([id, label]) => (
          <a key={id} href={`#/perfil`} onClick={(e) => { e.preventDefault(); document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }) }} className="inline-flex min-h-touch shrink-0 items-center rounded-full border border-line-strong bg-card px-3.5 text-sm">
            {label}
          </a>
        ))}
      </nav>

      <PersonalSection d={d} set={setProfile} status={profileStatus} loginEmail={profile.email} nameError={nameError} photo={<PhotoBlock profile={profile} />} {...sugProps} />
      <CareerSection d={d} set={setProfile} status={profileStatus} {...sugProps} />
      <QualificationsSection d={d} set={setProfile} status={profileStatus} {...sugProps} />
      <DestinationsSection />
      <SearchSection p={p} set={setPrefs} status={prefsStatus} {...sugProps} />
      <NotificationsSection d={d} set={setProfile} status={profileStatus} />
      <AccountSection />
    </div>
  )
}
