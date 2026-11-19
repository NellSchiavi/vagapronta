import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { RefreshCw, Search, UserRound } from 'lucide-react'
import { toast } from 'sonner'
import { EmptyState } from '@/components/brand/empty-state'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { LoadingCards } from '@/components/ui/skeleton'
import { showAiError } from '@/lib/ai'
import { countryInfo, type CountryCode } from '@/lib/paises'
import { detectAreas } from '@/lib/area-sites'
import { registryLine, useProfile } from '@/lib/profile'
import { useDestinations } from '@/lib/queries/destinations'
import { rankScore, runJobSearch, SOURCE_LABEL, useLastSearch, useSuggestedJobs } from '@/lib/queries/jobs'
import { usePreferences } from '@/lib/queries/preferences'
import type { WorkMode } from '@/lib/types'
import { cn } from '@/lib/utils'
import { JobCard } from './JobCard'
import { SmartSearch } from './SmartSearch'

function lastSearchText(iso: string) {
  const d = new Date(iso)
  const today = new Date()
  const sameDay = d.toDateString() === today.toDateString()
  const time = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  return sameDay ? `hoje às ${time}` : d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' }) + ` às ${time}`
}

export function JobsPage() {
  const { data: jobs, isLoading } = useSuggestedJobs()
  const { data: destinations } = useDestinations()
  const { data: prefs } = usePreferences()
  const { data: profile } = useProfile()
  const { data: last } = useLastSearch()
  const [filter, setFilter] = useState<CountryCode | 'todas'>('todas')
  const [busy, setBusy] = useState(false)

  const dests: CountryCode[] = destinations?.length ? destinations : ['BR']
  const roles = prefs?.desired_roles?.length ? prefs.desired_roles : profile?.desired_role ? [profile.desired_role] : []
  const priorityOf = (code: string | null) => (code ? dests.indexOf(code as CountryCode) + 1 || null : null)

  // ordem: compatibilidade + bônus do destino (uma vaga muito compatível de outro destino ainda pode ir ao topo)
  const ranked = useMemo(
    () => [...(jobs ?? [])].sort((a, b) => rankScore(b.compatibility, priorityOf(b.destination)) - rankScore(a.compatibility, priorityOf(a.destination))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [jobs, dests.join()],
  )
  const counts = useMemo(() => {
    const c: Record<string, number> = {}
    for (const j of ranked) if (j.destination) c[j.destination] = (c[j.destination] ?? 0) + 1
    return c
  }, [ranked])
  const visible = filter === 'todas' ? ranked : ranked.filter((j) => j.destination === filter)
  // destinos com vagas, na ordem de preferência (e os que não estão mais na lista no fim)
  const chipDests = [...dests, ...Object.keys(counts).filter((c) => !dests.includes(c as CountryCode))] as CountryCode[]

  // vagas que vieram das fontes automáticas (sem as de exemplo nem as que a pessoa trouxe)
  const automatic = ranked.filter((j) => !['exemplo', 'manual', 'link'].includes(j.source) && !j.match_notes?.exemplo).length
  const registry = registryLine(profile)
  const areas = detectAreas([...roles, registry])
  // poucas vagas automáticas: os sites da área vão para o topo, em destaque
  const highlightSites = !isLoading && automatic < 5
  const smartSearch = (
    <SmartSearch
      roles={roles}
      destinations={dests}
      city={prefs?.cities?.[0] ?? profile?.city ?? null}
      workModes={(prefs?.work_modes ?? []) as WorkMode[]}
      areas={areas}
      registry={registry}
      highlight={highlightSites}
    />
  )
  async function search() {
    setBusy(true)
    try {
      const r = await runJobSearch()
      const failed = r.failed.map((s) => SOURCE_LABEL[s] ?? s)
      if (r.inserted > 0) toast.success(r.inserted === 1 ? 'Encontramos 1 vaga nova.' : `Encontramos ${r.inserted} vagas novas.`)
      else toast.info('Nenhuma vaga nova por enquanto. Que tal procurar também nos sites abaixo?')
      if (failed.length) toast.info(`${failed.join(', ')} não respondeu agora. Tentamos de novo na próxima busca.`)
    } catch (e) {
      showAiError(e)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Vagas" description="Vagas que combinam com você, encontradas todos os dias de manhã." />

      {roles.length === 0 ? (
        <EmptyState
          icon={UserRound}
          title="Conte qual cargo você procura"
          description="Com o cargo (e de preferência a cidade e a modalidade), buscamos vagas para você todos os dias."
          action={
            <Button asChild>
              <Link to="/perfil?campo=cargos">Ir para Meu perfil</Link>
            </Button>
          }
        />
      ) : (
        <>
          <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div className="text-sm">
              <p className="font-medium">
                {last ? `Última busca: ${lastSearchText(last.created_at)}` : 'Ainda não buscamos vagas para você.'}
              </p>
              <p className="text-muted">
                Buscando por {roles.slice(0, 2).join(' e ')} ·{' '}
                <Link to="/perfil?campo=destinos" className="underline underline-offset-2 hover:text-ink">
                  mudar
                </Link>
              </p>
            </div>
            <Button onClick={search} loading={busy} className="w-full sm:w-auto">
              {!busy && <RefreshCw aria-hidden />} {busy ? 'Buscando vagas…' : 'Buscar agora'}
            </Button>
          </Card>

          {highlightSites && smartSearch}

          {ranked.length > 0 && (
            <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0" role="group" aria-label="Filtrar por destino">
              <div className="flex w-max gap-2 pb-1">
                <FilterChip active={filter === 'todas'} onClick={() => setFilter('todas')} label="Todas" count={ranked.length} />
                {chipDests
                  .filter((d) => counts[d])
                  .map((d) => (
                    <FilterChip
                      key={d}
                      active={filter === d}
                      onClick={() => setFilter(d)}
                      label={`${dests.includes(d) && dests.length > 1 ? `${dests.indexOf(d) + 1}º ` : ''}${countryInfo(d).name}`}
                      count={counts[d]}
                    />
                  ))}
              </div>
            </div>
          )}

          {isLoading ? (
            <LoadingCards count={3} />
          ) : visible.length === 0 ? (
            <EmptyState
              icon={Search}
              title="Nenhuma vaga aqui ainda"
              description="Toque em “Buscar agora” ou procure nos sites abaixo. As vagas novas também chegam sozinhas todas as manhãs."
            />
          ) : (
            <ul className="space-y-3" aria-label="Vagas sugeridas">
              {visible.map((j) => (
                <li key={j.id}>
                  <JobCard job={j} priority={dests.length > 1 ? priorityOf(j.destination) : null} />
                </li>
              ))}
            </ul>
          )}

          {!highlightSites && smartSearch}

        </>
      )}
    </div>
  )
}

function FilterChip({ active, onClick, label, count }: { active: boolean; onClick: () => void; label: string; count: number }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'inline-flex min-h-[40px] items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 text-sm font-medium transition-colors',
        active ? 'border-terra-strong bg-terra-strong text-on-accent' : 'border-line-strong bg-card hover:border-terra/60',
      )}
    >
      {label}
      <span className={cn('rounded-full px-1.5 text-xs', active ? 'bg-on-accent/20' : 'bg-track')}>{count}</span>
    </button>
  )
}
