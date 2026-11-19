/**
 * POST /melhorar-secao  { tipo: "resumo" | "experiencia" | "habilidades", texto, cargo_alvo?, contexto? }
 * "Melhorar com IA" do editor de currículo: devolve UMA sugestão para a parte
 * enviada. NÃO grava nada: a tela mostra a sugestão e só usa se a pessoa aceitar.
 */
import { z } from 'npm:zod@3.24.1'
import { generateJson } from '../_shared/ai.ts'
import { requireUser } from '../_shared/auth.ts'
import { handle, HttpError, json } from '../_shared/http.ts'
import { redactPersonalData } from '../_shared/privacy.ts'
import { IMPROVE_SYSTEM } from '../_shared/prompts.ts'
import { consumeQuota } from '../_shared/quota.ts'
import { clip } from '../_shared/resume.ts'

const KINDS = ['resumo', 'experiencia', 'habilidades'] as const
type Kind = (typeof KINDS)[number]

const LABEL: Record<Kind, string> = {
  resumo: 'Resumo',
  experiencia: 'Descrição de uma experiência',
  habilidades: 'Habilidades',
}

const schema = z.object({
  texto: z.string().min(1),
  dica: z.string().default(''),
})

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '')

/** Resposta de exemplo no modo de desenvolvimento (AI_PROVIDER=mock) */
function mock(kind: Kind, text: string) {
  if (kind === 'habilidades') {
    const items = [
      ...new Set(
        text
          .split(/[,;\n]/)
          .map((s) => s.trim())
          .filter(Boolean),
      ),
    ]
    return {
      texto: items.join(', '),
      dica: 'Juntei as repetidas e deixei uma lista limpa.',
    }
  }
  if (kind === 'experiencia') {
    const parts = text
      .split(/(?<=[.;])\s+|\n+/)
      .map((s) => s.trim().replace(/[.;]$/, ''))
      .filter(Boolean)
    return {
      texto: parts.map((p) => `• ${p.charAt(0).toUpperCase()}${p.slice(1)}`).join('\n'),
      dica: 'Organizei em tópicos curtos, um por tarefa.',
    }
  }
  return {
    texto: text.replace(/\s+/g, ' ').trim(),
    dica: 'Deixei o resumo mais direto.',
  }
}

Deno.serve(
  handle(async (req, body) => {
    const { supabase } = await requireUser(req)
    const kind = KINDS.find((k) => k === body.tipo)
    if (!kind) throw new HttpError(400, 'Escolha uma parte do currículo para melhorar.', 'tipo_invalido')
    const text = str(body.texto, 4000)
    if (text.length < 15) {
      throw new HttpError(422, 'Escreva um pouco mais nesta parte antes de pedir ajuda à IA.', 'texto_curto')
    }
    const target = str(body.cargo_alvo, 120)
    const ctx = (body.contexto ?? {}) as Record<string, unknown>
    const role = str(ctx.cargo, 120)
    const company = str(ctx.empresa, 120)

    const quota = await consumeQuota(supabase, 'melhorar-secao')

    // dados pessoais não saem do servidor: vão marcadores e voltam os valores originais
    const redacted = redactPersonalData(clip(text, 4000))
    const prompt = [
      `Parte do currículo: ${LABEL[kind]} ("${kind}")`,
      target ? `Cargo que a pessoa procura: ${target}` : '',
      kind === 'experiencia' && (role || company) ? `Experiência: ${[role, company].filter(Boolean).join(' · ')}` : '',
      `Texto atual:\n"""\n${redacted.text}\n"""`,
    ]
      .filter(Boolean)
      .join('\n')

    const out = await quota.guard(() =>
      generateJson({
        task: 'melhorar-secao',
        system: IMPROVE_SYSTEM,
        prompt,
        schema,
        temperature: 0.3,
        tier: 'lite',
        mock: () => mock(kind, redacted.text),
      }),
    )
    return json({ sugestao: redacted.restore(out) })
  }),
)
