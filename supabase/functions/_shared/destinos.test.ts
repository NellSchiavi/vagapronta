import { describe, expect, it } from 'vitest'
import { distributeSearch, rankScore, searchWeights } from './destinos'

describe('busca por destino', () => {
  it('pesos pedidos: 3 destinos 60/30/10 e 2 destinos 70/30', () => {
    expect(searchWeights(3)).toEqual([60, 30, 10])
    expect(searchWeights(2)).toEqual([70, 30])
    expect(searchWeights(1)).toEqual([100])
    expect(searchWeights(7).reduce((a, b) => a + b, 0)).toBeCloseTo(100)
  })

  it('distribui o total respeitando a prioridade e sem deixar nenhum destino de fora', () => {
    expect(distributeSearch(50, ['BR', 'EU', 'US'])).toEqual([
      { code: 'BR', count: 30 },
      { code: 'EU', count: 15 },
      { code: 'US', count: 5 },
    ])
    const small = distributeSearch(4, ['BR', 'EU', 'US'])
    expect(small.reduce((a, b) => a + b.count, 0)).toBe(4)
    expect(small.every((d) => d.count >= 1)).toBe(true)
  })

  it('bônus da prioridade não impede uma vaga muito compatível de outro destino de ficar no topo', () => {
    const brasilMedia = rankScore(80, 1) // 1º destino
    const europaOtima = rankScore(95, 2) // 2º destino
    expect(europaOtima).toBeGreaterThan(brasilMedia)
    expect(rankScore(80, 1)).toBeGreaterThan(rankScore(80, 2))
    expect(rankScore(80, 5)).toBe(80)
  })
})
