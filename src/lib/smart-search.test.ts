import { describe, expect, it } from 'vitest'
import { smartLinks } from './smart-search'

describe('busca inteligente', () => {
  it('Brasil: LinkedIn, Indeed, Gupy, Vagas.com e Catho com cargo, cidade e modalidade', () => {
    const links = smartLinks('BR', { role: 'Biomédica', city: 'São Paulo, SP', workModes: ['presencial', 'hibrido'] })
    expect(links.map((l) => l.site)).toEqual(['LinkedIn Vagas', 'Indeed', 'Gupy', 'Vagas.com', 'Catho'])
    const li = new URL(links[0].url)
    expect(li.searchParams.get('keywords')).toBe('Biomédica')
    expect(li.searchParams.get('location')).toBe('São Paulo, SP')
    expect(li.searchParams.get('f_WT')).toBe('1,3')
    expect(new URL(links[1].url).searchParams.get('l')).toBe('São Paulo, SP')
    expect(links[3].url).toBe('https://www.vagas.com.br/vagas-de-biomedica')
    expect(links[4].url).toBe('https://www.catho.com.br/vagas/biomedica/')
  })

  it('só remoto: sem cidade e com o filtro de remoto', () => {
    const links = smartLinks('BR', { role: 'Analista de Dados', city: 'Campinas', workModes: ['remoto'] })
    const indeed = new URL(links[1].url)
    expect(indeed.searchParams.get('l')).toBeNull()
    expect(indeed.searchParams.get('remotejob')).toBeTruthy()
    expect(links[2].url).toContain('Analista%20de%20Dados%20remoto')
  })

  it('Portugal: Net-Empregos e Indeed Portugal; exterior não usa a cidade do Brasil', () => {
    const links = smartLinks('PT', { role: 'Biomédica', city: 'São Paulo, SP' })
    expect(links.map((l) => l.site)).toContain('Net-Empregos')
    expect(links.map((l) => l.site)).toContain('Indeed Portugal')
    expect(links.every((l) => !l.url.includes('Paulo'))).toBe(true)
  })

  it('Europa e EUA têm links próprios', () => {
    expect(smartLinks('EU', { role: 'Data Engineer' }).map((l) => l.site)).toContain('EURES (portal oficial da UE)')
    expect(smartLinks('US', { role: 'Data Engineer' })[0].url).toContain('United+States')
    expect(smartLinks('BR', { role: '  ' })).toEqual([])
  })
})
