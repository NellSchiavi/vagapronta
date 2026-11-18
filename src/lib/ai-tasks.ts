/**
 * Tarefas de IA que continuam rodando mesmo se a pessoa sair da tela.
 *
 * - startAiTask() dispara a chamada e guarda o estado fora dos componentes.
 * - Ao terminar: se a pessoa está na tela da tarefa, a própria tela mostra o
 *   resultado; se está em outra, aparece um aviso "… ficou pronta" com "Ver".
 * - Depois de 90 s sem resposta, a tarefa fica "lenta": a tela oferece
 *   "Tentar de novo" (e, se a resposta chegar depois, ela ainda é usada).
 */
import { useSyncExternalStore } from 'react'
import { toast } from 'sonner'
import { AiError, showAiError } from '@/lib/ai'

export const SLOW_AFTER_MS = 90_000

export type AiTaskStatus = 'running' | 'slow' | 'done'

export interface AiTask<T = unknown, M = unknown> {
  key: string
  /** o que está acontecendo, ex.: "Analisando seu currículo" */
  label: string
  status: AiTaskStatus
  startedAt: number
  /** rota onde o resultado aparece (para o botão "Ver") */
  path: string
  result?: T
  /** dados extras que a tela precisa para mostrar o resultado */
  meta?: M
  retry: () => void
}

interface StartOptions<T, M> {
  key: string
  label: string
  path: string
  meta?: M
  run: () => Promise<T>
  /** chamado ao terminar; onPage = a pessoa está na tela da tarefa */
  onSuccess?: (result: T, ctx: { onPage: boolean }) => void
  /** texto do aviso quando ela está em outra tela, ex.: "Sua análise ficou pronta" */
  readyText: string
  /** apagar a tarefa logo ao terminar (quando a tela lê o resultado do banco) */
  clearOnSuccess?: boolean
  /** trata o erro na própria tela (ex.: no campo); devolva true para não mostrar o aviso padrão */
  onError?: (err: AiError, ctx: { onPage: boolean }) => boolean | void
}

const tasks = new Map<string, AiTask>()
const runIds = new Map<string, number>()
const listeners = new Set<() => void>()
let snapshot = new Map(tasks)

function emit() {
  snapshot = new Map(tasks)
  listeners.forEach((l) => l())
}

/** rota atual do HashRouter, sem a busca (?id=…) */
function currentPath() {
  return (window.location.hash.replace(/^#/, '') || '/').split('?')[0]
}

export function isOnPath(path: string) {
  return currentPath() === path.split('?')[0]
}

export function goTo(path: string) {
  window.location.hash = path
}

export function startAiTask<T, M = unknown>(opts: StartOptions<T, M>) {
  const runId = (runIds.get(opts.key) ?? 0) + 1
  runIds.set(opts.key, runId)
  const isCurrent = () => runIds.get(opts.key) === runId

  const task: AiTask<T, M> = {
    key: opts.key,
    label: opts.label,
    status: 'running',
    startedAt: Date.now(),
    path: opts.path,
    meta: opts.meta,
    retry: () => startAiTask(opts),
  }
  tasks.set(opts.key, task as AiTask)
  emit()

  const slowTimer = window.setTimeout(() => {
    const t = tasks.get(opts.key)
    if (isCurrent() && t?.status === 'running') {
      tasks.set(opts.key, { ...t, status: 'slow' })
      emit()
    }
  }, SLOW_AFTER_MS)

  opts
    .run()
    .then((result) => {
      if (!isCurrent()) return // uma nova tentativa já substituiu esta
      const onPage = isOnPath(opts.path)
      if (opts.clearOnSuccess) tasks.delete(opts.key)
      else tasks.set(opts.key, { ...(tasks.get(opts.key) as AiTask<T, M>), status: 'done', result })
      emit()
      opts.onSuccess?.(result, { onPage })
      if (!onPage) {
        toast.success(opts.readyText, {
          duration: 10_000,
          action: { label: 'Ver', onClick: () => goTo(opts.path) },
        })
      }
    })
    .catch((err) => {
      if (!isCurrent()) return
      tasks.delete(opts.key)
      emit()
      const e = err instanceof AiError ? err : new AiError('Algo não saiu como esperado. Tente de novo em instantes.', 'erro')
      const onPage = isOnPath(opts.path)
      const handled = onPage && opts.onError?.(e, { onPage }) === true
      if (!handled) showAiError(e)
    })
    .finally(() => window.clearTimeout(slowTimer))
}

export function clearAiTask(key: string) {
  runIds.set(key, (runIds.get(key) ?? 0) + 1) // ignora respostas atrasadas
  tasks.delete(key)
  emit()
}

function subscribe(l: () => void) {
  listeners.add(l)
  return () => listeners.delete(l)
}

export function useAiTask<T = unknown, M = unknown>(key: string | null): AiTask<T, M> | undefined {
  const all = useSyncExternalStore(subscribe, () => snapshot)
  return key ? (all.get(key) as AiTask<T, M> | undefined) : undefined
}

/** todas as tarefas: em andamento ou com resultado esperando a pessoa conferir */
export function useAllAiTasks() {
  const all = useSyncExternalStore(subscribe, () => snapshot)
  return [...all.values()]
}
