import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardTitle } from '@/components/ui/card'
import {
  emptyResumeInput,
  ResumeInput,
  sourceFromMode,
  validateResumeInput,
  type ResumeInputValue,
} from '@/components/resume/resume-input'
import { useAuth } from '@/lib/auth'
import { friendlyDataError } from '@/lib/errors'
import { useProfile } from '@/lib/profile'
import { createResume, useInvalidateResumes } from '@/lib/queries/resumes'

interface Props {
  /** já existe algum currículo (então é uma "nova versão") */
  isNewVersion: boolean
  onDone: (resumeId: string) => void
  onCancel?: () => void
}

export function UploadResumeCard({ isNewVersion, onDone, onCancel }: Props) {
  const { user } = useAuth()
  const { data: profile } = useProfile()
  const refresh = useInvalidateResumes()
  const [value, setValue] = useState<ResumeInputValue>(emptyResumeInput)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function save() {
    const problem = validateResumeInput(value)
    if (problem) return setError(problem)
    setSaving(true)
    try {
      const today = new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })
      const { id, fileSaved } = await createResume({
        userId: user!.id,
        text: value.text,
        file: value.file,
        source: sourceFromMode(value.mode),
        country: profile?.resume_country ?? 'BR',
        title: isNewVersion ? `Currículo de ${today}` : 'Currículo principal',
        principal: true,
      })
      if (!fileSaved) toast.warning('Guardamos o texto, mas não o arquivo PDF.')
      toast.success(isNewVersion ? 'Nova versão guardada e marcada como principal.' : 'Currículo guardado!')
      refresh(id)
      onDone(id)
    } catch (err) {
      toast.error(friendlyDataError(err, 'Não conseguimos guardar seu currículo.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="p-5 sm:p-8">
      <CardTitle className="text-[22px]">{isNewVersion ? 'Enviar uma nova versão' : 'Envie seu currículo para começar'}</CardTitle>
      <CardDescription className="mt-1.5 text-[15px]">
        {isNewVersion
          ? 'A versão atual continua guardada. A nova passa a ser a principal.'
          : 'Em poucos segundos você recebe uma nota de 0 a 100 e dicas do que melhorar.'}
      </CardDescription>
      <div className="mt-6">
        <ResumeInput
          value={value}
          onChange={(v) => {
            setValue(v)
            setError(null)
          }}
          error={error}
        />
      </div>
      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        {onCancel && (
          <Button variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
        )}
        <Button size="lg" onClick={save} loading={saving}>
          Guardar currículo
        </Button>
      </div>
    </Card>
  )
}
