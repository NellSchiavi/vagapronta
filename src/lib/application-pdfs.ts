import { buildLetterPdf, letterFileName } from '@/components/pdf/letter-pdf'
import { buildResumePdf, resumeFileName } from '@/components/pdf/resume-pdf'
import { saveBlob } from '@/components/pdf/pdf-kit'
import { hasGaps } from '@/lib/gaps'
import type { CountryCode } from '@/lib/paises'
import type { ResumeContent, ResumeTemplate } from '@/lib/resume'
import { loadAvatarDataUrl } from '@/lib/avatar-pdf'
import { effectiveFormat, resumePdfData, type ResumeOwner } from '@/lib/resume-format'
import type { ResumeLanguage } from '@/lib/resume-i18n'
import { supabase } from '@/lib/supabase'

export type Sender = ResumeOwner

/** Baixa o PDF do currículo de uma versão (gera pelas seções, no formato do país; se não houver, usa o PDF original) */
export async function downloadResumeById(resumeId: string, sender: Sender, company?: string | null) {
  const { data: r, error } = await supabase.from('resumes').select('content, file_path, country, language, template').eq('id', resumeId).single()
  if (error) throw error
  const resume = {
    content: r.content as unknown as ResumeContent,
    country: r.country as CountryCode,
    language: r.language as ResumeLanguage,
    template: r.template as ResumeTemplate,
  }
  const fileName = resumeFileName(sender.name, company, resume.language)
  if (resume.content.sections) {
    const photo = effectiveFormat(resume.country, resume.content.formato).photo ? await loadAvatarDataUrl(sender.avatar) : null
    saveBlob(await buildResumePdf(resumePdfData(resume, sender, { photo })), fileName)
    return
  }
  if (r.file_path) {
    const { data } = await supabase.storage.from('curriculos').download(r.file_path)
    if (data) return saveBlob(data, fileName)
  }
  throw new Error('Esse currículo ainda não tem conteúdo organizado para virar PDF.')
}

/** Baixa o PDF de uma carta; lacunas [X] precisam ser completadas antes */
export async function downloadLetterById(letterId: string, sender: Sender, company?: string | null) {
  const { data: l, error } = await supabase.from('cover_letters').select('content').eq('id', letterId).single()
  if (error) throw error
  if (hasGaps(l.content)) throw new Error('A carta ainda tem lacunas entre colchetes. Complete na tela Cartas antes de baixar.')
  const blob = await buildLetterPdf({
    ...sender,
    date: new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' }),
    recipient: company ? `Para: ${company}` : undefined,
    body: l.content,
  })
  saveBlob(blob, letterFileName(company, sender.name))
}
