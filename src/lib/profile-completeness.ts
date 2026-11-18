/**
 * "Perfil completo": considera SÓ os campos essenciais para a busca de vagas.
 * Campos opcionais e específicos de profissão (registro, habilitações,
 * certificações, links…) nunca reduzem a porcentagem.
 */
export interface CompletenessInput {
  full_name: string | null | undefined
  city: string | null | undefined
  desired_roles: string[]
  work_modes: string[]
  cities: string[]
}

export interface MissingField {
  label: string
  /** id do campo na tela Meu perfil (para levar direto até ele) */
  field: string
}

const ESSENTIALS: { label: string; field: string; ok: (p: CompletenessInput) => boolean }[] = [
  { label: 'Seu nome', field: 'perfil-nome', ok: (p) => Boolean(p.full_name?.trim()) },
  { label: 'Cargos que você procura', field: 'pref-cargos', ok: (p) => p.desired_roles.length > 0 },
  {
    label: 'Cidade (ou trabalho remoto)',
    field: 'perfil-cidade',
    ok: (p) => Boolean(p.city?.trim()) || p.cities.length > 0 || p.work_modes.includes('remoto'),
  },
  { label: 'Modalidade de trabalho', field: 'pref-modalidade', ok: (p) => p.work_modes.length > 0 },
]

export function profileCompleteness(p: CompletenessInput) {
  const missing: MissingField[] = ESSENTIALS.filter((e) => !e.ok(p)).map(({ label, field }) => ({ label, field }))
  const percent = Math.round(((ESSENTIALS.length - missing.length) / ESSENTIALS.length) * 100)
  return { percent, missing }
}
