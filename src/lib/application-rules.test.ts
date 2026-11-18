import { describe, expect, it } from 'vitest'
import { addDays, statusChange } from './application-rules'

const today = '2026-11-18'
const base = { status: 'preparacao' as const, applied_on: null, follow_up_on: null }

describe('mudança de coluna', () => {
  it('para "Enviada": marca envio hoje e sugere retorno em 7 dias', () => {
    const r = statusChange(base, 'enviada', today)
    expect(r.patch).toEqual({ status: 'enviada', applied_on: today, follow_up_on: '2026-11-25' })
    expect(r.followUpSuggested).toBe('2026-11-25')
  })

  it('não sobrescreve um lembrete futuro que a pessoa já marcou', () => {
    const r = statusChange({ ...base, follow_up_on: '2026-12-01' }, 'enviada', today)
    expect(r.patch.follow_up_on).toBeUndefined()
    expect(r.followUpSuggested).toBeNull()
  })

  it('mantém a data de envio já informada', () => {
    const r = statusChange({ ...base, applied_on: '2026-11-10' }, 'enviada', today)
    expect(r.patch.applied_on).toBeUndefined()
    expect(r.followUpSuggested).toBe('2026-11-25')
  })

  it('"Oferta" e "Recusada" encerram o lembrete e trazem o clima certo', () => {
    expect(statusChange({ ...base, follow_up_on: '2026-11-20' }, 'oferta', today)).toMatchObject({
      patch: { status: 'oferta', follow_up_on: null },
      mood: 'oferta',
    })
    expect(statusChange(base, 'recusada', today).mood).toBe('recusada')
    expect(statusChange(base, 'entrevista', today).mood).toBeNull()
  })

  it('soma dias atravessando o mês', () => {
    expect(addDays('2026-11-28', 7)).toBe('2026-12-05')
  })
})
