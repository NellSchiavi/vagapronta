/**
 * Regras do editor de currículo: datas no formato da tela, listas e limpeza
 * antes de gravar (testes em resume-edit.test.ts).
 */
import type { Education, Experience, ResumeSections } from './resume'

export function emptySections(): ResumeSections {
  return {
    resumo: '',
    experiencias: [],
    formacao: [],
    habilidades: [],
    idiomas: [],
    cursos: [],
  }
}

/** "2021-03" → "03/2021"; "2018" → "2018" (como a pessoa digita) */
export function dateToField(v?: string | null) {
  if (!v) return ''
  const m = v.match(/^(\d{4})-(\d{2})/)
  return m ? `${m[2]}/${m[1]}` : v
}

/** "3/2021" ou "03/2021" → "2021-03"; "2018" fica "2018"; o resto fica como foi escrito */
export function fieldToDate(v: string) {
  const t = v.trim()
  const m = t.match(/^(\d{1,2})\s*[/.-]\s*(\d{4})$/)
  if (m && Number(m[1]) >= 1 && Number(m[1]) <= 12) return `${m[2]}-${m[1].padStart(2, '0')}`
  return t
}

/** Texto separado por vírgula (ou ponto e vírgula) → lista sem vazios nem repetidos */
export function splitList(text: string) {
  const seen = new Set<string>()
  return text
    .split(/[,;\n]/)
    .map((s) => s.trim())
    .filter((s) => s && !seen.has(s.toLowerCase()) && seen.add(s.toLowerCase()))
}

/** Uma linha por item (cursos) */
export function splitLines(text: string) {
  return text
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
}

const hasText = (...v: (string | null | undefined)[]) => v.some((x) => x && x.trim())

/** Tira itens vazios e espaços sobrando (o que vai para o banco e para o PDF) */
export function cleanSections(s: ResumeSections): ResumeSections {
  const exp: Experience[] = (s.experiencias ?? [])
    .filter((e) => hasText(e.cargo, e.empresa, e.descricao))
    .map((e) => ({
      ...e,
      cargo: e.cargo.trim(),
      empresa: e.empresa.trim(),
      local: e.local?.trim() || undefined,
      descricao: e.descricao?.trim() || undefined,
    }))
  const edu: Education[] = (s.formacao ?? [])
    .filter((f) => hasText(f.curso, f.instituicao))
    .map((f) => ({
      ...f,
      curso: f.curso.trim(),
      instituicao: f.instituicao.trim(),
    }))
  return {
    ...s,
    resumo: s.resumo?.trim() || undefined,
    experiencias: exp,
    formacao: edu,
    habilidades: (s.habilidades ?? []).map((h) => h.trim()).filter(Boolean),
    idiomas: (s.idiomas ?? []).map((h) => h.trim()).filter(Boolean),
    cursos: (s.cursos ?? []).map((h) => h.trim()).filter(Boolean),
  }
}

/** Troca um item de lugar (subir/descer) */
export function move<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length) return list
  const out = [...list]
  const [item] = out.splice(from, 1)
  out.splice(to, 0, item)
  return out
}
