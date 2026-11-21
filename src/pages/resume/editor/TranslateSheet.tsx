import { useCallback, useMemo, useState } from 'react'
import { AlertTriangle, Check, Languages, Loader2, X } from 'lucide-react'
import { toast } from 'sonner'
import { PdfPreview } from '@/components/pdf/pdf-preview'
import { buildResumePdf } from '@/components/pdf/resume-pdf'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { SheetContent } from '@/components/ui/sheet'
import { clearAiTask, startAiTask, useAiTask } from '@/lib/ai-tasks'
import { friendlyDataError } from '@/lib/errors'
import { COUNTRY_GROUPS, countryInfo, PAISES, type CountryCode } from '@/lib/paises'
import { translateResume, type Translation } from '@/lib/queries/resumes'
import type { Resume, ResumeContent, ResumeSections, ResumeTemplate } from '@/lib/resume'
import { useAvatarDataUrl } from '@/lib/avatar-pdf'
import { effectiveFormat, resumePdfData, type ResumeOwner } from '@/lib/resume-format'
import { LANGUAGE_LABEL, type ResumeLanguage } from '@/lib/resume-i18n'
import { applyTranslation, translationPayload } from '@/lib/resume-translate'

interface Props {
  resume: Resume
  /** estado atual do editor (pode ter mudanças ainda não salvas) */
  current: { title: string; template: ResumeTemplate; sections: ResumeSections; titulo: string }
  owner: ResumeOwner & { registryCouncil?: string }
  initialCountry?: CountryCode
  onCreate: (version: { title: string; template: ResumeTemplate; country: CountryCode; language: ResumeLanguage; content: ResumeContent; translated: boolean }) => Promise<void>
}

const select = 'min-h-touch w-full rounded-field border border-line-strong bg-card px-3 text-[15px]'

/**
 * "Criar versão para outro país": escolhe país e idioma; se o idioma for outro,
 * a IA traduz. Nada é salvo até a pessoa conferir e tocar em "Salvar como nova versão".
 */
export function TranslateSheet({ resume, current, owner, initialCountry, onCreate }: Props) {
  const firstOther = PAISES.find((p) => p.code !== resume.country)!.code
  const [country, setCountry] = useState<CountryCode>(initialCountry && initialCountry !== resume.country ? initialCountry : firstOther)
  const info = countryInfo(country)
  const [language, setLanguage] = useState<ResumeLanguage>(info.languages[0].code as ResumeLanguage)
  const [name, setName] = useState(`${current.title} – ${info.name}`)
  const [busy, setBusy] = useState(false)
  const from = resume.language ?? 'pt-BR'
  const needsAi = language !== from
  const taskKey = `traduzir:${resume.id}:${country}:${language}`
  const task = useAiTask<Translation>(taskKey)
  const running = task && task.status !== 'done'
  const result = task?.status === 'done' ? task.result : undefined
  // a foto segue a regra do país NOVO (ex.: comum na Itália, proibida nos EUA)
  const photo = useAvatarDataUrl(owner.avatar, effectiveFormat(country, { ...resume.content.formato, foto: undefined }).photo)

  function chooseCountry(code: CountryCode) {
    const c = countryInfo(code)
    setCountry(code)
    setLanguage(c.languages[0].code as ResumeLanguage)
    setName(`${current.title} – ${c.name}`)
  }

  function translate() {
    startAiTask<Translation>({
      key: taskKey,
      label: `Traduzindo o currículo (${LANGUAGE_LABEL[language]})`,
      path: `/curriculo/editar?id=${resume.id}&versao=${country}`,
      readyText: 'A versão traduzida do seu currículo ficou pronta para você conferir.',
      run: () =>
        translateResume({
          idioma: language,
          idioma_origem: from,
          pais: country,
          titulo: current.titulo || owner.role,
          conselho: owner.registryCouncil,
          secoes: translationPayload(current.sections),
        }),
    })
  }

  // a nova versão como ficará (para a prévia e para salvar)
  const draft = useMemo(() => {
    if (needsAi && !result) return null
    const sections = result ? applyTranslation(current.sections, result) : current.sections
    const template: ResumeTemplate = current.template === 'europass' && !info.europass ? 'classico' : current.template
    const content: ResumeContent = {
      ...resume.content,
      sections,
      titulo: result ? result.titulo || undefined : current.titulo || undefined,
      // sem tradução (mesmo idioma), a explicação do registro continua a mesma
      registro_nota: result ? result.registro_nota || undefined : resume.content.registro_nota,
      // a autorização de trabalho é escrita no idioma da versão: começa vazia
      formato: { ...resume.content.formato, foto: undefined, autorizacao: undefined },
      ...(result ? { traducao: { de: resume.id, idioma_original: from } } : {}),
    }
    return { template, content }
  }, [needsAi, result, current, info.europass, resume.content, resume.id, from])

  const pdf = useMemo(
    () => (draft ? resumePdfData({ country, language, template: draft.template, content: draft.content }, owner, { photo }) : null),
    [draft, country, language, owner, photo],
  )
  const build = useCallback(() => buildResumePdf(pdf!), [pdf])

  async function save() {
    if (!draft) return
    setBusy(true)
    try {
      await onCreate({ title: name, template: draft.template, country, language, content: draft.content, translated: Boolean(result) })
      clearAiTask(taskKey)
    } catch (e) {
      toast.error(friendlyDataError(e, 'Não conseguimos criar a nova versão. Tente de novo.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <SheetContent
      title="Criar versão para outro país"
      description={`A partir de “${current.title}”. A original fica como está.`}
      className="sm:w-[560px]"
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="tr-pais" className="text-sm font-medium">
              País
            </label>
            <select id="tr-pais" className={select} value={country} disabled={Boolean(running || result)} onChange={(e) => chooseCountry(e.target.value as CountryCode)}>
              {PAISES.filter((p) => !p.group).map((p) => (
                <option key={p.code} value={p.code}>
                  {p.name}
                </option>
              ))}
              {COUNTRY_GROUPS.map((g) => (
                <optgroup key={g} label={g}>
                  {PAISES.filter((p) => p.group === g).map((p) => (
                    <option key={p.code} value={p.code}>
                      {p.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="tr-idioma" className="text-sm font-medium">
              Idioma
            </label>
            <select id="tr-idioma" className={select} value={language} disabled={Boolean(running || result)} onChange={(e) => setLanguage(e.target.value as ResumeLanguage)}>
              {[...new Set([...info.languages.map((l) => l.code as ResumeLanguage), from])].map((l, i) => (
                <option key={l} value={l}>
                  {LANGUAGE_LABEL[l]}
                  {i === 0 && info.languages.length > 1 ? ' (recomendado)' : ''}
                  {l === from ? ' (sem traduzir)' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>
        <p className="text-[13px] text-muted">{info.summary}</p>

        {needsAi && !result && (
          <div className="rounded-card-sm bg-bg p-3 text-sm">
            <p>
              A IA traduz o resumo, os cargos, as descrições, as habilidades e os idiomas para o idioma{' '}
              <strong className="font-medium">{LANGUAGE_LABEL[language]}</strong>
              {language === 'pt-PT' ? ', com o vocabulário de Portugal (CV, telemóvel, equipa…)' : ''}.
            </p>
            <p className="mt-1.5 text-muted">
              Ela não inventa nada. Empresas, instituições, nomes de cursos, datas e termos técnicos ficam como estão. Seus dados de contato não vão para a IA.
            </p>
            <Button className="mt-3 w-full" onClick={translate} disabled={Boolean(running)}>
              {running ? <Loader2 className="animate-spin" aria-hidden /> : <Languages aria-hidden />}
              {task?.status === 'waiting' ? 'Muita gente usando a IA, tentando de novo…' : running ? 'Traduzindo…' : 'Traduzir com IA'}
            </Button>
          </div>
        )}

        {draft && pdf && (
          <>
            {result && (
              <div className="space-y-2 rounded-card-sm border border-terra/30 bg-terra-soft/40 p-3 text-sm" role="region" aria-label="Tradução da IA">
                <p className="font-medium">Confira a tradução antes de salvar</p>
                {result.titulo && (
                  <p>
                    <span className="text-muted">Cargo no topo:</span> {result.titulo}
                  </p>
                )}
                {result.registro_nota && (
                  <p>
                    <span className="text-muted">Explicação do registro:</span> {result.registro_nota}
                  </p>
                )}
                {result.avisos.length > 0 && (
                  <ul className="space-y-1 rounded-[8px] bg-warn-soft px-2.5 py-2 text-[13px] text-warn">
                    {result.avisos.map((a) => (
                      <li key={a} className="flex gap-1.5">
                        <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden /> {a}
                      </li>
                    ))}
                  </ul>
                )}
                <p className="text-[13px] text-muted">A IA pode errar. Depois de salvar, você ajusta o que quiser no editor.</p>
              </div>
            )}
            <Field label="Nome da nova versão" htmlFor="tr-nome">
              <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
            </Field>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button className="flex-1" onClick={save} loading={busy}>
                {!busy && <Check aria-hidden />} {result ? 'Salvar como nova versão' : 'Criar versão'}
              </Button>
              {result && (
                <Button variant="ghost" onClick={() => clearAiTask(taskKey)} disabled={busy}>
                  <X aria-hidden /> Descartar
                </Button>
              )}
            </div>
            <PdfPreview build={build} version={JSON.stringify(pdf)} label="Prévia da nova versão" />
          </>
        )}
      </div>
    </SheetContent>
  )
}
