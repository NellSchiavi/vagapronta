import { describe, expect, it } from 'vitest'
import { containsTerm, jobScore, keywordsAfter } from './job-score'
import type { Adaptation } from './types'

const base: Adaptation = {
  vaga: { titulo: 'Coordenadora de Estudos Clínicos', resumo: '' },
  compat_antes: 25,
  compat_depois: 75,
  palavras_chave: ['Pesquisa clínica', 'ICH-GCP', 'EDC', 'Biomedicina'],
  palavras_presentes: ['Biomedicina'],
  palavras_faltando: ['Pesquisa clínica', 'ICH-GCP', 'EDC'],
  mudancas: [
    { secao: 'habilidades', titulo: 't', motivo: 'm', antes: '', depois: 'Pesquisa clínica, ICH-GCP', impacto: 50, cobre: ['Pesquisa clínica', 'ICH-GCP'] },
    { secao: 'resumo', titulo: 't', motivo: 'm', antes: '', depois: 'Biomédica com interesse em EDC', impacto: 25, cobre: ['EDC'] },
  ],
  aderencia: { nota: 43, teto: 70, requisitos: [] },
  vaga_texto: '',
  vaga_url: null,
  job_id: null,
}

describe('duas notas da vaga', () => {
  it('a vaga mostra a aderência quando existe; senão, palavras-chave', () => {
    expect(jobScore({ compatibility: 43, match_notes: { aderencia: { nota: 43, teto: 70, requisitos: [] } } })).toEqual({ value: 43, kind: 'aderencia' })
    expect(jobScore({ compatibility: 92, match_notes: {} })).toEqual({ value: 92, kind: 'palavras' })
    expect(jobScore({ compatibility: null, match_notes: {} })).toBeNull()
  })

  it('palavras-chave sobem só com as mudanças marcadas e com o texto final', () => {
    expect(keywordsAfter(base, [false, false])).toBe(25)
    expect(keywordsAfter(base, [true, true])).toBe(100)
    // a pessoa tirou "ICH-GCP" da lista de habilidades
    expect(keywordsAfter(base, [true, false], ['Pesquisa clínica', ''])).toBe(50)
  })

  it('compara sem acento e com plural', () => {
    expect(containsTerm('Estudos Clínicos de fase III', 'estudo clinico')).toBe(true)
    expect(containsTerm('Hematologia', 'GCP')).toBe(false)
  })
})
