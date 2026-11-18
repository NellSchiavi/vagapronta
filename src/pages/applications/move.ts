import { toast } from 'sonner'
import { STATUS_META, type ApplicationStatus } from '@/components/brand/pills'
import { encouragement, statusChange } from '@/lib/application-rules'
import { celebrate } from '@/lib/celebrate'
import { shortDate, toISODate } from '@/lib/dates'
import { friendlyDataError } from '@/lib/errors'
import {
  patchApplicationsCache,
  refreshApplications,
  updateApplication,
  type ApplicationPatch,
  type ApplicationRow,
} from '@/lib/queries/applications'

/**
 * Move uma candidatura de coluna (pelo arrastar ou pelo menu "Mover para…").
 * `order` = nova ordem completa da coluna de destino (ids), quando veio do arrastar.
 */
export async function moveApplication(
  row: ApplicationRow,
  next: ApplicationStatus,
  opts: { order?: string[]; all: ApplicationRow[]; onEditFollowUp?: (id: string) => void },
) {
  const changingColumn = row.status !== next
  const change = changingColumn ? statusChange(row, next, toISODate()) : null
  const patch: ApplicationPatch = { ...(change?.patch ?? {}) }

  // posições: ordem vinda do arrastar, ou no topo da coluna quando veio do menu
  const positions = new Map<string, number>()
  if (opts.order) {
    opts.order.forEach((id, i) => positions.set(id, i))
  } else if (changingColumn) {
    const top = Math.min(0, ...opts.all.filter((a) => a.status === next).map((a) => a.position))
    positions.set(row.id, top - 1)
  }

  patchApplicationsCache((rows) =>
    rows.map((r) => {
      const p = positions.get(r.id)
      if (r.id === row.id) return { ...r, ...patch, ...(p !== undefined ? { position: p } : {}) }
      return p !== undefined ? { ...r, position: p } : r
    }),
  )

  try {
    const own = positions.get(row.id)
    await updateApplication(row.id, { ...patch, ...(own !== undefined ? { position: own } : {}) })
    const others = [...positions].filter(([id, p]) => id !== row.id && opts.all.find((a) => a.id === id)?.position !== p)
    await Promise.all(others.map(([id, position]) => updateApplication(id, { position })))
  } catch (e) {
    toast.error(friendlyDataError(e, 'Não conseguimos mover a candidatura.'))
    refreshApplications()
    return
  }
  refreshApplications()
  if (!change) return

  if (change.mood === 'oferta') {
    celebrate()
    toast.success('Que notícia boa: oferta recebida!', { description: `${row.company} · Você merece. Leia com calma antes de responder.` })
  } else if (change.mood === 'recusada') {
    toast(encouragement(), { duration: 7000 })
  } else if (change.followUpSuggested) {
    toast.success(`Movida para ${STATUS_META[next].label}.`, {
      description: `Lembrete para dar um retorno em ${shortDate(change.followUpSuggested)}.`,
      action: opts.onEditFollowUp ? { label: 'Mudar data', onClick: () => opts.onEditFollowUp!(row.id) } : undefined,
    })
  } else {
    toast.success(`Movida para ${STATUS_META[next].label}.`)
  }
}
