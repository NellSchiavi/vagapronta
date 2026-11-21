import { describe, expect, it } from 'vitest'
import { toPortugalVocabulary } from '../../supabase/functions/_shared/pt-pt'
import { PAISES } from '@/lib/paises'
import type { Resume } from '@/lib/resume'
import { countryForJob, effectiveFormat, personalLines, placeLine, resumePdfData, type ResumeOwner } from '@/lib/resume-format'
import { formatDate, formatPeriod, labelsFor } from '@/lib/resume-i18n'
import { applyTranslation, translationPayload } from '@/lib/resume-translate'

const owner: ResumeOwner = {
  name: 'Maria Teste',
  role: 'Biomédica',
  registry: 'CRBM 12345 · 1ª Região (SP)',
  contact: ['maria@example.com'],
  place: 'Campinas, SP',
  residenceCountry: 'BR',
  birthDate: '1990-03-04',
  citizenships: ['BR', 'IT'],
}

const resume = (over: Partial<Pick<Resume, 'country' | 'language' | 'template' | 'content'>> = {}) =>
  ({
    country: 'BR',
    language: 'pt-BR',
    template: 'classico',
    content: { sections: { resumo: 'Texto' } },
    ...over,
  }) as Pick<Resume, 'country' | 'language' | 'template' | 'content'>

describe('regras de formato por país', () => {
  it('todos os países têm tamanho, ordem das seções e dados pessoais definidos', () => {
    for (const p of PAISES) {
      expect(p.format.maxPages, p.code).toBeGreaterThan(0)
      expect(p.format.sectionOrder, p.code).toHaveLength(5)
      expect(new Set(p.format.sectionOrder).size, p.code).toBe(5)
    }
  })

  it('o que o país não permite nunca entra, mesmo que a pessoa marque', () => {
    const us = effectiveFormat('US', { foto: true, nascimento: true, cidadania: true, autorizacao: 'Green card' })
    expect(us).toEqual({ photo: false, birthDate: false, citizenship: false, permit: 'Green card' })
    const br = effectiveFormat('BR', { nascimento: true })
    expect(br.birthDate).toBe(false)
    expect(br.permit).toBeNull()
  })

  it('foto: padrão ligado onde é comum, desligado onde é opcional', () => {
    expect(effectiveFormat('DE').photo).toBe(true)
    expect(effectiveFormat('BR').photo).toBe(false)
    expect(effectiveFormat('BR', { foto: true }).photo).toBe(true)
    expect(effectiveFormat('DE', { foto: false }).photo).toBe(false)
  })

  it('dados pessoais saem no idioma da versão', () => {
    const f = effectiveFormat('DE')
    const lines = personalLines('de', f, owner)
    expect(lines[0]).toBe('Geburtsdatum: 04.03.1990')
    expect(lines[1]).toMatch(/^Staatsangehörigkeit: Brasilien, Italien$/)
    expect(personalLines('en', effectiveFormat('IE'), owner)).toEqual([])
  })

  it('cidade ganha o país quando o currículo é para fora', () => {
    expect(placeLine(owner, 'BR', 'pt-BR')).toBe('Campinas, SP')
    expect(placeLine(owner, 'US', 'en')).toBe('Campinas, SP, Brazil')
  })

  it('PDF: Itália com rodapé GDPR, Alemanha com cidade e data, Europass só onde é usado', () => {
    const it_ = resumePdfData(resume({ country: 'IT', language: 'it' }), owner)
    expect(it_.footerNote).toMatch(/GDPR/)
    expect(it_.sectionOrder?.[3]).toBe('idiomas')
    const de = resumePdfData(resume({ country: 'DE', language: 'de' }), owner)
    expect(de.closing).toMatch(/^Campinas, \d{2}\.\d{2}\.\d{4}$/)
    expect(resumePdfData(resume({ country: 'US', language: 'en', template: 'europass' }), owner).template).toBe('classico')
    expect(resumePdfData(resume({ country: 'PT', language: 'pt-PT', template: 'europass' }), owner).template).toBe('europass')
  })

  it('a explicação do registro e o cargo da versão só valem fora do Brasil / quando preenchidos', () => {
    const content = { sections: {}, registro_nota: 'CRBM: Brazilian Regional Council of Biomedicine', titulo: 'Biomedical Scientist' }
    expect(resumePdfData(resume({ country: 'GB', language: 'en', content }), owner).registryNote).toMatch(/Council/)
    expect(resumePdfData(resume({ country: 'GB', language: 'en', content }), owner).role).toBe('Biomedical Scientist')
    expect(resumePdfData(resume({ country: 'BR', content }), owner).registryNote).toBeUndefined()
  })

  it('vaga de outro país pede outra versão', () => {
    expect(countryForJob('PT', 'BR')).toBe('PT')
    expect(countryForJob('BR', 'BR')).toBeNull()
    expect(countryForJob(null, 'BR')).toBeNull()
    expect(countryForJob('XX', 'BR')).toBeNull()
  })
})

describe('textos e datas por idioma', () => {
  it('períodos', () => {
    expect(formatPeriod('2021-03', null, 'pt-BR')).toBe('mar/2021 – atual')
    expect(formatPeriod('2021-03', null, 'en')).toBe('Mar 2021 – Present')
    expect(formatPeriod('2021-03', '2023-11', 'de')).toBe('03/2021 – 11/2023')
    expect(formatDate('1990-03-04', 'en')).toBe('4 March 1990')
  })

  it('títulos das seções', () => {
    expect(labelsFor('it').sections.experiencias).toBe('Esperienza professionale')
    expect(labelsFor('pt-PT').sections.idiomas).toBe('Línguas')
    expect(labelsFor('xx').sections.resumo).toBe('Resumo')
  })
})

describe('tradução', () => {
  const sections = {
    resumo: 'Biomédica com 5 anos em laboratório.',
    experiencias: [{ cargo: 'Biomédica', empresa: 'Grupo Fleury', inicio: '2020-01', fim: null, local: 'São Paulo, SP', descricao: '• Realizei exames' }],
    formacao: [{ curso: 'Biomedicina', instituicao: 'UNIFESP', fim: '2019-12' }],
    habilidades: ['RT-PCR', 'Hematologia'],
    idiomas: ['Inglês avançado'],
  }

  it('só os textos vão para a IA', () => {
    const p = translationPayload(sections)
    expect(JSON.stringify(p)).not.toMatch(/Fleury|UNIFESP|2020|São Paulo/)
  })

  it('a resposta volta item a item; empresa, datas e cursos ficam iguais', () => {
    const out = applyTranslation(sections, {
      titulo: 'Biomedical Scientist',
      resumo: 'Biomedical scientist with 5 years in laboratory work.',
      experiencias: [{ cargo: 'Biomedical Scientist', descricao: '• Performed tests' }],
      habilidades: ['RT-PCR', 'Haematology'],
      idiomas: ['English – advanced'],
      registro_nota: '',
      avisos: [],
    })
    expect(out.experiencias?.[0]).toMatchObject({ cargo: 'Biomedical Scientist', empresa: 'Grupo Fleury', inicio: '2020-01', fim: null, local: 'São Paulo, SP' })
    expect(out.formacao).toEqual(sections.formacao)
    expect(out.habilidades).toEqual(['RT-PCR', 'Haematology'])
  })

  it('item que a IA deixou vazio mantém o original', () => {
    const out = applyTranslation(sections, { titulo: '', resumo: '', experiencias: [], habilidades: ['', ''], idiomas: [], registro_nota: '', avisos: [] })
    expect(out.resumo).toBe(sections.resumo)
    expect(out.habilidades).toEqual(sections.habilidades)
  })
})

describe('português de Portugal', () => {
  it('troca o vocabulário do Brasil, palavra inteira, mantendo maiúsculas', () => {
    expect(toPortugalVocabulary('Atendimento por celular e contato com a equipe.')).toBe('Atendimento por telemóvel e contacto com a equipa.')
    expect(toPortugalVocabulary('Equipe de 5 pessoas; Registro de amostras')).toBe('Equipa de 5 pessoas; Registo de amostras')
    expect(toPortugalVocabulary('Envio do currículo')).toBe('Envio do CV')
  })

  it('não mexe em partes de palavras nem em lacunas', () => {
    expect(toPortugalVocabulary('telas, telagem, [contato do gestor]')).toBe('ecrãs, telagem, [contato do gestor]')
    expect(toPortugalVocabulary('Equipamentos')).toBe('Equipamentos')
  })
})
