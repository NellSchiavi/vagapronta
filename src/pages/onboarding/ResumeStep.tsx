import { useState } from 'react'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  emptyResumeInput,
  ResumeInput,
  sourceFromMode,
  validateResumeInput,
  type InputMode,
  type ResumeInputValue,
} from '@/components/resume/resume-input'
import type { CountryCode } from '@/lib/countries'
import { friendlyDataError } from '@/lib/errors'
import type { ResumeContent } from '@/lib/resume'
import { asJson, supabase } from '@/lib/supabase'

interface Props {
  userId: string
  greeting: string
  country: CountryCode
  resume: { mode: InputMode; text: string }
  resumeId: string | null
  onChange: (r: { mode: InputMode; text: string }) => void
  onSaved: (resumeId: string) => void
  onSkip: () => void
  onBack: () => void
}

export function ResumeStep({ userId, greeting, country, resume, resumeId, onChange, onSaved, onSkip, onBack }: Props) {
  // o arquivo em si não vai para o rascunho; só o modo e o texto
  const [value, setValue] = useState<ResumeInputValue>({
    ...emptyResumeInput,
    mode: resume.mode,
    text: resume.mode === 'texto' ? resume.text : '',
  })
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  function update(v: ResumeInputValue) {
    setValue(v)
    setError(null)
    onChange({ mode: v.mode, text: v.text })
  }

  async function save() {
    const problem = validateResumeInput(value)
    if (problem) {
      setError(problem)
      return
    }
    setSaving(true)
    try {
      let file_path: string | null = null
      if (value.file) {
        const path = `${userId}/${crypto.randomUUID()}.pdf`
        const { error: upErr } = await supabase.storage
          .from('curriculos')
          .upload(path, value.file, { contentType: 'application/pdf' })
        if (upErr) {
          // o texto já foi lido; segue sem o arquivo original
          toast.warning('Guardamos o texto, mas não o arquivo PDF.', { description: 'Você pode enviar o PDF de novo depois.' })
        } else {
          file_path = path
        }
      }

      const content: ResumeContent = { raw_text: value.text.trim(), sections: null }
      const row = {
        title: 'Currículo principal',
        content: asJson(content),
        source: sourceFromMode(value.mode),
        country,
        is_principal: true,
        ...(file_path ? { file_path } : {}),
      }

      const query = resumeId
        ? supabase.from('resumes').update(row).eq('id', resumeId).select('id').single()
        : supabase.from('resumes').insert(row).select('id').single()
      const { data, error: dbErr } = await query
      if (dbErr) throw dbErr

      toast.success('Currículo guardado!')
      onSaved(data.id as string)
    } catch (err) {
      toast.error(friendlyDataError(err, 'Não conseguimos guardar seu currículo.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="p-5 sm:p-8">
      <h1 id="onboarding-title" className="text-[28px] leading-tight sm:text-[32px]">
        {greeting ? `${greeting}, agora seu currículo` : 'Agora, seu currículo'}
      </h1>
      <p className="mt-2 text-muted">
        Com ele a gente calcula sua nota, sugere melhorias e encontra vagas parecidas com você. Escolha o jeito mais fácil:
      </p>

      <div className="mt-6">
        <ResumeInput value={value} onChange={update} error={error} />
      </div>

      {resumeId && !value.file && value.mode !== 'texto' && (
        <p className="mt-3 text-sm text-muted">Você já enviou um currículo. Pode continuar ou enviar outro para substituir.</p>
      )}

      <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button variant="ghost" onClick={onBack} className="text-muted">
          <ArrowLeft aria-hidden /> Voltar
        </Button>
        <div className="flex flex-col-reverse gap-3 sm:flex-row">
          <Button variant="ghost" onClick={resumeId ? () => onSaved(resumeId) : onSkip}>
            {resumeId ? 'Manter o que enviei' : 'Pular por enquanto'}
          </Button>
          <Button size="lg" onClick={save} loading={saving}>
            Guardar e continuar {!saving && <ArrowRight aria-hidden />}
          </Button>
        </div>
      </div>
    </Card>
  )
}
