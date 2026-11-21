/**
 * Formato por país: junta as regras do país (paises.ts), o idioma da versão e
 * as escolhas da pessoa (foto, dados pessoais) nos dados que viram o PDF.
 * O que o país não permite NUNCA entra no PDF, mesmo que esteja no perfil.
 */
import type { ResumePdfData } from '@/components/pdf/resume-pdf'
import { countryInfo, type CountryCode } from '@/lib/paises'
import type { Resume, ResumeFormat, ResumeSections } from '@/lib/resume'
import { countryNames, formatDate, labelsFor } from '@/lib/resume-i18n'

/** Dados de quem envia o currículo (vêm do "Meu perfil", ver useSender) */
export interface ResumeOwner {
  name: string
  role?: string
  registry?: string
  contact: string[]
  place?: string
  residenceCountry?: string
  birthDate?: string | null
  citizenships?: string[]
  avatar?: { path: string | null; url: string | null; source: string | null } | null
}

export interface EffectiveFormat {
  photo: boolean
  birthDate: boolean
  citizenship: boolean
  permit: string | null
}

/** O que vai de fato para o PDF: escolha da pessoa, limitada pelas regras do país */
export function effectiveFormat(country: string, f: ResumeFormat = {}): EffectiveFormat {
  const c = countryInfo(country)
  const allowed = (k: 'nascimento' | 'cidadania' | 'autorizacao') => c.format.personalFields.includes(k)
  return {
    photo: c.photo !== 'nao' && (f.foto ?? c.photo === 'comum'),
    birthDate: allowed('nascimento') && (f.nascimento ?? true),
    citizenship: allowed('cidadania') && (f.cidadania ?? true),
    permit: allowed('autorizacao') ? f.autorizacao?.trim() || null : null,
  }
}

/** Linhas de dados pessoais extras, já no idioma da versão */
export function personalLines(lang: string, f: EffectiveFormat, owner: ResumeOwner) {
  const L = labelsFor(lang)
  const out: string[] = []
  if (f.birthDate && owner.birthDate) out.push(`${L.birthDate}: ${formatDate(owner.birthDate, lang)}`)
  if (f.citizenship && owner.citizenships?.length) out.push(`${L.citizenship}: ${countryNames(owner.citizenships, lang)}`)
  if (f.permit) out.push(`${L.workPermit}: ${f.permit}`)
  return out
}

/** Cidade no topo; fora do Brasil, com o país (ex.: "Campinas, SP, Brazil") */
export function placeLine(owner: ResumeOwner, country: string, lang: string) {
  if (!owner.place) return undefined
  const home = owner.residenceCountry && owner.residenceCountry !== 'OUTRO' ? owner.residenceCountry : null
  if (!home || home === country) return owner.place
  return `${owner.place}, ${countryNames([home], lang)}`
}

/** "Berlin, 19.11.2026" (costume alemão de terminar com cidade e data) */
export function placeAndDate(owner: ResumeOwner, lang: string, today = new Date()) {
  // data local (toISOString usaria o fuso UTC e poderia virar o dia)
  const pad = (n: number) => String(n).padStart(2, '0')
  const iso = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`
  return [owner.place?.split(',')[0]?.trim(), formatDate(iso, lang)].filter(Boolean).join(', ')
}

type ResumeLike = Pick<Resume, 'country' | 'language' | 'template' | 'content'>

/** Monta os dados do PDF de uma versão (sem a foto, que é carregada à parte) */
export function resumePdfData(resume: ResumeLike, owner: ResumeOwner, opts: { sections?: ResumeSections; photo?: string | null } = {}): ResumePdfData {
  const country = countryInfo(resume.country)
  const lang = resume.language ?? 'pt-BR'
  const f = effectiveFormat(resume.country, resume.content.formato)
  const place = placeLine(owner, resume.country, lang)
  return {
    name: owner.name,
    role: resume.content.titulo?.trim() || owner.role,
    registry: owner.registry,
    // a explicação do registro só faz sentido fora do Brasil
    registryNote: owner.registry && resume.country !== 'BR' ? resume.content.registro_nota?.trim() || undefined : undefined,
    contact: [...(place ? [place] : []), ...owner.contact],
    personal: personalLines(lang, f, owner),
    photo: f.photo ? opts.photo ?? null : null,
    sections: opts.sections ?? resume.content.sections ?? {},
    sectionOrder: country.format.sectionOrder,
    language: lang,
    // o layout Europass só vale onde ele é usado; nos outros países, volta ao Clássico
    template: resume.template === 'europass' && !country.europass ? 'classico' : resume.template,
    footerNote: country.footer?.text,
    closing: country.format.placeAndDate ? placeAndDate(owner, lang) : undefined,
  }
}

/** País da vaga que pede outra versão do currículo (null se a versão já serve) */
export function countryForJob(destination: string | null | undefined, resumeCountry: string | undefined): CountryCode | null {
  if (!destination || !resumeCountry || destination === resumeCountry) return null
  const known = countryInfo(destination)
  return known.code === destination ? known.code : null
}
