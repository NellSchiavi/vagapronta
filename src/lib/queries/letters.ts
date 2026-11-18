import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/auth'
import { invokeAi } from '@/lib/ai'
import { queryClient } from '@/lib/query-client'
import { supabase } from '@/lib/supabase'
import type { CoverLetter, GeneratedLetter, LetterTone } from '@/lib/types'

export type LetterRow = CoverLetter & { jobs: { title: string; company: string | null } | null }

export function useLetters() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['letters', user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cover_letters')
        .select('*, jobs(title, company)')
        .order('updated_at', { ascending: false })
      if (error) throw error
      return data as unknown as LetterRow[]
    },
  })
}

export function useLetter(id: string | null) {
  return useQuery({
    queryKey: ['letter', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data, error } = await supabase.from('cover_letters').select('*, jobs(title, company)').eq('id', id!).maybeSingle()
      if (error) throw error
      return data as unknown as LetterRow | null
    },
  })
}

/** Vagas que podem receber uma carta (salvas ou novas), com a versão adaptada do currículo, se houver */
export function useLetterJobs() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['letter-jobs', user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const [jobs, adapted] = await Promise.all([
        supabase
          .from('jobs')
          .select('id, title, company, status, compatibility, created_at')
          .neq('status', 'descartada')
          .order('status', { ascending: false }) // "salva" antes de "nova"
          .order('created_at', { ascending: false })
          .limit(50),
        supabase.from('resumes').select('id, title, job_id').not('job_id', 'is', null),
      ])
      if (jobs.error) throw jobs.error
      if (adapted.error) throw adapted.error
      const byJob = new Map(adapted.data.map((r) => [r.job_id!, { id: r.id, title: r.title }]))
      return jobs.data.map((j) => ({ ...j, adaptedResume: byJob.get(j.id) ?? null }))
    },
  })
}

export function generateLetter(args: { resumeId: string; tone: LetterTone; jobId?: string | null; jobText?: string }) {
  return invokeAi<{ letter: GeneratedLetter }>('gerar-carta', {
    resume_id: args.resumeId,
    tone: args.tone,
    job_id: args.jobId || undefined,
    job_text: args.jobText || undefined,
  }).then((r) => r.letter)
}

function useRefreshLetters() {
  const qc = useQueryClient()
  const { user } = useAuth()
  return (id?: string) => {
    qc.invalidateQueries({ queryKey: ['letters', user?.id] })
    if (id) qc.invalidateQueries({ queryKey: ['letter', id] })
  }
}

export function useCreateLetter() {
  const refresh = useRefreshLetters()
  return useMutation({
    mutationFn: async (l: { job_id: string | null; resume_id: string | null; title: string; tone: LetterTone; content: string }) => {
      const { data, error } = await supabase.from('cover_letters').insert(l).select('id').single()
      if (error) throw error
      return data.id
    },
    onSuccess: () => refresh(),
  })
}

export function useUpdateLetter() {
  const refresh = useRefreshLetters()
  return useMutation({
    mutationFn: async ({ id, ...patch }: { id: string; content?: string; tone?: LetterTone; title?: string }) => {
      const { error } = await supabase.from('cover_letters').update(patch).eq('id', id)
      if (error) throw error
      return id
    },
    onSuccess: () => refresh(),
  })
}

export function useDeleteLetter() {
  const refresh = useRefreshLetters()
  return useMutation({
    mutationFn: async (l: LetterRow) => {
      const { error } = await supabase.from('cover_letters').delete().eq('id', l.id)
      if (error) throw error
      return l
    },
    onSuccess: () => refresh(),
  })
}

/** Desfazer a exclusão: recria a carta com os mesmos dados */
export async function restoreLetter(l: LetterRow) {
  const { error } = await supabase.from('cover_letters').insert({
    id: l.id,
    job_id: l.job_id,
    resume_id: l.resume_id,
    title: l.title,
    tone: l.tone,
    content: l.content,
    created_at: l.created_at,
  })
  if (error) throw error
  queryClient.invalidateQueries({ queryKey: ['letters'] })
}
