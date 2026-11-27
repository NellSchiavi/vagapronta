import { Card } from '@/components/ui/card'
import type { Adherence, ReqStatus } from '@/lib/types'
import { cn } from '@/lib/utils'

const STATUS: Record<ReqStatus, { icon: string; label: string; tone: string }> = {
  atende: { icon: '✅', label: 'Atende', tone: 'text-success' },
  parcial: { icon: '⚠️', label: 'Atende em parte', tone: 'text-warn' },
  nao_atende: { icon: '❌', label: 'Não atende', tone: 'text-danger' },
}

/**
 * Checklist dos requisitos da vaga: ✅ atende / ⚠️ atende em parte / ❌ não atende,
 * com o trecho do currículo que comprova e uma dica honesta para o que falta.
 */
export function RequirementsList({ adherence, compact = false }: { adherence: Adherence; compact?: boolean }) {
  return (
    <ul className={cn('space-y-3', compact && 'space-y-2')}>
      {adherence.requisitos.map((r, i) => {
        const st = STATUS[r.status]
        return (
          <li key={`${r.requisito}-${i}`} className="flex gap-2.5">
            <span aria-hidden className="mt-0.5 shrink-0 text-[15px] leading-none">
              {st.icon}
            </span>
            <div className="min-w-0 flex-1">
              <p className={cn('text-[15px]', compact && 'text-sm')}>
                <span className="sr-only">{st.label}: </span>
                {r.requisito}
                <span className="ml-1.5 text-xs text-muted">{r.tipo === 'obrigatorio' ? 'obrigatório' : 'desejável'}</span>
              </p>
              {r.evidencia && (
                <p className="mt-0.5 text-[13px] text-muted">
                  No seu currículo: <q className="italic">{r.evidencia}</q>
                </p>
              )}
              {r.status !== 'atende' && r.dica && <p className={cn('mt-0.5 text-[13px]', st.tone)}>{r.dica}</p>}
            </div>
          </li>
        )
      })}
    </ul>
  )
}

export function RequirementsChecklist({ adherence }: { adherence: Adherence }) {
  const count = (s: ReqStatus) => adherence.requisitos.filter((r) => r.status === s).length
  return (
    <section aria-labelledby="requisitos-titulo">
      <Card className="p-5 sm:p-6">
        <h2 id="requisitos-titulo" className="text-[22px]">
          Requisitos da vaga
        </h2>
        <p className="mt-1 text-sm text-muted">
          {count('atende')} atende · {count('parcial')} em parte · {count('nao_atende')} não atende
          {adherence.basica ? ' · conferido sem IA, pelas palavras do anúncio' : ''}
        </p>
        <div className="mt-4">
          <RequirementsList adherence={adherence} />
        </div>
      </Card>
    </section>
  )
}
