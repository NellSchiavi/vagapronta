import { useState } from 'react'
import { AlertTriangle, Check, LayoutList, RotateCw } from 'lucide-react'
import { toast } from 'sonner'
import { AiProgress } from '@/components/ai/ai-progress'
import { LinkedInIcon } from '@/components/brand/linkedin-icon'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { friendlyDataError } from '@/lib/errors'
import type { Resume, ResumeSections } from '@/lib/resume'
import { useOrganizeResume, useSaveSections } from '@/lib/queries/resumes'
import { looksEmpty, ResumeSnapshot } from './ResumeSnapshot'

/**
 * Primeiro passo de um currículo novo: a IA separa o texto em seções.
 * Nada é guardado até a pessoa conferir e confirmar.
 */
export function OrganizePanel({ resume }: { resume: Resume }) {
  const organize = useOrganizeResume()
  const save = useSaveSections()
  const [preview, setPreview] = useState<ResumeSections | null>(null)

  function run() {
    setPreview(null)
    organize.mutate(resume.id, {
      onSuccess: setPreview,
      onError: (e) => toast.error(e.message),
    })
  }

  function confirm() {
    if (!preview) return
    save.mutate(
      { resume, sections: preview },
      {
        onSuccess: () =>
          toast.success('Currículo organizado!', {
            description: 'Agora você já pode descobrir a nota dele.',
            action: { label: 'Desfazer', onClick: () => save.mutate({ resume, sections: null }) },
          }),
        onError: (e) => toast.error(friendlyDataError(e, 'Não conseguimos guardar.')),
      },
    )
  }

  if (organize.isPending) {
    return (
      <AiProgress
        steps={['Lendo seu currículo…', 'Separando experiências e formação…', 'Encontrando suas habilidades…', 'Quase pronto…']}
      />
    )
  }

  if (preview) {
    const empty = looksEmpty(preview)
    return (
      <Card className="p-5 sm:p-8">
        <h2 className="text-[22px]">Confira se está tudo certo</h2>
        <p className="mt-1.5 text-muted">
          Foi assim que entendemos seu currículo. Se estiver certo, é só guardar. Ajustes finos poderão ser feitos no editor.
        </p>
        {empty && (
          <p role="alert" className="mt-4 flex items-start gap-2 rounded-card-sm bg-terra-soft p-3 text-sm">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-terra" aria-hidden />
            Não conseguimos identificar as partes do seu currículo. Tente de novo ou envie o texto colado.
          </p>
        )}
        <div className="mt-6 rounded-card-sm border border-line bg-bg p-4 sm:p-5">
          <ResumeSnapshot sections={preview} />
        </div>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={() => setPreview(null)}>
            Descartar
          </Button>
          <Button variant="secondary" onClick={run}>
            <RotateCw aria-hidden /> Tentar de novo
          </Button>
          <Button size="lg" onClick={confirm} loading={save.isPending} disabled={empty}>
            {!save.isPending && <Check aria-hidden />} Está certo, guardar
          </Button>
        </div>
      </Card>
    )
  }

  const fromLinkedIn = resume.source === 'linkedin'
  return (
    <Card className="flex flex-col items-start gap-4 p-5 sm:flex-row sm:items-center sm:gap-6 sm:p-8">
      <span className="inline-flex size-14 shrink-0 items-center justify-center rounded-full bg-terra-soft text-terra">
        {fromLinkedIn ? <LinkedInIcon className="size-6" /> : <LayoutList className="size-6" aria-hidden />}
      </span>
      <div className="flex-1">
        <h2 className="text-[22px]">Vamos organizar seu currículo</h2>
        <p className="mt-1.5 text-muted">
          {fromLinkedIn
            ? 'Vamos separar as experiências, a formação e as habilidades do PDF do seu LinkedIn. '
            : 'Vamos separar suas experiências, formação e habilidades. '}
          Você confere tudo antes de guardar.
        </p>
      </div>
      <Button size="lg" onClick={run} className="w-full sm:w-auto">
        Organizar meu currículo
      </Button>
    </Card>
  )
}
