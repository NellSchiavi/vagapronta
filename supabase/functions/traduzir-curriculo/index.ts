/**
 * POST /traduzir-curriculo
 *   { idioma, pais, idioma_origem, titulo?, conselho?, secoes: { resumo, experiencias: [{cargo, descricao}], habilidades, idiomas } }
 * Traduz as partes do currículo para o idioma do país. NÃO grava nada: a tela
 * mostra a versão traduzida e só cria a nova versão se a pessoa confirmar.
 *
 * Só vão para a IA os textos que precisam de tradução. Nomes de empresas,
 * instituições, cursos, datas e cidades ficam no app e não mudam.
 */
import { z } from 'npm:zod@3.24.1'
import { generateJson } from '../_shared/ai.ts'
import { requireUser } from '../_shared/auth.ts'
import { handle, HttpError, json } from '../_shared/http.ts'
import { countryInfo, promptRules } from '../_shared/paises.ts'
import { redactPersonalData } from '../_shared/privacy.ts'
import { TRANSLATE_SYSTEM } from '../_shared/prompts.ts'
import { toPortugalVocabulary } from '../_shared/pt-pt.ts'
import { consumeQuota } from '../_shared/quota.ts'

const LANGS: Record<string, string> = {
  'pt-BR': 'português do Brasil',
  'pt-PT': 'português de Portugal (pt-PT)',
  en: 'inglês',
  it: 'italiano',
  es: 'espanhol',
  fr: 'francês',
  de: 'alemão',
  nl: 'holandês',
}

const schema = z.object({
  titulo: z.string().default(''),
  resumo: z.string().default(''),
  experiencias: z.array(z.object({ cargo: z.string().default(''), descricao: z.string().default('') })).default([]),
  habilidades: z.array(z.string()).default([]),
  idiomas: z.array(z.string()).default([]),
  registro_nota: z.string().default(''),
  avisos: z.array(z.string()).default([]),
})
type Out = z.infer<typeof schema>

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '')
const list = (v: unknown, maxItems: number, maxLen: number) => (Array.isArray(v) ? v.slice(0, maxItems).map((x) => str(x, maxLen)) : [])

/** Resposta de exemplo no modo de desenvolvimento (AI_PROVIDER=mock) */
function mock(lang: string, input: Omit<Out, 'registro_nota' | 'avisos'>, council: string): Out {
  const tr = (s: string) => (!s ? s : lang === 'pt-PT' ? toPortugalVocabulary(s) : `(${lang}) ${s}`)
  return {
    titulo: tr(input.titulo),
    resumo: tr(input.resumo),
    experiencias: input.experiencias.map((e) => ({ cargo: tr(e.cargo), descricao: tr(e.descricao) })),
    habilidades: input.habilidades.map(tr),
    idiomas: input.idiomas.map(tr),
    registro_nota: council ? `${council}: (${lang}) conselho profissional brasileiro` : '',
    avisos: ['Tradução de exemplo (modo de desenvolvimento).'],
  }
}

Deno.serve(
  handle(async (req, body) => {
    const { supabase } = await requireUser(req)
    const lang = str(body.idioma, 10)
    if (!LANGS[lang]) throw new HttpError(400, 'Escolha um idioma para a nova versão.', 'idioma_invalido')
    const from = LANGS[str(body.idioma_origem, 10)] ? str(body.idioma_origem, 10) : 'pt-BR'
    if (from === lang) throw new HttpError(422, 'O currículo já está nesse idioma.', 'mesmo_idioma')
    const country = countryInfo(str(body.pais, 4))
    const council = str(body.conselho, 20)

    const sx = (body.secoes ?? {}) as Record<string, unknown>
    const input = {
      titulo: str(body.titulo, 120),
      resumo: str(sx.resumo, 3000),
      experiencias: (Array.isArray(sx.experiencias) ? sx.experiencias.slice(0, 15) : []).map((e) => {
        const x = (e ?? {}) as Record<string, unknown>
        return { cargo: str(x.cargo, 120), descricao: str(x.descricao, 2500) }
      }),
      habilidades: list(sx.habilidades, 60, 80),
      idiomas: list(sx.idiomas, 12, 80),
    }
    const empty = !input.resumo && !input.titulo && !input.habilidades.length && !input.idiomas.length && !input.experiencias.some((e) => e.cargo || e.descricao)
    if (empty) throw new HttpError(422, 'Este currículo ainda não tem texto para traduzir.', 'vazio')

    const quota = await consumeQuota(supabase, 'traduzir-curriculo')

    // dados pessoais não saem do servidor: vão marcadores e voltam os valores originais
    const redacted = redactPersonalData(JSON.stringify(input, null, 2))
    const prompt = [
      `Idioma de origem: ${LANGS[from]}`,
      `Traduzir para: ${LANGS[lang]}`,
      `País da vaga: ${country.name}. Costumes do país: ${promptRules(country.code)}`,
      council ? `Conselho profissional da pessoa: ${council} (Brasil)` : 'A pessoa não informou conselho profissional.',
      `Partes do currículo (JSON):\n${redacted.text}`,
    ].join('\n')

    const out = await quota.guard(async () => {
      const r = await generateJson({
        task: 'traduzir-curriculo',
        system: TRANSLATE_SYSTEM,
        prompt,
        schema,
        temperature: 0.2,
        mock: () => mock(lang, input, council),
      })
      // as listas precisam bater item a item com o original (senão a tradução se perderia)
      if (
        r.experiencias.length !== input.experiencias.length ||
        r.habilidades.length !== input.habilidades.length ||
        r.idiomas.length !== input.idiomas.length
      ) {
        throw new HttpError(502, 'A tradução veio incompleta. Tente de novo; não contamos este uso.', 'traducao_incompleta')
      }
      return r
    })

    const fix = lang === 'pt-PT' ? toPortugalVocabulary : (s: string) => s
    // o rodapé do país (ex.: GDPR na Itália) já entra sozinho no PDF: nunca repetido na nota ou nos avisos
    const footerStart = country.footer?.text.slice(0, 24).toLowerCase()
    const withoutFooter = (s: string) => {
      const i = footerStart ? s.toLowerCase().indexOf(footerStart) : -1
      return (i >= 0 ? s.slice(0, i) : s).trim()
    }
    const result: Out = {
      titulo: fix(out.titulo.trim()),
      resumo: input.resumo ? fix(out.resumo.trim()) : '',
      experiencias: out.experiencias.map((e, i) => ({
        cargo: input.experiencias[i].cargo ? fix(e.cargo.trim()) : '',
        descricao: input.experiencias[i].descricao ? fix(e.descricao.trim()) : '',
      })),
      habilidades: out.habilidades.map((h) => fix(h.trim())),
      idiomas: out.idiomas.map((l) => fix(l.trim())),
      registro_nota: council ? withoutFooter(out.registro_nota).slice(0, 200) : '',
      avisos: out.avisos.map(withoutFooter).filter(Boolean).slice(0, 3),
    }
    return json({ traducao: redacted.restore(result) })
  }),
)
