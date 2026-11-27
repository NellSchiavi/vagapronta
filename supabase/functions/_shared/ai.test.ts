// Troca de modelo quando o Google está sobrecarregado. Nenhum teste chama o Google:
// o fetch é simulado, então a cota real nunca é usada.
import { describe, expect, it } from 'vitest'
import { backoffMs, GeminiProvider, isAiFailure, modelChain, simulated503, stripFences } from './ai.ts'
import { HttpError } from './http.ts'

const ok = (text: string) =>
  new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: 'pensando…', thought: true }, { text }] } }] }), { status: 200 })
const status = (n: number, body = '{}') => new Response(body, { status: n })

/** relógio falso: as esperas passam na hora, sem atrasar os testes */
function fakeClock() {
  let t = 0
  const waits: number[] = []
  return {
    now: () => t,
    sleep: async (ms: number) => {
      waits.push(ms)
      t += ms
    },
    advance: (ms: number) => (t += ms),
    waits,
  }
}

function provider(models: string[], answer: (model: string, body: Record<string, unknown>) => Response | Promise<Response>, extra = {}) {
  const clock = fakeClock()
  const calls: string[] = []
  const fetchFn = (async (url: string, init: RequestInit) => {
    const model = /models\/([^:]+):/.exec(url)![1]
    calls.push(model)
    clock.advance(1_000)
    return answer(model, JSON.parse(String(init.body)))
  }) as unknown as typeof fetch
  const p = new GeminiProvider('chave-falsa', models, { fetch: fetchFn, sleep: clock.sleep, now: clock.now, ...extra })
  return { p, calls, clock }
}

describe('IA sobrecarregada (503)', () => {
  it('tenta de novo no mesmo modelo com espera e depois passa para o próximo', async () => {
    const { p, calls, clock } = provider(['flash', 'flash-lite', 'gemma-4-31b-it'], (m) => (m === 'gemma-4-31b-it' ? ok('{"a":1}') : status(503)))
    await expect(p.completeJson('sis', 'pedido', 0.3, 100_000)).resolves.toBe('{"a":1}')
    expect(calls).toEqual(['flash', 'flash', 'flash-lite', 'flash-lite', 'gemma-4-31b-it'])
    // espera crescente entre as tentativas
    expect(clock.waits).toEqual([1_000, 3_000])
  })

  it('espera cresce e tem teto', () => {
    expect([1, 2, 3, 4, 5, 9].map(backoffMs)).toEqual([1_000, 2_000, 3_000, 3_000, 3_000, 3_000])
  })

  it('todos sobrecarregados: erro honesto de sobrecarga (a tela oferece Tentar de novo)', async () => {
    const { p } = provider(['flash', 'flash-lite'], () => status(503))
    const err = await p.completeJson('s', 'p', 0.3, 100_000).catch((e) => e)
    expect(err).toBeInstanceOf(HttpError)
    expect(err.code).toBe('ia_sobrecarregada')
    expect(err.message).toMatch(/sobrecarregado neste momento/)
    expect(isAiFailure(err)).toBe(true)
  })

  it('respeita o tempo total: não começa chamada sem tempo para terminar', async () => {
    const { p, calls } = provider(['a', 'b', 'c', 'd'], () => status(503))
    await p.completeJson('s', 'p', 0.3, 10_000).catch(() => {})
    expect(calls.length).toBeLessThanOrEqual(2)
  })

  it('limite do dia em um modelo: passa para o próximo sem esperar', async () => {
    const day = JSON.stringify({ error: { details: [{ violations: [{ quotaId: 'GenerateRequestsPerDayPerProjectPerModel-FreeTier' }] }] } })
    const { p, calls, clock } = provider(['flash', 'lite'], (m) => (m === 'flash' ? status(429, day) : ok('{}')))
    await expect(p.completeJson('s', 'p', 0.3, 100_000)).resolves.toBe('{}')
    expect(calls).toEqual(['flash', 'lite'])
    expect(clock.waits).toEqual([])
  })

  it('todos no limite do dia: "descansou por hoje"', async () => {
    const day = JSON.stringify({ error: { details: [{ violations: [{ quotaId: 'GenerateRequestsPerDayPerProjectPerModel-FreeTier' }] }] } })
    const { p } = provider(['a', 'b'], () => status(429, day))
    const err = await p.completeJson('s', 'p', 0.3, 100_000).catch((e) => e)
    expect(err.code).toBe('ia_limite_dia')
  })

  it('Gemma recebe tudo no pedido (sem instrução de sistema nem modo JSON)', async () => {
    let seen: Record<string, unknown> = {}
    const { p } = provider(['gemma-4-31b-it'], (_m, body) => {
      seen = body
      return ok('{"x":2}')
    })
    await p.completeJson('REGRAS', 'DADOS', 0.3, 100_000)
    expect(seen.systemInstruction).toBeUndefined()
    expect(JSON.stringify(seen.generationConfig)).not.toMatch(/responseMimeType/)
    expect(JSON.stringify(seen.contents)).toMatch(/REGRAS[\s\S]*DADOS/)
  })

  it('503 simulado para a conta de teste não chama o Google', async () => {
    const { p, calls } = provider(['flash', 'gemma-4-31b-it'], () => ok('{}'), { simulate503: ['flash'] })
    await expect(p.completeJson('s', 'p', 0.3, 100_000)).resolves.toBe('{}')
    expect(calls).toEqual(['gemma-4-31b-it'])
  })
})

describe('configuração', () => {
  const env = (vars: Record<string, string>) => (k: string) => vars[k]

  it('ordem: flash → flash-lite → Gemma (e lite começa pelos leves)', () => {
    const e = env({ GEMINI_MODEL: 'f1,f2', GEMINI_MODEL_LITE: 'l1', GEMMA_MODELS: 'g1' })
    expect(modelChain('standard', e)).toEqual(['f1', 'f2', 'l1', 'g1'])
    expect(modelChain('lite', e)).toEqual(['l1', 'f1', 'f2', 'g1'])
    expect(modelChain('standard', env({})).slice(-2)).toEqual(['gemma-4-26b-a4b-it', 'gemma-4-31b-it'])
  })

  it('simulação só vale para o e-mail de teste e só com AI_TEST_FAIL', () => {
    const e = env({ AI_TEST_EMAIL: 'teste@example.com', AI_TEST_FAIL: '*' })
    expect(simulated503(e, 'TESTE@example.com')).toEqual(['*'])
    expect(simulated503(e, 'outra@gmail.com')).toBeUndefined()
    expect(simulated503(env({ AI_TEST_EMAIL: 'teste@example.com' }), 'teste@example.com')).toBeUndefined()
  })

  it('tira texto em volta do JSON', () => {
    expect(stripFences('```json\n{"a":1}\n```')).toBe('{"a":1}')
    expect(stripFences('Aqui está:\n{"a":1}\nPronto.')).toBe('{"a":1}')
  })
})
