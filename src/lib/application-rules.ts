import type { ApplicationStatus } from '@/components/brand/pills'

export const FOLLOW_UP_DAYS = 7

export function addDays(iso: string, days: number) {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d + days))
  return dt.toISOString().slice(0, 10)
}

interface AppLike {
  status: ApplicationStatus
  applied_on: string | null
  follow_up_on: string | null
}

export interface StatusChange {
  patch: { status: ApplicationStatus; applied_on?: string; follow_up_on?: string | null }
  /** um lembrete foi sugerido automaticamente (mostrar aviso com opção de mudar) */
  followUpSuggested: string | null
  /** o que celebrar ou acolher na tela */
  mood: 'oferta' | 'recusada' | null
}

/**
 * O que acontece ao mover uma candidatura de coluna:
 * - "Enviada": marca a data de envio (se não houver) e sugere retorno em 7 dias;
 * - "Oferta"/"Recusada": encerra o lembrete de retorno (não faz mais sentido).
 */
export function statusChange(app: AppLike, next: ApplicationStatus, today: string): StatusChange {
  const patch: StatusChange['patch'] = { status: next }
  let followUpSuggested: string | null = null

  if (next === 'enviada') {
    const sentOn = app.applied_on ?? today
    if (!app.applied_on) patch.applied_on = today
    if (!app.follow_up_on || app.follow_up_on < today) {
      followUpSuggested = addDays(sentOn > today ? sentOn : today, FOLLOW_UP_DAYS)
      patch.follow_up_on = followUpSuggested
    }
  }
  if (next === 'oferta' || next === 'recusada') patch.follow_up_on = null

  return { patch, followUpSuggested, mood: next === 'oferta' || next === 'recusada' ? next : null }
}

const ENCOURAGEMENTS = [
  'Faz parte do caminho. Cada “não” te deixa mais perto do “sim” certo.',
  'Não foi dessa vez, e tudo bem. Sua próxima candidatura já começa mais forte.',
  'Respira fundo: o que você aprendeu aqui vai pesar a seu favor na próxima.',
  'Um processo a menos, uma porta mais perto. Siga em frente, você está indo bem.',
]

export function encouragement(seed = Date.now()) {
  return ENCOURAGEMENTS[seed % ENCOURAGEMENTS.length]
}
