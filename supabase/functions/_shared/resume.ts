// Currículo: schemas (zod), formatação para os prompts e regras por país
import { z } from 'npm:zod@3.24.1'

const str = z.string().trim()
const optStr = z.union([str, z.null()]).optional().transform((v) => (v ? v : undefined))

export const sectionsSchema = z.object({
  contato: z
    .object({ email: optStr, telefone: optStr, cidade: optStr, linkedin: optStr })
    .partial()
    .optional(),
  resumo: optStr,
  experiencias: z
    .array(
      z.object({
        cargo: str,
        empresa: str,
        local: optStr,
        inicio: optStr,
        fim: z.union([str, z.null()]).optional(),
        descricao: optStr,
      }),
    )
    .default([]),
  formacao: z
    .array(z.object({ curso: str, instituicao: str, inicio: optStr, fim: z.union([str, z.null()]).optional() }))
    .default([]),
  habilidades: z.array(str).default([]),
  idiomas: z.array(str).default([]),
  cursos: z.array(str).default([]),
})
export type ResumeSections = z.infer<typeof sectionsSchema>

export interface ResumeContent {
  raw_text?: string
  sections?: ResumeSections | null
}

/** Transforma o currículo em texto legível para a IA */
export function resumeToText(content: ResumeContent): string {
  const s = content.sections
  if (!s) return (content.raw_text ?? '').trim()

  const lines: string[] = []
  const c = s.contato ?? {}
  const contact = [c.email, c.telefone, c.cidade, c.linkedin].filter(Boolean).join(' · ')
  if (contact) lines.push(`CONTATO: ${contact}`)
  if (s.resumo) lines.push(`\nRESUMO\n${s.resumo}`)
  if (s.experiencias?.length) {
    lines.push('\nEXPERIÊNCIA')
    for (const e of s.experiencias) {
      const period = [e.inicio, e.fim ?? 'atual'].filter(Boolean).join(' – ')
      lines.push(`- ${e.cargo} | ${e.empresa}${e.local ? ` | ${e.local}` : ''}${period ? ` | ${period}` : ''}`)
      if (e.descricao) lines.push(`  ${e.descricao}`)
    }
  }
  if (s.formacao?.length) {
    lines.push('\nFORMAÇÃO')
    for (const f of s.formacao) lines.push(`- ${f.curso} | ${f.instituicao}${f.fim ? ` | ${f.fim}` : ''}`)
  }
  if (s.cursos?.length) lines.push(`\nCURSOS\n${s.cursos.map((x) => `- ${x}`).join('\n')}`)
  if (s.habilidades?.length) lines.push(`\nHABILIDADES\n${s.habilidades.join(', ')}`)
  if (s.idiomas?.length) lines.push(`\nIDIOMAS\n${s.idiomas.join(', ')}`)
  return lines.join('\n').trim()
}

export const COUNTRY_RULES: Record<string, string> = {
  BR: 'Brasil: foto opcional (mais comum não colocar); evitar CPF, RG e estado civil; até 2 páginas; cidade e contato no topo.',
  US: 'Estados Unidos: sem foto, idade, estado civil ou nacionalidade; 1 página; verbos de ação e resultados com números; em inglês.',
  DE: 'Alemanha (Lebenslauf): foto profissional é comum; ordem cronológica inversa com datas mês/ano; até 2 páginas; em alemão ou inglês.',
  CH: 'Suíça: foto, nacionalidade e permissão de trabalho costumam aparecer; até 2 páginas; idioma da região (alemão, francês ou italiano) ou inglês.',
}

/** Limita o tamanho do texto enviado para a IA */
export function clip(text: string, max = 15000) {
  return text.length > max ? `${text.slice(0, max)}\n[…texto cortado…]` : text
}
