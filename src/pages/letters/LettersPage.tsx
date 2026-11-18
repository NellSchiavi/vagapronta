import { Link, useSearchParams } from 'react-router-dom'
import { FileText, PenLine, Plus } from 'lucide-react'
import { EmptyState } from '@/components/brand/empty-state'
import { CompanyInitial } from '@/components/brand/pills'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { LoadingCards } from '@/components/ui/skeleton'
import { useAiTask } from '@/lib/ai-tasks'
import { useLetters } from '@/lib/queries/letters'
import { useResumes } from '@/lib/queries/resumes'
import { TONE_LABEL } from '@/lib/types'
import { AdaptLettersSwitch } from '@/pages/PlaceholderPage'
import { LetterEditor } from './LetterEditor'
import { LETTER_TASK, NewLetter } from './NewLetter'

export function LettersPage() {
  const [params, setParams] = useSearchParams()
  const id = params.get('id')
  const creating = params.has('nova') || params.has('vaga')
  const task = useAiTask(LETTER_TASK)
  const { data: resumes, isLoading: loadingResumes } = useResumes()

  function body() {
    if (id) return <LetterEditor id={id} />
    if (loadingResumes) return <LoadingCards count={2} />
    if (!resumes?.length) {
      return (
        <EmptyState
          icon={FileText}
          title="Envie seu currículo primeiro"
          description="A carta usa as suas experiências reais, então o currículo precisa estar no VagaPronta."
          action={
            <Button asChild>
              <Link to="/curriculo">Enviar currículo</Link>
            </Button>
          }
        />
      )
    }
    if (creating || task) return <NewLetter />
    return <LettersList onNew={() => setParams({ nova: '1' })} />
  }

  return (
    <div>
      <AdaptLettersSwitch current="cartas" />
      <PageHeader
        title="Cartas de apresentação"
        description="Cartas feitas para cada vaga, no tom que você preferir."
        actions={
          !id && !creating && !task && resumes?.length ? (
            <Button onClick={() => setParams({ nova: '1' })}>
              <Plus aria-hidden /> Nova carta
            </Button>
          ) : undefined
        }
      />
      {body()}
    </div>
  )
}

function LettersList({ onNew }: { onNew: () => void }) {
  const { data: letters, isLoading } = useLetters()
  if (isLoading) return <LoadingCards count={3} label="Carregando suas cartas…" />
  if (!letters?.length) {
    return (
      <EmptyState
        icon={PenLine}
        title="Crie sua primeira carta"
        description="Escolha uma vaga e o tom. A IA escreve a carta com as suas experiências, e você ajusta como quiser."
        action={
          <Button onClick={onNew}>
            <Plus aria-hidden /> Nova carta
          </Button>
        }
      />
    )
  }
  return (
    <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">
      {letters.map((l) => {
        const title = l.jobs ? l.jobs.title : l.title
        const company = l.jobs?.company
        const first = l.content.split('\n').find((x) => x.trim() && !/^(olá|prezad|caro|cara|dear|bonjour|hallo)/i.test(x.trim()))
        return (
          <li key={l.id}>
            <Link
              to={`/cartas?id=${l.id}`}
              className="flex h-full gap-3 rounded-card border border-line bg-card p-4 transition-colors hover:border-line-strong"
            >
              <CompanyInitial name={company ?? title} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{title}</p>
                <p className="truncate text-sm text-muted">
                  {[company, `tom ${TONE_LABEL[l.tone].toLowerCase()}`, new Date(l.updated_at).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
                {first && <p className="mt-1.5 line-clamp-2 font-serif text-[15px] leading-snug text-ink/80">{first}</p>}
              </div>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
