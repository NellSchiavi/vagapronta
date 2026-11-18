import { saveBlob } from '@/components/pdf/pdf-kit'
import { supabase } from '@/lib/supabase'

/** "Baixar meus dados" (LGPD): tudo da pessoa num arquivo JSON */
export async function exportMyData(userId: string) {
  const tables = ['profiles', 'job_preferences', 'resumes', 'resume_analyses', 'jobs', 'cover_letters', 'applications', 'ai_usage'] as const
  const out: Record<string, unknown> = { gerado_em: new Date().toISOString(), aviso: 'Dados exportados do VagaPronta.' }
  for (const t of tables) {
    const { data, error } = await supabase.from(t).select('*')
    if (error) throw error
    out[t] = data
  }
  const files: Record<string, string[]> = {}
  for (const bucket of ['curriculos', 'avatares']) {
    const { data } = await supabase.storage.from(bucket).list(userId, { limit: 1000 })
    files[bucket] = (data ?? []).map((f) => `${userId}/${f.name}`)
  }
  out.arquivos = files
  const blob = new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' })
  const name = `vagapronta-meus-dados-${new Date().toISOString().slice(0, 10)}.json`
  saveBlob(blob, name)
}
