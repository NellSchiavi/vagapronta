import { useMemo, useState } from 'react'
import { useIsDesktop } from '@/lib/use-is-desktop'
import { useSearchParams } from 'react-router-dom'
import { KanbanSquare, Plus, RefreshCw } from 'lucide-react'
import { EmptyState } from '@/components/brand/empty-state'
import { STATUS_ORDER, type ApplicationStatus } from '@/components/brand/pills'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { LoadingCards } from '@/components/ui/skeleton'
import { friendlyDataError } from '@/lib/errors'
import { useApplications, type ApplicationRow } from '@/lib/queries/applications'
import { ApplicationSheet, type DraftApplication } from './ApplicationSheet'
import { DesktopBoard, groupByStatus, MobileBoard } from './Board'
import { moveApplication } from './move'

export function ApplicationsPage() {
  const { data: rows, isLoading, error, refetch, isRefetching } = useApplications()
  const [params, setParams] = useSearchParams()
  const desktop = useIsDesktop()
  const openId = params.get('id')
  const creating = params.has('nova')
  const [focusFollowUp, setFocusFollowUp] = useState(false)
  const [tab, setTab] = useState<ApplicationStatus | null>(null)

  const openRow = useMemo(() => rows?.find((r) => r.id === openId) ?? null, [rows, openId])
  const columns = useMemo(() => groupByStatus(rows ?? []), [rows])
  // no celular, começa na primeira coluna que tem candidaturas (ou na do card aberto)
  const currentTab = tab ?? openRow?.status ?? STATUS_ORDER.find((s) => columns[s].length) ?? 'preparacao'

  // valores vindos de outra tela para uma nova candidatura (ex.: carta sem vaga salva)
  const initial: Partial<DraftApplication> = {
    company: params.get('empresa') ?? '',
    role: params.get('cargo') ?? '',
    cover_letter_id: params.get('carta') ?? '',
    resume_id: params.get('curriculo') ?? '',
  }

  const open = (row: ApplicationRow) => {
    setFocusFollowUp(false)
    setParams({ id: row.id })
  }
  const close = () => setParams({}, { replace: true })
  const move = (row: ApplicationRow, status: ApplicationStatus, order?: string[]) => {
    if (!desktop && status !== row.status) setTab(status)
    moveApplication(row, status, {
      order,
      all: rows ?? [],
      onEditFollowUp: (id) => {
        setFocusFollowUp(true)
        setParams({ id })
      },
    })
  }

  return (
    <div>
      <PageHeader
        title="Candidaturas"
        description="Acompanhe cada candidatura, da preparação até a oferta."
        actions={
          <Button onClick={() => setParams({ nova: '1' })}>
            <Plus aria-hidden /> Nova candidatura
          </Button>
        }
      />

      {error ? (
        <Card role="alert" className="border-danger/30 bg-danger-soft">
          <p>{friendlyDataError(error, 'Não conseguimos carregar suas candidaturas.')}</p>
          <Button variant="secondary" className="mt-3" onClick={() => refetch()} loading={isRefetching}>
            <RefreshCw aria-hidden /> Tentar de novo
          </Button>
        </Card>
      ) : isLoading ? (
        <LoadingCards count={3} label="Carregando suas candidaturas…" />
      ) : !rows?.length ? (
        <EmptyState
          icon={KanbanSquare}
          title="Nenhuma candidatura ainda"
          description="Quando você salvar uma versão adaptada ou uma carta, dá para mandar direto para cá. Ou adicione uma candidatura à mão."
          action={
            <Button onClick={() => setParams({ nova: '1' })}>
              <Plus aria-hidden /> Nova candidatura
            </Button>
          }
        />
      ) : desktop ? (
        <>
          <p className="mb-3 text-sm text-muted">Arraste os cards entre as colunas, ou use “Mover para…” em cada card.</p>
          <DesktopBoard rows={rows} onOpen={open} onMove={move} />
        </>
      ) : (
        <MobileBoard rows={rows} onOpen={open} onMove={move} tab={currentTab} onTab={setTab} />
      )}

      <ApplicationSheet
        open={Boolean(openRow) || creating}
        onOpenChange={(o) => !o && close()}
        row={creating ? null : openRow}
        initial={creating ? initial : undefined}
        focusFollowUp={focusFollowUp}
      />
    </div>
  )
}
