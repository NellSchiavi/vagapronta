import { describe, expect, it } from 'vitest'
import { isExampleJob, linkHost, safeHttpUrl } from './safe-link'

describe('links seguros', () => {
  it('só aceita http e https', () => {
    expect(safeHttpUrl('https://empresa.gupy.io/jobs/1')).toBe('https://empresa.gupy.io/jobs/1')
    expect(safeHttpUrl('http://vagas.com.br/v/1')).toBe('http://vagas.com.br/v/1')
    expect(safeHttpUrl('javascript:alert(1)')).toBeNull()
    expect(safeHttpUrl('data:text/html,<b>x</b>')).toBeNull()
    expect(safeHttpUrl('file:///C:/x')).toBeNull()
    expect(safeHttpUrl('vagas.com.br')).toBeNull()
    expect(safeHttpUrl('')).toBeNull()
    expect(safeHttpUrl(null)).toBeNull()
  })

  it('nunca abre domínios reservados para exemplo', () => {
    expect(safeHttpUrl('https://example.com/vaga')).toBeNull()
    expect(safeHttpUrl('https://vagas.example.org/1')).toBeNull()
    expect(safeHttpUrl('https://vaga.invalid/1')).toBeNull()
    expect(safeHttpUrl('https://laboratorio.example/1')).toBeNull()
  })

  it('mostra o domínio de destino sem "www."', () => {
    expect(linkHost('https://www.linkedin.com/jobs/view/1/')).toBe('linkedin.com')
    expect(linkHost('https://gruposabin.gupy.io/jobs/9')).toBe('gruposabin.gupy.io')
    expect(linkHost('javascript:void 0')).toBeNull()
  })

  it('reconhece vagas de exemplo', () => {
    expect(isExampleJob({ source: 'exemplo', match_notes: {} })).toBe(true)
    expect(isExampleJob({ source: 'jobicy', match_notes: { exemplo: true } })).toBe(true)
    expect(isExampleJob({ source: 'jobicy', match_notes: {} })).toBe(false)
  })
})
