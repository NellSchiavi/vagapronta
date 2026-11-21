/**
 * Tradução de uma versão do currículo: o que vai para a IA (só os textos) e
 * como a resposta volta para as seções. Empresas, instituições, cursos, datas e
 * cidades não vão para a IA e ficam exatamente como estavam.
 */
import type { Translation } from '@/lib/queries/resumes'
import type { ResumeSections } from '@/lib/resume'

export function translationPayload(s: ResumeSections) {
  return {
    resumo: s.resumo ?? '',
    experiencias: (s.experiencias ?? []).map((e) => ({ cargo: e.cargo ?? '', descricao: e.descricao ?? '' })),
    habilidades: s.habilidades ?? [],
    idiomas: s.idiomas ?? [],
  }
}

/** Junta a tradução às seções originais (item a item; o que não foi traduzido fica igual) */
export function applyTranslation(s: ResumeSections, t: Translation): ResumeSections {
  const pick = (translated: string | undefined, original: string | undefined) => (translated?.trim() ? translated.trim() : (original ?? ''))
  return {
    ...s,
    resumo: s.resumo ? pick(t.resumo, s.resumo) : s.resumo,
    experiencias: s.experiencias?.map((e, i) => ({
      ...e,
      cargo: pick(t.experiencias[i]?.cargo, e.cargo),
      descricao: e.descricao ? pick(t.experiencias[i]?.descricao, e.descricao) : e.descricao,
    })),
    habilidades: s.habilidades?.map((h, i) => pick(t.habilidades[i], h)),
    idiomas: s.idiomas?.map((l, i) => pick(t.idiomas[i], l)),
  }
}
