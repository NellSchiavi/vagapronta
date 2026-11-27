// Aderência aos requisitos: a nota não sobe com palavras-chave, só com o que o currículo ORIGINAL comprova
import { describe, expect, it } from 'vitest'
import { basicRequirements, buildAdherence, experienceYears, hasRequirementsSection, requirementLines, scoreRequirements, TETO_OBRIGATORIO, verifyEvidence, type Requirement } from './aderencia.ts'
import { compareKeywords, resumeComparableText } from './basico.ts'
import type { ResumeSections } from './resume.ts'

/** currículo de exemplo da Esposa (supabase/seed.sql) */
export const ESPOSA: ResumeSections = {
  contato: { email: 'esposa@example.com', telefone: '(11) 99999-0000', cidade: 'São Paulo, SP' },
  resumo:
    'Biomédica com habilitação em análises clínicas e 4 anos de experiência em laboratório, atuando em bioquímica, hematologia e coleta. Cuidadosa com biossegurança e com o controle de qualidade dos resultados.',
  experiencias: [
    {
      cargo: 'Biomédica',
      empresa: 'Laboratório Vida Diagnósticos',
      local: 'São Paulo, SP',
      inicio: '2021-03',
      fim: null,
      descricao:
        'Realizo e libero exames de bioquímica e hematologia em equipamentos automatizados (cerca de 300 amostras por plantão). Executo o controle de qualidade interno e apoio a coleta de sangue venoso.',
    },
    {
      cargo: 'Estagiária de Microbiologia',
      empresa: 'Hospital Santa Clara Exemplo',
      local: 'São Paulo, SP',
      inicio: '2019-08',
      fim: '2020-12',
      descricao: 'Semeadura e leitura de culturas, identificação bacteriana e antibiograma, sob supervisão.',
    },
  ],
  formacao: [
    { curso: 'Biomedicina (bacharelado)', instituicao: 'Universidade Exemplo', inicio: '2016', fim: '2020' },
    { curso: 'Especialização em Análises Clínicas', instituicao: 'Faculdade Exemplo', inicio: '2021', fim: '2022' },
  ],
  habilidades: ['Bioquímica clínica', 'Hematologia', 'Coleta de sangue', 'Controle de qualidade interno', 'Microbiologia', 'Sistema LIS', 'Biossegurança'],
  idiomas: ['Português (nativo)', 'Inglês (intermediário)'],
  cursos: ['Biossegurança em laboratório (NR-32) — Escola Técnica Exemplo (2023)'],
}

/** vaga de pesquisa clínica que pede experiência que ela não tem */
export const VAGA_PESQUISA = `Coordenador(a) de Estudos Clínicos (CRC)
Centro de Pesquisa Exemplo — São Paulo, SP

Responsabilidades
• Coordenar estudos clínicos de fase II e III junto ao investigador principal
• Preencher CRF e EDC, conduzir visitas de monitoria e manter o arquivo do estudo
• Processar e enviar amostras biológicas ao laboratório central

Requisitos
• Graduação em Biomedicina, Enfermagem ou Farmácia
• 3 anos de experiência em pesquisa clínica
• Conhecimento de Boas Práticas Clínicas (ICH-GCP)
• Inglês avançado

Diferenciais
• Certificação em pesquisa clínica
• Experiência com processamento de amostras em laboratório`

const HOJE = new Date('2026-11-25T12:00:00Z')

const req = (tipo: Requirement['tipo'], status: Requirement['status'], evidencia = ''): Requirement => ({
  requisito: 'x', tipo, categoria: 'outro', status, evidencia, dica: '',
})

describe('nota de aderência (calculada no código)', () => {
  it('obrigatório não atendido limita a nota a 70%', () => {
    const r = scoreRequirements([req('obrigatorio', 'atende'), req('obrigatorio', 'atende'), req('obrigatorio', 'nao_atende'), req('desejavel', 'atende')])!
    expect(r.nota).toBeLessThanOrEqual(TETO_OBRIGATORIO)
    expect(r.teto).toBe(70)
  })
  it('tudo atendido: 100%; desejável pesa menos que obrigatório', () => {
    expect(scoreRequirements([req('obrigatorio', 'atende'), req('desejavel', 'atende')])!.nota).toBe(100)
    const a = scoreRequirements([req('obrigatorio', 'atende'), req('desejavel', 'nao_atende')])!.nota
    const b = scoreRequirements([req('obrigatorio', 'nao_atende'), req('desejavel', 'atende')])!.nota
    expect(a).toBeGreaterThan(b)
  })
  it('sem requisitos: sem nota', () => {
    expect(scoreRequirements([])).toBeNull()
  })
})

describe('comprovação', () => {
  it('trecho que não está no currículo não vale: "atende" vira "parcial"', () => {
    const text = resumeComparableText(ESPOSA)
    const [ok, fake] = verifyEvidence(
      [req('obrigatorio', 'atende', 'Executo o controle de qualidade interno'), req('obrigatorio', 'atende', 'Coordenei estudos clínicos de fase III por 3 anos')],
      text,
    )
    expect(ok.status).toBe('atende')
    expect(fake.status).toBe('parcial')
    expect(fake.evidencia).toBe('')
  })
})

describe('só o que o anúncio pede', () => {
  it('requisito que não está no anúncio é descartado', () => {
    const reqs: Requirement[] = [
      { ...req('obrigatorio', 'atende', 'Biomedicina (bacharelado)'), requisito: 'Graduação em Biomedicina' },
      { ...req('obrigatorio', 'atende', 'Biomédica'), requisito: 'Habilitação ativa (CRBM)' },
    ]
    const a = buildAdherence(reqs, resumeComparableText(ESPOSA), false, VAGA_PESQUISA)!
    expect(a.requisitos.map((r) => r.requisito)).toEqual(['Graduação em Biomedicina'])
  })
})

describe('anos de experiência', () => {
  it('conta só as experiências da área pedida', () => {
    expect(experienceYears(ESPOSA, ['pesquisa clinica'], HOJE)).toBe(0)
    expect(experienceYears(ESPOSA, ['hematologia'], HOJE)).toBeGreaterThan(5)
  })
})

describe('checklist sem IA', () => {
  it('lê requisitos e diferenciais do anúncio', () => {
    const lines = requirementLines(VAGA_PESQUISA)
    expect(lines.filter((l) => l.tipo === 'obrigatorio').map((l) => l.texto)).toEqual([
      'Graduação em Biomedicina, Enfermagem ou Farmácia',
      '3 anos de experiência em pesquisa clínica',
      'Conhecimento de Boas Práticas Clínicas (ICH-GCP)',
      'Inglês avançado',
    ])
    expect(lines.filter((l) => l.tipo === 'desejavel')).toHaveLength(2)
  })

  it('Esposa x pesquisa clínica: aderência cai e fica limitada, com dica honesta dos anos', () => {
    const reqs = basicRequirements(VAGA_PESQUISA, ESPOSA, '', HOJE)
    const a = buildAdherence(reqs, resumeComparableText(ESPOSA), true)!
    expect(a.nota).toBeLessThanOrEqual(TETO_OBRIGATORIO)
    const anos = a.requisitos.find((r) => r.requisito.startsWith('3 anos'))!
    expect(anos.status).toBe('nao_atende')
    expect(anos.dica).toMatch(/pede 3 anos .*seu currículo não mostra experiência direta.*carta/)
    const grad = a.requisitos.find((r) => r.requisito.startsWith('Graduação'))!
    expect(grad.status).toBe('atende')
    expect(grad.evidencia).toMatch(/Biomedicina/)
    // os que não atende vêm primeiro
    expect(a.requisitos[0].status).toBe('nao_atende')
  })

  it('palavras-chave podem subir com a adaptação; a aderência não muda', () => {
    // "adaptação" que só acrescenta termos da vaga às habilidades
    const adaptada: ResumeSections = { ...ESPOSA, habilidades: [...ESPOSA.habilidades, 'Pesquisa clínica', 'ICH-GCP', 'EDC', 'CRF', 'Estudos clínicos'] }
    const kwAntes = compareKeywords(VAGA_PESQUISA, resumeComparableText(ESPOSA)).compat
    const kwDepois = compareKeywords(VAGA_PESQUISA, resumeComparableText(adaptada)).compat
    expect(kwDepois).toBeGreaterThan(kwAntes)
    // a aderência é sempre calculada sobre o ORIGINAL
    const original = buildAdherence(basicRequirements(VAGA_PESQUISA, ESPOSA, '', HOJE), '', true)!
    expect(original.nota).toBeLessThanOrEqual(TETO_OBRIGATORIO)
  })
})

describe('anúncios reais (formatos variados)', () => {
  it('títulos "Imprescindíveis:" e "Desejáveis:", linhas de local/horário e escolaridade', () => {
    const vaga = `Pessoa Auxiliar de Laboratório\nRequisitos e qualificações\n\nImprescindíveis:\n~ Ensino Médio Completo.\n\nDesejáveis:\n~ experiência em análises clínicas\n\nInformações adicionais\nUnidade Paulista\nHorário: Conforme disponibilidade das vagas.`
    const reqs = basicRequirements(vaga, ESPOSA, '', HOJE)
    expect(reqs.map((r) => [r.requisito, r.tipo, r.status])).toEqual([
      ['Ensino Médio Completo.', 'obrigatorio', 'atende'],
      ['experiência em análises clínicas', 'desejavel', 'atende'],
    ])
  })

  it('anúncio sem seção de requisitos: tarefas não viram requisito e a busca não usa o checklist', () => {
    const vaga = `* Realizar avaliações e procedimentos estéticos conforme sua habilitação.\n* Elaborar e apresentar planos de tratamento personalizados.`
    expect(requirementLines(vaga)).toEqual([])
    expect(hasRequirementsSection(vaga)).toBe(false)
    expect(hasRequirementsSection(VAGA_PESQUISA)).toBe(true)
  })

  it('linha cortada pela fonte ("...") fica de fora', () => {
    expect(requirementLines('Requisitos\n• Formação Superior Completa em...\n• Inglês avançado').map((r) => r.texto)).toEqual(['Inglês avançado'])
  })
})
