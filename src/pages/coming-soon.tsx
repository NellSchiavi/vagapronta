import { KanbanSquare, Search } from 'lucide-react'
import { ComingSoonPage } from './PlaceholderPage'

/* Telas ainda em construção. Cada uma é trocada pela tela real na sua etapa. */

export function JobsComingSoon() {
  return (
    <ComingSoonPage
      title="Vagas"
      description="Vagas com o seu perfil, encontradas todos os dias."
      icon={Search}
      promise="Aqui vão aparecer, todos os dias, vagas que combinam com você."
      features={[
        'Vagas do Brasil e vagas remotas',
        'A porcentagem de compatibilidade de cada uma',
        'Salvar, descartar ou se candidatar com um toque',
      ]}
    />
  )
}

export function ApplicationsComingSoon() {
  return (
    <ComingSoonPage
      title="Candidaturas"
      description="Acompanhe cada candidatura, da preparação até a oferta."
      icon={KanbanSquare}
      promise="Aqui você vai acompanhar todas as suas candidaturas num só quadro."
      features={[
        'Da preparação até a oferta, em colunas',
        'Anotações e o currículo e a carta usados em cada uma',
        'Lembretes para dar retorno às empresas',
      ]}
    />
  )
}
