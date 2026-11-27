/**
 * "Próximo passo sugerido" da tela Início.
 * Prioridade:
 *   1. sem currículo                    → enviar currículo
 *   2. currículo sem nota ou nota < 70  → melhorar o currículo
 *   3. follow-up vencido                → dar retorno para a empresa
 *   4. vaga nova acima de 85%           → adaptar o currículo para a vaga
 *   5. nada pendente                    → incentivo
 */
import { jobScore } from '@/lib/job-score'
import type { MatchNotes } from '@/lib/types'

/** "72% aderência" ou "80% palavras-chave" (nunca uma "compatibilidade" sem dizer qual) */
function scoreText(j: { compatibility: number | null; match_notes?: MatchNotes | null }) {
  const s = jobScore(j)
  return s ? `${s.value}% ${s.kind === 'aderencia' ? 'aderência' : 'palavras-chave'}` : ''
}

export const LOW_SCORE = 70
export const HIGH_MATCH = 85

export interface NextStepInput {
  hasResume: boolean
  /** o currículo principal já foi separado em seções (necessário para analisar e aplicar sugestões) */
  isOrganized: boolean
  latestScore: number | null
  /** candidaturas em andamento (enviada/entrevista) com data de follow-up */
  followUps: { id: string; company: string; follow_up_on: string | null; status: string }[]
  /** vagas com status "nova" */
  newJobs: { id: string; title: string; company: string | null; compatibility: number | null; match_notes?: MatchNotes | null }[]
  /** vagas que já têm candidatura ou currículo adaptado (não sugerir de novo) */
  handledJobIds: Set<string>
  /** data de hoje no formato AAAA-MM-DD */
  today: string
  /** perfil completo (só campos essenciais) e o primeiro campo que falta */
  profile?: { percent: number; field: string | null }
}

export type NextStepKind = 'upload' | 'organize' | 'improve' | 'analyze' | 'follow-up' | 'profile' | 'adapt' | 'cheer'

export interface NextStep {
  kind: NextStepKind
  title: string
  /** rótulo curto acima da descrição, ex.: "Natura · 91% compatível" */
  meta?: string
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

  if (!input.isOrganized) {
    return {
      kind: 'organize',
      title: 'Organize seu currículo',
      description: 'A IA separa suas experiências, formação e habilidades. Você confere antes de guardar.',
      action: { label: 'Organizar com IA', to: '/curriculo' },
    }
  }

  if (input.latestScore === null) {
    return {
      kind: 'analyze',
      title: 'Descubra a nota do seu currículo',
      description: 'Em poucos segundos você recebe uma nota de 0 a 100 e dicas do que melhorar.',
      action: { label: 'Analisar meu currículo', to: '/curriculo' },
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

  if (input.profile && input.profile.percent < 100) {
    return {
      kind: 'profile',
      title: 'Complete seu perfil para receber vagas melhores',
      meta: `Perfil ${input.profile.percent}% completo`,
      description: 'Faltam só alguns dados essenciais, como os cargos que você procura e a modalidade de trabalho.',
      action: { label: 'Completar perfil', to: input.profile.field ? `/perfil?campo=${input.profile.field}` : '/perfil' },
    }
  }

  const best = input.newJobs
    .filter((j) => (j.compatibility ?? 0) > HIGH_MATCH && !input.handledJobIds.has(j.id))
    .sort((a, b) => (b.compatibility ?? 0) - (a.compatibility ?? 0))[0]
  if (best) {
    return {
      kind: 'adapt',
      title: `Adapte seu currículo para ${best.title}`,
      meta: [best.company, scoreText(best)].filter(Boolean).join(' · '),
      description: 'Uma vaga que combina muito com você. Ajustar o currículo para ela aumenta suas chances.',
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
