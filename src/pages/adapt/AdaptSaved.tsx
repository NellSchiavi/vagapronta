import { Link } from 'react-router-dom'
import { CheckCircle2, FileText, PenLine, RotateCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import type { SavedAdaptation } from '@/lib/queries/adapt'
import { AddToApplicationsButton } from '@/pages/applications/AddToApplicationsButton'

export function AdaptSaved({ saved, onAnother }: { saved: SavedAdaptation; onAnother: () => void }) {
  return (
    <Card className="border-success/30 bg-success-soft/50 p-6 sm:p-8">
      <div className="flex items-center gap-3">
        <CheckCircle2 className="size-8 text-success" aria-hidden />
        <h2 className="text-[24px]">Nova versão salva!</h2>
      </div>
      <p className="mt-2 text-[15px]">
        <strong className="font-medium">{saved.title}</strong> agora está entre as versões do seu currículo. A vaga também ficou guardada.
      </p>
      {saved.skipped > 0 && (
        <p className="mt-2 text-sm text-muted">
          {saved.skipped} mudança(s) não entraram porque o trecho original do currículo tinha mudado.
        </p>
      )}
      <p className="mt-4 text-sm font-medium">E agora?</p>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <AddToApplicationsButton jobId={saved.jobId} resumeId={saved.resumeId} />
        <Button asChild variant="secondary">
          <Link to={`/cartas?vaga=${saved.jobId}`}>
            <PenLine className="text-terra" aria-hidden /> Criar carta para esta vaga
          </Link>
        </Button>
        <Button asChild variant="secondary">
          <Link to={`/curriculo?id=${saved.resumeId}`}>
            <FileText className="text-terra" aria-hidden /> Ver a nova versão
          </Link>
        </Button>
        <Button variant="ghost" onClick={onAnother}>
          <RotateCw aria-hidden /> Adaptar para outra vaga
        </Button>
      </div>
    </Card>
  )
}
