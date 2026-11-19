/**
 * POST /buscar-vagas
 *  - pela tela ("Buscar agora"): com o JWT da pessoa; até 5 buscas manuais por dia.
 *  - pelo agendamento diário (pg_cron): cabeçalho x-cron-secret = CRON_SECRET;
 *    busca para todas as pessoas que concluíram o início.
 *
 * Distribui a busca pelos destinos na ordem de preferência (pesos em
 * _shared/destinos.ts), estima a compatibilidade SEM IA (custo zero) e grava
 * só vagas novas. O currículo é usado só aqui dentro, para comparar palavras:
 * nada da pessoa é enviado às fontes, só o termo de busca do cargo e o país.
 */
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2.49.1'
import { requireUser } from '../_shared/auth.ts'
import { distributeSearch } from '../_shared/destinos.ts'
import { handle, HttpError, json } from '../_shared/http.ts'
import type { ResumeContent } from '../_shared/resume.ts'
import { exampleJobs } from '../_shared/vagas/exemplo.ts'
import { keySourcesMissing, queriesFor, type SourceQuery } from '../_shared/vagas/fontes.ts'
import { estimateMatch, isExcluded, remoteFromBrazil, requiredLanguage, visaSponsorship, type FoundJob } from '../_shared/vagas/regras.ts'

/** vagas novas por busca, divididas entre os destinos */
const PER_RUN = 30
/** abaixo disso a vaga nem aparece (quase sem relação com o perfil) */
const MIN_SCORE = 35
const MANUAL_PER_DAY = 5

type Mode = 'real' | 'mock' | 'offline'
const mode = (): Mode => {
  const m = Deno.env.get('JOBS_MODE')
  return m === 'mock' || m === 'offline' ? m : 'real'
}

function adminClient() {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

/**
 * Usa o cache da consulta se ainda estiver dentro do intervalo pedido pela
 * fonte; senão consulta de novo. Se a fonte falhar, usa o cache antigo.
 */
async function cached(admin: SupabaseClient, q: SourceQuery, memo: Map<string, Promise<FoundJob[]>>): Promise<FoundJob[]> {
  if (!memo.has(q.key)) {
    memo.set(
      q.key,
      (async () => {
        const { data: row } = await admin.from('source_cache').select('jobs, fetched_at').eq('key', q.key).maybeSingle()
        const fresh = row && Date.now() - new Date(row.fetched_at).getTime() < q.minIntervalMin * 60_000
        if (fresh) return row.jobs as FoundJob[]
        if (mode() === 'offline') return (row?.jobs as FoundJob[]) ?? []
        try {
          const jobs = await q.run()
          await admin.from('source_cache').upsert({ key: q.key, jobs, fetched_at: new Date().toISOString() })
          console.info(`[buscar-vagas] ${q.key}: ${jobs.length} vagas`)
          return jobs
        } catch (err) {
          console.warn(`[buscar-vagas] ${q.key} falhou: ${(err as Error).message}`)
          if (row) return row.jobs as FoundJob[]
          throw err
        }
      })(),
    )
  }
  return memo.get(q.key)!
}

interface RunResult {
  found: number
  inserted: number
  sources: Record<string, number>
  failed: string[]
  mode: 'real' | 'exemplo'
}

async function searchForUser(admin: SupabaseClient, userId: string, trigger: 'agendada' | 'manual', memo: Map<string, Promise<FoundJob[]>>): Promise<RunResult> {
  const [{ data: prefs }, { data: profile }, { data: dests }, { data: resume }] = await Promise.all([
    admin.from('job_preferences').select('*').eq('user_id', userId).maybeSingle(),
    admin.from('profiles').select('desired_role, city').eq('user_id', userId).maybeSingle(),
    admin.from('job_destinations').select('country_code').eq('user_id', userId).order('priority'),
    admin.from('resumes').select('content').eq('user_id', userId).eq('is_principal', true).maybeSingle(),
  ])

  const roles: string[] = prefs?.desired_roles?.length ? prefs.desired_roles : profile?.desired_role ? [profile.desired_role] : []
  if (!roles.length) {
    throw new HttpError(422, 'Conte qual cargo você procura em Meu perfil para buscarmos vagas.', 'sem_cargo')
  }
  const destinations: string[] = dests?.length ? dests.map((d) => d.country_code) : ['BR']
  const city: string | null = prefs?.cities?.[0] ?? profile?.city ?? null
  const content = (resume?.content ?? {}) as ResumeContent
  // só o que diz o que a pessoa sabe fazer: habilidades, cursos e experiências (sem contato)
  const s = content.sections
  const resumeText = s
    ? [...s.habilidades, ...s.cursos, ...s.experiencias.map((e) => `${e.cargo} ${e.descricao ?? ''}`)].join('\n')
    : (content.raw_text ?? '')
  const match = { roles, resumeText, include: prefs?.keywords_include ?? [], workModes: prefs?.work_modes ?? [], seniority: prefs?.seniority ?? [] }

  // o que a pessoa já tem (inclusive descartadas) não volta
  const { data: existing } = await admin.from('jobs').select('source, external_id').eq('user_id', userId).not('external_id', 'is', null)
  const known = new Set((existing ?? []).map((e) => `${e.source}:${e.external_id}`))

  const sources: Record<string, number> = {}
  const failed = new Set<string>()
  const answered = new Set<string>()
  let found = 0
  let usedExamples = false
  const rows: Record<string, unknown>[] = []
  const missingKeys = keySourcesMissing()

  for (const { code: dest, count } of distributeSearch(PER_RUN, destinations)) {
    let pool: FoundJob[] = []
    for (const q of queriesFor(dest, roles, city)) {
      try {
        const jobs = await cached(admin, q, memo)
        pool.push(...jobs)
        answered.add(q.source)
      } catch {
        failed.add(q.source)
      }
    }
    // fontes com chave ainda não ligadas: vagas de exemplo no modo de desenvolvimento
    if (mode() !== 'real' && missingKeys.includes('jooble')) {
      const ex = exampleJobs(dest, roles)
      if (ex.length) usedExamples = true
      pool.push(...ex)
    }

    // sem repetir (a mesma vaga pode vir de duas consultas)
    const seen = new Set<string>()
    pool = pool.filter((j) => {
      const k = `${j.source}:${j.external_id}`
      if (seen.has(k) || known.has(k)) return false
      seen.add(k)
      return true
    })
    found += pool.length

    const ranked = pool
      .filter((j) => !isExcluded(j, prefs?.keywords_exclude ?? [], prefs?.blocked_companies ?? []))
      .map((j) => {
        const text = `${j.title}\n${j.description}`
        const remote = remoteFromBrazil(j)
        const lang = requiredLanguage(text)
        return { j, remote, lang, visa: visaSponsorship(text, j.visa_sponsorship), m: estimateMatch(j, match) }
      })
      // para o Brasil, vaga remota que não aceita quem mora aqui não serve
      .filter((x) => !(dest === 'BR' && x.remote === false))
      .filter((x) => x.m.score >= MIN_SCORE)
      .sort((a, b) => b.m.score - a.m.score)
      .slice(0, count)

    for (const { j, remote, lang, visa, m } of ranked) {
      known.add(`${j.source}:${j.external_id}`)
      sources[j.source] = (sources[j.source] ?? 0) + 1
      rows.push({
        user_id: userId,
        source: j.source,
        external_id: j.external_id,
        title: j.title.slice(0, 200),
        company: j.company,
        location: j.location,
        work_mode: j.work_mode,
        url: j.url || null,
        source_url: j.source_url || null,
        description: j.description,
        salary: j.salary,
        compatibility: m.score,
        match_notes: { estimada: true, termos: m.terms, ...(j.example ? { exemplo: true } : {}) },
        status: 'nova',
        published_at: j.published_at,
        destination: dest,
        country: j.country,
        // idioma só vira aviso quando não é o português
        language_required: lang && lang !== 'pt' ? lang : null,
        visa_sponsorship: dest === 'BR' ? null : visa,
        remote_from_brazil: remote,
      })
    }
  }

  if (rows.length) {
    const { error } = await admin.from('jobs').insert(rows)
    if (error) {
      console.error('[buscar-vagas] gravar', error)
      throw new HttpError(500, 'Encontramos vagas, mas não conseguimos guardar. Tente de novo.', 'gravar')
    }
  }
  // "falhou" = a fonte não respondeu em nenhuma consulta
  const result: RunResult = { found, inserted: rows.length, sources, failed: [...failed].filter((s) => !answered.has(s)), mode: usedExamples ? 'exemplo' : 'real' }
  await admin.from('job_search_runs').insert({ user_id: userId, trigger, found, inserted: rows.length, sources, mode: result.mode })
  return result
}

Deno.serve(
  handle(async (req) => {
    const admin = adminClient()
    const memo = new Map<string, Promise<FoundJob[]>>()

    const secret = Deno.env.get('CRON_SECRET')
    if (secret && req.headers.get('x-cron-secret') === secret) {
      const { data: people } = await admin.from('profiles').select('user_id').not('onboarded_at', 'is', null)
      let ok = 0
      for (const p of people ?? []) {
        try {
          await searchForUser(admin, p.user_id, 'agendada', memo)
          ok++
        } catch (err) {
          console.warn(`[buscar-vagas] agendada ${p.user_id}: ${(err as Error).message}`)
        }
      }
      return json({ ok: true, people: ok })
    }

    const { user } = await requireUser(req)
    // nas últimas 24 h
    const { count } = await admin
      .from('job_search_runs')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('trigger', 'manual')
      .gte('created_at', new Date(Date.now() - 24 * 3600_000).toISOString())
    if ((count ?? 0) >= MANUAL_PER_DAY) {
      throw new HttpError(429, 'Você já buscou bastante hoje. As vagas novas chegam sozinhas todas as manhãs.', 'limite_busca')
    }
    return json(await searchForUser(admin, user.id, 'manual', memo))
  }),
)
