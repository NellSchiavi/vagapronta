/**
 * POST /gerar-carta  { resume_id, tone, job_id?, job_text? }
 * Escreve uma carta de apresentação para a vaga, no tom pedido.
 * NÃO grava nada: a tela mostra a carta e só salva quando a pessoa confirma.
 */
import { z } from 'npm:zod@3.24.1'
import { generateJson } from '../_shared/ai.ts'
import { requireUser } from '../_shared/auth.ts'
import { handle, HttpError, json } from '../_shared/http.ts'
import { countryInfo } from '../_shared/paises.ts'
import { redactPersonalData } from '../_shared/privacy.ts'
import { careerStageGuidance, guardInventedNumbers, LETTER_SYSTEM } from '../_shared/prompts.ts'
import { consumeQuota } from '../_shared/quota.ts'
import { clip, resumeToText, type ResumeContent } from '../_shared/resume.ts'

const TONES = ['formal', 'caloroso', 'direto'] as const
type Tone = (typeof TONES)[number]

const letterSchema = z.object({
  titulo: z.string().trim().min(1).max(160),
  carta: z.string().trim().min(200).max(4000),
})

const LANGUAGE_NAMES: Record<string, string> = {
  'pt-BR': 'português do Brasil',
  'pt-PT': 'português de Portugal',
  en: 'inglês',
  es: 'espanhol',
  fr: 'francês',
  de: 'alemão',
  it: 'italiano',
  nl: 'holandês',
}

function mockLetter(name: string, title: string, company: string | undefined, tone: Tone) {
  const hello = tone === 'formal' ? `Prezada equipe de recrutamento${company ? ` da ${company}` : ''},` : `Olá, equipe${company ? ` da ${company}` : ''}!`
  const bye = tone === 'formal' ? 'Atenciosamente,' : tone === 'caloroso' ? 'Com carinho,' : 'Obrigada,'
  return {
    titulo: [title, company].filter(Boolean).join(' — '),
    carta: `${hello}

Escrevo para me candidatar à vaga de ${title}. Ao ler o anúncio, reconheci muitas das tarefas que já faço no meu dia a dia e fiquei com muita vontade de contribuir com o time.

Na minha experiência atual, cuido de rotinas que exigem organização, atenção aos detalhes e uma boa comunicação com as pessoas. Gosto de deixar os processos claros e de ajudar quem chega a se sentir bem-vindo desde o primeiro dia.

Acredito que posso somar com a minha dedicação e com a vontade de continuar aprendendo. Fico à disposição para conversarmos e contar mais sobre como posso ajudar.

${bye}
${name}`,
  }
}

Deno.serve(
  handle(async (req, body) => {
    const { supabase, user } = await requireUser(req)
    const resumeId = typeof body.resume_id === 'string' ? body.resume_id : null
    const jobId = typeof body.job_id === 'string' ? body.job_id : null
    let jobText = typeof body.job_text === 'string' ? body.job_text.trim() : ''
    const tone: Tone = TONES.includes(body.tone as Tone) ? (body.tone as Tone) : 'caloroso'
    if (!resumeId) throw new HttpError(400, 'Escolha qual currículo usar na carta.', 'sem_curriculo')

    const [{ data: resume }, { data: profile }] = await Promise.all([
      supabase.from('resumes').select('id, content, country').eq('id', resumeId).maybeSingle(),
      supabase
        .from('profiles')
        .select('full_name, preferences, career_stage, study_course, study_institution, study_period, study_expected_end')
        .eq('user_id', user.id)
        .maybeSingle(),
    ])
    if (!resume) throw new HttpError(404, 'Não encontramos esse currículo. Atualize a página.', 'nao_encontrado')

    let title = ''
    let company: string | undefined
    if (jobId) {
      const { data: job } = await supabase.from('jobs').select('title, company, location, description').eq('id', jobId).maybeSingle()
      if (!job) throw new HttpError(404, 'Não encontramos essa vaga. Atualize a página.', 'vaga_nao_encontrada')
      title = job.title
      company = job.company ?? undefined
      jobText = [job.title, job.company, job.location, jobText || job.description].filter(Boolean).join('\n')
    }
    if (jobText.length < 80) {
      throw new HttpError(422, 'Precisamos do anúncio da vaga para escrever a carta. Cole o texto do anúncio.', 'vaga_curta')
    }

    const resumeText = resumeToText(resume.content as ResumeContent)
    if (resumeText.length < 80) {
      throw new HttpError(422, 'Seu currículo está quase vazio. Envie ou organize o currículo antes de criar a carta.', 'texto_curto')
    }

    const quota = await consumeQuota(supabase, 'carta')

    const prefs = (profile?.preferences ?? {}) as { resume_language?: string }
    const langCode = prefs.resume_language || countryInfo(resume.country).languages[0].code
    const language = LANGUAGE_NAMES[langCode] ?? 'português do Brasil'
    const name = profile?.full_name?.trim() || '[seu nome]'

    const redacted = redactPersonalData(clip(resumeText, 12000))
    // o nome da pessoa não vai para a IA: ela escreve [NOME] e o app troca depois
    const prompt = [
      `Tom pedido: ${tone}`,
      `Idioma da carta: ${language}`,
      'Assinatura: use o marcador [NOME].',
      careerStageGuidance(profile?.career_stage, {
        curso: profile?.study_course,
        instituicao: profile?.study_institution,
        periodo: profile?.study_period,
        conclusao: profile?.study_expected_end,
      }),
      '',
      'ANÚNCIO DA VAGA:',
      '"""',
      clip(jobText, 8000),
      '"""',
      '',
      'CURRÍCULO DA PESSOA:',
      '"""',
      redacted.text,
      '"""',
    ].join('\n')

    const raw = await quota.guard(() => generateJson({
      task: 'gerar-carta',
      system: LETTER_SYSTEM,
      prompt,
      schema: letterSchema,
      temperature: 0.6,
      tier: 'standard',
      mock: () => mockLetter('[NOME]', title || 'a vaga', company, tone),
    }))
    // nenhum número inventado: o que não está no currículo nem no anúncio vira [X]
    raw.carta = guardInventedNumbers(raw.carta, [prompt]).replace(/\[NOME\]/g, name)
    const letter = redacted.restore(raw)

    return json({ letter: { ...letter, tone, job_id: jobId, job_text: jobId ? null : jobText } })
  }),
)
