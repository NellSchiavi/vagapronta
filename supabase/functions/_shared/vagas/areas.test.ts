import { describe, expect, it } from 'vitest'
import { areaAdjustment, detectProfessions, isOffTopic, jobAreas, knownAreas, PROFESSIONS, searchTerms } from './areas'
import { englishQuery, isExcluded } from './regras'

const bio = PROFESSIONS.find((p) => p.id === 'biomedicina')!
const chosen = ['Laboratório', 'Gestão', 'Qualidade', 'Pesquisa clínica']
const areas = knownAreas(chosen)
const job = (title: string, company = '', description = '') => ({ title, company, description })

describe('profissões e termos de busca', () => {
  it('reconhece a biomédica pelos cargos ou pelo CRBM', () => {
    expect(detectProfessions(['Biomédica']).map((p) => p.id)).toEqual(['biomedicina'])
    expect(detectProfessions(['Analista', 'CRBM']).map((p) => p.id)).toEqual(['biomedicina'])
    expect(detectProfessions(['Engenheiro de Dados']).map((p) => p.id)).toEqual(['dados'])
  })

  it('aceita os chips com ou sem acento', () => {
    expect(knownAreas(['laboratorio', 'Pesquisa Clínica', 'Outra coisa']).map((a) => a.id)).toEqual(['laboratorio', 'pesquisa'])
  })

  it('a área preferida ganha 2 termos; no máximo 5; termos do país', () => {
    const br = searchTerms('BR', ['Biomédica'], chosen, 'Qualidade', englishQuery)
    expect(br).toHaveLength(5)
    expect(br.slice(0, 2).map((t) => t.local)).toEqual(['analista da qualidade laboratório', 'garantia da qualidade'])
    expect(br.map((t) => t.local)).toContain('pesquisa clínica')
    const pt = searchTerms('PT', ['Biomédica'], chosen, 'Laboratório', englishQuery).map((t) => t.local)
    expect(pt).toContain('técnico de análises clínicas')
    expect(pt).toContain('ensaios clínicos')
    expect(searchTerms('US', ['Biomédica'], ['Pesquisa clínica'], null, englishQuery)[0].local).toBe('clinical research associate')
  })

  it('sem áreas conhecidas, busca pelos 2 primeiros cargos (como antes)', () => {
    expect(searchTerms('BR', ['Analista de Dados', 'Engenheiro de Dados', 'Outro'], ['Dados'], null, englishQuery).map((t) => t.en)).toEqual([
      'data analyst',
      'data engineer',
    ])
  })
})

describe('vagas da área e fora da área (títulos reais da Jooble, 21/11/2026)', () => {
  it('classifica pela área', () => {
    expect(jobAreas(job('Analista De Laboratório- Microbiologia'), areas)[0].id).toBe('laboratorio')
    expect(jobAreas(job('Coordenador(a) de Laboratório de Análises Clínicas'), areas)[0].id).toBe('gestao')
    expect(jobAreas(job('Analista da Qualidade', 'Hermes Pardini', 'Acreditação PALC e ISO 15189'), areas)[0].id).toBe('qualidade')
    expect(jobAreas(job('Clinical Trial Coordinator'), areas)[0].id).toBe('pesquisa')
    expect(jobAreas(job('Vendedor', '', 'atendimento'), areas)).toEqual([])
  })

  it('manda para o fim engenharia biomédica, equipamentos e laboratório químico industrial', () => {
    for (const t of [
      job('Técnico Em Equipamentos Biomédicos', 'STBIO ENGENHARIA'),
      job('Engenheiro Biomédico de Manutenção de Equipamentos Médicos', 'Speculum'),
      job('Senior Biomedical Data Modeller - FAIR Knowledge Graph', 'Capgemini'),
      job('Analista De Laboratório Químico', 'Hire Now'),
      job('Analista De Laboratório', 'ANTONIAZZI ALIMENTOS'),
      job('Analista De Laboratório Elétrico', 'NOSSA RH'),
    ]) {
      expect(isOffTopic(t, [bio]), t.title).toBe(true)
    }
    expect(isOffTopic(job('Técnico/a de Análises Clínicas', 'Unilabs'), [bio])).toBe(false)
    // recepção só conta no título ("recepção de amostras" é rotina do laboratório)
    expect(isOffTopic(job('Recepcionista - Clínica'), [bio])).toBe(true)
    expect(isOffTopic(job('Biomédica', 'Lab', 'Recepção de amostras e coleta'), [bio])).toBe(false)
    expect(isOffTopic(job('Analista de laboratório (m/f)', 'Grupo Lactogal', 'indústria de lacticínios'), [bio])).toBe(true)
  })

  it('"qualidade" só conta em saúde/laboratório e precisa de sinal forte', () => {
    expect(jobAreas(job('Analista De Qualidade E Performance', 'PROATIVA RH', 'call center, qualidade do atendimento'), areas)).toEqual([])
    expect(jobAreas(job('Coordenador De Recepção', '', 'atendimento com qualidade'), areas)).toEqual([])
    expect(jobAreas(job('Analista Laboratório', 'Dasa'), areas)[0].id).toBe('laboratorio')
  })

  it('a empresa também entra na exclusão (ex.: "Clinica Estetica")', () => {
    expect(isExcluded(job('Biomedica', 'Clinica Estetica'), bio.avoid, [])).toBe(true)
  })

  it('indústria farmacêutica com qualidade ou pesquisa clínica conta como da área', () => {
    expect(isOffTopic(job('Analista de Garantia da Qualidade', 'Indústria Farmacêutica', 'indústria química e farmacêutica, BPF'), [bio])).toBe(false)
    expect(areaAdjustment(job('Analista de Controle de Qualidade', 'EMS Farmacêutica'), areas, 'Qualidade', [bio])).toEqual({ delta: 10, area: 'qualidade', offTopic: false })
  })

  it('área preferida pesa mais que as outras', () => {
    const lab = job('Biomédico(a) - Análises Clínicas')
    expect(areaAdjustment(lab, areas, 'Laboratório', [bio]).delta).toBe(10)
    expect(areaAdjustment(lab, areas, 'Qualidade', [bio]).delta).toBe(5)
    expect(areaAdjustment(job('Engenheiro Biomédico'), areas, 'Laboratório', [bio]).delta).toBe(-30)
  })

  it('as palavras de estética da profissão excluem as vagas de estética', () => {
    for (const t of ['Biomédica Esteta', 'Biomédico Ou Farmacêutico Esteta', 'Biomédica - Harmonização Facial', 'BIOMÉDICA ESTÉTICA AVANÇADA']) {
      expect(isExcluded(job(t), bio.avoid, []), t).toBe(true)
    }
    expect(isExcluded(job('Biomédica - Análises Clínicas'), bio.avoid, [])).toBe(false)
  })

  it('palavras curtas só contam inteiras ("bi" não pega "biologia")', () => {
    const ti = PROFESSIONS.find((p) => p.id === 'dados')!
    expect(jobAreas(job('Professor de Biologia'), ti.areas)).toEqual([])
    expect(jobAreas(job('Analista de BI'), ti.areas)[0].id).toBe('analise-dados')
  })
})
