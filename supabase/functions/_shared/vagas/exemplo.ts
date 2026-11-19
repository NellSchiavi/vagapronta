/**
 * Vagas de EXEMPLO (JOBS_MODE=mock): ocupam o lugar das fontes que precisam
 * de chave (Jooble) enquanto a chave não existe, para testar a tela com vagas
 * presenciais do Brasil e de Portugal. Sempre marcadas como exemplo na tela,
 * sem link de candidatura. Empresas fictícias.
 */
import type { FoundJob } from './regras.ts'

const PLACES: Record<string, { city: string; companies: string[] }> = {
  BR: { city: 'São Paulo, SP', companies: ['Empresa Exemplo Alfa', 'Instituto Exemplo Beta', 'Grupo Exemplo Gama'] },
  PT: { city: 'Lisboa', companies: ['Exemplo Lisboa Lda.', 'Clínica Exemplo do Porto', 'Exemplo Tech Portugal'] },
}

export function exampleJobs(dest: string, roles: string[], day = new Date().toISOString().slice(0, 10)): FoundJob[] {
  const place = PLACES[dest]
  if (!place) return []
  return roles.slice(0, 2).flatMap((role, r) =>
    place.companies.slice(0, 2).map((company, i) => {
      const mode = (['presencial', 'hibrido'] as const)[(r + i) % 2]
      return {
        source: 'exemplo',
        external_id: `${dest}-${day}-${r}-${i}`,
        title: role,
        company,
        location: place.city,
        country: dest,
        work_mode: mode,
        url: '',
        source_url: '',
        description:
          `Vaga de exemplo para testar a tela (a fonte com chave ainda não foi ligada). ` +
          `Procuramos ${role} para atuar em ${place.city}, em regime ${mode === 'presencial' ? 'presencial' : 'híbrido'}. ` +
          `Responsabilidades: rotinas da área, registro de resultados, controle de qualidade e comunicação com a equipe. ` +
          `Requisitos: formação na área, organização, boa comunicação.`,
        salary: null,
        published_at: new Date().toISOString(),
        visa_sponsorship: null,
        regions: [],
        example: true,
      }
    }),
  )
}
