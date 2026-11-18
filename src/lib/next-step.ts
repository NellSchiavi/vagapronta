/**
 * "Próximo passo sugerido" da tela Início.
 * Prioridade:
 *   1. sem currículo                    → enviar currículo
 *   2. currículo sem nota ou nota < 70  → melhorar o currículo
 *   3. follow-up vencido                → dar retorno para a empresa
 *   4. vaga nova acima de 85%           → adaptar o currículo para a vaga
 *   5. nada pendente                    → incentivo
 */

export const LOW_SCORE = 70
export const HIGH_MATCH = 85

export interface NextStepInput {
  hasResume: boolean
  latestScore: number | null
  /** candidaturas em andamento (enviada/entrevista) com data de follow-up */
  followUps: { id: string; company: string; follow_up_on: string | null; status: string }[]
  /** vagas com status "nova" */
  newJobs: { id: string; title: string; company: string | null; compatibility: number | null }[]
  /** vagas que já têm candidatura ou currículo adaptado (não sugerir de novo) */
  handledJobIds: Set<string>
  /** data de hoje no formato AAAA-MM-DD */
  today: string
}

export type NextStepKind = 'upload' | 'improve' | 'analyze' | 'follow-up' | 'adapt' | 'cheer'

export interface NextStep {
  kind: NextStepKind
  title: string
  description: string
  action: { label: string; to: string }
}

const ACTIVE_STATUSES = new Set(['enviada', 'entrevista'])

export function computeNextStep(input: NextStepInput): NextStep {
  if (!input.hasResume) {
    return {
      kind: 'upload',
      title: 'Envie seu currículo',
      description: 'Com ele a gente calcula sua nota, sugere melhorias e encontra vagas parecidas com você.',
      action: { label: 'Enviar currículo', to: '/curriculo' },
    }
  }

  if (input.latestScore === null) {
    return {
      kind: 'analyze',
      title: 'Descubra a nota do seu currículo',
      description: 'Em poucos segundos você recebe uma nota de 0 a 100 e dicas do que melhorar.',
      action: { label: 'Analisar currículo', to: '/curriculo' },
    }
  }

  if (input.latestScore < LOW_SCORE) {
    return {
      kind: 'improve',
      title: 'Melhore seu currículo',
      description: `Sua nota está em ${input.latestScore}. Com algumas sugestões aplicadas, ela pode passar de ${LOW_SCORE}.`,
      action: { label: 'Ver sugestões', to: '/curriculo' },
    }
  }

  const overdue = input.followUps
    .filter((a) => a.follow_up_on && a.follow_up_on <= input.today && ACTIVE_STATUSES.has(a.status))
    .sort((a, b) => (a.follow_up_on! < b.follow_up_on! ? -1 : 1))
  if (overdue.length) {
    const a = overdue[0]
    const late = a.follow_up_on! < input.today
    return {
      kind: 'follow-up',
      title: `Dê um retorno para ${a.company}`,
      description: late
        ? 'O lembrete que você marcou já passou. Uma mensagem curta mostra interesse e pode destravar o processo.'
        : 'Hoje é o dia do retorno que você marcou. Uma mensagem curta mostra interesse.',
      action: { label: 'Abrir candidatura', to: `/candidaturas?id=${a.id}` },
    }
  }

  const best = input.newJobs
    .filter((j) => (j.compatibility ?? 0) > HIGH_MATCH && !input.handledJobIds.has(j.id))
    .sort((a, b) => (b.compatibility ?? 0) - (a.compatibility ?? 0))[0]
  if (best) {
    const where = best.company ? `Vaga na empresa ${best.company}, com` : 'Essa vaga tem'
    return {
      kind: 'adapt',
      title: `Adapte seu currículo para ${best.title}`,
      description: `${where} ${best.compatibility}% de compatibilidade com você. Adaptar o currículo aumenta suas chances.`,
      action: { label: 'Adaptar', to: `/adaptar?vaga=${best.id}` },
    }
  }

  return {
    kind: 'cheer',
    title: 'Tudo em dia por aqui!',
    description: 'Você está cuidando bem da sua busca. Que tal dar uma olhada nas vagas novas?',
    action: { label: 'Ver vagas', to: '/vagas' },
  }
}
