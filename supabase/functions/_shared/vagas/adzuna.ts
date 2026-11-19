/**
 * Adzuna — DESLIGADA. A API não é gratuita (só libera chamadas de teste;
 * o uso real exige cartão e plano pago). O código fica aqui, isolado, caso
 * um dia valha a pena. Para ligar: ADZUNA_ENABLED=true + ADZUNA_APP_ID e
 * ADZUNA_APP_KEY nos secrets, e incluir adzuna() em queriesFor (fontes.ts).
 */
import { htmlToText } from '../fetch-job.ts'
import { ADZUNA_COUNTRIES } from '../destinos.ts'
import type { SourceQuery } from './fontes.ts'

interface AdzunaJob {
  id: string; title: string; description?: string; redirect_url: string; created?: string
  company?: { display_name?: string }; location?: { display_name?: string }
  salary_min?: number; salary_max?: number
}

export function adzuna(dest: string, role: string, category?: string): SourceQuery[] {
  if (Deno.env.get('ADZUNA_ENABLED') !== 'true') return []
  const id = Deno.env.get('ADZUNA_APP_ID')
  const key = Deno.env.get('ADZUNA_APP_KEY')
  if (!id || !key) return []
  return (ADZUNA_COUNTRIES[dest] ?? []).map((cc) => ({
    key: `adzuna:${cc}:${role}:${category ?? ''}`,
    source: 'adzuna',
    minIntervalMin: 60,
    run: async () => {
      const u = new URL(`https://api.adzuna.com/v1/api/jobs/${cc}/search/1`)
      u.searchParams.set('app_id', id)
      u.searchParams.set('app_key', key)
      u.searchParams.set('what', role)
      u.searchParams.set('results_per_page', '30')
      if (category) u.searchParams.set('category', category)
      const res = await fetch(u)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = (await res.json()) as { results?: AdzunaJob[] }
      return (data.results ?? []).map((j) => ({
        source: 'adzuna',
        external_id: j.id,
        title: htmlToText(j.title),
        company: j.company?.display_name ?? null,
        location: j.location?.display_name ?? null,
        country: cc.toUpperCase(),
        work_mode: null,
        url: j.redirect_url,
        source_url: j.redirect_url,
        description: htmlToText(j.description ?? ''),
        salary: j.salary_min ? `${j.salary_min}–${j.salary_max ?? ''}` : null,
        published_at: j.created ?? null,
        visa_sponsorship: null,
        regions: [],
      }))
    },
  }))
}
