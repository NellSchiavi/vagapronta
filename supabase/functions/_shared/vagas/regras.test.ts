import { describe, expect, it } from 'vitest'
import { englishQuery, estimateMatch, isExcluded, remoteFromBrazil, requiredLanguage, visaSponsorship } from './regras'

describe('termos de busca', () => {
  it('traduz cargos comuns para as fontes em inglês', () => {
    expect(englishQuery('Analista de Dados Pleno')).toBe('data analyst')
    expect(englishQuery('Biomédica')).toBe('biomedical')
    expect(englishQuery('Pesquisa Clínica')).toBe('clinical research')
    expect(englishQuery('Data Engineer')).toBe('data engineer')
  })
})

describe('avisos para vagas no exterior', () => {
  it('detecta o idioma exigido', () => {
    expect(requiredLanguage('We are looking for an analyst. Fluent German (C1) is required.')).toBe('de')
    expect(requiredLanguage('Wir suchen eine Person mit Erfahrung und Deutschkenntnisse für unser Team und die Firma')).toBe('de')
    expect(requiredLanguage('You will join our team and work with the data platform and the analysts')).toBe('en')
  })
  it('visto: sim, não ou não informado', () => {
    expect(visaSponsorship('We offer visa sponsorship and relocation support')).toBe(true)
    expect(visaSponsorship('Unfortunately we are unable to sponsor visas')).toBe(false)
    expect(visaSponsorship('Great team', true)).toBe(true)
    expect(visaSponsorship('Great team')).toBeNull()
  })
  it('remoto a partir do Brasil', () => {
    expect(remoteFromBrazil({ work_mode: 'remoto', regions: ['LATAM'], location: null })).toBe(true)
    expect(remoteFromBrazil({ work_mode: 'remoto', regions: ['USA', 'Canada'], location: null })).toBe(false)
    expect(remoteFromBrazil({ work_mode: 'presencial', regions: [], location: 'Berlin' })).toBeNull()
  })
})

describe('compatibilidade estimada e filtros', () => {
  const m = { roles: ['Analista de Dados'], resumeText: 'SQL Python Power BI dashboards indicadores ETL', include: [], workModes: ['remoto'] }
  it('vaga do cargo desejado e com as habilidades do currículo fica alta; vaga sem relação fica baixa', () => {
    const good = estimateMatch({ title: 'Senior Data Analyst', description: 'SQL, Python and Power BI dashboards, ETL pipelines', work_mode: 'remoto' }, m)
    const bad = estimateMatch({ title: 'Sales Manager', description: 'Close deals with enterprise clients', work_mode: 'presencial' }, m)
    expect(good.score).toBeGreaterThanOrEqual(80)
    expect(good.terms).toContain('sql')
    expect(bad.score).toBeLessThan(40)
  })
  it('vaga de nível diferente do escolhido perde pontos', () => {
    const job = { title: 'Senior Data Analyst', description: 'SQL, Python and Power BI dashboards, ETL pipelines', work_mode: 'remoto' as const }
    const pleno = estimateMatch(job, { ...m, seniority: ['pleno'] })
    const any = estimateMatch(job, m)
    expect(any.score - pleno.score).toBeGreaterThanOrEqual(15)
  })

  it('respeita palavras proibidas e empresas bloqueadas', () => {
    const job = { title: 'Analista de Dados', description: 'Vaga temporária', company: 'Empresa Bloqueada SA' }
    expect(isExcluded(job, ['temporária'], [])).toBe(true)
    expect(isExcluded(job, [], ['empresa bloqueada'])).toBe(true)
    expect(isExcluded(job, ['estágio'], ['outra'])).toBe(false)
  })
})
