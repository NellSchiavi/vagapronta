import { describe, expect, it } from 'vitest'
import { ADAPT_SYSTEM, ANALYZE_SYSTEM, guardInventedNumbers, LETTER_SYSTEM, NO_INVENTION_RULE, ORGANIZE_SYSTEM } from './prompts'

describe('regra fixa contra invenção', () => {
  it('está em todos os prompts de IA', () => {
    for (const [name, p] of Object.entries({ ORGANIZE_SYSTEM, ANALYZE_SYSTEM, ADAPT_SYSTEM, LETTER_SYSTEM })) {
      expect(p, name).toContain(NO_INVENTION_RULE)
    }
    expect(NO_INVENTION_RULE).toMatch(/números/)
    expect(NO_INVENTION_RULE).toMatch(/empresas/)
    expect(NO_INVENTION_RULE).toMatch(/cargos/)
    expect(NO_INVENTION_RULE).toMatch(/certificações/)
    expect(NO_INVENTION_RULE).toMatch(/\[X\]/)
  })
})

describe('guardInventedNumbers', () => {
  const cv = 'Conduzo cerca de 15 processos seletivos por mês desde 2021. Salário R$ 4.500.'
  const vaga = 'Requisito: 2 anos de experiência com eSocial.'

  it('troca números que não existem nas fontes por [X]', () => {
    expect(guardInventedNumbers('Reduzi erros em 30% e atendi 200 clientes.', [cv])).toBe('Reduzi erros em [X]% e atendi [X] clientes.')
    expect(guardInventedNumbers('mantendo a recepção com 100% de eficiência', [cv])).toBe('mantendo a recepção com [X]% de eficiência')
  })

  it('mantém números do currículo e da vaga', () => {
    expect(guardInventedNumbers('Conduzo 15 processos por mês desde 2021, com 2 anos de eSocial.', [cv, vaga])).toBe(
      'Conduzo 15 processos por mês desde 2021, com 2 anos de eSocial.',
    )
    expect(guardInventedNumbers('pretensão de R$ 4500', [cv])).toBe('pretensão de R$ 4500')
  })

  it('não mexe em lacunas nem em marcadores de privacidade', () => {
    const t = 'Atendi [X] clientes; contato [EMAIL_1] e [TELEFONE_2]; reduzi em [número]%.'
    expect(guardInventedNumbers(t, [cv])).toBe(t)
  })

  it('não confunde números dentro de palavras (B2B, Office 365 é tratado)', () => {
    expect(guardInventedNumbers('Vendas B2B e SAP S4', [cv])).toBe('Vendas B2B e SAP S4')
  })
})
