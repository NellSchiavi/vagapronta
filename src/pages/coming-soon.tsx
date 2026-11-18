import { KanbanSquare, PenLine, Search, Sparkles } from 'lucide-react'
import { AdaptLettersSwitch, ComingSoonPage } from './PlaceholderPage'

/* Telas ainda em construção. Cada uma é trocada pela tela real na sua etapa. */

export function AdaptComingSoon() {
  return (
    <>
      <AdaptLettersSwitch current="adaptar" />
      <ComingSoonPage
        title="Adaptar à vaga"
        description="Deixe seu currículo com a cara de cada vaga."
        icon={Sparkles}
        promise="Aqui você vai adaptar seu currículo para cada vaga que quiser."
        features={[
          'Cole o anúncio ou o link da vaga',
          'Veja a compatibilidade antes e depois',
          'Escolha quais mudanças aceitar',
        ]}
      />
    </>
  )
}

export function LettersComingSoon() {
  return (
    <>
      <AdaptLettersSwitch current="cartas" />
      <ComingSoonPage
        title="Cartas de apresentação"
        description="Cartas feitas para cada vaga, no tom que você preferir."
        icon={PenLine}
        promise="Aqui você vai criar cartas de apresentação para cada vaga."
        features={['Tom formal, caloroso ou direto', 'Edite o texto direto na tela', 'Baixe em PDF para enviar']}
      />
    </>
  )
}

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
