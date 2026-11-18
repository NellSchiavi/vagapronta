import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/auth'
import { invokeAi } from '@/lib/ai'
import type { CountryCode } from '@/lib/countries'
import type { Resume, ResumeContent, ResumeSections, ResumeSource } from '@/lib/resume'
import { asJson, supabase } from '@/lib/supabase'
import type { AnalysisSuggestion, ResumeAnalysis } from '@/lib/types'

const RESUME_FIELDS = 'id, user_id, title, template, country, content, source, file_path, is_principal, job_id, created_at, updated_at'

export function useResumes() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['resumes', user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('resumes')
        .select(RESUME_FIELDS)
        .order('is_principal', { ascending: false })
        .order('updated_at', { ascending: false })
      if (error) throw error
      return data as unknown as Resume[]
    },
  })
}

export function useAnalyses(resumeId: string | undefined) {
  return useQuery({
    queryKey: ['analyses', resumeId],
    enabled: Boolean(resumeId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('resume_analyses')
        .select('*')
        .eq('resume_id', resumeId!)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as unknown as ResumeAnalysis[]
    },
  })
}

/** Atualiza o cache de currículos e a tela Início depois de uma mudança */
function useRefresh() {
  const qc = useQueryClient()
  const { user } = useAuth()
  return (resumeId?: string) => {
    qc.invalidateQueries({ queryKey: ['resumes', user?.id] })
    qc.invalidateQueries({ queryKey: ['home', user?.id] })
    if (resumeId) qc.invalidateQueries({ queryKey: ['analyses', resumeId] })
  }
}

export async function updateResumeContent(resumeId: string, content: ResumeContent) {
  const { error } = await supabase.from('resumes').update({ content: asJson(content) }).eq('id', resumeId)
  if (error) throw error
}

/** Grava as seções no currículo (mantendo o texto original) */
export function useSaveSections() {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: async ({ resume, sections }: { resume: Resume; sections: ResumeSections | null }) => {
      await updateResumeContent(resume.id, { ...resume.content, sections })
      return resume.id
    },
    onSuccess: (id) => refresh(id),
  })
}

export function useOrganizeResume() {
  return useMutation({
    mutationFn: (resumeId: string) =>
      invokeAi<{ sections: ResumeSections }>('organizar-curriculo', { resume_id: resumeId }).then((r) => r.sections),
  })
}

export function useAnalyzeResume() {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: (resumeId: string) =>
      invokeAi<{ analysis: ResumeAnalysis }>('analisar-curriculo', { resume_id: resumeId }).then((r) => r.analysis),
    onSuccess: (a) => refresh(a.resume_id),
  })
}

export function useDeleteAnalysis() {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: async (a: ResumeAnalysis) => {
      const { error } = await supabase.from('resume_analyses').delete().eq('id', a.id)
      if (error) throw error
      return a.resume_id
    },
    onSuccess: (id) => refresh(id),
  })
}

/** Marca/desmarca uma sugestão como aplicada e grava o novo conteúdo do currículo */
export function useSetSuggestionApplied() {
  const refresh = useRefresh()
  const qc = useQueryClient()
  const { user } = useAuth()
  return useMutation({
    // atualiza a tela na hora, para a próxima sugestão já partir do conteúdo novo
    onMutate: (args) => {
      qc.setQueryData<Resume[]>(['resumes', user?.id], (old) =>
        old?.map((r) => (r.id === args.resume.id ? { ...r, content: args.content } : r)),
      )
      qc.setQueryData<ResumeAnalysis[]>(['analyses', args.resume.id], (old) =>
        old?.map((a) =>
          a.id === args.analysis.id
            ? { ...a, suggestions: a.suggestions.map((s, i) => (i === args.index ? { ...s, aplicada: args.applied } : s)) }
            : a,
        ),
      )
    },
    onError: (_e, args) => refresh(args.resume.id),
    mutationFn: async (args: { analysis: ResumeAnalysis; index: number; applied: boolean; resume: Resume; content: ResumeContent }) => {
      // parte do estado mais recente das sugestões (cache), não de uma cópia antiga
      const current =
        qc.getQueryData<ResumeAnalysis[]>(['analyses', args.resume.id])?.find((a) => a.id === args.analysis.id) ?? args.analysis
      const suggestions: AnalysisSuggestion[] = current.suggestions.map((s, i) =>
        i === args.index ? { ...s, aplicada: args.applied } : s,
      )
      await updateResumeContent(args.resume.id, args.content)
      const { error } = await supabase
        .from('resume_analyses')
        .update({ suggestions: asJson(suggestions) })
        .eq('id', args.analysis.id)
      if (error) throw error
      return args.resume.id
    },
    onSuccess: (id) => refresh(id),
  })
}

/** Cria um currículo a partir de um PDF ou texto (onboarding e "Enviar nova versão") */
export async function createResume(opts: {
  userId: string
  text: string
  file: File | null
  source: ResumeSource
  country: CountryCode
  title?: string
  principal?: boolean
  existingId?: string | null
}): Promise<{ id: string; fileSaved: boolean }> {
  let file_path: string | null = null
  if (opts.file) {
    const path = `${opts.userId}/${crypto.randomUUID()}.pdf`
    const { error } = await supabase.storage.from('curriculos').upload(path, opts.file, { contentType: 'application/pdf' })
    if (!error) file_path = path
  }
  const content: ResumeContent = { raw_text: opts.text.trim(), sections: null }
  const row = {
    title: opts.title ?? 'Currículo principal',
    content: asJson(content),
    source: opts.source,
    country: opts.country,
    is_principal: opts.principal ?? true,
    ...(file_path ? { file_path } : {}),
  }
  const query = opts.existingId
    ? supabase.from('resumes').update(row).eq('id', opts.existingId).select('id').single()
    : supabase.from('resumes').insert(row).select('id').single()
  const { data, error } = await query
  if (error) throw error
  return { id: data.id, fileSaved: Boolean(file_path) || !opts.file }
}

export function useInvalidateResumes() {
  return useRefresh()
}
