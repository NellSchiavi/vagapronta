import { describe, expect, it } from 'vitest'
import { areaLinks, crbmRegion, detectAreas, roleInEnglish } from './area-sites'

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

  it('abre já na busca pelo cargo quando o site permite; senão, dá a dica', () => {
    const l = areaLinks('BR', ['saude'], { registry: 'CRBM 1ª Região', role: 'Biomédica' })
    const fleury = l.find((x) => x.site.startsWith('Grupo Fleury'))!
    expect(fleury.url).toBe('https://trabalheconosco.vagas.com.br/grupo-fleury/oportunidades?q=Biom%C3%A9dica')
    expect(fleury.hint).toBeUndefined()
    const sabin = l.find((x) => x.site.startsWith('Grupo Sabin'))!
    expect(sabin.url).toBe('https://gruposabin.gupy.io/')
    expect(sabin.hint).toBe('Procure por “Biomédica” nesta página')
    expect(areaLinks('PT', ['ti'], { role: 'Analista de Dados' }).find((x) => x.site === 'ITJobs')!.url).toBe(
      'https://www.itjobs.pt/emprego?q=Analista%20de%20Dados',
    )
  })

  it('sites internacionais buscam o cargo em inglês', () => {
    expect(roleInEnglish('Engenheiro de Dados')).toBe('data engineer')
    expect(roleInEnglish('Data Engineer')).toBe('Data Engineer')
    expect(roleInEnglish('Gerente de Projetos')).toBeNull()
    const eu = areaLinks('EU', ['ti'], { role: 'Engenheiro de Dados' })
    expect(eu.find((x) => x.site === 'Berlin Startup Jobs')!.url).toBe('https://berlinstartupjobs.com/?s=data%20engineer')
    const unknown = areaLinks('EU', ['ti'], { role: 'Gerente de Projetos' }).find((x) => x.site === 'Landing.Jobs')!
    expect(unknown.url).toBe('https://landing.jobs/')
    expect(unknown.hint).toBe('Procure por “Gerente de Projetos” nesta página')
  })

  it('saúde em Portugal e TI na Europa', () => {
    expect(areaLinks('PT', ['saude']).map((l) => l.site)).toContain('Lusíadas Saúde · Carreiras')
    expect(areaLinks('EU', ['ti']).map((l) => l.site)).toContain('Berlin Startup Jobs')
    expect(areaLinks('US', ['saude'])).toEqual([])
  })
})
