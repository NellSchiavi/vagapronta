import { FunctionsFetchError, FunctionsHttpError, FunctionsRelayError } from '@supabase/supabase-js'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'

/** Mostra o erro de uma ação de IA: limites viram um aviso calmo, não um erro vermelho */
export function showAiError(err: unknown) {
  const e = err instanceof AiError ? err : new AiError('Algo não saiu como esperado. Tente de novo em instantes.', 'erro')
  if (e.code === 'limite_diario' || e.code.startsWith('ia_limite')) {
    toast.info(e.message, { duration: 8000 })
  } else {
    toast.error(e.message)
  }
}

/** Erro de uma ação de IA, com mensagem pronta para mostrar na tela */
export class AiError extends Error {
  constructor(
    message: string,
    public code: string,
  ) {
    super(message)
  }
}

/**
 * Chama uma Edge Function de IA com o login do usuário.
 * As funções devolvem { error, code } com mensagens amigáveis quando algo falha.
 */
export async function invokeAi<T>(name: string, body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke(name, { body })
  if (!error) return data as T

  if (error instanceof FunctionsHttpError) {
    try {
      const payload = (await error.context.json()) as { error?: string; code?: string; msg?: string }
      if (payload?.error) throw new AiError(payload.error, payload.code ?? 'erro')
      if (error.context.status === 401) throw new AiError('Sua sessão expirou. Entre de novo para continuar.', 'sessao')
    } catch (e) {
      if (e instanceof AiError) throw e
    }
  }
  if (error instanceof FunctionsFetchError || error instanceof FunctionsRelayError) {
    throw new AiError('Sem conexão com o servidor. Confira sua internet e tente de novo.', 'rede')
  }
  throw new AiError('Algo não saiu como esperado. Tente de novo em instantes.', 'erro')
}
