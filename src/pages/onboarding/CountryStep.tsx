import { ArrowLeft, FileText } from 'lucide-react'
import { CountryDetails } from '@/components/resume/country-picker'
import { DestinationPicker } from '@/components/resume/destination-picker'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { countryInfo, type CountryCode } from '@/lib/paises'

interface Props {
  destinations: CountryCode[]
  language: string | null
  onChange: (d: CountryCode[]) => void
  onLanguageChange: (l: string) => void
  onBack: () => void
  onFinish: (d: CountryCode[], language: string | null) => void
  saving: boolean
}

export function CountryStep({ destinations, language, onChange, onLanguageChange, onBack, onFinish, saving }: Props) {
  const first = destinations[0]
  return (
    <Card className="p-5 sm:p-8">
      <h1 id="onboarding-title" className="text-[28px] leading-tight sm:text-[32px]">
        Onde você quer trabalhar?
      </h1>
      <p className="mt-2 text-muted">Pode escolher mais de um lugar. Você muda isso quando quiser, em Meu perfil.</p>

      <div className="mt-6">
        <DestinationPicker
          value={destinations}
          onChange={(d) => {
            onChange(d)
            // o idioma sugerido acompanha o 1º lugar
            if (d[0] && d[0] !== first) onLanguageChange(countryInfo(d[0]).languages[0].code)
          }}
        />
      </div>

      {first && (
        <div className="mt-6 space-y-3">
          <h2 className="flex items-center gap-2 font-sans text-[15px] font-medium">
            <FileText className="size-4 text-terra" aria-hidden /> Formato do seu currículo principal: {countryInfo(first).name}
          </h2>
          <p className="text-sm text-muted">
            Ele segue o seu 1º lugar. Quando você se candidatar a uma vaga em outro país, vamos sugerir uma versão no formato de lá.
          </p>
          <CountryDetails c={countryInfo(first)} language={language} onLanguageChange={onLanguageChange} />
        </div>
      )}

      <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button variant="ghost" onClick={onBack} className="text-muted">
          <ArrowLeft aria-hidden /> Voltar
        </Button>
        <Button size="lg" onClick={() => onFinish(destinations, language)} loading={saving} disabled={destinations.length === 0}>
          Concluir
        </Button>
      </div>
    </Card>
  )
}
