import { buildLetterPdf, letterFileName } from '@/components/pdf/letter-pdf'
import { buildResumePdf, resumeFileName } from '@/components/pdf/resume-pdf'
import { saveBlob } from '@/components/pdf/pdf-kit'
import { hasGaps } from '@/lib/gaps'
import { countryInfo } from '@/lib/paises'
import type { ResumeContent, ResumeTemplate } from '@/lib/resume'
import { supabase } from '@/lib/supabase'

export interface Sender {
  name: string
  role?: string
  registry?: string
  contact: string[]
  place?: string
}

/** Baixa o PDF do currículo de uma versão (gera pelas seções; se não houver, usa o PDF original) */
export async function downloadResumeById(resumeId: string, sender: Sender, company?: string | null) {
  const { data: r, error } = await supabase.from('resumes').select('content, file_path, country, template').eq('id', resumeId).single()
  if (error) throw error
  const content = r.content as unknown as ResumeContent
  const fileName = resumeFileName(sender.name, company)
  if (content.sections) {
    const blob = await buildResumePdf({
      name: sender.name,
      role: sender.role,
      registry: sender.registry,
      contact: sender.contact,
      sections: content.sections,
      template: r.template as ResumeTemplate,
      footerNote: countryInfo(r.country).footer?.text,
    })
    saveBlob(blob, fileName)
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
