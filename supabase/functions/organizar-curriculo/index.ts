/**
 * POST /organizar-curriculo  { resume_id }
 * Lê o texto do currículo (PDF, texto colado ou PDF do LinkedIn) e devolve
 * as seções organizadas. NÃO grava nada: a tela mostra o resultado e só
 * salva quando a pessoa confirma.
 */
import { generateJson } from '../_shared/ai.ts'
import { requireUser } from '../_shared/auth.ts'
import { handle, HttpError, json } from '../_shared/http.ts'
import { redactPersonalData } from '../_shared/privacy.ts'
import { consumeQuota } from '../_shared/quota.ts'
import { clip, sectionsSchema, type ResumeContent, type ResumeSections } from '../_shared/resume.ts'

const SYSTEM = `Você organiza currículos brasileiros em seções.
Leia o texto (que pode ter vindo de um PDF, inclusive do PDF de perfil do LinkedIn, com quebras de linha estranhas)
e devolva SOMENTE um JSON com este formato:
{
  "contato": { "email": string?, "telefone": string?, "cidade": string?, "linkedin": string? },
  "resumo": string?,                         // parágrafo de apresentação, se existir
  "experiencias": [ { "cargo": string, "empresa": string, "local": string?, "inicio": "AAAA-MM"?, "fim": "AAAA-MM" | null, "descricao": string? } ],
  "formacao": [ { "curso": string, "instituicao": string, "inicio": "AAAA"?, "fim": "AAAA"? } ],
  "habilidades": [string],
  "idiomas": [string],                       // ex.: "Inglês (intermediário)"
  "cursos": [string]                         // cursos livres e certificações
}
Regras:
- NÃO invente nada. Use só o que está no texto. Se algo não existir, omita o campo ou use lista vazia.
- "resumo" é SÓ um parágrafo de apresentação escrito pela pessoa. O cargo/título no topo (ex.: "Assistente
  Administrativa") NÃO é resumo: nesse caso omita "resumo".
- "cidade" é só cidade e estado (ex.: "Campinas, SP"). Nunca coloque endereço nem marcadores [ENDERECO_x] em "cidade".
- "fim": null quando for o emprego atual.
- Mantenha o texto em português, corrigindo apenas quebras de linha e espaços.
- Experiências da mais recente para a mais antiga.
- No PDF do LinkedIn, ignore "Contato", "Principais competências" duplicadas, números de página e "Page X of Y".
- Dados pessoais foram trocados por marcadores como [EMAIL_1], [TELEFONE_1], [LINK_1], [ENDERECO_1].
  Copie esses marcadores EXATAMENTE como estão para os campos de contato (ex.: "email": "[EMAIL_1]").`

/** Organização simples usada no modo de desenvolvimento (AI_PROVIDER=mock) */
function mockSections(text: string): ResumeSections {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)
  const find = (re: RegExp) => lines.findIndex((l) => re.test(l))
  const block = (start: number) => {
    if (start < 0) return []
    const out: string[] = []
    for (let i = start + 1; i < lines.length; i++) {
      if (/^(experi[eê]ncia|forma[cç][aã]o|habilidades|compet[eê]ncias|idiomas|cursos|resumo)/i.test(lines[i])) break
      out.push(lines[i])
    }
    return out
  }
  const exp = block(find(/^experi[eê]ncia/i))
  const edu = block(find(/^forma[cç][aã]o/i))
  const skills = block(find(/^(habilidades|compet[eê]ncias)/i))
  const email = text.match(/[\w.+-]+@[\w-]+\.[\w.]+/)?.[0]
  return {
    contato: { email },
    resumo: block(find(/^resumo/i)).join(' ') || undefined,
    experiencias: exp.length ? [{ cargo: exp[0].split(/ na | - | \| /)[0], empresa: exp[0].split(/ na | - | \| /)[1]?.replace(/\(.*$/, '').trim() || 'Empresa', descricao: exp.slice(0).join(' ') }] : [],
    formacao: edu.length ? [{ curso: edu[0].split(/ - | — | \| /)[0], instituicao: edu[0].split(/ - | — | \| /)[1] ?? '' }] : [],
    habilidades: skills.join(', ').split(/[,;]/).map((s) => s.trim()).filter(Boolean),
    idiomas: [],
    cursos: [],
  }
}

Deno.serve(
  handle(async (req, body) => {
    const { supabase } = await requireUser(req)
    const resumeId = typeof body.resume_id === 'string' ? body.resume_id : null
    if (!resumeId) throw new HttpError(400, 'Escolha um currículo para organizar.', 'sem_curriculo')

    const { data: resume, error } = await supabase.from('resumes').select('id, content').eq('id', resumeId).maybeSingle()
    if (error) throw new HttpError(500, 'Não conseguimos abrir seu currículo agora. Tente de novo.', 'banco')
    if (!resume) throw new HttpError(404, 'Não encontramos esse currículo. Atualize a página.', 'nao_encontrado')

    const text = ((resume.content as ResumeContent)?.raw_text ?? '').trim()
    if (text.length < 80) {
      throw new HttpError(422, 'O texto do currículo está muito curto para organizar. Envie o PDF de novo ou cole o texto completo.', 'texto_curto')
    }

    await consumeQuota(supabase, 'organizar-curriculo')

    // dados pessoais não saem do servidor: vão marcadores e voltam os valores originais
    const redacted = redactPersonalData(clip(text))
    const sections = await generateJson({
      task: 'organizar-curriculo',
      system: SYSTEM,
      prompt: `Texto do currículo:\n"""\n${redacted.text}\n"""`,
      schema: sectionsSchema,
      temperature: 0.1,
      tier: 'lite',
      mock: () => mockSections(redacted.text),
    })

    // garantia extra: endereço completo não vai para o campo "cidade"
    const c = sections.contato
    if (c?.cidade && /\[(ENDERECO|CEP)_\d+\]/.test(c.cidade)) {
      const city = c.cidade.replace(/\[(ENDERECO|CEP)_\d+\]/g, '').replace(/^[\s,–-]+|[\s,–-]+$/g, '')
      c.cidade = city || undefined
    }

    return json({ sections: redacted.restore(sections) })
  }),
)
