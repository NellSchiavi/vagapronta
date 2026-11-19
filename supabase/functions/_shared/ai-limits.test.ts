import { describe, expect, it } from 'vitest'
import { classify429 } from './ai-limits'

const body = (quotaIds: string[], retryDelay?: string) =>
  JSON.stringify({
    error: {
      code: 429,
      message: 'You exceeded your current quota, please check your plan and billing details.',
      status: 'RESOURCE_EXHAUSTED',
      details: [
        { '@type': 'type.googleapis.com/google.rpc.QuotaFailure', violations: quotaIds.map((quotaId) => ({ quotaMetric: 'generativelanguage.googleapis.com/generate_content_free_tier_requests', quotaId })) },
        ...(retryDelay ? [{ '@type': 'type.googleapis.com/google.rpc.RetryInfo', retryDelay }] : []),
      ],
    },
  })

describe('limite do Gemini (429)', () => {
  it('por minuto: tenta de novo no tempo que o Google sugere', () => {
    expect(classify429(body(['GenerateRequestsPerMinutePerProjectPerModel-FreeTier'], '37.5s'))).toMatchObject({ kind: 'minuto', retryAfter: 38 })
  })
  it('por dia: a IA descansou por hoje', () => {
    expect(classify429(body(['GenerateRequestsPerDayPerProjectPerModel-FreeTier'], '20s'))).toMatchObject({ kind: 'dia', retryAfter: null })
  })
  it('as duas violadas: trata como por minuto (vale tentar de novo)', () => {
    expect(classify429(body(['GenerateRequestsPerDayPerProjectPerModel-FreeTier', 'GenerateContentInputTokensPerModelPerMinute-FreeTier'])).kind).toBe('minuto')
  })
  it('a mensagem genérica "check your plan" sozinha não vira limite diário', () => {
    expect(classify429(body([])).kind).toBe('minuto')
  })
})
