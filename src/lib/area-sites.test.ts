import { describe, expect, it } from 'vitest'
import { areaLinks, crbmRegion, detectAreas } from './area-sites'

describe('sites por área', () => {
  it('descobre a área pelos cargos e pelo registro', () => {
    expect(detectAreas(['Biomédica', 'Analista de Laboratório'])).toEqual(['saude'])
    expect(detectAreas(['Analista de Dados', 'Engenheiro de Dados'])).toEqual(['ti'])
    expect(detectAreas(['Controle de Qualidade', 'CRBM 12345 · 1ª Região (SP)'])).toEqual(['saude'])
    expect(detectAreas(['Vendedor'])).toEqual([])
  })

  it('região do CRBM', () => {
    expect(crbmRegion('CRBM 12345 · 1ª Região (SP)')).toBe(1)
    expect(crbmRegion('CRBM-6 54321')).toBe(6)
    expect(crbmRegion('')).toBeNull()
  })

  it('saúde no Brasil: o CRBM da região vem primeiro, depois as redes', () => {
    const l = areaLinks('BR', ['saude'], { registry: 'CRBM 12345 · 1ª Região (SP)' })
    expect(l[0].url).toBe('https://crbm1.gov.br/vagas/')
    expect(l.some((x) => x.url.includes('crbm6'))).toBe(false)
    expect(l.some((x) => x.site.startsWith('Grupo Fleury'))).toBe(true)
  })

  it('saúde em Portugal e TI na Europa', () => {
    expect(areaLinks('PT', ['saude']).map((l) => l.site)).toContain('Net-Empregos · Saúde')
    expect(areaLinks('EU', ['ti']).map((l) => l.site)).toContain('Berlin Startup Jobs')
    expect(areaLinks('US', ['saude'])).toEqual([])
  })
})
