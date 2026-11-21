/**
 * POST /adaptar-vaga  { resume_id, job_text?, job_url?, job_id? }
 * Compara o currículo com uma vaga e propõe mudanças (palavras-chave,
 * habilidades e tom), com a compatibilidade antes e a estimativa depois.
 * NÃO grava nada: a pessoa marca o que aceita e salva uma nova versão na tela.
 */
import { z } from 'npm:zod@3.24.1'
import { generateJson } from '../_shared/ai.ts'
import { requireUser } from '../_shared/auth.ts'
import { fetchJobFromUrl } from '../_shared/fetch-job.ts'
import { cleanJobUrl } from '../_shared/links.ts'
import { handle, HttpError, json } from '../_shared/http.ts'
import { promptRules } from '../_shared/paises.ts'
import { redactPersonalData } from '../_shared/privacy.ts'
import { ADAPT_SYSTEM, careerStageGuidance, guardInventedNumbers } from '../_shared/prompts.ts'
import { consumeQuota } from '../_shared/quota.ts'
import { clip, resumeToText, type ResumeContent } from '../_shared/resume.ts'

const pct = z.coerce.number().transform((n) => Math.max(0, Math.min(100, Math.round(n))))
const optStr = z.union([z.string().trim(), z.null()]).optional().transform((v) => (v ? v : undefined))

const adaptSchema = z.object({
  vaga: z.object({
    titulo: z.string().trim().min(1).max(160),
    empresa: optStr,
    local: optStr,
    modalidade: z
      .union([z.enum(['presencial', 'hibrido', 'remoto']), z.null()])
      .optional()
      .catch(undefined),
    resumo: z.string().trim().max(600).default(''),
  }),
  compat_antes: pct,
  palavras_chave: z.array(z.string().trim().min(1)).max(15).default([]),
  mudancas: z
    .array(
      z.object({
        secao: z.enum(['resumo', 'experiencia', 'formacao', 'habilidades']),
        titulo: z.string().trim().min(1).max(140),
        motivo: z.string().trim().min(1).max(400),
        antes: z.string().trim().default(''),
        depois: z.string().trim().min(1),
        impacto: z.coerce.number().transform((n) => Math.max(0, Math.min(30, Math.round(n)))),
      }),
    )
    .min(1)
    .max(8),
})
type Adaptation = z.infer<typeof adaptSchema>


function mockAdaptation(resumeText: string, jobText: string, firstDescription?: string): Adaptation {
  const title = jobText.split('\n').map((l) => l.trim()).find((l) => l.length > 3)?.slice(0, 80) ?? 'Vaga'
  const snippet = firstDescription?.split(/(?<=\.)\s/)[0]?.trim()
  const mudancas: Adaptation['mudancas'] = [
    {
      secao: 'resumo',
      titulo: 'Use o nome do cargo da vaga no resumo',
      motivo: 'Os sistemas das empresas comparam o título do currículo com o da vaga.',
      antes: '',
      depois: `Profissional com experiência em ${title.toLowerCase()}, organizada e comunicativa, com foco em resultados e em uma boa experiência para as pessoas.`,
      impacto: 10,
    },
    {
      secao: 'habilidades',
      titulo: 'Inclua os termos que a vaga usa',
      motivo: 'A vaga cita essas palavras; inclua só as que você realmente domina.',
      antes: '',
      depois: 'Indicadores de desempenho, Comunicação com gestores, Organização de processos',
      impacto: 9,
    },
  ]
  if (snippet) {
    mudancas.push({
      secao: 'experiencia',
      titulo: 'Aproxime sua experiência do que a vaga pede',
      motivo: 'Mostrar o mesmo tipo de tarefa da vaga aumenta a compatibilidade.',
      antes: snippet,
      depois: `${snippet.replace(/\.$/, '')}, com foco nas rotinas citadas na vaga.`,
      impacto: 6,
    })
  }
  return {
    vaga: { titulo: title, empresa: 'Empresa da vaga', local: undefined, modalidade: undefined, resumo: 'Vaga de exemplo (modo de desenvolvimento).' },
    compat_antes: Math.min(70, 45 + Math.round(resumeText.length / 200)),
    palavras_chave: ['Comunicação', 'Organização', 'Indicadores'],
    mudancas,
  }
}

Deno.serve(
  handle(async (req, body) => {
    const { supabase, user } = await requireUser(req)
    const resumeId = typeof body.resume_id === 'string' ? body.resume_id : null
    const jobId = typeof body.job_id === 'string' ? body.job_id : null
    // sem rastreamento nem tokens (otpToken, trackingId…)
    const jobUrl = typeof body.job_url === 'string' && body.job_url.trim() ? cleanJobUrl(body.job_url) : ''
    let jobText = typeof body.job_text === 'string' ? body.job_text.trim() : ''
    if (!resumeId) throw new HttpError(400, 'Escolha qual currículo adaptar.', 'sem_curriculo')

    const [{ data: resume }, { data: profile }] = await Promise.all([
      supabase.from('resumes').select('id, content, country, language').eq('id', resumeId).maybeSingle(),
      supabase
        .from('profiles')
        .select('desired_role, career_stage, study_course, study_institution, study_period, study_expected_end')
        .eq('user_id', user.id)
        .maybeSingle(),
    ])
    if (!resume) throw new HttpError(404, 'Não encontramos esse currículo. Atualize a página.', 'nao_encontrado')
    const content = resume.content as ResumeContent
    if (!content.sections) {
      throw new HttpError(422, 'Organize seu currículo antes de adaptar. É rapidinho, na tela Currículo.', 'nao_organizado')
    }

    // de onde vem o anúncio: vaga salva, link ou texto colado
    let fetched: { title?: string; company?: string; location?: string } = {}
    if (jobId) {
      const { data: job } = await supabase.from('jobs').select('title, company, location, description').eq('id', jobId).maybeSingle()
      if (!job) throw new HttpError(404, 'Não encontramos essa vaga. Atualize a página.', 'vaga_nao_encontrada')
      // o anúncio completo colado na tela tem preferência sobre a descrição salva (às vezes resumida)
      jobText = [job.title, job.company, job.location, jobText || job.description].filter(Boolean).join('\n')
      fetched = { title: job.title, company: job.company ?? undefined, location: job.location ?? undefined }
    } else if (!jobText && jobUrl) {
      const f = await fetchJobFromUrl(jobUrl)
      jobText = f.text
      fetched = f
    }
    if (jobText.length < 150) {
      throw new HttpError(422, 'O anúncio está muito curto. Cole o texto completo da vaga, com as responsabilidades e requisitos.', 'vaga_curta')
    }

    const t0 = Date.now()
    const step = (s: string) => console.info(`[adaptar-vaga] ${s} (+${Date.now() - t0}ms)`)
    step(`vaga com ${jobText.length} caracteres`)
    const quota = await consumeQuota(supabase, 'adaptar-vaga')
    step('cota ok')

    const resumeText = resumeToText(content)
    const redacted = redactPersonalData(clip(resumeText, 12000))
    step('dados pessoais protegidos')
    const prompt = [
      `Cargo que a pessoa procura: ${profile?.desired_role || 'não informado'}`,
      `País do currículo — ${promptRules(resume.country)}`,
      resume.language && resume.language !== 'pt-BR' ? `Idioma desta versão do currículo: ${resume.language}. Escreva os textos sugeridos ("depois") nesse idioma.` : '',
      careerStageGuidance(profile?.career_stage, {
        curso: profile?.study_course,
        instituicao: profile?.study_institution,
        periodo: profile?.study_period,
        conclusao: profile?.study_expected_end,
      }),
      '',
      'ANÚNCIO DA VAGA:',
      '"""',
      clip(jobText, 10000),
      '"""',
      '',
      'CURRÍCULO ATUAL:',
      '"""',
      redacted.text,
      '"""',
    ].join('\n')

    const raw = await quota.guard(() => generateJson({
      task: 'adaptar-vaga',
      system: ADAPT_SYSTEM,
      prompt,
      schema: adaptSchema,
      temperature: 0.35,
      tier: 'standard',
      mock: () => mockAdaptation(resumeText, jobText, content.sections?.experiencias?.[0]?.descricao),
    }))
    step('resposta da IA validada')
    // nenhum número inventado chega à tela: o que não está no currículo nem no anúncio vira [X]
    raw.mudancas = raw.mudancas.map((m) => ({ ...m, depois: guardInventedNumbers(m.depois, [prompt]) }))
    const result = redacted.restore(raw)

    // dados lidos do próprio site têm preferência sobre o que a IA extraiu
    result.vaga.titulo = fetched.title || result.vaga.titulo
    result.vaga.empresa = fetched.company || result.vaga.empresa
    result.vaga.local = fetched.location || result.vaga.local

    const gain = result.mudancas.reduce((s, m) => s + m.impacto, 0)
    return json({
      adaptation: {
        ...result,
        compat_depois: Math.min(95, result.compat_antes + gain),
        vaga_texto: jobText,
        vaga_url: jobUrl || null,
        job_id: jobId,
      },
    })
  }),
)
