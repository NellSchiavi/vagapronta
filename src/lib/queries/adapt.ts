import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/auth'
import { invokeAi } from '@/lib/ai'
import { applySuggestion } from '@/lib/apply-suggestion'
import type { Resume, ResumeContent, ResumeSections } from '@/lib/resume'
import { asJson, supabase } from '@/lib/supabase'
import { keywordsAfter } from '@/lib/job-score'
import type { Adaptation, Job, MatchNotes } from '@/lib/types'

export function useJob(jobId: string | null) {
  return useQuery({
    queryKey: ['job', jobId],
    enabled: Boolean(jobId),
    queryFn: async () => {
      const { data, error } = await supabase.from('jobs').select('*').eq('id', jobId!).maybeSingle()
      if (error) throw error
      return data as unknown as Job | null
    },
  })
}

export function adaptResume(args: { resumeId: string; jobText?: string; jobUrl?: string; jobId?: string | null }) {
  return invokeAi<{ adaptation: Adaptation }>('adaptar-vaga', {
    resume_id: args.resumeId,
    job_text: args.jobText || undefined,
    job_url: args.jobUrl || undefined,
    job_id: args.jobId || undefined,
  }).then((r) => r.adaptation)
}

/** Palavras-chave da vaga considerando só as mudanças aceitas (e o texto final de cada uma) */
export function estimatedAfter(a: Adaptation, accepted: boolean[], edits?: string[]) {
  return keywordsAfter(a, accepted, edits)
}

/**
 * Aplica as mudanças aceitas, uma após a outra. `edits` traz o texto final de cada
 * mudança (com as lacunas completadas). Devolve as seções novas e quantas não couberam.
 */
export function applyAccepted(sections: ResumeSections, a: Adaptation, accepted: boolean[], edits?: string[]) {
  let current = sections
  let skipped = 0
  a.mudancas.forEach((m, i) => {
    if (!accepted[i]) return
    const r = applySuggestion(current, { ...m, depois: edits?.[i] ?? m.depois, explicacao: m.motivo, aplicada: false })
    if (r.ok) current = r.sections
    else skipped++
  })
  return { sections: current, skipped }
}

export interface SavedAdaptation {
  resumeId: string
  jobId: string
  createdJob: boolean
  /** como a vaga estava antes (para o Desfazer devolver igual) */
  previousJob: { compatibility: number | null; status: string; match_notes?: MatchNotes } | null
  skipped: number
  title: string
}

/** "Salvar nova versão": cria a versão do currículo ligada à vaga (e a vaga, se ainda não existir) */
export function useSaveAdaptation() {
  const qc = useQueryClient()
  const { user } = useAuth()
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['resumes', user?.id] })
    qc.invalidateQueries({ queryKey: ['home', user?.id] })
  }

  const save = useMutation({
    mutationFn: async ({
      base,
      adaptation,
      accepted,
      edits,
    }: {
      base: Resume
      adaptation: Adaptation
      accepted: boolean[]
      edits: string[]
    }): Promise<SavedAdaptation> => {
      const { sections, skipped } = applyAccepted(base.content.sections!, adaptation, accepted, edits)
      const after = estimatedAfter(adaptation, accepted, edits)
      const v = adaptation.vaga
      // a nota da vaga é a ADERÊNCIA (currículo original): as mudanças aceitas não a aumentam
      const ad = adaptation.aderencia
      const notes: MatchNotes = {
        palavras: after,
        ...(ad ? { aderencia: { ...ad, requisitos: ad.requisitos.slice(0, 12) } } : {}),
      }
      const compatibility = ad ? ad.nota : after

      let jobId = adaptation.job_id
      let createdJob = false
      let previousJob: SavedAdaptation['previousJob'] = null
      if (jobId) {
        const { data: prev } = await supabase.from('jobs').select('compatibility, status, match_notes').eq('id', jobId).maybeSingle()
        previousJob = prev ? { compatibility: prev.compatibility, status: prev.status, match_notes: prev.match_notes as MatchNotes } : null
        const { error } = await supabase
          .from('jobs')
          .update({ compatibility, status: 'salva', match_notes: asJson({ ...((prev?.match_notes as MatchNotes) ?? {}), ...notes }) })
          .eq('id', jobId)
        if (error) throw error
      } else {
        const { data, error } = await supabase
          .from('jobs')
          .insert({
            source: 'manual',
            title: v.titulo,
            company: v.empresa ?? null,
            location: v.local ?? null,
            work_mode: v.modalidade ?? null,
            url: adaptation.vaga_url,
            description: adaptation.vaga_texto.slice(0, 20000),
            compatibility,
            match_notes: asJson(notes),
            status: 'salva',
          })
          .select('id')
          .single()
        if (error) throw error
        jobId = data.id
        createdJob = true
      }

      const title = [v.titulo, v.empresa].filter(Boolean).join(' — ')
      // a adaptação herda o formato do país da versão de origem (idioma, foto, dados pessoais)
      const { formato, titulo, registro_nota } = base.content
      const content: ResumeContent = { raw_text: '', sections, formato, titulo, registro_nota }
      const { data: resume, error } = await supabase
        .from('resumes')
        .insert({
          title,
          template: base.template,
          country: base.country,
          language: base.language ?? 'pt-BR',
          source: 'adaptacao',
          is_principal: false,
          job_id: jobId,
          content: asJson(content),
        })
        .select('id')
        .single()
      if (error) {
        if (createdJob) await supabase.from('jobs').delete().eq('id', jobId!)
        else if (previousJob) await supabase.from('jobs').update(restoreJob(previousJob)).eq('id', jobId!)
        throw error
      }
      return { resumeId: resume.id, jobId: jobId!, createdJob, previousJob, skipped, title }
    },
    onSuccess: refresh,
  })

  const undo = useMutation({
    mutationFn: async (s: SavedAdaptation) => {
      const { error } = await supabase.from('resumes').delete().eq('id', s.resumeId)
      if (error) throw error
      if (s.createdJob) await supabase.from('jobs').delete().eq('id', s.jobId)
      else if (s.previousJob) await supabase.from('jobs').update(restoreJob(s.previousJob)).eq('id', s.jobId)
    },
    onSuccess: refresh,
  })

  return { save, undo }
}

/** Como a vaga estava antes de salvar a adaptação (para o Desfazer) */
function restoreJob(p: NonNullable<SavedAdaptation['previousJob']>) {
  return { compatibility: p.compatibility, status: p.status, ...(p.match_notes ? { match_notes: asJson(p.match_notes) } : {}) }
}
