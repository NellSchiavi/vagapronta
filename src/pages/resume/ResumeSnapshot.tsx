import { Briefcase, GraduationCap, Languages, Sparkles, UserRound } from 'lucide-react'
import type { ResumeSections } from '@/lib/resume'

function period(inicio?: string, fim?: string | null) {
  if (!inicio && fim === undefined) return ''
  return [inicio, fim ?? 'atual'].filter(Boolean).join(' – ')
}

function Block({ icon: Icon, title, children }: { icon: typeof Briefcase; title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-line pt-4 first:border-t-0 first:pt-0">
      <h4 className="mb-2 flex items-center gap-2 font-sans text-sm font-medium uppercase tracking-wider text-muted">
        <Icon className="size-4" aria-hidden /> {title}
      </h4>
      {children}
    </section>
  )
}

/** Mostra as seções do currículo de forma simples (só leitura) */
export function ResumeSnapshot({ sections }: { sections: ResumeSections }) {
  const empty = <p className="text-sm text-muted">Nada encontrado nesta parte.</p>
  return (
    <div className="space-y-4 text-[15px]">
      <Block icon={UserRound} title="Resumo">
        {sections.resumo ? <p className="leading-relaxed">{sections.resumo}</p> : empty}
      </Block>
      <Block icon={Briefcase} title="Experiência">
        {sections.experiencias?.length ? (
          <ul className="space-y-3">
            {sections.experiencias.map((e, i) => (
              <li key={i}>
                <p className="font-medium">
                  {e.cargo} <span className="font-normal text-muted">· {e.empresa}</span>
                </p>
                {period(e.inicio, e.fim) && <p className="text-sm text-muted">{period(e.inicio, e.fim)}</p>}
                {e.descricao && <p className="mt-1 leading-relaxed">{e.descricao}</p>}
              </li>
            ))}
          </ul>
        ) : (
          empty
        )}
      </Block>
      <Block icon={GraduationCap} title="Formação e cursos">
        {sections.formacao?.length || sections.cursos?.length ? (
          <ul className="space-y-1.5">
            {sections.formacao?.map((f, i) => (
              <li key={`f${i}`}>
                <span className="font-medium">{f.curso}</span> <span className="text-muted">· {f.instituicao}</span>
              </li>
            ))}
            {sections.cursos?.map((c, i) => (
              <li key={`c${i}`} className="text-ink/90">
                {c}
              </li>
            ))}
          </ul>
        ) : (
          empty
        )}
      </Block>
      <Block icon={Sparkles} title="Habilidades">
        {sections.habilidades?.length ? (
          <ul className="flex flex-wrap gap-1.5">
            {sections.habilidades.map((h) => (
              <li key={h} className="rounded-full bg-track px-2.5 py-1 text-sm">
                {h}
              </li>
            ))}
          </ul>
        ) : (
          empty
        )}
      </Block>
      {sections.idiomas?.length ? (
        <Block icon={Languages} title="Idiomas">
          <p>{sections.idiomas.join(' · ')}</p>
        </Block>
      ) : null}
    </div>
  )
}

/** true quando a organização não encontrou quase nada */
export function looksEmpty(s: ResumeSections) {
  return !s.experiencias?.length && !s.formacao?.length && !s.habilidades?.length && !s.resumo
}
