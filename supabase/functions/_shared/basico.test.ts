// Modo reserva sem IA (Adaptar e Análise quando todos os modelos falham)
import { describe, expect, it } from 'vitest'
import { AVISO_BASICO, basicAdaptation, basicAnalysis, compareKeywords, containsTerm, jobKeywords, normalize, resumeComparableText } from './basico.ts'
import type { ResumeSections } from './resume.ts'

const VAGA = `Analista de Controle de Qualidade
Laboratório Exemplo — São Paulo, SP

Responsabilidades:
- Realizar análises de controle de qualidade em amostras.
- Executar ensaios por HPLC e espectrofotometria.
- Registrar resultados no LIMS e tratar não conformidades.
- Apoiar auditorias internas da ISO 17025.

Requisitos:
- Formação em Biomedicina, Farmácia ou Química.
- Experiência com HPLC e boas práticas de laboratório (BPL).
- Conhecimento em validação de métodos.
- Inglês intermediário.

Benefícios: vale-refeição, plano de saúde.`

const CURRICULO: ResumeSections = {
  contato: { email: 'pessoa@example.com', cidade: 'São Paulo, SP' },
  resumo: 'Biomédica com 4 anos de experiência em laboratório de análises clínicas.',
  experiencias: [
    {
      cargo: 'Biomédica',
      empresa: 'Laboratório Alfa',
      local: 'São Paulo, SP',
      inicio: '2021-03',
      fim: null,
      descricao: 'Realizo exames de bioquímica e hematologia e executo o controle de qualidade interno com espectrofotometria.',
    },
  ],
  formacao: [{ curso: 'Biomedicina', instituicao: 'Universidade Exemplo', inicio: '2016', fim: '2020' }],
  habilidades: ['Bioquímica clínica', 'Hematologia', 'Controle de qualidade'],
  idiomas: ['Português (nativo)'],
  cursos: [],
}

describe('palavras-chave do anúncio', () => {
  it('acha termos técnicos, siglas e o que os requisitos pedem', () => {
    const k = jobKeywords(VAGA).map(normalize)
    for (const t of ['hplc', 'lims', 'controle de qualidade', 'espectrofotometria', 'validacao de metodos', 'ingles']) {
      expect(k).toContain(t)
    }
    expect(k.some((x) => x.includes('iso 17025'))).toBe(true)
  })

  it('ignora o jargão do anúncio (benefícios, requisitos, vaga)', () => {
    const k = jobKeywords(VAGA).map(normalize)
    for (const t of ['requisitos', 'beneficios', 'vale', 'plano de saude', 'realizar']) expect(k).not.toContain(t)
  })

  it('compara com o currículo sem acento e com plural', () => {
    const text = normalize('Auditorias internas; Análise clínica; inglês')
    expect(containsTerm(text, 'auditoria')).toBe(true)
    expect(containsTerm(text, 'análises clínicas')).toBe(true)
    expect(containsTerm(text, 'Inglês')).toBe(true)
    expect(containsTerm(text, 'lims')).toBe(false)
  })

  it('% de compatibilidade = parte das palavras-chave que já está no currículo', () => {
    const m = compareKeywords(VAGA, resumeComparableText(CURRICULO))
    expect(m.presentes.map(normalize)).toEqual(expect.arrayContaining(['controle de qualidade', 'espectrofotometria']))
    expect(m.faltando.map(normalize)).toEqual(expect.arrayContaining(['hplc', 'lims']))
    expect(m.compat).toBe(Math.max(10, Math.round((100 * m.presentes.length) / m.palavras.length)))
  })
})

describe('adaptação básica', () => {
  const a = basicAdaptation({ jobText: VAGA, sections: CURRICULO, company: 'Laboratório Exemplo' })

  it('sempre consegue adaptar: palavras que faltam, cargo no resumo e onde contar a experiência', () => {
    expect(a.basica).toBe(true)
    expect(a.aviso).toBe(AVISO_BASICO)
    expect(a.vaga.titulo).toBe('Analista de Controle de Qualidade')
    expect(a.mudancas.map((m) => m.secao)).toEqual(['habilidades', 'resumo', 'experiencia'])
  })

  it('não inventa: só sugere o que falta para a pessoa escolher, com lacuna onde precisa', () => {
    const hab = a.mudancas.find((m) => m.secao === 'habilidades')!
    expect(normalize(hab.depois)).toContain('hplc')
    expect(normalize(hab.depois)).not.toContain('espectrofotometria') // já está no currículo
    const exp = a.mudancas.find((m) => m.secao === 'experiencia')!
    expect(exp.antes).toBe(CURRICULO.experiencias[0].descricao)
    expect(exp.depois.startsWith(exp.antes)).toBe(true)
    expect(exp.depois).toMatch(/\[[^\]]{1,40}\]$/)
    const res = a.mudancas.find((m) => m.secao === 'resumo')!
    expect(res.depois).toMatch(/^Objetivo: Analista de Controle de Qualidade\. Biomédica com 4 anos/)
  })

  it('impacto e compatibilidade ficam entre 0 e 100', () => {
    expect(a.compat_antes).toBeGreaterThanOrEqual(10)
    expect(a.compat_antes).toBeLessThanOrEqual(95)
    for (const m of a.mudancas) expect(m.impacto).toBeLessThanOrEqual(30)
  })

  it('currículo em outro idioma: só as palavras-chave (sem texto em português)', () => {
    const en = basicAdaptation({ jobText: VAGA, sections: CURRICULO, language: 'en' })
    expect(en.mudancas.map((m) => m.secao)).toEqual(['habilidades'])
  })
})

describe('análise básica', () => {
  it('dá nota pela estrutura e sugere com lacunas', () => {
    const r = basicAnalysis(CURRICULO, 'Analista de Qualidade')
    expect(r.scores.basica).toBe(true)
    expect(r.overall_score).toBeGreaterThan(30)
    expect(r.overall_score).toBeLessThanOrEqual(100)
    expect(r.summary).toMatch(/^Análise básica, sem IA/)
    expect(r.summary.length).toBeLessThanOrEqual(500)
    expect(r.suggestions.length).toBeLessThanOrEqual(8)
  })

  it('currículo sem resumo: sugere criar um, com lacunas', () => {
    const r = basicAnalysis({ ...CURRICULO, resumo: undefined }, 'Biomédica')
    const s = r.suggestions.find((x) => x.secao === 'resumo')!
    expect(s.depois).toMatch(/^Biomédica com experiência em \[/)
  })
})
