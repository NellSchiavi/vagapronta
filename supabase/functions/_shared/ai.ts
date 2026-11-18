/**
 * Módulo de IA isolado. Para trocar de provedor, implemente AiProvider
 * e ajuste getAiProvider(). O resto do app só usa generateJson().
 *
 * Secrets:
 *   AI_PROVIDER        "gemini" (padrão) ou "mock" (respostas de exemplo, só para desenvolvimento)
 *   GEMINI_API_KEY     chave do Google AI Studio
 *   GEMINI_MODEL       modelos (em ordem, separados por vírgula) das tarefas que pedem mais
 *                      cuidado — análise, adaptação, cartas
 *   GEMINI_MODEL_LITE  modelos das tarefas simples — organizar seções
 *   Padrões em DEFAULT_MODELS. Se um modelo estiver sobrecarregado ou sumir, usa o próximo.
 *
 * Privacidade: quem chama deve passar o texto por redactPersonalData() (privacy.ts)
 * antes de montar o prompt.
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
  /** "lite" para tarefas simples (economiza cota); "standard" para o resto */
  tier?: 'lite' | 'standard'
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
/**
 * Modelos padrão (podem ser trocados pelos secrets, em ordem de preferência).
 * Os da versão 2.5 deixaram de ser oferecidos a chaves novas em 2026.
 */
const DEFAULT_MODELS = {
  standard: 'gemini-flash-latest,gemini-3-flash-preview',
  lite: 'gemini-3.5-flash-lite,gemini-flash-lite-latest',
}

/** códigos em que vale tentar o modelo reserva */
const FALLBACK_CODES = new Set(['ia_indisponivel', 'ia_sobrecarregada', 'ia_modelo'])

class GeminiProvider implements AiProvider {
  name = 'gemini'
  /** models[0] é o principal; os demais são reservas */
  constructor(
    private apiKey: string,
    private models: string[],
  ) {}

  async completeJson(system: string, prompt: string, temperature: number) {
    // prazo total: as Edge Functions têm limite de tempo por chamada
    const deadline = Date.now() + 100_000
    let last: HttpError | undefined
    for (const model of this.models) {
      if (Date.now() > deadline - 5_000) break
      try {
        return await this.callModel(model, system, prompt, temperature, deadline)
      } catch (err) {
        if (err instanceof HttpError && FALLBACK_CODES.has(err.code)) {
          console.warn(`[gemini] ${model} indisponível (${err.code}); tentando o próximo modelo`)
          last = err
          continue
        }
        throw err
      }
    }
    throw last ?? new HttpError(503, 'Não conseguimos falar com a IA agora. Tente de novo em instantes.', 'ia_indisponivel')
  }

  private async callModel(model: string, system: string, prompt: string, temperature: number, deadline: number): Promise<string> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`
    const body = JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature, responseMimeType: 'application/json' },
    })

    // falhas passageiras (rede/DNS, ou o Google com "alta demanda" 500/503): tenta até 2 vezes por modelo
    const ATTEMPTS = 2
    let res: Response | undefined
    for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
      const remaining = deadline - Date.now()
      if (remaining < 5_000) {
        throw new HttpError(503, 'A IA está muito procurada agora. Tente de novo em alguns minutos.', 'ia_sobrecarregada')
      }
      try {
        res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': this.apiKey },
          body,
          signal: AbortSignal.timeout(Math.min(60_000, remaining)),
        })
        if (res.status !== 500 && res.status !== 503) break
        console.warn(`[gemini] ${model} respondeu ${res.status} (tentativa ${attempt}/${ATTEMPTS})`)
        if (attempt === ATTEMPTS) {
          throw new HttpError(503, 'A IA está muito procurada agora. Tente de novo em alguns minutos.', 'ia_sobrecarregada')
        }
      } catch (err) {
        if (err instanceof HttpError) throw err
        console.warn(`[gemini] ${model} falha de rede ou demora (tentativa ${attempt}/${ATTEMPTS})`, String(err).slice(0, 160))
        if (attempt === ATTEMPTS) {
          throw new HttpError(503, 'Não conseguimos falar com a IA agora. Tente de novo em instantes.', 'ia_indisponivel')
        }
      }
      await new Promise((r) => setTimeout(r, 2000 * attempt))
    }
    if (!res) throw new HttpError(503, 'Não conseguimos falar com a IA agora. Tente de novo em instantes.', 'ia_indisponivel')

    if (res.status === 429) {
      // o nível gratuito tem limite por minuto e por dia; a resposta diz qual estourou
      const detail = await res.text()
      console.warn('[gemini] limite atingido', model, detail.slice(0, 300))
      if (/per.?day|PerDay|daily/i.test(detail)) {
        throw new HttpError(429, 'A IA descansou por hoje. Tente de novo amanhã!', 'ia_limite_dia')
      }
      throw new HttpError(429, 'A IA recebeu muitos pedidos de uma vez. Espere um minuto e tente de novo.', 'ia_limite_minuto')
    }
    if (res.status === 404) {
      console.error('[gemini] modelo não encontrado', model, (await res.text()).slice(0, 300))
      throw new HttpError(503, 'A IA não respondeu como deveria. Tente de novo em instantes.', 'ia_modelo')
    }
    if (!res.ok) {
      console.error('[gemini] status', res.status, (await res.text()).slice(0, 500))
      throw new HttpError(502, 'A IA não respondeu como deveria. Tente de novo em instantes.', 'ia_erro')
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

function getAiProvider(mock: () => unknown, tier: 'lite' | 'standard'): AiProvider {
  const name = (Deno.env.get('AI_PROVIDER') ?? 'gemini').toLowerCase()
  if (name === 'mock') return new MockProvider(mock)
  const key = Deno.env.get('GEMINI_API_KEY')
  if (!key) {
    throw new HttpError(503, 'A IA ainda não foi configurada neste app. Avise o Nelson.', 'ia_sem_chave')
  }
  // apelidos "-latest": o Google mantém apontando para o flash atual,
  // evitando que o app quebre quando uma versão é descontinuada
  // cada variável aceita uma lista em ordem de preferência, separada por vírgulas
  const list = (v: string | undefined, fallback: string) =>
    (v || fallback).split(',').map((s) => s.trim()).filter(Boolean)
  const standard = list(Deno.env.get('GEMINI_MODEL'), DEFAULT_MODELS.standard)
  const lite = list(Deno.env.get('GEMINI_MODEL_LITE'), DEFAULT_MODELS.lite)
  // a lista da outra categoria entra no fim como reserva final
  const chain = tier === 'lite' ? [...lite, ...standard] : [...standard, ...lite]
  return new GeminiProvider(key, [...new Set(chain)])
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
  const provider = getAiProvider(opts.mock, opts.tier ?? 'standard')
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
