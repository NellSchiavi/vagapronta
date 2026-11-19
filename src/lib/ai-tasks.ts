/**
 * Tarefas de IA que continuam rodando mesmo se a pessoa sair da tela.
 *
 * - startAiTask() dispara a chamada e guarda o estado fora dos componentes.
 * - Ao terminar: se a pessoa está na tela da tarefa, a própria tela mostra o
 *   resultado; se está em outra, aparece um aviso "… ficou pronta" com "Ver".
 * - Depois de 90 s sem resposta, a tarefa fica "lenta": a tela oferece
 *   "Tentar de novo" (e, se a resposta chegar depois, ela ainda é usada).
 * - Limite POR MINUTO da IA: a tarefa fica "aguardando" e tenta de novo
 *   sozinha (até 2 vezes), sem a pessoa fazer nada.
 * - Se falhar de vez, o erro fica guardado (useAiTaskError) para a tela mostrar
 *   junto do formulário, com "Tentar de novo", sem recarregar a página.
 */
import { useSyncExternalStore } from 'react'
import { toast } from 'sonner'
import { AiError, showAiError } from '@/lib/ai'
import { queryClient } from '@/lib/query-client'

export const SLOW_AFTER_MS = 90_000
/** novas tentativas automáticas quando a IA está no limite por minuto */
export const AUTO_RETRIES = 2

export type AiTaskStatus = 'running' | 'slow' | 'waiting' | 'done'

export interface AiTask<T = unknown, M = unknown> {
  key: string
  /** o que está acontecendo, ex.: "Analisando seu currículo" */
  label: string
  status: AiTaskStatus
  startedAt: number
  /** status "waiting": quando a próxima tentativa automática acontece */
  retryAt?: number
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
  /**
   * trata o erro na própria tela (ex.: no campo); devolva true para não mostrar o aviso padrão.
   * Com keepError, o erro também fica em useAiTaskError(key) para a tela mostrar depois.
   */
  onError?: (err: AiError, ctx: { onPage: boolean }) => boolean | void
  keepError?: boolean
}

const tasks = new Map<string, AiTask>()
const errors = new Map<string, AiError>()
const runIds = new Map<string, number>()
const listeners = new Set<() => void>()
let snapshot = new Map(tasks)
let errorSnapshot = new Map(errors)

function emit() {
  snapshot = new Map(tasks)
  errorSnapshot = new Map(errors)
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

export function startAiTask<T, M = unknown>(opts: StartOptions<T, M>, autoAttempt = 0) {
  const runId = (runIds.get(opts.key) ?? 0) + 1
  runIds.set(opts.key, runId)
  const isCurrent = () => runIds.get(opts.key) === runId
  errors.delete(opts.key)

  const task: AiTask<T, M> = {
    key: opts.key,
    label: opts.label,
    status: 'running',
    // nas tentativas automáticas, o progresso continua de onde estava
    startedAt: autoAttempt ? (tasks.get(opts.key)?.startedAt ?? Date.now()) : Date.now(),
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
      const e = err instanceof AiError ? err : new AiError('Algo não saiu como esperado. Tente de novo em instantes.', 'erro')

      // limite por minuto: espera o tempo sugerido e tenta de novo sozinha
      if (e.code === 'ia_limite_minuto' && autoAttempt < AUTO_RETRIES) {
        const waitMs = Math.min(60, Math.max(10, e.retryAfter ?? 20)) * 1000
        tasks.set(opts.key, { ...(tasks.get(opts.key) as AiTask), status: 'waiting', retryAt: Date.now() + waitMs })
        emit()
        if (!isOnPath(opts.path)) toast.info(e.message, { duration: 6000 })
        window.setTimeout(() => {
          if (isCurrent()) startAiTask(opts, autoAttempt + 1)
        }, waitMs)
        return
      }

      // as tentativas automáticas acabaram: a pessoa decide quando tentar de novo
      const final = e.code === 'ia_limite_minuto' ? new AiError('Muita gente usando a IA agora. Tente de novo em um minuto.', e.code) : e
      tasks.delete(opts.key)
      if (opts.keepError) errors.set(opts.key, final)
      emit()
      const onPage = isOnPath(opts.path)
      const handled = onPage && opts.onError?.(final, { onPage }) === true
      if (!handled) showAiError(final)
    })
    .finally(() => {
      window.clearTimeout(slowTimer)
      // a cota do dia mudou (ou foi devolvida, se a chamada falhou)
      queryClient.invalidateQueries({ queryKey: ['ai-usage'] })
    })
}

/** Atualiza o resultado guardado (ex.: a pessoa editou a carta antes de salvar) */
export function updateAiTaskResult<T>(key: string, update: (prev: T) => T) {
  const t = tasks.get(key) as AiTask<T> | undefined
  if (!t || t.status !== 'done' || t.result === undefined) return
  tasks.set(key, { ...t, result: update(t.result) } as AiTask)
  emit()
}

export function clearAiTask(key: string) {
  runIds.set(key, (runIds.get(key) ?? 0) + 1) // ignora respostas atrasadas e tentativas agendadas
  tasks.delete(key)
  errors.delete(key)
  emit()
}

/** A pessoa mexeu no formulário: o erro anterior deixa de valer */
export function clearAiTaskError(key: string) {
  if (!errors.has(key)) return
  errors.delete(key)
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

/** Último erro da tarefa (quando iniciada com keepError) */
export function useAiTaskError(key: string): AiError | undefined {
  const all = useSyncExternalStore(subscribe, () => errorSnapshot)
  return all.get(key)
}

/** todas as tarefas: em andamento ou com resultado esperando a pessoa conferir */
export function useAllAiTasks() {
  const all = useSyncExternalStore(subscribe, () => snapshot)
  return [...all.values()]
}
