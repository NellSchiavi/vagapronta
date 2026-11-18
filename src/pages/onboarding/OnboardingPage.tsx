import { useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { LogOut } from 'lucide-react'
import { toast } from 'sonner'
import { Footer } from '@/components/brand/footer'
import { SiteHeader } from '@/components/brand/site-header'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { LoadingCards } from '@/components/ui/skeleton'
import { useAuth } from '@/lib/auth'
import { countryInfo, type CountryCode } from '@/lib/paises'
import { friendlyDataError } from '@/lib/errors'
import { useProfile, useUpdateProfile } from '@/lib/profile'
import { supabase } from '@/lib/supabase'
import { loadDraft, useAutosaveDraft } from '@/lib/use-draft'
import { startProfileSuggestions } from '@/pages/profile/suggest'
import { saveDestinations } from '@/lib/queries/destinations'
import { AboutStep, type AboutValues } from './AboutStep'
import { ResumeStep } from './ResumeStep'
import { CountryStep } from './CountryStep'
import type { InputMode } from '@/components/resume/resume-input'

const STEPS = ['Sobre você', 'Seu currículo', 'Onde quer trabalhar'] as const

export interface OnboardingDraft {
  step: number
  about: AboutValues
  resume: { mode: InputMode; text: string }
  country: CountryCode
  /** onde quer trabalhar, em ordem de preferência (o 1º define o formato do currículo) */
  destinations?: CountryCode[]
  /** idioma escolhido para o currículo (ex.: "it") */
  language?: string | null
  resumeId: string | null
}

export function OnboardingPage() {
  const { user, signOut } = useAuth()
  const { data: profile, isLoading, error } = useProfile()

  if (isLoading || (!profile && !error)) {
    return (
      <Shell onSignOut={signOut}>
        <LoadingCards count={1} label="Carregando seu perfil…" />
      </Shell>
    )
  }
  if (error || !profile) {
    return (
      <Shell onSignOut={signOut}>
        <p role="alert" className="rounded-card border border-danger/30 bg-danger-soft p-5">
          {friendlyDataError(error, 'Não conseguimos carregar seu perfil.')}
        </p>
      </Shell>
    )
  }
  if (profile.onboarded_at) return <Navigate to="/" replace />

  const draftKey = `vp-onboarding-${user!.id}`
  const initial: OnboardingDraft = loadDraft<OnboardingDraft>(draftKey) ?? {
    step: 0,
    about: {
      full_name: profile.full_name ?? '',
      desired_role: profile.desired_role ?? '',
      city: profile.city ?? '',
    },
    resume: { mode: 'pdf', text: '' },
    country: profile.resume_country ?? 'BR',
    destinations: [profile.resume_country ?? 'BR'],
    language: null,
    resumeId: null,
  }

  return (
    <Shell onSignOut={signOut}>
      <Wizard draftKey={draftKey} initial={initial} />
    </Shell>
  )
}

function Shell({ children, onSignOut }: { children: React.ReactNode; onSignOut: () => void }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader
        actions={
          <Button variant="ghost" onClick={onSignOut} className="text-muted">
            <LogOut aria-hidden /> <span className="hidden sm:inline">Sair</span>
            <span className="sr-only sm:hidden">Sair</span>
          </Button>
        }
      />
      <main className="page-container flex-1 py-8 sm:py-12">
        <div className="mx-auto w-full max-w-2xl">{children}</div>
      </main>
      <Footer />
    </div>
  )
}

function Wizard({ draftKey, initial }: { draftKey: string; initial: OnboardingDraft }) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const updateProfile = useUpdateProfile()
  const { data: profile } = useProfile()
  const [draft, setDraft] = useState<OnboardingDraft>(initial)
  const [direction, setDirection] = useState(1)
  const { savedAt, discard } = useAutosaveDraft(draftKey, draft)

  const patch = (p: Partial<OnboardingDraft>) => setDraft((d) => ({ ...d, ...p }))
  const go = (step: number) => {
    setDirection(step > draft.step ? 1 : -1)
    patch({ step })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function saveAbout(values: AboutValues) {
    try {
      await updateProfile.mutateAsync(values)
      patch({ about: values })
      go(1)
    } catch (err) {
      toast.error(friendlyDataError(err, 'Não conseguimos salvar seus dados.'))
    }
  }

  async function finish(destinations: CountryCode[], language: string | null) {
    const country = destinations[0] ?? 'BR'
    try {
      await saveDestinations(destinations)
      if (draft.resumeId) {
        await supabase.from('resumes').update({ country }).eq('id', draft.resumeId)
      }
      const resumeLanguage = language ?? countryInfo(country).languages[0].code
      const prefs = profile?.preferences && typeof profile.preferences === 'object' && !Array.isArray(profile.preferences) ? profile.preferences : {}
      await updateProfile.mutateAsync({
        resume_country: country,
        preferences: { ...prefs, resume_language: resumeLanguage },
        onboarded_at: new Date().toISOString(),
      })
      // os cargos do passo 1 (separados por vírgula) viram os "cargos que procuro"
      const roles = draft.about.desired_role.split(',').map((r) => r.trim()).filter(Boolean)
      if (roles.length) await supabase.from('job_preferences').update({ desired_roles: roles }).eq('user_id', user!.id)
      discard()
      // com currículo, a IA procura sugestões para o perfil em segundo plano
      if (draft.resumeId) startProfileSuggestions(draft.resumeId, user!.id)
      toast.success('Tudo pronto!', { description: 'Agora, se quiser, revise seu perfil.' })
      navigate('/perfil?origem=onboarding', { replace: true })
    } catch (err) {
      toast.error(friendlyDataError(err, 'Não conseguimos concluir agora.'))
    }
  }

  const progress = useMemo(() => ((draft.step + 1) / STEPS.length) * 100, [draft.step])
  const greeting = draft.about.full_name.trim().split(/\s+/)[0]

  return (
    <div>
      <div className="mb-8">
        <p className="text-sm font-medium text-terra-strong">
          Passo {draft.step + 1} de {STEPS.length} · {STEPS[draft.step]}
        </p>
        <Progress value={progress} className="mt-2" label={`Passo ${draft.step + 1} de ${STEPS.length}`} hideLabel />
        {savedAt && (
          <p className="mt-2 text-xs text-muted" aria-live="polite">
            Rascunho salvo automaticamente
          </p>
        )}
      </div>

      <AnimatePresence mode="wait" initial={false} custom={direction}>
        <motion.section
          key={draft.step}
          custom={direction}
          initial={{ opacity: 0, x: 24 * direction }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 * direction }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          aria-labelledby="onboarding-title"
        >
          {draft.step === 0 && (
            <AboutStep
              defaultValues={draft.about}
              onChange={(about) => patch({ about })}
              onSubmit={saveAbout}
            />
          )}
          {draft.step === 1 && (
            <ResumeStep
              userId={user!.id}
              greeting={greeting}
              country={draft.country}
              resume={draft.resume}
              resumeId={draft.resumeId}
              onChange={(resume) => patch({ resume })}
              onSaved={(resumeId) => {
                patch({ resumeId })
                go(2)
              }}
              onSkip={() => go(2)}
              onBack={() => go(0)}
            />
          )}
          {draft.step === 2 && (
            <CountryStep
              destinations={draft.destinations ?? [draft.country]}
              language={draft.language ?? null}
              onChange={(destinations) => patch({ destinations, country: destinations[0] ?? draft.country })}
              onLanguageChange={(language) => patch({ language })}
              onBack={() => go(1)}
              onFinish={finish}
              saving={updateProfile.isPending}
            />
          )}
        </motion.section>
      </AnimatePresence>
    </div>
  )
}
