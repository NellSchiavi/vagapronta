import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { FilePlus2, RefreshCw } from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { LoadingCards } from '@/components/ui/skeleton'
import { friendlyDataError } from '@/lib/errors'
import { useResumes } from '@/lib/queries/resumes'
import type { Resume } from '@/lib/resume'
import { AnalysisPanel } from './AnalysisPanel'
import { OrganizePanel } from './OrganizePanel'
import { UploadResumeCard } from './UploadResumeCard'

export function ResumePage() {
  const { data: resumes, isLoading, error, refetch, isRefetching } = useResumes()
  const [params, setParams] = useSearchParams()
  const [uploading, setUploading] = useState(false)

  const selected = resumes?.find((r) => r.id === params.get('id')) ?? resumes?.[0]
  const hasResumes = Boolean(resumes?.length)

  return (
    <div>
      <PageHeader
        title="Seu currículo"
        description="Descubra a nota, veja o que melhorar e acompanhe a evolução."
        actions={
          hasResumes && !uploading ? (
            <Button variant="secondary" onClick={() => setUploading(true)}>
              <FilePlus2 aria-hidden /> Enviar nova versão
            </Button>
          ) : undefined
        }
      />

      {error ? (
        <Card role="alert" className="border-danger/30 bg-danger-soft">
          <p>{friendlyDataError(error, 'Não conseguimos carregar seu currículo.')}</p>
          <Button variant="secondary" className="mt-3" onClick={() => refetch()} loading={isRefetching}>
            <RefreshCw aria-hidden /> Tentar de novo
          </Button>
        </Card>
      ) : isLoading ? (
        <LoadingCards count={2} label="Carregando seu currículo…" />
      ) : !hasResumes || uploading ? (
        <UploadResumeCard
          isNewVersion={hasResumes}
          onCancel={hasResumes ? () => setUploading(false) : undefined}
          onDone={(id) => {
            setUploading(false)
            setParams({ id }, { replace: true })
          }}
        />
      ) : (
        <div className="space-y-6">
          {resumes!.length > 1 && (
            <VersionSelect resumes={resumes!} value={selected!.id} onChange={(id) => setParams({ id }, { replace: true })} />
          )}
          {selected!.content.sections ? <AnalysisPanel key={selected!.id} resume={selected!} /> : <OrganizePanel key={selected!.id} resume={selected!} />}
        </div>
      )}
    </div>
  )
}

function VersionSelect({ resumes, value, onChange }: { resumes: Resume[]; value: string; onChange: (id: string) => void }) {
  return (
    <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
      <label htmlFor="resume-version" className="text-sm font-medium">
        Versão do currículo
      </label>
      <select
        id="resume-version"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-touch w-full rounded-field border border-line-strong bg-card px-3 text-[15px] text-ink sm:w-auto sm:min-w-[320px]"
      >
        {resumes.map((r) => (
          <option key={r.id} value={r.id}>
            {r.title}
            {r.is_principal ? ' (principal)' : r.job_id ? ' (adaptado para vaga)' : ''}
          </option>
        ))}
      </select>
    </div>
  )
}
