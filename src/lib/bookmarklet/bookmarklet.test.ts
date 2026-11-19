import { describe, expect, it } from 'vitest'
import { bookmarkletHref, compactSource, textFromBookmarklet } from './index'

describe('botão de favoritos', () => {
  it('o código enxuto continua válido e sem comentários', () => {
    const src = compactSource()
    expect(src).not.toContain('/*')
    expect(() => new Function(`return (${src})`)).not.toThrow()
  })

  it('o favorito leva ao endereço do app certo e cabe num favorito', () => {
    const href = bookmarkletHref('https://app.example.org/vagapronta/')
    expect(href.startsWith('javascript:')).toBe(true)
    const code = decodeURIComponent(href.slice('javascript:'.length))
    expect(code).toContain('("https://app.example.org/vagapronta/")')
    expect(href.length).toBeLessThan(20000)
  })

  it('título e empresa entram no começo do texto (sem repetir)', () => {
    expect(textFromBookmarklet({ titulo: 'Biomédica', empresa: 'Lab X', texto: 'Requisitos: CRBM ativo' })).toBe('Biomédica\nLab X\nRequisitos: CRBM ativo')
    expect(textFromBookmarklet({ titulo: 'Biomédica', empresa: null, texto: 'Biomédica\nRequisitos…' })).toBe('Biomédica\nRequisitos…')
  })
})
