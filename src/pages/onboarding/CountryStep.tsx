import { ArrowLeft } from 'lucide-react'
import { CountryPicker } from '@/components/resume/country-picker'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import type { CountryCode } from '@/lib/paises'

interface Props {
  value: CountryCode
  language: string | null
  onChange: (c: CountryCode) => void
  onLanguageChange: (l: string) => void
  onBack: () => void
  onFinish: (c: CountryCode, language: string | null) => void
  saving: boolean
}

export function CountryStep({ value, language, onChange, onLanguageChange, onBack, onFinish, saving }: Props) {
  return (
    <Card className="p-5 sm:p-8">
      <h1 id="onboarding-title" className="text-[28px] leading-tight sm:text-[32px]">
        Para qual país é o seu currículo?
      </h1>
      <p className="mt-2 text-muted">
        Cada país tem costumes diferentes sobre foto, dados pessoais e tamanho. Você pode mudar isso depois.
      </p>

      <div className="mt-6">
        <CountryPicker value={value} language={language} onChange={onChange} onLanguageChange={onLanguageChange} />
      </div>

      <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button variant="ghost" onClick={onBack} className="text-muted">
          <ArrowLeft aria-hidden /> Voltar
        </Button>
        <Button size="lg" onClick={() => onFinish(value, language)} loading={saving}>
          Concluir
        </Button>
      </div>
    </Card>
  )
}
