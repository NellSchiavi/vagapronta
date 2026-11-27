/**
 * POST /adaptar-vaga  { resume_id, job_text?, job_url?, job_id? }
 * Compara o currículo com uma vaga e propõe mudanças (palavras-chave,
 * habilidades e tom). Devolve duas notas:
 *  - palavras-chave da vaga (antes e com as mudanças), calculada aqui;
 *  - aderência aos requisitos (nota principal), avaliada numa chamada SEPARADA
 *    sobre o currículo ORIGINAL: a adaptação não consegue aumentá-la.
 * NÃO grava nada: a pessoa marca o que aceita e salva uma nova versão na tela.
 */
import { z } from 'npm:zod@3.24.1'
import { generateJson, isAiFailure } from '../_shared/ai.ts'
import { basicRequirements, buildAdherence, resumePieces, type Requirement } from '../_shared/aderencia.ts'
import { basicAdaptation, containsTerm, jobKeywords, normalize, resumeComparableText } from '../_shared/basico.ts'
import { requireUser } from '../_shared/auth.ts'
import { fetchJobFromUrl } from '../_shared/fetch-job.ts'
import { cleanJobUrl } from '../_shared/links.ts'
import { handle, HttpError, json } from '../_shared/http.ts'
import { promptRules } from '../_shared/paises.ts'
import { redactPersonalData } from '../_shared/privacy.ts'
import { ADAPT_SYSTEM, careerStageGuidance, guardInventedNumbers, REQUIREMENTS_SYSTEM } from '../_shared/prompts.ts'
import { consumeQuota } from '../_shared/quota.ts'
import { clip, resumeToText, type ResumeContent } from '../_shared/resume.ts'

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
  palavras_chave: z.array(z.string().trim().min(1)).max(15).default([]),
  mudancas: z
    .array(
      z.object({
        secao: z.enum(['resumo', 'experiencia', 'formacao', 'habilidades']),
        titulo: z.string().trim().min(1).max(140),
        motivo: z.string().trim().min(1).max(400),
        antes: z.string().trim().default(''),
        depois: z.string().trim().min(1),
      }),
    )
    .min(1)
    .max(8),
})
type Adaptation = z.infer<typeof adaptSchema>

const requirementsSchema = z.object({
  requisitos: z
    .array(
      z.object({
        requisito: z.string().trim().min(1).max(200),
        tipo: z.enum(['obrigatorio', 'desejavel']).catch('obrigatorio'),
        categoria: z.enum(['experiencia', 'formacao', 'registro', 'ferramenta', 'idioma', 'outro']).catch('outro'),
        status: z.enum(['atende', 'parcial', 'nao_atende']),
        evidencia: z.union([z.string(), z.null()]).optional().transform((v) => (v ?? '').trim().slice(0, 300)),
        dica: z.union([z.string(), z.null()]).optional().transform((v) => (v ?? '').trim().slice(0, 400)),
      }),
    )
    .max(14),
})

/** % das palavras-chave da vaga que aparecem no texto, e quais aparecem */
function keywordScore(keywords: string[], textNorm: string) {
  const presentes = keywords.filter((k) => containsTerm(textNorm, k))
  return { presentes, nota: keywords.length ? Math.round((100 * presentes.length) / keywords.length) : 0 }
}



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
    },
    {
      secao: 'habilidades',
      titulo: 'Inclua os termos que a vaga usa',
      motivo: 'A vaga cita essas palavras; inclua só as que você realmente domina.',
      antes: '',
      depois: 'Indicadores de desempenho, Comunicação com gestores, Organização de processos',
    },
  ]
  if (snippet) {
    mudancas.push({
      secao: 'experiencia',
      titulo: 'Aproxime sua experiência do que a vaga pede',
      motivo: 'Mostrar o mesmo tipo de tarefa da vaga aumenta a compatibilidade.',
      antes: snippet,
      depois: `${snippet.replace(/\.$/, '')}, com foco nas rotinas citadas na vaga.`,
    })
  }
  return {
    vaga: { titulo: title, empresa: 'Empresa da vaga', local: undefined, modalidade: undefined, resumo: 'Vaga de exemplo (modo de desenvolvimento).' },
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
    const jobBlock = ['ANÚNCIO DA VAGA:', '"""', clip(jobText, 10000), '"""'].join('\n')
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
      jobBlock,
      '',
      'CURRÍCULO ATUAL:',
      '"""',
      redacted.text,
      '"""',
    ].join('\n')

    // a aderência é avaliada à parte, sempre com o currículo ORIGINAL (sem as mudanças sugeridas)
    const today = new Date().toISOString().slice(0, 10)
    const reqPrompt = [`Data de hoje: ${today}`, '', jobBlock, '', 'CURRÍCULO (original):', '"""', redacted.text, '"""'].join('\n')

    const isOk = <T>(r: PromiseSettledResult<T>): r is PromiseFulfilledResult<T> => r.status === 'fulfilled'
    let aiAdapt: Adaptation | null = null
    let aiReqs: Requirement[] | null = null
    try {
      const [a, r] = await quota.guard(async () => {
        const results = await Promise.allSettled([
          generateJson({
            task: 'adaptar-vaga',
            system: ADAPT_SYSTEM,
            prompt,
            schema: adaptSchema,
            temperature: 0.35,
            tier: 'standard',
            userEmail: user.email,
            mock: () => mockAdaptation(resumeText, jobText, content.sections?.experiencias?.[0]?.descricao),
          }),
          generateJson({
            task: 'aderencia',
            system: REQUIREMENTS_SYSTEM,
            prompt: reqPrompt,
            schema: requirementsSchema,
            temperature: 0.1,
            tier: 'standard',
            userEmail: user.email,
            mock: () => ({ requisitos: basicRequirements(jobText, content.sections) }),
          }),
        ] as const)
        for (const x of results) if (x.status === 'rejected' && !isAiFailure(x.reason)) throw x.reason
        // as duas falharam: devolve a cota (quota.guard) e usa o modo básico
        if (results[0].status === 'rejected' && results[1].status === 'rejected') throw results[0].reason
        return results
      })
      if (isOk(a)) aiAdapt = a.value as Adaptation
      if (isOk(r)) aiReqs = redacted.restore(r.value).requisitos as Requirement[]
    } catch (err) {
      if (!isAiFailure(err)) throw err
    }
    step(`IA: adaptação ${aiAdapt ? 'ok' : 'básica'}, aderência ${aiReqs ? 'ok' : 'básica'}`)

    // ---- aderência aos requisitos (nota principal), sempre sobre o currículo ORIGINAL
    const pieces = resumePieces(content.sections).join('\n')
    const aderencia =
      (aiReqs && buildAdherence(aiReqs, pieces, false, jobText)) ?? buildAdherence(basicRequirements(jobText, content.sections), pieces, true)

    // ---- adaptação (palavras-chave e mudanças)
    type Change = Adaptation['mudancas'][number] & { impacto?: number }
    let result: Omit<Adaptation, 'mudancas'> & { mudancas: Change[]; basica?: true; aviso?: string }
    if (aiAdapt) {
      // nenhum número inventado chega à tela: o que não está no currículo nem no anúncio vira [X]
      aiAdapt.mudancas = aiAdapt.mudancas.map((m) => ({ ...m, depois: guardInventedNumbers(m.depois, [prompt]) }))
      result = redacted.restore(aiAdapt) as typeof result
      // dados lidos do próprio site têm preferência sobre o que a IA extraiu
      result.vaga.titulo = fetched.title || result.vaga.titulo
      result.vaga.empresa = fetched.company || result.vaga.empresa
      result.vaga.local = fetched.location || result.vaga.local
      if (!result.palavras_chave.length) result.palavras_chave = jobKeywords(jobText)
    } else {
      const basic = basicAdaptation({
        jobText,
        sections: content.sections,
        title: fetched.title,
        company: fetched.company,
        location: fetched.location,
        language: resume.language,
      })
      result = { vaga: basic.vaga, palavras_chave: basic.palavras_chave, mudancas: basic.mudancas, basica: true, aviso: basic.aviso }
    }

    // palavras-chave: calculadas aqui (não pela IA), no currículo original e com cada mudança
    const originalNorm = resumeComparableText(content.sections)
    const kw = keywordScore(result.palavras_chave, originalNorm)
    const missing = result.palavras_chave.filter((k) => !kw.presentes.includes(k))
    const perKeyword = result.palavras_chave.length ? 100 / result.palavras_chave.length : 0
    const mudancas = result.mudancas.map((m) => {
      const cobre = missing.filter((k) => containsTerm(normalize(m.depois), k))
      return { ...m, cobre, impacto: Math.round(cobre.length * perKeyword) }
    })
    const covered = new Set([...kw.presentes, ...mudancas.flatMap((m) => m.cobre)])
    const after = result.palavras_chave.length ? Math.round((100 * covered.size) / result.palavras_chave.length) : 0

    return json({
      adaptation: {
        ...result,
        mudancas,
        // "compat_*" = palavras-chave da vaga (o que a adaptação melhora); a nota principal é a aderência
        compat_antes: kw.nota,
        compat_depois: after,
        palavras_presentes: kw.presentes,
        palavras_faltando: missing,
        aderencia,
        vaga_texto: jobText,
        vaga_url: jobUrl || null,
        job_id: jobId,
      },
    })
  }),
)
