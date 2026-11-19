/**
 * POST /sugerir-perfil  { resume_id }
 * Lê o currículo (ou o PDF do LinkedIn) e devolve SUGESTÕES para o perfil.
 * Só traz o que está escrito no documento (telefone, cidade, links, idiomas,
 * registro, especializações, certificações) e sugere cargos/áreas/nível.
 * NÃO grava nada no perfil: a tela mostra para a pessoa aceitar ou ignorar.
 */
import { z } from 'npm:zod@3.24.1'
import { generateJson } from '../_shared/ai.ts'
import { requireUser } from '../_shared/auth.ts'
import { handle, HttpError, json } from '../_shared/http.ts'
import { redactPersonalData } from '../_shared/privacy.ts'
import { PROFILE_SUGGEST_SYSTEM } from '../_shared/prompts.ts'
import { consumeQuota } from '../_shared/quota.ts'
import { clip, resumeToText, type ResumeContent } from '../_shared/resume.ts'

const optStr = z.union([z.string().trim(), z.null()]).optional().transform((v) => (v ? v : null))
const NIVEIS = ['basico', 'intermediario', 'avancado', 'fluente', 'nativo'] as const

const suggestSchema = z.object({
  telefone: optStr,
  cidade: optStr,
  linkedin: optStr,
  links: z.array(z.object({ rotulo: z.string().trim().min(1), url: z.string().trim().min(1) })).default([]),
  idiomas: z
    .array(z.object({ idioma: z.string().trim().min(1), nivel: z.enum(NIVEIS).catch('intermediario') }))
    .default([]),
  registro: z
    .union([z.object({ conselho: optStr, numero: optStr, regiao: optStr }), z.null()])
    .optional()
    .transform((r) => (r?.conselho ? r : null)),
  especializacoes: z.array(z.string().trim().min(1)).default([]),
  certificacoes: z
    .array(z.object({ nome: z.string().trim().min(1), emissor: optStr, validade: optStr }))
    .default([]),
  cargos: z.array(z.string().trim().min(1)).max(4).default([]),
  areas: z.array(z.string().trim().min(1)).max(4).default([]),
  nivel: z.union([z.enum(['estagio', 'trainee', 'junior', 'pleno', 'senior']), z.null()]).optional().catch(null),
  momento: z
    .union([z.enum(['na_area', 'primeiro_emprego', 'estudante', 'mudando_area', 'voltando']), z.null()])
    .optional()
    .catch(null),
})

Deno.serve(
  handle(async (req, body) => {
    const { supabase } = await requireUser(req)
    const resumeId = typeof body.resume_id === 'string' ? body.resume_id : null
    if (!resumeId) throw new HttpError(400, 'Escolha um currículo.', 'sem_curriculo')

    const { data: resume } = await supabase.from('resumes').select('content').eq('id', resumeId).maybeSingle()
    if (!resume) throw new HttpError(404, 'Não encontramos esse currículo. Atualize a página.', 'nao_encontrado')
    const content = resume.content as ResumeContent
    // texto original (tem o contato) ou, se não houver, as seções
    const text = (content.raw_text && content.raw_text.length > 80 ? content.raw_text : resumeToText(content)).trim()
    if (text.length < 80) throw new HttpError(422, 'O currículo está muito curto para sugerir dados do perfil.', 'texto_curto')

    const quota = await consumeQuota(supabase, 'sugerir-perfil')
    const redacted = redactPersonalData(clip(text))
    const raw = await quota.guard(() => generateJson({
      task: 'sugerir-perfil',
      system: PROFILE_SUGGEST_SYSTEM,
      prompt: `Documento:\n"""\n${redacted.text}\n"""`,
      schema: suggestSchema,
      temperature: 0.1,
      tier: 'lite',
      mock: () => ({
        telefone: redacted.text.match(/\[TELEFONE_\d+\]/)?.[0] ?? null,
        cidade: null,
        linkedin: null,
        links: [],
        idiomas: [],
        registro: null,
        especializacoes: [],
        certificacoes: [],
        cargos: [],
        areas: [],
        nivel: null,
        momento: null,
      }),
    }))

    // garantia extra: telefone e links só valem se vieram do documento (marcadores reais)
    const isToken = (v: string | null, kind: string) => !v || new RegExp(`^\\[${kind}_\\d+\\]$`).test(v) || redacted.text.includes(v)
    if (!isToken(raw.telefone, 'TELEFONE')) raw.telefone = null
    if (!isToken(raw.linkedin, 'LINK')) raw.linkedin = null
    raw.links = raw.links.filter((l) => isToken(l.url, 'LINK'))

    const out = redacted.restore(raw)
    // um link que não é do LinkedIn (ex.: GitHub) vai para "outros links", com o rótulo certo
    if (out.linkedin && !/linkedin\./i.test(out.linkedin)) {
      const host = out.linkedin.replace(/^https?:\/\//, '').split('/')[0].replace(/^www\./, '')
      const rotulo = /github/i.test(host) ? 'GitHub' : /lattes/i.test(host) ? 'Lattes' : /gitlab/i.test(host) ? 'GitLab' : 'Site'
      out.links = [{ rotulo, url: out.linkedin }, ...out.links]
      out.linkedin = null
    }
    return json({ suggestions: out })
  }),
)
