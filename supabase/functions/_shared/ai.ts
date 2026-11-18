/**
 * Módulo de IA isolado. Para trocar de provedor, implemente AiProvider
 * e ajuste getAiProvider(). O resto do app só usa generateJson().
 *
 * Secrets:
 *   AI_PROVIDER     "gemini" (padrão) ou "mock" (respostas de exemplo, só para desenvolvimento)
 *   GEMINI_API_KEY  chave do Google AI Studio
 *   GEMINI_MODEL    modelo (padrão: gemini-2.5-flash)
 */
import type { z } from 'npm:zod@3.24.1'
import { HttpError } from './http.ts'

export interface GenerateJsonOptions<T> {
  /** nome curto da tarefa, para logs */
  task: string
  /** instruções de comportamento */
  system: string
  /** pedido com os dados */
  prompt: string
  /** a resposta é validada com este schema */
  schema: z.ZodType<T>
  temperature?: number
  /** resposta de exemplo usada quando AI_PROVIDER=mock */
  mock: () => unknown
}

export interface AiProvider {
  name: string
  /** devolve o texto JSON bruto gerado pelo modelo */
  completeJson(system: string, prompt: string, temperature: number): Promise<string>
}

// ---------------------------------------------------------------------------
// Gemini
// ---------------------------------------------------------------------------
class GeminiProvider implements AiProvider {
  name = 'gemini'
  constructor(
    private apiKey: string,
    private model: string,
  ) {}

  async completeJson(system: string, prompt: string, temperature: number) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent`
    let res: Response
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': this.apiKey },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { temperature, responseMimeType: 'application/json' },
        }),
        signal: AbortSignal.timeout(90_000),
      })
    } catch (err) {
      console.error('[gemini] falha de rede', err)
      throw new HttpError(503, 'Não conseguimos falar com a IA agora. Tente de novo em instantes.', 'ia_indisponivel')
    }

    if (res.status === 429) {
      throw new HttpError(503, 'A IA está muito ocupada agora. Espere um minuto e tente de novo.', 'ia_ocupada')
    }
    if (!res.ok) {
      console.error('[gemini] status', res.status, await res.text())
      throw new HttpError(503, 'A IA não respondeu como deveria. Tente de novo em instantes.', 'ia_indisponivel')
    }

    const data = await res.json()
    const text: string | undefined = data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? '').join('')
    if (!text) {
      console.error('[gemini] resposta vazia', JSON.stringify(data).slice(0, 500))
      throw new HttpError(502, 'A IA não conseguiu responder desta vez. Tente de novo.', 'ia_vazia')
    }
    return text
  }
}

// ---------------------------------------------------------------------------
// Mock (desenvolvimento sem chave)
// ---------------------------------------------------------------------------
class MockProvider implements AiProvider {
  name = 'mock'
  constructor(private mock: () => unknown) {}
  async completeJson() {
    await new Promise((r) => setTimeout(r, 1200)) // simula o tempo de resposta
    return JSON.stringify(this.mock())
  }
}

function getAiProvider(mock: () => unknown): AiProvider {
  const name = (Deno.env.get('AI_PROVIDER') ?? 'gemini').toLowerCase()
  if (name === 'mock') return new MockProvider(mock)
  const key = Deno.env.get('GEMINI_API_KEY')
  if (!key) {
    throw new HttpError(503, 'A IA ainda não foi configurada neste app. Avise o Nelson.', 'ia_sem_chave')
  }
  return new GeminiProvider(key, Deno.env.get('GEMINI_MODEL') ?? 'gemini-2.5-flash')
}

/** Remove cercas de código (```json) que alguns modelos colocam */
function stripFences(text: string) {
  return text.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim()
}

/**
 * Pede uma resposta em JSON e valida com zod.
 * Se a validação falhar, tenta mais uma vez avisando o modelo do problema.
 */
export async function generateJson<T>(opts: GenerateJsonOptions<T>): Promise<T> {
  const provider = getAiProvider(opts.mock)
  let prompt = opts.prompt
  let lastIssue = ''

  for (let attempt = 1; attempt <= 2; attempt++) {
    const raw = await provider.completeJson(opts.system, prompt, opts.temperature ?? 0.4)
    let parsed: unknown
    try {
      parsed = JSON.parse(stripFences(raw))
    } catch {
      lastIssue = 'A resposta não era um JSON válido.'
      prompt = `${opts.prompt}\n\nATENÇÃO: sua resposta anterior não era um JSON válido. Responda SOMENTE com o JSON pedido.`
      continue
    }
    const result = opts.schema.safeParse(parsed)
    if (result.success) return result.data
    lastIssue = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')
    prompt = `${opts.prompt}\n\nATENÇÃO: sua resposta anterior não seguiu o formato (${lastIssue}). Corrija e responda SOMENTE com o JSON pedido.`
  }

  console.error(`[ia:${opts.task}] resposta inválida após 2 tentativas:`, lastIssue)
  throw new HttpError(502, 'A IA respondeu de um jeito inesperado. Tente de novo.', 'ia_formato')
}
