import { describe, expect, it } from 'vitest'
import { cleanSections, dateToField, fieldToDate, move, splitList, splitLines } from './resume-edit'

describe('editor de currículo', () => {
  it('datas: mês/ano na tela, AAAA-MM no banco', () => {
    expect(dateToField('2021-03')).toBe('03/2021')
    expect(dateToField('2018')).toBe('2018')
    expect(fieldToDate('3/2021')).toBe('2021-03')
    expect(fieldToDate('03/2021')).toBe('2021-03')
    expect(fieldToDate('2018')).toBe('2018')
    expect(fieldToDate('13/2021')).toBe('13/2021')
  })

  it('listas sem vazios nem repetidos', () => {
    expect(splitList('Hematologia, Bioquímica;  hematologia,, Microbiologia ')).toEqual(['Hematologia', 'Bioquímica', 'Microbiologia'])
    expect(splitLines('Curso A\n\n Curso B ')).toEqual(['Curso A', 'Curso B'])
  })

  it('limpa itens vazios antes de gravar', () => {
    const s = cleanSections({
      resumo: '  ',
      experiencias: [
        { cargo: ' Biomédica ', empresa: 'Lab', descricao: '  ' },
        { cargo: '', empresa: '', descricao: '' },
      ],
      formacao: [{ curso: '', instituicao: '' }],
      habilidades: ['PCR', ' '],
    })
    expect(s.resumo).toBeUndefined()
    expect(s.experiencias).toEqual([{ cargo: 'Biomédica', empresa: 'Lab', local: undefined, descricao: undefined }])
    expect(s.formacao).toEqual([])
    expect(s.habilidades).toEqual(['PCR'])
  })

  it('subir e descer itens', () => {
    expect(move(['a', 'b', 'c'], 2, 1)).toEqual(['a', 'c', 'b'])
    expect(move(['a', 'b'], 0, -1)).toEqual(['a', 'b'])
  })
})
