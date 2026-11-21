import { Link } from 'react-router-dom'
import { Camera, CameraOff, FileText, Globe2, Languages, ScrollText, UserRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { COUNTRY_GROUPS, countryInfo, PAISES, type CountryCode } from '@/lib/paises'
import type { ResumeFormat } from '@/lib/resume'
import { effectiveFormat } from '@/lib/resume-format'
import { LANGUAGE_LABEL, type ResumeLanguage } from '@/lib/resume-i18n'

interface Props {
  country: CountryCode
  language: ResumeLanguage
  onCountry: (c: CountryCode) => void
  onLanguage: (l: ResumeLanguage) => void
  formato: ResumeFormat
  onFormato: (f: ResumeFormat) => void
  /** o que existe no "Meu perfil" */
  has: { photo: boolean; birthDate: boolean; citizenship: boolean }
  registry?: string
  registryNote: string
  onRegistryNote: (v: string) => void
  onNewVersion: () => void
}

const select = 'min-h-touch w-full rounded-field border border-line-strong bg-card px-3 text-[15px]'

/** Formato do país desta versão: regras, foto, dados pessoais e idioma */
export function FormatCard({ country, language, onCountry, onLanguage, formato, onFormato, has, registry, registryNote, onRegistryNote, onNewVersion }: Props) {
  const c = countryInfo(country)
  const eff = effectiveFormat(country, formato)
  const allowed = c.format.personalFields
  const languages = [...new Set([...c.languages.map((l) => l.code as ResumeLanguage), language])]
  const set = (p: Partial<ResumeFormat>) => onFormato({ ...formato, ...p })
  const PhotoIcon = c.photo === 'nao' ? CameraOff : Camera

  return (
    <Card className="space-y-4 p-4 sm:p-5" aria-labelledby="formato-titulo">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h2 id="formato-titulo" className="flex items-center gap-2 font-sans text-base font-medium">
          <Globe2 className="size-[18px] text-terra" aria-hidden /> Formato do país
        </h2>
        <Button size="sm" variant="secondary" onClick={onNewVersion}>
          <Languages aria-hidden /> Criar versão para outro país
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="ed-pais" className="text-sm font-medium">
            País desta versão
          </label>
          <select id="ed-pais" className={select} value={country} onChange={(e) => onCountry(e.target.value as CountryCode)}>
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
          <label htmlFor="ed-idioma" className="text-sm font-medium">
            Idioma do texto
          </label>
          <select id="ed-idioma" className={select} value={language} onChange={(e) => onLanguage(e.target.value as ResumeLanguage)}>
            {languages.map((l, i) => (
              <option key={l} value={l}>
                {LANGUAGE_LABEL[l]}
                {i === 0 && c.languages.length > 1 ? ' (recomendado)' : ''}
              </option>
            ))}
          </select>
        </div>
      </div>
      <p className="-mt-1 text-[13px] text-muted">
        Aqui você só ajusta o formato e os títulos das seções. Para traduzir o texto, use “Criar versão para outro país”: a original fica como está.
      </p>

      <ul className="grid gap-2 rounded-card-sm bg-bg p-3 text-sm sm:grid-cols-2">
        <li className="flex items-start gap-2">
          <PhotoIcon className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden />
          <span>{c.photo === 'nao' ? 'Sem foto' : c.photo === 'comum' ? 'Foto é comum' : 'Foto opcional'}</span>
        </li>
        <li className="flex items-start gap-2">
          <FileText className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden />
          <span>{c.length}</span>
        </li>
        <li className="flex items-start gap-2 sm:col-span-2">
          <UserRound className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden />
          <span>{c.personalData}</span>
        </li>
        {c.footer && (
          <li className="flex items-start gap-2 sm:col-span-2">
            <ScrollText className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden />
            <span>O rodapé com a autorização de uso dos dados (GDPR), em italiano, entra sozinho no PDF.</span>
          </li>
        )}
        {c.format.placeAndDate && (
          <li className="flex items-start gap-2 sm:col-span-2">
            <ScrollText className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden />
            <span>Termina com cidade e data, como é costume ali.</span>
          </li>
        )}
      </ul>
      {c.customs.length > 0 && (
        <details className="text-sm">
          <summary className="min-h-touch cursor-pointer py-2 font-medium text-terra-strong">Dicas para {c.name}</summary>
          <ul className="list-disc space-y-1 pl-5 text-ink/85">
            {c.customs.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </details>
      )}

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">O que entra no topo</legend>
        {c.photo === 'nao' ? (
          <p className="text-sm text-muted">Em {c.name} não se usa foto, então ela não entra no PDF.</p>
        ) : (
          <Check
            id="fmt-foto"
            label="Minha foto"
            checked={eff.photo}
            onChange={(on) => set({ foto: on })}
            missing={!has.photo && eff.photo ? 'Você ainda não tem foto.' : undefined}
          />
        )}
        {allowed.includes('nascimento') && (
          <Check
            id="fmt-nascimento"
            label="Data de nascimento"
            checked={eff.birthDate}
            onChange={(on) => set({ nascimento: on })}
            missing={!has.birthDate && eff.birthDate ? 'Falta a data no seu perfil.' : undefined}
          />
        )}
        {allowed.includes('cidadania') && (
          <Check
            id="fmt-cidadania"
            label="Nacionalidade"
            checked={eff.citizenship}
            onChange={(on) => set({ cidadania: on })}
            missing={!has.citizenship && eff.citizenship ? 'Falta a nacionalidade no seu perfil.' : undefined}
          />
        )}
        {allowed.length === 0 && (
          <p className="text-sm text-muted">
            {country === 'BR' ? 'No Brasil, data de nascimento, documentos e estado civil ficam fora do currículo.' : 'Aqui, dados pessoais extras ficam fora do currículo.'}
          </p>
        )}
        {allowed.includes('autorizacao') && (
          <Field
            label="Autorização de trabalho (opcional)"
            htmlFor="fmt-autorizacao"
            hint="Escreva no idioma desta versão. Ex.: “EU citizen – no visa required” ou “Permis B”."
          >
            <Input value={formato.autorizacao ?? ''} maxLength={120} onChange={(e) => set({ autorizacao: e.target.value })} />
          </Field>
        )}
      </fieldset>

      {registry && country !== 'BR' && (
        <Field
          label="Explicação do seu registro"
          htmlFor="fmt-registro"
          hint={`Fora do Brasil, recrutadores não conhecem o ${registry.split(' ')[0]}. Uma frase curta, no idioma desta versão.`}
        >
          <Input value={registryNote} maxLength={200} onChange={(e) => onRegistryNote(e.target.value)} />
        </Field>
      )}
    </Card>
  )
}

function Check({ id, label, checked, onChange, missing }: { id: string; label: string; checked: boolean; onChange: (on: boolean) => void; missing?: string }) {
  return (
    <div>
      <label htmlFor={id} className="flex min-h-touch cursor-pointer items-center gap-3 text-[15px]">
        <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="size-5 accent-terra-strong" />
        {label}
      </label>
      {missing && (
        <p className="-mt-1 ml-8 text-[13px] text-warn">
          {missing}{' '}
          <Link to="/perfil#dados" className="font-medium underline underline-offset-2">
            Completar em Meu perfil
          </Link>
        </p>
      )}
    </div>
  )
}
