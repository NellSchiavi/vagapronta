// Utilitários HTTP comuns às Edge Functions

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

/** Erro com mensagem amigável (em português) que vai direto para a tela */
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public code = 'erro',
  ) {
    super(message)
  }
}

export function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' },
  })
}

/**
 * Envolve o handler: responde ao preflight CORS, aceita só POST com JSON
 * e transforma qualquer erro numa resposta { error, code } amigável.
 */
export function handle(fn: (req: Request, body: Record<string, unknown>) => Promise<Response>) {
  return async (req: Request) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
    if (req.method !== 'POST') return json({ error: 'Use POST.', code: 'metodo' }, 405)
    try {
      let body: Record<string, unknown> = {}
      try {
        body = (await req.json()) ?? {}
      } catch {
        throw new HttpError(400, 'Pedido inválido. Atualize a página e tente de novo.', 'corpo')
      }
      return await fn(req, body)
    } catch (err) {
      if (err instanceof HttpError) return json({ error: err.message, code: err.code }, err.status)
      console.error('[erro inesperado]', err)
      return json({ error: 'Algo não saiu como esperado. Tente de novo em instantes.', code: 'interno' }, 500)
    }
  }
}
