/**
 * POST /analisar-curriculo  { resume_id }
 * Gera a nota do currículo (geral e por critério) e sugestões por seção,
 * e guarda o resultado no histórico (resume_analyses) para mostrar a evolução.
 * As SUGESTÕES não alteram o currículo: cada uma só é aplicada quando a
 * pessoa toca em "Aplicar sugestão" (e pode desfazer).
 */
import { z } from 'npm:zod@3.24.1'
import { generateJson } from '../_shared/ai.ts'
import { requireUser } from '../_shared/auth.ts'
import { handle, HttpError, json } from '../_shared/http.ts'
import { consumeQuota } from '../_shared/quota.ts'
import { clip, COUNTRY_RULES, resumeToText, type ResumeContent } from '../_shared/resume.ts'

const score = z.coerce.number().transform((n) => Math.max(0, Math.min(100, Math.round(n))))

const analysisSchema = z.object({
  overall_score: score,
  scores: z.object({ ats: score, palavras_chave: score, estrutura: score, clareza: score }),
  summary: z.string().trim().min(1).max(500),
  suggestions: z
    .array(
      z.object({
        secao: z.enum(['resumo', 'experiencia', 'formacao', 'habilidades']),
        titulo: z.string().trim().min(1).max(120),
        explicacao: z.string().trim().min(1).max(400),
        antes: z.string().trim().default(''),
        depois: z.string().trim().min(1),
      }),
    )
    .max(8),
})
type Analysis = z.infer<typeof analysisSchema>

const SYSTEM = `Você é uma recrutadora brasileira experiente e especialista em ATS
(sistemas que as empresas usam para filtrar currículos). Avalie o currículo com honestidade e carinho,
em linguagem simples, calorosa e sem jargões — quem vai ler NÃO é da área de tecnologia.

Responda SOMENTE com um JSON neste formato:
{
  "overall_score": 0-100,
  "scores": { "ats": 0-100, "palavras_chave": 0-100, "estrutura": 0-100, "clareza": 0-100 },
  "summary": "uma ou duas frases sobre o currículo, começando pelo que está bom",
  "suggestions": [
    { "secao": "resumo" | "experiencia" | "formacao" | "habilidades",
      "titulo": "frase curta com a ação, ex.: Mostre resultados com números",
      "explicacao": "por que isso ajuda, em 1 ou 2 frases simples",
      "antes": "trecho EXATO copiado do currículo que será trocado, ou \\"\\" se for algo novo",
      "depois": "o texto novo, pronto para usar" }
  ]
}

Critérios:
- ats: o currículo é fácil de ler por sistemas (seções claras, sem tabelas/colunas, palavras-chave do cargo).
- palavras_chave: tem os termos que as vagas do cargo desejado costumam pedir.
- estrutura: ordem lógica, seções completas, tamanho adequado ao país.
- clareza: frases objetivas, verbos de ação, resultados concretos.
- overall_score: média ponderada que reflita o conjunto.

Regras das sugestões (de 3 a 6, as mais importantes primeiro):
- "resumo": "depois" é o parágrafo de resumo completo, novo ou reescrito (3 a 4 linhas). "antes" é o resumo atual ou "".
- "experiencia": "antes" é um trecho copiado EXATAMENTE de uma descrição de experiência; "depois" é a versão melhorada desse trecho.
- "habilidades": "antes" é ""; "depois" é uma lista separada por vírgulas SÓ com as habilidades novas a acrescentar.
- "formacao": "antes" é ""; "depois" é UM curso ou certificação a acrescentar, ex.: "Excel Avançado — Fundação Bradesco (online, gratuito)".
- Nunca invente experiências, empresas, datas ou números que não estejam no currículo. Para números, use marcadores como "[X]" para a pessoa completar.
- Escreva no idioma do currículo.`

/** Resposta de exemplo usada no modo de desenvolvimento (AI_PROVIDER=mock) */
function mockAnalysis(text: string, firstDescription: string | undefined, hasSummary: boolean): Analysis {
  const len = text.length
  const base = Math.min(88, 52 + Math.round(len / 120) + (hasSummary ? 8 : 0))
  const snippet = firstDescription?.split(/(?<=\.)\s/)[0]?.trim()
  const suggestions: Analysis['suggestions'] = [
    {
      secao: 'resumo',
      titulo: hasSummary ? 'Deixe o resumo mais direto' : 'Crie um resumo profissional',
      explicacao: 'Um resumo de 3 linhas no topo ajuda quem lê a entender seu perfil em poucos segundos.',
      antes: '',
      depois:
        'Profissional organizada e comunicativa, com experiência em rotinas administrativas e atendimento. Busco contribuir com processos bem feitos e uma boa experiência para as pessoas.',
    },
    {
      secao: 'habilidades',
      titulo: 'Acrescente habilidades que as vagas pedem',
      explicacao: 'Os sistemas das empresas procuram essas palavras. Inclua só as que você realmente tem.',
      antes: '',
      depois: 'Pacote Office, Comunicação clara, Organização',
    },
    {
      secao: 'formacao',
      titulo: 'Inclua um curso recente',
      explicacao: 'Cursos curtos mostram que você continua aprendendo. Este é gratuito e reconhecido.',
      antes: '',
      depois: 'Excel Avançado — Fundação Bradesco (online, gratuito)',
    },
  ]
  if (snippet) {
    suggestions.splice(1, 0, {
      secao: 'experiencia',
      titulo: 'Mostre resultados com números',
      explicacao: 'Números chamam atenção e mostram o tamanho do seu trabalho.',
      antes: snippet,
      depois: `${snippet.replace(/\.$/, '')}, com cerca de [X] atendimentos por mês.`,
    })
  }
  return {
    overall_score: base,
    scores: { ats: Math.min(100, base + 4), palavras_chave: Math.max(0, base - 9), estrutura: Math.min(100, base + 6), clareza: base - 1 },
    summary: 'Seu currículo está bem organizado e fácil de ler. Com algumas palavras-chave e resultados concretos, ele fica ainda mais forte.',
    suggestions,
  }
}

Deno.serve(
  handle(async (req, body) => {
    const { supabase, user } = await requireUser(req)
    const resumeId = typeof body.resume_id === 'string' ? body.resume_id : null
    if (!resumeId) throw new HttpError(400, 'Escolha um currículo para analisar.', 'sem_curriculo')

    const [{ data: resume, error }, { data: profile }] = await Promise.all([
      supabase.from('resumes').select('id, content, country').eq('id', resumeId).maybeSingle(),
      supabase.from('profiles').select('desired_role, city').eq('user_id', user.id).maybeSingle(),
    ])
    if (error) throw new HttpError(500, 'Não conseguimos abrir seu currículo agora. Tente de novo.', 'banco')
    if (!resume) throw new HttpError(404, 'Não encontramos esse currículo. Atualize a página.', 'nao_encontrado')

    const content = resume.content as ResumeContent
    const text = resumeToText(content)
    if (text.length < 80) {
      throw new HttpError(422, 'Seu currículo está quase vazio. Envie o PDF de novo ou cole o texto completo.', 'texto_curto')
    }

    await consumeQuota(supabase, 'analisar-curriculo')

    const prompt = [
      `Cargo desejado: ${profile?.desired_role || 'não informado'}`,
      `Cidade: ${profile?.city || 'não informada'}`,
      `País do currículo — ${COUNTRY_RULES[resume.country] ?? COUNTRY_RULES.BR}`,
      '',
      'Currículo:',
      '"""',
      clip(text),
      '"""',
    ].join('\n')

    const analysis = await generateJson({
      task: 'analisar-curriculo',
      system: SYSTEM,
      prompt,
      schema: analysisSchema,
      temperature: 0.3,
      mock: () => mockAnalysis(text, content.sections?.experiencias?.[0]?.descricao, Boolean(content.sections?.resumo)),
    })

    const { data: saved, error: saveError } = await supabase
      .from('resume_analyses')
      .insert({
        user_id: user.id,
        resume_id: resume.id,
        overall_score: analysis.overall_score,
        scores: analysis.scores,
        summary: analysis.summary,
        suggestions: analysis.suggestions.map((s) => ({ ...s, aplicada: false })),
      })
      .select()
      .single()
    if (saveError) {
      console.error('[analisar-curriculo] salvar', saveError)
      throw new HttpError(500, 'A análise ficou pronta, mas não conseguimos guardá-la. Tente de novo.', 'banco')
    }

    return json({ analysis: saved })
  }),
)
