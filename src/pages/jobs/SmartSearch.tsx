import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { cleanJobUrl } from '@/lib/links'
import { ArrowRight, ExternalLink, Link2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { countryInfo, type CountryCode } from '@/lib/paises'
import { smartLinks } from '@/lib/smart-search'
import type { WorkMode } from '@/lib/types'
import { cn } from '@/lib/utils'

interface Props {
  roles: string[]
  destinations: CountryCode[]
  city: string | null
  workModes: WorkMode[]
}

/**
 * "Procure também em": abre os sites de vagas já na busca certa (cargo, cidade
 * e modalidade). Ao voltar, a pessoa cola o link da vaga para importar e adaptar.
 */
export function SmartSearch({ roles, destinations, city, workModes }: Props) {
  const navigate = useNavigate()
  const [role, setRole] = useState(roles[0] ?? '')
  const [link, setLink] = useState('')
  const [error, setError] = useState<string | null>(null)

  function importLink(e: React.FormEvent) {
    e.preventDefault()
    const url = link.trim()
    if (!/^https?:\/\/\S+\.\S+/i.test(url)) {
      setError('Cole o link completo da vaga (começa com https://).')
      return
    }
    // sem rastreamento nem tokens (o link de e-mails de alerta traz até token de login)
    navigate(`/adaptar?link=${encodeURIComponent(cleanJobUrl(url))}`)
  }

  return (
    <Card className="p-5 sm:p-6" aria-labelledby="procure-titulo">
      <h2 id="procure-titulo" className="text-[22px]">
        Procure também em
      </h2>
      <p className="mt-1 text-sm text-muted">
        Abre o site com a busca pronta. Achou uma vaga? Cole o link aqui para adaptar seu currículo.
      </p>

      {roles.length > 1 && (
        <div className="mt-4" role="radiogroup" aria-label="Cargo para buscar">
          <p className="mb-2 text-sm font-medium">Buscar por</p>
          <div className="flex flex-wrap gap-2">
            {roles.map((r) => (
              <button
                key={r}
                type="button"
                role="radio"
                aria-checked={r === role}
                onClick={() => setRole(r)}
                className={cn(
                  'min-h-[40px] rounded-full border px-3.5 text-sm font-medium transition-colors',
                  r === role ? 'border-terra-strong bg-terra-strong text-on-accent' : 'border-line-strong bg-card hover:border-terra/60',
                )}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-5 space-y-5">
        {destinations.map((dest, i) => {
          const links = smartLinks(dest, { role, city, workModes })
          if (!links.length) return null
          return (
            <section key={dest} aria-label={`Sites para ${countryInfo(dest).name}`}>
              <h3 className="font-sans text-[15px] font-medium">
                {destinations.length > 1 ? `${i + 1}º · ` : ''}
                {countryInfo(dest).name}
              </h3>
              <ul className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {links.map((l) => (
                  <li key={l.site}>
                    <a
                      href={l.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex min-h-touch items-center justify-between gap-3 rounded-field border border-line-strong bg-card px-3.5 py-2 text-[15px] font-medium hover:border-terra/60 hover:bg-terra-soft/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terra/40"
                    >
                      <span className="min-w-0">
                        <span className="block">{l.site}</span>
                        {l.note && <span className="block text-xs font-normal text-muted">{l.note}</span>}
                      </span>
                      <ExternalLink className="size-4 shrink-0 text-muted" aria-hidden />
                      <span className="sr-only">(abre em outra aba)</span>
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )
        })}
      </div>

      <form onSubmit={importLink} noValidate className="mt-6 rounded-card-sm border border-line bg-bg p-4">
        <h3 className="flex items-center gap-2 font-sans text-[15px] font-medium">
          <Link2 className="size-4 text-terra" aria-hidden /> Achou uma vaga lá?
        </h3>
        <p className="mt-0.5 text-sm text-muted">Cole o link aqui para trazer a vaga e adaptar seu currículo a ela.</p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-start">
          <div className="flex-1">
            <Field label="Link da vaga" htmlFor="importar-link" error={error ?? undefined} className="[&>label]:sr-only">
              <Input
                type="url"
                inputMode="url"
                placeholder="https://…"
                value={link}
                onChange={(e) => {
                  setLink(e.target.value)
                  setError(null)
                }}
              />
            </Field>
          </div>
          <Button type="submit" className="sm:mt-0">
            Importar e adaptar <ArrowRight aria-hidden />
          </Button>
        </div>
      </form>
    </Card>
  )
}
