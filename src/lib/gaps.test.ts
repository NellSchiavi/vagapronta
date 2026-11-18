import { describe, expect, it } from 'vitest'
import { countGaps, hasGaps, splitGaps } from './gaps'

describe('lacunas', () => {
  it('encontra lacunas entre colchetes', () => {
    expect(hasGaps('reduzindo erros em [X]%')).toBe(true)
    expect(hasGaps('atendi [número de clientes] por mês')).toBe(true)
    expect(hasGaps('texto completo, sem lacunas')).toBe(false)
    expect(countGaps('[X] e [Y]')).toBe(2)
  })

  it('divide o texto para destacar', () => {
    expect(splitGaps('em [X]% dos casos')).toEqual([
      { text: 'em ', gap: false },
      { text: '[X]', gap: true },
      { text: '% dos casos', gap: false },
    ])
    expect(splitGaps('sem lacuna')).toEqual([{ text: 'sem lacuna', gap: false }])
  })

  it('pode ser chamado várias vezes seguidas (sem estado preso na regex)', () => {
    expect(hasGaps('[X]')).toBe(true)
    expect(hasGaps('[X]')).toBe(true)
  })
})
