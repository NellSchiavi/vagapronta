import type { ResumeSections } from '@/lib/resume'
import type { AnalysisSuggestion } from '@/lib/types'

export type ApplyResult = { ok: true; sections: ResumeSections } | { ok: false; reason: string }

const norm = (s: string) => s.replace(/\s+/g, ' ').trim()

/** Junta itens novos a uma lista, sem repetir (ignorando maiúsculas/minúsculas) */
function mergeList(current: string[] = [], additions: string[]) {
  const seen = new Set(current.map((x) => x.toLowerCase()))
  const out = [...current]
  for (const a of additions) {
    if (a && !seen.has(a.toLowerCase())) {
      out.push(a)
      seen.add(a.toLowerCase())
    }
  }
  return out
}

/**
 * Aplica uma sugestão da análise às seções do currículo.
 * Não altera o objeto original: devolve as seções novas (para poder desfazer).
 */
export function applySuggestion(sections: ResumeSections, s: AnalysisSuggestion): ApplyResult {
  const depois = s.depois.trim()
  if (!depois) return { ok: false, reason: 'A sugestão está vazia.' }

  switch (s.secao) {
    case 'resumo':
      return { ok: true, sections: { ...sections, resumo: depois } }

    case 'habilidades': {
      const items = depois.split(/[,;\n]/).map((x) => x.trim().replace(/\.$/, '')).filter(Boolean)
      return { ok: true, sections: { ...sections, habilidades: mergeList(sections.habilidades, items) } }
    }

    case 'formacao':
      return { ok: true, sections: { ...sections, cursos: mergeList(sections.cursos, [depois]) } }

    case 'experiencia': {
      const antes = norm(s.antes ?? '')
      if (!antes) return { ok: false, reason: 'Não sabemos em qual experiência colocar essa sugestão.' }
      const list = sections.experiencias ?? []
      const idx = list.findIndex((e) => norm(e.descricao ?? '').includes(antes))
      if (idx < 0) return { ok: false, reason: 'Não encontramos esse trecho no seu currículo. Talvez ele já tenha sido alterado.' }
      const experiencias = list.map((e, i) => (i === idx ? { ...e, descricao: norm(e.descricao ?? '').replace(antes, depois) } : e))
      return { ok: true, sections: { ...sections, experiencias } }
    }
  }
}
