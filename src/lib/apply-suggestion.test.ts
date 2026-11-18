import { describe, expect, it } from 'vitest'
import { applySuggestion } from './apply-suggestion'
import type { ResumeSections } from './resume'

const base: ResumeSections = {
  resumo: 'Resumo antigo.',
  experiencias: [
    { cargo: 'Assistente', empresa: 'A', descricao: 'Conduzo processos seletivos.  Organizo a integração.' },
    { cargo: 'Auxiliar', empresa: 'B', descricao: 'Controle de documentos.' },
  ],
  habilidades: ['Excel', 'Gupy'],
  cursos: [],
}

const sug = (secao: 'resumo' | 'experiencia' | 'formacao' | 'habilidades', antes: string, depois: string) => ({
  secao,
  titulo: 't',
  explicacao: 'e',
  antes,
  depois,
  aplicada: false,
})

describe('applySuggestion', () => {
  it('troca o resumo sem mexer no original', () => {
    const r = applySuggestion(base, sug('resumo', 'Resumo antigo.', 'Resumo novo.'))
    expect(r.ok && r.sections.resumo).toBe('Resumo novo.')
    expect(base.resumo).toBe('Resumo antigo.')
  })

  it('acrescenta habilidades sem repetir', () => {
    const r = applySuggestion(base, sug('habilidades', '', 'excel, Comunicação; Organização.'))
    expect(r.ok && r.sections.habilidades).toEqual(['Excel', 'Gupy', 'Comunicação', 'Organização'])
  })

  it('acrescenta curso em formação', () => {
    const r = applySuggestion(base, sug('formacao', '', 'Excel Avançado — Fundação Bradesco'))
    expect(r.ok && r.sections.cursos).toEqual(['Excel Avançado — Fundação Bradesco'])
  })

  it('troca o trecho na experiência certa, mesmo com espaços diferentes', () => {
    const r = applySuggestion(base, sug('experiencia', 'Conduzo processos seletivos. Organizo', 'Conduzo 15 processos por mês. Organizo'))
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.sections.experiencias![0].descricao).toBe('Conduzo 15 processos por mês. Organizo a integração.')
      expect(r.sections.experiencias![1]).toBe(base.experiencias![1])
    }
  })

  it('avisa quando o trecho não existe mais', () => {
    const r = applySuggestion(base, sug('experiencia', 'texto que não existe', 'novo'))
    expect(r.ok).toBe(false)
  })
})
