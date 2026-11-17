export type CountryCode = 'BR' | 'US' | 'DE' | 'CH'

export interface CountryInfo {
  code: CountryCode
  name: string
  /** resumo curto exibido no onboarding */
  summary: string
}

export const COUNTRIES: CountryInfo[] = [
  { code: 'BR', name: 'Brasil', summary: 'Foto opcional, até 2 páginas, dados de contato e cidade.' },
  { code: 'US', name: 'Estados Unidos', summary: 'Sem foto, idade ou estado civil. Uma página, direto ao ponto.' },
  { code: 'DE', name: 'Alemanha', summary: 'Foto profissional é comum. Ordem cronológica e até 2 páginas.' },
  { code: 'CH', name: 'Suíça', summary: 'Foto, nacionalidade e permissão de trabalho. Até 2 páginas.' },
]

export const countryName = (code: string) => COUNTRIES.find((c) => c.code === code)?.name ?? code
