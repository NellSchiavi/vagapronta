import { useId, useMemo, useState } from 'react'
import { Camera, CameraOff, Check, FileText, Globe2, Languages, Search, UserRound, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { COUNTRY_GROUPS, countryInfo, FEATURED, PAISES, type CountryCode, type CountryInfo } from '@/lib/paises'
import { cn } from '@/lib/utils'

const normalize = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

const PHOTO_LABEL = { nao: 'Sem foto', opcional: 'Foto opcional', comum: 'Foto é comum' } as const

interface Props {
  value: CountryCode
  language: string | null
  onChange: (code: CountryCode) => void
  onLanguageChange: (language: string) => void
}

/**
 * Escolha do país do currículo: 4 cartões em destaque + "Outro país" com busca.
 * Um país escolhido pela busca aparece como um 5º cartão, selecionado.
 * Abaixo, os costumes do país e a escolha do idioma do currículo.
 */
export function CountryPicker({ value, language, onChange, onLanguageChange }: Props) {
  const selected = countryInfo(value)
  const cards = selected.featured ? FEATURED : [...FEATURED, selected]

  function choose(code: CountryCode) {
    onChange(code)
    // sugere o idioma mais indicado do país
    onLanguageChange(countryInfo(code).languages[0].code)
  }

  return (
    <div className="space-y-6">
      <fieldset>
        <legend className="sr-only">País do currículo</legend>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {cards.map((c) => (
            <CountryCard key={c.code} c={c} checked={c.code === value} onSelect={() => choose(c.code)} />
          ))}
        </div>
      </fieldset>

      <OtherCountrySearch value={value} onSelect={choose} />

      <CountryDetails c={selected} language={language} onLanguageChange={onLanguageChange} />
    </div>
  )
}

function CountryCard({ c, checked, onSelect }: { c: CountryInfo; checked: boolean; onSelect: () => void }) {
  return (
    <label
      className={cn(
        'relative flex cursor-pointer gap-3 rounded-card-sm border bg-card p-4 transition-colors',
        'focus-within:ring-2 focus-within:ring-terra/40',
        checked ? 'border-terra bg-terra-soft/50' : 'border-line-strong hover:border-terra/60',
      )}
    >
      <input type="radio" name="country" value={c.code} checked={checked} onChange={onSelect} className="sr-only" />
      <span
        aria-hidden
        className={cn(
          'mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full border-2',
          checked ? 'border-terra-strong bg-terra-strong text-on-accent' : 'border-line-strong',
        )}
      >
        {checked && <Check className="size-3" strokeWidth={3} />}
      </span>
      <span>
        <span className="flex flex-wrap items-center gap-2 font-medium">
          {c.name}
          {c.code === 'BR' && <span className="rounded-full bg-track px-2 py-0.5 text-xs font-normal text-muted">padrão</span>}
        </span>
        <span className="mt-0.5 block text-sm text-muted">{c.summary}</span>
      </span>
    </label>
  )
}

export function OtherCountrySearch({ value, onSelect }: { value: CountryCode | CountryCode[]; onSelect: (code: CountryCode) => void }) {
  const isSelected = (code: CountryCode) => (Array.isArray(value) ? value.includes(code) : value === code)
  const inputId = useId()
  const listId = useId()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)

  const groups = useMemo(() => {
    const q = normalize(query.trim())
    return COUNTRY_GROUPS.map((g) => ({
      group: g,
      items: PAISES.filter((p) => p.group === g && (!q || normalize(p.name).includes(q))),
    })).filter((g) => g.items.length)
  }, [query])

  return (
    <div>
      <label htmlFor={inputId} className="text-sm font-medium">
        Outro país
      </label>
      <div className="relative mt-1.5">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-muted" aria-hidden />
        <Input
          id={inputId}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          autoComplete="off"
          placeholder="Busque: Itália, Canadá, Irlanda…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
          className="pl-10 pr-10"
        />
        {(query || open) && (
          <button
            type="button"
            onClick={() => {
              setQuery('')
              setOpen(false)
            }}
            className="absolute right-1 top-1/2 inline-flex size-10 -translate-y-1/2 items-center justify-center rounded-field text-muted hover:text-ink"
            aria-label="Fechar a lista de países"
          >
            <X className="size-4" aria-hidden />
          </button>
        )}
      </div>

      {open && (
        <div id={listId} className="mt-2 max-h-72 overflow-y-auto rounded-card-sm border border-line bg-card p-1.5">
          {groups.length === 0 ? (
            <p className="px-3 py-3 text-sm text-muted">
              Ainda não temos regras para esse país. Escolha <strong className="font-medium">Europa (Europass)</strong> se for na
              União Europeia.
            </p>
          ) : (
            groups.map(({ group, items }) => (
              <div key={group} role="group" aria-label={group}>
                <p className="px-3 pb-1 pt-2 text-xs font-medium uppercase tracking-wider text-muted">{group}</p>
                <ul>
                  {items.map((p) => (
                    <li key={p.code}>
                      <button
                        type="button"
                        onClick={() => {
                          onSelect(p.code)
                          setQuery('')
                          setOpen(false)
                        }}
                        aria-pressed={isSelected(p.code)}
                        className={cn(
                          'flex min-h-touch w-full items-center justify-between gap-3 rounded-[8px] px-3 text-left text-[15px] hover:bg-track/60',
                          isSelected(p.code) && 'font-medium text-terra-strong',
                        )}
                      >
                        <span>{p.name}</span>
                        {isSelected(p.code) && <Check className="size-4" aria-hidden />}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

export function CountryDetails({
  c,
  language,
  onLanguageChange,
}: {
  c: CountryInfo
  language: string | null
  onLanguageChange: (language: string) => void
}) {
  const current = language && c.languages.some((l) => l.code === language) ? language : c.languages[0].code
  const PhotoIcon = c.photo === 'nao' ? CameraOff : Camera
  return (
    <section aria-labelledby="pais-costumes" className="rounded-card-sm border border-line bg-bg p-4 sm:p-5">
      <h3 id="pais-costumes" className="flex items-center gap-2 font-sans text-[15px] font-medium">
        <Globe2 className="size-[18px] text-terra" aria-hidden /> Costumes para {c.name}
      </h3>
      <ul className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
        <li className="flex items-start gap-2">
          <PhotoIcon className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden />
          <span>{PHOTO_LABEL[c.photo]}</span>
        </li>
        <li className="flex items-start gap-2">
          <FileText className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden />
          <span>{c.length}</span>
        </li>
        <li className="flex items-start gap-2 sm:col-span-2">
          <UserRound className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden />
          <span>{c.personalData}</span>
        </li>
      </ul>
      {c.customs.length > 0 && (
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-ink/85">
          {c.customs.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      )}

      {c.languages.length > 0 && (
        <fieldset className="mt-4">
          <legend className="flex items-center gap-2 text-sm font-medium">
            <Languages className="size-4 text-muted" aria-hidden /> Idioma do currículo
          </legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {c.languages.map((l, i) => (
              <label
                key={l.code}
                className={cn(
                  'inline-flex min-h-touch cursor-pointer items-center gap-1.5 rounded-full border px-3.5 text-sm',
                  'focus-within:ring-2 focus-within:ring-terra/40',
                  current === l.code ? 'border-terra bg-terra-soft font-medium text-terra-strong' : 'border-line-strong bg-card',
                )}
              >
                <input
                  type="radio"
                  name="resume-language"
                  value={l.code}
                  checked={current === l.code}
                  onChange={() => onLanguageChange(l.code)}
                  className="sr-only"
                />
                {current === l.code && <Check className="size-3.5" aria-hidden />}
                {l.label}
                {i === 0 && c.languages.length > 1 && <span className="text-xs font-normal text-muted">(recomendado)</span>}
              </label>
            ))}
          </div>
          {current !== 'pt-BR' && (
            <p className="mt-2 text-[13px] text-muted">
              Você pode continuar escrevendo em português. Depois, no editor do currículo, a IA cria uma versão traduzida para esse idioma, sem mexer na original.
            </p>
          )}
        </fieldset>
      )}
    </section>
  )
}
