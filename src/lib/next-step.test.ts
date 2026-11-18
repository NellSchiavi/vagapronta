import { describe, expect, it } from 'vitest'
import { computeNextStep, type NextStepInput } from './next-step'
import { greetingFor } from './greeting'

const base: NextStepInput = {
  hasResume: true,
  latestScore: 80,
  followUps: [],
  newJobs: [],
  handledJobIds: new Set(),
  today: '2026-11-17',
}

describe('computeNextStep', () => {
  it('sem currículo pede o envio, mesmo com outras pendências', () => {
    const s = computeNextStep({
      ...base,
      hasResume: false,
      latestScore: null,
      followUps: [{ id: 'a', company: 'X', follow_up_on: '2026-11-01', status: 'enviada' }],
    })
    expect(s.kind).toBe('upload')
    expect(s.action.to).toBe('/curriculo')
  })

  it('currículo sem análise pede a primeira nota', () => {
    expect(computeNextStep({ ...base, latestScore: null }).kind).toBe('analyze')
  })

  it('nota abaixo de 70 pede melhoria (69 sim, 70 não)', () => {
    expect(computeNextStep({ ...base, latestScore: 69 }).kind).toBe('improve')
    expect(computeNextStep({ ...base, latestScore: 70 }).kind).toBe('cheer')
  })

  it('follow-up vencido vem antes de vaga nova e escolhe o mais antigo', () => {
    const s = computeNextStep({
      ...base,
      followUps: [
        { id: 'b', company: 'Stone', follow_up_on: '2026-11-15', status: 'enviada' },
        { id: 'c', company: 'Ambev', follow_up_on: '2026-11-10', status: 'entrevista' },
        { id: 'd', company: 'Futuro', follow_up_on: '2026-11-20', status: 'enviada' },
      ],
      newJobs: [{ id: 'j', title: 'Analista', company: 'Magalu', compatibility: 95 }],
    })
    expect(s.kind).toBe('follow-up')
    expect(s.title).toBe('Dê um retorno para Ambev')
    expect(s.action.to).toBe('/candidaturas?id=c')
  })

  it('ignora follow-up de candidatura encerrada', () => {
    const s = computeNextStep({
      ...base,
      followUps: [{ id: 'x', company: 'Y', follow_up_on: '2026-11-01', status: 'recusada' }],
    })
    expect(s.kind).toBe('cheer')
  })

  it('follow-up marcado para hoje também conta', () => {
    const s = computeNextStep({
      ...base,
      followUps: [{ id: 'x', company: 'Y', follow_up_on: '2026-11-17', status: 'enviada' }],
    })
    expect(s.kind).toBe('follow-up')
  })

  it('sugere a vaga nova mais compatível acima de 85%, pulando as já tratadas', () => {
    const s = computeNextStep({
      ...base,
      newJobs: [
        { id: '1', title: 'Analista de RH jr', company: 'Magalu', compatibility: 95 },
        { id: '2', title: 'Assistente de DP', company: 'Natura', compatibility: 91 },
        { id: '3', title: 'Recrutadora', company: 'iFood', compatibility: 85 },
      ],
      handledJobIds: new Set(['1']),
    })
    expect(s.kind).toBe('adapt')
    expect(s.title).toBe('Adapte seu currículo para Assistente de DP')
    expect(s.description).toContain('Vaga na empresa Natura, com 91%')
    expect(s.action.to).toBe('/adaptar?vaga=2')
  })

  it('85% exatos não contam como alta compatibilidade', () => {
    const s = computeNextStep({ ...base, newJobs: [{ id: '3', title: 'R', company: 'i', compatibility: 85 }] })
    expect(s.kind).toBe('cheer')
  })
})

describe('greetingFor', () => {
  const at = (h: number) => new Date(2026, 10, 17, h, 0)
  it('separa manhã, tarde e noite', () => {
    expect(greetingFor(at(5))).toBe('Bom dia')
    expect(greetingFor(at(11))).toBe('Bom dia')
    expect(greetingFor(at(12))).toBe('Boa tarde')
    expect(greetingFor(at(17))).toBe('Boa tarde')
    expect(greetingFor(at(18))).toBe('Boa noite')
    expect(greetingFor(at(2))).toBe('Boa noite')
  })
})
