import { ArrowLeft, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { COUNTRIES, type CountryCode } from '@/lib/countries'
import { cn } from '@/lib/utils'

interface Props {
  value: CountryCode
  onChange: (c: CountryCode) => void
  onBack: () => void
  onFinish: (c: CountryCode) => void
  saving: boolean
}

export function CountryStep({ value, onChange, onBack, onFinish, saving }: Props) {
  return (
    <Card className="p-5 sm:p-8">
      <h1 id="onboarding-title" className="text-[28px] leading-tight sm:text-[32px]">
        Para qual país é o seu currículo?
      </h1>
      <p className="mt-2 text-muted">
        Cada país tem costumes diferentes sobre foto, dados pessoais e tamanho. Você pode mudar isso depois.
      </p>

      <fieldset className="mt-6">
        <legend className="sr-only">País do currículo</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {COUNTRIES.map((c) => {
            const checked = c.code === value
            return (
              <label
                key={c.code}
                className={cn(
                  'relative flex cursor-pointer gap-3 rounded-card-sm border bg-card p-4 transition-colors',
                  'focus-within:ring-2 focus-within:ring-terra/40',
                  checked ? 'border-terra bg-terra-soft/50' : 'border-line-strong hover:border-terra/60',
                )}
              >
                <input
                  type="radio"
                  name="country"
                  value={c.code}
                  checked={checked}
                  onChange={() => onChange(c.code)}
                  className="sr-only"
                />
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
                  <span className="flex items-center gap-2 font-medium">
                    {c.name}
                    {c.code === 'BR' && <span className="rounded-full bg-track px-2 py-0.5 text-xs text-muted">padrão</span>}
                  </span>
                  <span className="mt-0.5 block text-sm text-muted">{c.summary}</span>
                </span>
              </label>
            )
          })}
        </div>
      </fieldset>

      <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button variant="ghost" onClick={onBack} className="text-muted">
          <ArrowLeft aria-hidden /> Voltar
        </Button>
        <Button size="lg" onClick={() => onFinish(value)} loading={saving}>
          Concluir
        </Button>
      </div>
    </Card>
  )
}
