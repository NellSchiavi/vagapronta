/**
 * "Me candidatar": o app só abre o site original da vaga. A inscrição é sempre
 * feita pela pessoa, lá. Guardamos aqui qual vaga foi aberta para, quando a
 * pessoa voltar ao app, perguntar se ela se candidatou.
 * Fica no sessionStorage (sobrevive se o celular recarregar a aba), com uma
 * cópia em memória para quando o navegador bloqueia o armazenamento.
 */
export interface PendingApply {
  applicationId: string
  title: string
  company: string | null
  /** quando o site da vaga foi aberto (ms) */
  openedAt: number
}

const KEY = 'vp-candidatura-aberta'
/** avisado quando a candidatura termina de ser guardada (a pessoa pode já ter voltado) */
export const PENDING_EVENT = 'vp-candidatura-aberta'
/** tempo mínimo fora do app antes de perguntar (evita perguntar na mesma hora) */
export const MIN_AWAY_MS = 1500
/** depois disso a pergunta já não faz sentido */
const MAX_AGE_MS = 12 * 3600_000

let memory: PendingApply | null = null

export function setPendingApply(p: PendingApply) {
  memory = p
  try {
    sessionStorage.setItem(KEY, JSON.stringify(p))
  } catch {
    /* sem armazenamento: fica só em memória */
  }
}

export function getPendingApply(now = Date.now()): PendingApply | null {
  let p = memory
  try {
    const raw = sessionStorage.getItem(KEY)
    if (raw) p = JSON.parse(raw) as PendingApply
  } catch {
    /* usa a cópia em memória */
  }
  if (!p || now - p.openedAt > MAX_AGE_MS) return null
  return p
}

export function clearPendingApply() {
  memory = null
  try {
    sessionStorage.removeItem(KEY)
  } catch {
    /* nada a limpar */
  }
}

/** Já dá para perguntar? (a pessoa ficou fora do app tempo suficiente) */
export function shouldAsk(p: PendingApply | null, now = Date.now()): p is PendingApply {
  return Boolean(p) && now - p!.openedAt >= MIN_AWAY_MS
}
