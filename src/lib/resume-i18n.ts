/**
 * Textos fixos do currículo (títulos das seções, "atual", rótulos dos dados
 * pessoais) no idioma de cada versão, e formatos de data por idioma.
 */
import type { SectionKey } from '@/lib/paises'

export type ResumeLanguage = 'pt-BR' | 'pt-PT' | 'en' | 'it' | 'es' | 'fr' | 'de' | 'nl'

export const LANGUAGE_LABEL: Record<ResumeLanguage, string> = {
  'pt-BR': 'Português (Brasil)',
  'pt-PT': 'Português (Portugal)',
  en: 'Inglês',
  it: 'Italiano',
  es: 'Espanhol',
  fr: 'Francês',
  de: 'Alemão',
  nl: 'Holandês',
}

export const isResumeLanguage = (v: unknown): v is ResumeLanguage => typeof v === 'string' && v in LANGUAGE_LABEL

interface Labels {
  sections: Record<SectionKey, string>
  birthDate: string
  citizenship: string
  workPermit: string
  /** "até hoje" em períodos */
  present: string
  /** título do documento (metadados do PDF) */
  docTitle: string
}

export const RESUME_LABELS: Record<ResumeLanguage, Labels> = {
  'pt-BR': {
    sections: { resumo: 'Resumo', experiencias: 'Experiência', formacao: 'Formação', habilidades: 'Habilidades', idiomas: 'Idiomas' },
    birthDate: 'Data de nascimento',
    citizenship: 'Nacionalidade',
    workPermit: 'Autorização de trabalho',
    present: 'atual',
    docTitle: 'Currículo',
  },
  'pt-PT': {
    sections: { resumo: 'Perfil', experiencias: 'Experiência profissional', formacao: 'Formação', habilidades: 'Competências', idiomas: 'Línguas' },
    birthDate: 'Data de nascimento',
    citizenship: 'Nacionalidade',
    workPermit: 'Autorização de trabalho',
    present: 'atual',
    docTitle: 'CV',
  },
  en: {
    sections: { resumo: 'Summary', experiencias: 'Experience', formacao: 'Education', habilidades: 'Skills', idiomas: 'Languages' },
    birthDate: 'Date of birth',
    citizenship: 'Citizenship',
    workPermit: 'Work authorization',
    present: 'Present',
    docTitle: 'CV',
  },
  it: {
    sections: { resumo: 'Profilo', experiencias: 'Esperienza professionale', formacao: 'Istruzione e formazione', habilidades: 'Competenze', idiomas: 'Lingue' },
    birthDate: 'Data di nascita',
    citizenship: 'Cittadinanza',
    workPermit: 'Permesso di lavoro',
    present: 'in corso',
    docTitle: 'Curriculum vitae',
  },
  es: {
    sections: { resumo: 'Perfil', experiencias: 'Experiencia profesional', formacao: 'Formación', habilidades: 'Competencias', idiomas: 'Idiomas' },
    birthDate: 'Fecha de nacimiento',
    citizenship: 'Nacionalidad',
    workPermit: 'Permiso de trabajo',
    present: 'actualidad',
    docTitle: 'Currículum',
  },
  fr: {
    sections: { resumo: 'Profil', experiencias: 'Expérience professionnelle', formacao: 'Formation', habilidades: 'Compétences', idiomas: 'Langues' },
    birthDate: 'Date de naissance',
    citizenship: 'Nationalité',
    workPermit: 'Autorisation de travail',
    present: 'aujourd’hui',
    docTitle: 'CV',
  },
  de: {
    sections: { resumo: 'Profil', experiencias: 'Berufserfahrung', formacao: 'Ausbildung', habilidades: 'Kenntnisse', idiomas: 'Sprachen' },
    birthDate: 'Geburtsdatum',
    citizenship: 'Staatsangehörigkeit',
    workPermit: 'Arbeitserlaubnis',
    present: 'heute',
    docTitle: 'Lebenslauf',
  },
  nl: {
    sections: { resumo: 'Profiel', experiencias: 'Werkervaring', formacao: 'Opleiding', habilidades: 'Vaardigheden', idiomas: 'Talen' },
    birthDate: 'Geboortedatum',
    citizenship: 'Nationaliteit',
    workPermit: 'Werkvergunning',
    present: 'heden',
    docTitle: 'CV',
  },
}

export const labelsFor = (lang?: string | null) => RESUME_LABELS[isResumeLanguage(lang) ? lang : 'pt-BR']

const MONTHS_PT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** "2021-03" → "mar/2021" (português), "Mar 2021" (inglês) ou "03/2021" (outros); "2018" → "2018" */
export function formatPeriodPart(v?: string | null, lang: string = 'pt-BR') {
  if (!v) return ''
  const m = v.match(/^(\d{4})-(\d{2})/)
  if (!m) return v
  const i = Number(m[2]) - 1
  if (lang.startsWith('pt')) return `${MONTHS_PT[i] ?? m[2]}/${m[1]}`
  if (lang === 'en') return `${MONTHS_EN[i] ?? m[2]} ${m[1]}`
  return `${m[2]}/${m[1]}`
}

/** fim null = emprego atual */
export function formatPeriod(inicio?: string, fim?: string | null, lang: string = 'pt-BR') {
  if (!inicio && fim === undefined) return ''
  return [formatPeriodPart(inicio, lang), fim === null ? labelsFor(lang).present : formatPeriodPart(fim, lang)].filter(Boolean).join(' – ')
}

/** "1990-03-04" → "04/03/1990" (alemão: "04.03.1990"; inglês: "4 March 1990") */
export function formatDate(iso: string, lang: string = 'pt-BR') {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return iso
  if (lang === 'de') return `${m[3]}.${m[2]}.${m[1]}`
  if (lang === 'en') {
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
    return `${Number(m[3])} ${months[Number(m[2]) - 1]} ${m[1]}`
  }
  return `${m[3]}/${m[2]}/${m[1]}`
}

/** Nomes dos países no idioma do currículo (["BR","IT"] → "Brasil, Itália" / "Brazil, Italy") */
export function countryNames(codes: string[], lang: string = 'pt-BR') {
  let names: Intl.DisplayNames | null = null
  try {
    names = new Intl.DisplayNames([lang], { type: 'region' })
  } catch {
    names = null
  }
  return codes.map((c) => names?.of(c) ?? c).join(', ')
}
