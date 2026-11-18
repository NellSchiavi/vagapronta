import { useMutation, useQuery } from '@tanstack/react-query'
import type { ApplicationStatus } from '@/components/brand/pills'
import { useAuth } from '@/lib/auth'
import { queryClient } from '@/lib/query-client'
import { supabase } from '@/lib/supabase'
import type { Application } from '@/lib/types'

export type ApplicationRow = Application & {
  resumes: { id: string; title: string } | null
  cover_letters: { id: string; title: string } | null
  jobs: { id: string; title: string; company: string | null; url: string | null } | null
}

const SELECT = '*, resumes(id, title), cover_letters(id, title), jobs(id, title, company, url)'

export function useApplications() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['applications', user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('applications')
        .select(SELECT)
        .order('position', { ascending: true })
        .order('updated_at', { ascending: false })
      if (error) throw error
      return data as unknown as ApplicationRow[]
    },
  })
}

export function refreshApplications() {
  queryClient.invalidateQueries({ queryKey: ['applications'] })
  queryClient.invalidateQueries({ queryKey: ['home'] })
}

export type ApplicationPatch = Partial<
  Pick<Application, 'company' | 'role' | 'url' | 'status' | 'applied_on' | 'notes' | 'follow_up_on' | 'position' | 'resume_id' | 'cover_letter_id' | 'job_id'>
>

export async function updateApplication(id: string, patch: ApplicationPatch) {
  const { error } = await supabase.from('applications').update(patch).eq('id', id)
  if (error) throw error
}

/** Atualiza na tela na hora (o banco grava em seguida) */
export function patchApplicationsCache(update: (rows: ApplicationRow[]) => ApplicationRow[]) {
  queryClient.setQueriesData<ApplicationRow[]>({ queryKey: ['applications'] }, (old) => (old ? update(old) : old))
}

export function useSaveApplication() {
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string | null; patch: ApplicationPatch & { company: string; role: string } }) => {
      if (id) {
        await updateApplication(id, patch)
        return id
      }
      const { data, error } = await supabase.from('applications').insert(patch).select('id').single()
      if (error) throw error
      return data.id
    },
    onSuccess: refreshApplications,
  })
}

export async function deleteApplication(row: ApplicationRow) {
  const { error } = await supabase.from('applications').delete().eq('id', row.id)
  if (error) throw error
  refreshApplications()
}

/** Desfazer a exclusão: recria com os mesmos dados */
export async function restoreApplication(row: ApplicationRow) {
  const { resumes: _r, cover_letters: _c, jobs: _j, ...plain } = row
  void _r
  void _c
  void _j
  const { error } = await supabase.from('applications').insert(plain)
  if (error) throw error
  refreshApplications()
}

/**
 * "Adicionar às candidaturas" a partir de uma vaga, de uma versão adaptada ou de uma carta.
 * Preenche empresa, cargo e link com o que o app já sabe. Se a vaga já tem uma
 * candidatura, só completa o currículo/carta nela (sem duplicar).
 */
export async function addApplicationForJob(args: { jobId: string; resumeId?: string | null; letterId?: string | null }) {
  const { data: job, error: jobErr } = await supabase.from('jobs').select('id, title, company, url').eq('id', args.jobId).single()
  if (jobErr) throw jobErr

  const { data: existing } = await supabase.from('applications').select('id, resume_id, cover_letter_id').eq('job_id', args.jobId).maybeSingle()

  if (existing) {
    const patch: ApplicationPatch = {}
    if (args.resumeId) patch.resume_id = args.resumeId
    if (args.letterId) patch.cover_letter_id = args.letterId
    if (Object.keys(patch).length) await updateApplication(existing.id, patch)
    refreshApplications()
    return { id: existing.id, created: false }
  }

  // currículo: o informado, ou a versão adaptada para a vaga, ou o principal
  let resumeId = args.resumeId ?? null
  if (!resumeId) {
    const { data: adapted } = await supabase.from('resumes').select('id').eq('job_id', args.jobId).limit(1).maybeSingle()
    const { data: principal } = await supabase.from('resumes').select('id').eq('is_principal', true).maybeSingle()
    resumeId = adapted?.id ?? principal?.id ?? null
  }
  let letterId = args.letterId ?? null
  if (!letterId) {
    const { data: letter } = await supabase
      .from('cover_letters')
      .select('id')
      .eq('job_id', args.jobId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    letterId = letter?.id ?? null
  }

  const { data, error } = await supabase
    .from('applications')
    .insert({
      job_id: job.id,
      company: job.company || 'Empresa',
      role: job.title,
      url: job.url,
      status: 'preparacao' satisfies ApplicationStatus,
      resume_id: resumeId,
      cover_letter_id: letterId,
      position: -Math.floor(Date.now() / 1000), // no topo da coluna
    })
    .select('id')
    .single()
  if (error) throw error
  // a vaga vira "salva" (não aparece mais como nova)
  await supabase.from('jobs').update({ status: 'salva' }).eq('id', job.id).eq('status', 'nova')
  refreshApplications()
  queryClient.invalidateQueries({ queryKey: ['letter-jobs'] })
  return { id: data.id, created: true }
}
