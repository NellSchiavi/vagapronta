import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/lib/auth'
import { startOfToday, toISODate } from '@/lib/dates'
import { computeNextStep, HIGH_MATCH, type NextStep } from '@/lib/next-step'
import { profileCompleteness } from '@/lib/profile-completeness'
import { supabase } from '@/lib/supabase'
import type { MatchNotes, WorkMode } from '@/lib/types'

export interface HomeJob {
  id: string
  title: string
  company: string | null
  location: string | null
  work_mode: WorkMode | null
  compatibility: number | null
  /** aderência aos requisitos, quando já avaliada (lib/job-score.ts) */
  match_notes?: MatchNotes | null
  created_at: string
}

export interface HomeFollowUp {
  id: string
  company: string
  role: string
  status: string
  follow_up_on: string
}

export interface HomeData {
  hasResume: boolean
  isOrganized: boolean
  score: number | null
  scoreDelta: number | null
  applications: number
  awaiting: number
  interviews: number
  offers: number
  newHighMatchToday: number
  overdueFollowUps: number
  topJobs: HomeJob[]
  upcomingFollowUps: HomeFollowUp[]
  nextStep: NextStep
}

export function useHomeData() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['home', user?.id],
    enabled: Boolean(user),
    queryFn: async (): Promise<HomeData> => {
      const [resumesRes, appsRes, jobsRes, profRes, prefsRes] = await Promise.all([
        supabase
          .from('resumes')
          .select('id, is_principal, job_id, updated_at, sections:content->sections')
          .order('updated_at', { ascending: false }),
        supabase.from('applications').select('id, company, role, status, follow_up_on, job_id'),
        supabase
          .from('jobs')
          .select('id, title, company, location, work_mode, compatibility, match_notes, created_at')
          .eq('status', 'nova')
          .order('compatibility', { ascending: false, nullsFirst: false }),
        supabase.from('profiles').select('full_name, city').eq('user_id', user!.id).maybeSingle(),
        supabase.from('job_preferences').select('desired_roles, work_modes, cities').eq('user_id', user!.id).maybeSingle(),
      ])
      if (resumesRes.error) throw resumesRes.error
      if (appsRes.error) throw appsRes.error
      if (jobsRes.error) throw jobsRes.error

      const resumes = resumesRes.data
      const apps = appsRes.data
      const jobs = jobsRes.data as HomeJob[]

      // currículo principal (ou o mais recente que não seja uma versão adaptada)
      const principal = resumes.find((r) => r.is_principal) ?? resumes.find((r) => !r.job_id) ?? null

      let score: number | null = null
      let scoreDelta: number | null = null
      if (principal) {
        const { data, error } = await supabase
          .from('resume_analyses')
          .select('overall_score, created_at')
          .eq('resume_id', principal.id)
          .order('created_at', { ascending: false })
          .limit(2)
        if (error) throw error
        score = data[0]?.overall_score ?? null
        scoreDelta = data.length === 2 ? data[0].overall_score - data[1].overall_score : null
      }

      const isOrganized = Boolean(principal?.sections)
      const completeness = profileCompleteness({
        full_name: profRes.data?.full_name,
        city: profRes.data?.city,
        desired_roles: prefsRes.data?.desired_roles ?? [],
        work_modes: prefsRes.data?.work_modes ?? [],
        cities: prefsRes.data?.cities ?? [],
      })
      const today = toISODate()
      const todayStart = startOfToday().getTime()
      const active = apps.filter((a) => a.status === 'enviada' || a.status === 'entrevista')
      const handledJobIds = new Set<string>([
        ...apps.map((a) => a.job_id).filter((id): id is string => Boolean(id)),
        ...resumes.map((r) => r.job_id).filter((id): id is string => Boolean(id)),
      ])

      const withFollowUp = active
        .filter((a): a is typeof a & { follow_up_on: string } => Boolean(a.follow_up_on))
        .sort((a, b) => (a.follow_up_on < b.follow_up_on ? -1 : 1))

      return {
        hasResume: Boolean(principal),
        score,
        scoreDelta,
        applications: apps.length,
        awaiting: apps.filter((a) => a.status === 'enviada').length,
        interviews: apps.filter((a) => a.status === 'entrevista').length,
        offers: apps.filter((a) => a.status === 'oferta').length,
        newHighMatchToday: jobs.filter(
          (j) =>
            (j.compatibility ?? 0) > HIGH_MATCH &&
            !handledJobIds.has(j.id) &&
            new Date(j.created_at).getTime() >= todayStart,
        ).length,
        overdueFollowUps: withFollowUp.filter((a) => a.follow_up_on <= today).length,
        topJobs: jobs.slice(0, 3),
        upcomingFollowUps: withFollowUp.slice(0, 3).map(({ id, company, role, status, follow_up_on }) => ({
          id,
          company,
          role,
          status,
          follow_up_on,
        })),
        isOrganized,
        nextStep: computeNextStep({
          hasResume: Boolean(principal),
          isOrganized,
          latestScore: score,
          followUps: active,
          newJobs: jobs,
          handledJobIds,
          today,
          profile: { percent: completeness.percent, field: completeness.missing[0]?.field ?? null },
        }),
      }
    },
  })
}
