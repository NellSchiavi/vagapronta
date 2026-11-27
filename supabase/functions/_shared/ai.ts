/**
 * Módulo de IA isolado. Para trocar de provedor, implemente AiProvider
 * e ajuste getAiProvider(). O resto do app só usa generateJson().
 *
 * Secrets:
 *   AI_PROVIDER        "gemini" (padrão) ou "mock" (respostas de exemplo, só para desenvolvimento)
 *   GEMINI_API_KEY     chave do Google AI Studio (a mesma para todos os modelos abaixo)
 *   GEMINI_MODEL       modelos (em ordem, separados por vírgula) das tarefas que pedem mais
 *                      cuidado — análise, adaptação, cartas
 *   GEMINI_MODEL_LITE  modelos das tarefas simples — organizar seções
 *   GEMMA_MODELS       modelos Gemma, a última reserva (gratuitos na mesma chave)
 *   Padrões em DEFAULT_MODELS.
 *
 * Sobrecarga do Google (503): tenta de novo com espera crescente e, se o modelo
 * continuar sobrecarregado, passa para o próximo da lista (flash → flash-lite → Gemma),
 * sempre dentro do tempo total da função. Quem chama devolve a cota quando tudo falha
 * (quota.guard) e, no Adaptar e na Análise, usa o modo reserva sem IA (basico.ts).
 *
 * Testes: AI_TEST_EMAIL + AI_TEST_FAIL ("*" ou lista de modelos) simulam o 503 sem
 * chamar o Google, só para a conta de teste. Fora do teste, os dois ficam sem valor.
 *
 * Privacidade: quem chama deve passar o texto por redactPersonalData() (privacy.ts)
 * antes de montar o prompt.
 */
import type { z } from 'npm:zod@3.24.1'
import { classify429, MSG_LIMITE_DIA, MSG_LIMITE_MINUTO } from './ai-limits.ts'
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
  /** e-mail de quem pediu (só para a simulação de 503 da conta de teste) */
  userEmail?: string | null
}

export interface AiProvider {
  name: string
  /** devolve o texto JSON bruto gerado pelo modelo; `deadline` = horário limite (ms) */
  completeJson(system: string, prompt: string, temperature: number, deadline: number): Promise<string>
}

export const MSG_SOBRECARGA = 'O serviço de IA está sobrecarregado neste momento. Tente de novo em alguns minutos.'

/** A IA falhou (sobrecarga, limite, formato…): vale usar o modo reserva sem IA */
export function isAiFailure(err: unknown): err is HttpError {
  return err instanceof HttpError && err.code.startsWith('ia_')
}

/** Tempo total da IA numa chamada (as Edge Functions param em 150 s; sobra tempo para o modo reserva) */
export const AI_BUDGET_MS = 100_000

// ---------------------------------------------------------------------------
// Gemini e Gemma (mesma API, mesma chave)
// ---------------------------------------------------------------------------
/**
 * Modelos padrão (podem ser trocados pelos secrets, em ordem de preferência).
 * Os Gemma entram por último: são mais lentos, mas costumam estar livres quando
 * os Gemini estão sobrecarregados.
 */
export const DEFAULT_MODELS = {
  standard: 'gemini-flash-latest,gemini-3-flash-preview',
  lite: 'gemini-3.5-flash-lite,gemini-flash-lite-latest',
  gemma: 'gemma-4-26b-a4b-it,gemma-4-31b-it',
}

/** limite de uma chamada (uma resposta travada não pode consumir o tempo todo) */
const CALL_TIMEOUT_MS = 50_000
/** abaixo disso não vale começar outra chamada */
const MIN_CALL_MS = 8_000
/** tentativas no mesmo modelo quando ele responde 500/503 */
const ATTEMPTS_PER_MODEL = 2

/** espera antes de tentar de novo: cresce a cada modelo sobrecarregado (1 s, 2 s, até 3 s) */
export function backoffMs(overloads: number) {
  return Math.min(3_000, 1_000 * 2 ** Math.max(0, overloads - 1))
}

export const isGemma = (model: string) => model.startsWith('gemma')

export interface ProviderDeps {
  fetch?: typeof fetch
  sleep?: (ms: number) => Promise<void>
  now?: () => number
  /** modelos com 503 simulado (teste); "*" = todos */
  simulate503?: string[]
}

type Failure = { code: string; model: string; retryAfter?: number }

export class GeminiProvider implements AiProvider {
  name = 'gemini'
  private fetchFn: typeof fetch
  private sleep: (ms: number) => Promise<void>
  private now: () => number

  /** models[0] é o principal; os demais são reservas, em ordem */
  constructor(
    private apiKey: string,
    private models: string[],
    private deps: ProviderDeps = {},
  ) {
    this.fetchFn = deps.fetch ?? fetch
    this.sleep = deps.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)))
    this.now = deps.now ?? Date.now
  }

  async completeJson(system: string, prompt: string, temperature: number, deadline: number) {
    const failures: Failure[] = []
    let overloads = 0

    models: for (const model of this.models) {
      for (let attempt = 1; attempt <= ATTEMPTS_PER_MODEL; attempt++) {
        const remaining = deadline - this.now()
        if (remaining < MIN_CALL_MS) break models
        // Gemma é mais lento: usa o tempo que sobrar
        const limit = isGemma(model) ? remaining - 1_000 : Math.min(CALL_TIMEOUT_MS, remaining - 1_000)
        const r = await this.callModel(model, system, prompt, temperature, limit)
        if (r.ok) {
          if (failures.length) console.info(`[ia] respondeu com ${model} depois de ${failures.length} falha(s)`)
          return r.text
        }
        failures.push({ code: r.code, model, retryAfter: r.retryAfter })
        if (r.code !== 'ia_sobrecarregada') break // limite, modelo sumido, demora: próximo modelo
        overloads++
        if (attempt === ATTEMPTS_PER_MODEL) break
        const wait = backoffMs(overloads)
        if (deadline - this.now() - wait < MIN_CALL_MS) break
        await this.sleep(wait)
      }
      console.warn(`[ia] ${model} indisponível (${failures.at(-1)?.code}); tentando o próximo modelo`)
    }

    console.warn(`[ia] nenhum modelo respondeu: ${failures.map((f) => `${f.model}=${f.code}`).join(', ') || 'sem tempo'}`)
    // "descansou por hoje" só quando TODOS os modelos estouraram o limite do dia
    if (failures.length && failures.every((f) => f.code === 'ia_limite_dia')) {
      throw new HttpError(429, MSG_LIMITE_DIA, 'ia_limite_dia')
    }
    // só limite por minuto (sem sobrecarga): a tela tenta de novo sozinha
    const minute = failures.find((f) => f.code === 'ia_limite_minuto')
    if (minute && !failures.some((f) => f.code === 'ia_sobrecarregada' || f.code === 'ia_demora')) {
      throw new HttpError(429, MSG_LIMITE_MINUTO, 'ia_limite_minuto', minute.retryAfter)
    }
    throw new HttpError(503, MSG_SOBRECARGA, 'ia_sobrecarregada')
  }

  /** Uma chamada a um modelo. Nunca lança: devolve o texto ou o motivo da falha. */
  private async callModel(
    model: string,
    system: string,
    prompt: string,
    temperature: number,
    limitMs: number,
  ): Promise<{ ok: true; text: string } | { ok: false; code: string; retryAfter?: number }> {
    const sim = this.deps.simulate503
    if (sim && (sim.includes('*') || sim.includes(model))) {
      console.warn(`[ia] ${model} respondeu 503 (simulado para a conta de teste)`)
      return { ok: false, code: 'ia_sobrecarregada' }
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`
    // Gemma não aceita instrução de sistema nem o modo JSON: tudo vai no pedido
    const body = isGemma(model)
      ? {
          contents: [{ role: 'user', parts: [{ text: `${system}\n\n${prompt}\n\nResponda SOMENTE com o JSON pedido, sem texto antes ou depois.` }] }],
          generationConfig: { temperature },
        }
      : {
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { temperature, responseMimeType: 'application/json' },
        }

    let res: Response
    const started = this.now()
    // cronômetro próprio: uma consulta de DNS travada não respeita o AbortSignal do fetch
    const controller = new AbortController()
    let timer: ReturnType<typeof setTimeout> | undefined
    try {
      res = await Promise.race([
        this.fetchFn(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': this.apiKey },
          body: JSON.stringify(body),
          signal: controller.signal,
        }),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => {
            controller.abort()
            reject(new Error(`sem resposta em ${Math.round(limitMs / 1000)}s`))
          }, limitMs)
        }),
      ])
    } catch (err) {
      const slow = this.now() - started >= limitMs - 50
      console.warn(`[ia] ${model} ${slow ? 'demorou demais' : 'falha de rede'}:`, String(err).slice(0, 160))
      // rede que caiu na hora: conta como sobrecarga (vale tentar de novo); demora: próximo modelo
      return { ok: false, code: slow ? 'ia_demora' : 'ia_sobrecarregada' }
    } finally {
      clearTimeout(timer)
    }

    if (res.status === 500 || res.status === 503) {
      console.warn(`[ia] ${model} respondeu ${res.status}`)
      await res.body?.cancel()
      return { ok: false, code: 'ia_sobrecarregada' }
    }
    if (res.status === 429) {
      // o nível gratuito tem limite por minuto e por dia, separados por modelo
      const info = classify429(await res.text())
      console.warn(`[ia] limite ${info.kind === 'dia' ? 'DIÁRIO' : 'POR MINUTO'} em ${model}`, info.quotas.join(', ') || '(sem detalhes)')
      return info.kind === 'dia'
        ? { ok: false, code: 'ia_limite_dia' }
        : { ok: false, code: 'ia_limite_minuto', retryAfter: Math.min(60, Math.max(10, info.retryAfter ?? 20)) }
    }
    if (!res.ok) {
      console.error(`[ia] ${model} status ${res.status}`, (await res.text()).slice(0, 300))
      return { ok: false, code: res.status === 404 ? 'ia_modelo' : 'ia_erro' }
    }

    const data = await res.json().catch(() => null)
    // modelos que "pensam" mandam o raciocínio em partes marcadas com thought: fica de fora
    const parts: { text?: string; thought?: boolean }[] = data?.candidates?.[0]?.content?.parts ?? []
    const text = parts.filter((p) => !p.thought).map((p) => p.text ?? '').join('')
    if (!text.trim()) {
      console.error(`[ia] ${model} resposta vazia`, JSON.stringify(data).slice(0, 300))
      return { ok: false, code: 'ia_vazia' }
    }
    return { ok: true, text }
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

/** Lista de modelos de um secret (separados por vírgula) */
const list = (v: string | undefined, fallback: string) =>
  (v || fallback).split(',').map((s) => s.trim()).filter(Boolean)

/** Ordem dos modelos: os da categoria pedida, os da outra e, por último, os Gemma */
export function modelChain(tier: 'lite' | 'standard', env: (k: string) => string | undefined) {
  const standard = list(env('GEMINI_MODEL'), DEFAULT_MODELS.standard)
  const lite = list(env('GEMINI_MODEL_LITE'), DEFAULT_MODELS.lite)
  const gemma = list(env('GEMMA_MODELS'), DEFAULT_MODELS.gemma)
  return [...new Set(tier === 'lite' ? [...lite, ...standard, ...gemma] : [...standard, ...lite, ...gemma])]
}

/** 503 simulado: só para a conta de teste, só enquanto AI_TEST_FAIL tiver valor */
export function simulated503(env: (k: string) => string | undefined, userEmail?: string | null): string[] | undefined {
  const email = env('AI_TEST_EMAIL')?.trim().toLowerCase()
  const fail = env('AI_TEST_FAIL')?.trim()
  if (!email || !fail || !userEmail || userEmail.toLowerCase() !== email) return undefined
  return list(fail, '')
}

function getAiProvider(mock: () => unknown, tier: 'lite' | 'standard', userEmail?: string | null): AiProvider {
  const env = (k: string) => Deno.env.get(k)
  const name = (env('AI_PROVIDER') ?? 'gemini').toLowerCase()
  if (name === 'mock') return new MockProvider(mock)
  const key = env('GEMINI_API_KEY')
  if (!key) {
    throw new HttpError(503, 'A IA ainda não foi configurada neste app. Avise o Nelson.', 'ia_sem_chave')
  }
  return new GeminiProvider(key, modelChain(tier, env), { simulate503: simulated503(env, userEmail) })
}

/** Remove cercas de código (```json) e texto em volta do JSON, que alguns modelos colocam */
export function stripFences(text: string) {
  const t = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim()
  if (t.startsWith('{') || t.startsWith('[')) return t
  const start = t.indexOf('{')
  const end = t.lastIndexOf('}')
  return start >= 0 && end > start ? t.slice(start, end + 1) : t
}

/**
 * Pede uma resposta em JSON e valida com zod.
 * Se a validação falhar, tenta mais uma vez avisando o modelo do problema.
 */
export async function generateJson<T>(opts: GenerateJsonOptions<T>): Promise<T> {
  const provider = getAiProvider(opts.mock, opts.tier ?? 'standard', opts.userEmail)
  const deadline = Date.now() + AI_BUDGET_MS
  let prompt = opts.prompt
  let lastIssue = ''

  for (let attempt = 1; attempt <= 2; attempt++) {
    const raw = await provider.completeJson(opts.system, prompt, opts.temperature ?? 0.4, deadline)
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
