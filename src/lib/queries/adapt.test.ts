import { describe, expect, it, vi } from 'vitest'

// o módulo importa o cliente Supabase; nos testes só usamos as funções puras
vi.mock('@/lib/supabase', () => ({ supabase: {}, asJson: (v: unknown) => v }))
vi.mock('@/lib/auth', () => ({ useAuth: () => ({}) }))

const { applyAccepted, estimatedAfter } = await import('./adapt')
import type { Adaptation } from '@/lib/types'

const adaptation: Adaptation = {
  vaga: { titulo: 'Assistente de DP', empresa: 'Natura', resumo: '' },
  compat_antes: 65,
  compat_depois: 95,
  palavras_chave: [],
  vaga_texto: '',
  vaga_url: null,
  job_id: null,
  mudancas: [
    { secao: 'resumo', titulo: 'r', motivo: 'm', antes: '', depois: 'Resumo focado em DP.', impacto: 12 },
    { secao: 'experiencia', titulo: 'e', motivo: 'm', antes: 'apoio a folha', depois: 'fechamento da folha', impacto: 10 },
    { secao: 'experiencia', titulo: 'x', motivo: 'm', antes: 'trecho que não existe', depois: 'novo', impacto: 5 },
    { secao: 'habilidades', titulo: 'h', motivo: 'm', antes: '', depois: 'eSocial, CLT', impacto: 8 },
  ],
}

const sections = {
  resumo: 'Resumo antigo',
  experiencias: [{ cargo: 'Assistente de RH', empresa: 'Clínica', descricao: 'Organizo a integração e apoio a folha de pagamento.' }],
  habilidades: ['Excel'],
}

describe('adaptação à vaga', () => {
  it('estimativa soma só as mudanças aceitas e não passa de 95', () => {
    expect(estimatedAfter(adaptation, [true, true, true, true])).toBe(95)
    expect(estimatedAfter(adaptation, [true, false, false, false])).toBe(77)
    expect(estimatedAfter(adaptation, [false, false, false, false])).toBe(65)
  })

  it('aplica só as aceitas, em sequência, e conta as que não couberam', () => {
    const { sections: s, skipped } = applyAccepted(sections, adaptation, [true, true, true, false])
    expect(s.resumo).toBe('Resumo focado em DP.')
    expect(s.experiencias![0].descricao).toBe('Organizo a integração e fechamento da folha de pagamento.')
    expect(s.habilidades).toEqual(['Excel'])
    expect(skipped).toBe(1)
    expect(sections.resumo).toBe('Resumo antigo') // original intacto
  })

  it('usa o texto editado (lacunas completadas) quando existir', () => {
    const { sections: s } = applyAccepted(sections, adaptation, [true, false, false, false], ['Resumo com 15 processos por mês.'])
    expect(s.resumo).toBe('Resumo com 15 processos por mês.')
  })
})
