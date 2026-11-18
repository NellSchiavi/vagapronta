import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase', () => ({ supabase: {} }))
vi.mock('@/lib/auth', () => ({ useAuth: () => ({}) }))

const { acceptSuggestion, pendingSuggestions } = await import('./preferences')

const cur = {
  links: [{ rotulo: 'GitHub', url: 'https://github.com/x' }],
  specializations: ['Análises clínicas'],
  certifications: [],
  desired_roles: ['Biomédica'],
  areas: [],
  languages: [{ idioma: 'Inglês', nivel: 'basico' as const }],
  seniority: [],
}

describe('sugestões do perfil', () => {
  it('ignora o que está vazio ou já igual', () => {
    const p = pendingSuggestions(
      { telefone: '(11) 9', cidade: null, cargos: ['biomédica', 'Analista de Laboratório'], areas: [], idiomas: [] },
      { phone: null, city: 'Santos', desired_roles: ['Biomédica'], areas: [] },
    )
    expect(p).toEqual({ telefone: '(11) 9', cargos: ['Analista de Laboratório'] })
  })

  it('aceitar soma às listas sem apagar nem repetir', () => {
    expect(acceptSuggestion('cargos', { cargos: ['Analista de Laboratório', 'biomédica'] }, cur).prefs).toEqual({
      desired_roles: ['Biomédica', 'Analista de Laboratório'],
    })
    expect(acceptSuggestion('especializacoes', { especializacoes: ['Microbiologia'] }, cur).profile).toEqual({
      specializations: ['Análises clínicas', 'Microbiologia'],
    })
    expect(acceptSuggestion('idiomas', { idiomas: [{ idioma: 'inglês', nivel: 'avancado' }] }, cur).prefs).toEqual({
      languages: [{ idioma: 'Inglês', nivel: 'basico' }],
    })
  })

  it('campos simples vão para o perfil', () => {
    expect(acceptSuggestion('telefone', { telefone: '(11) 98888-7777' }, cur).profile).toEqual({ phone: '(11) 98888-7777' })
    expect(acceptSuggestion('registro', { registro: { conselho: 'CRBM', numero: '1', regiao: 'SP' } }, cur).profile).toEqual({
      registry_council: 'CRBM',
      registry_number: '1',
      registry_region: 'SP',
    })
  })
})
