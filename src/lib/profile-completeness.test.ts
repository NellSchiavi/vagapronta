import { describe, expect, it } from 'vitest'
import { profileCompleteness } from './profile-completeness'

const empty = { full_name: '', city: '', desired_roles: [], work_modes: [], cities: [] }

describe('perfil completo', () => {
  it('só os 4 campos essenciais contam', () => {
    expect(profileCompleteness(empty).percent).toBe(0)
    const full = profileCompleteness({ full_name: 'Ana', city: 'Santos, SP', desired_roles: ['Biomédica'], work_modes: ['presencial'], cities: [] })
    expect(full.percent).toBe(100)
    expect(full.missing).toEqual([])
  })

  it('trabalho remoto conta no lugar da cidade', () => {
    const r = profileCompleteness({ ...empty, full_name: 'Nelson', desired_roles: ['Engenheiro de Dados'], work_modes: ['remoto'] })
    expect(r.percent).toBe(100)
  })

  it('aponta o primeiro campo que falta, para levar direto até ele', () => {
    const r = profileCompleteness({ ...empty, full_name: 'Ana' })
    expect(r.percent).toBe(25)
    expect(r.missing[0]).toEqual({ label: 'Cargos que você procura', field: 'pref-cargos' })
  })
})
