import { useState } from 'react'
import { ArrowDown, ArrowUp, Briefcase, GraduationCap, Languages, ListChecks, Plus, Sparkles, Trash2, UserRound } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Field } from '@/components/ui/field'
import { Input, Textarea } from '@/components/ui/input'
import type { Education, Experience, ResumeSections } from '@/lib/resume'
import { dateToField, fieldToDate, move, splitLines, splitList } from '@/lib/resume-edit'
import { ImproveWithAi } from './ImproveWithAi'

interface Props {
  resumeId: string
  sections: ResumeSections
  onChange: (next: ResumeSections) => void
  targetRole?: string
}

function SectionCard({ icon: Icon, title, hint, children }: { icon: typeof Briefcase; title: string; hint?: string; children: React.ReactNode }) {
  return (
    <Card className="p-4 sm:p-5">
      <h2 className="flex items-center gap-2 font-sans text-[17px] font-medium">
        <Icon className="size-5 text-terra" aria-hidden /> {title}
      </h2>
      {hint && <p className="mt-0.5 text-sm text-muted">{hint}</p>}
      <div className="mt-4 space-y-4">{children}</div>
    </Card>
  )
}

/** Campo de lista ("separe por vírgula"): guarda o texto digitado e entrega a lista limpa */
function ListField({
  id,
  label,
  hint,
  value,
  onChange,
  lines = false,
  rows = 3,
}: {
  id: string
  label: string
  hint: string
  value: string[]
  onChange: (v: string[]) => void
  lines?: boolean
  rows?: number
}) {
  const [text, setText] = useState(() => value.join(lines ? '\n' : ', '))
  return (
    <Field label={label} htmlFor={id} hint={hint}>
      <Textarea
        rows={rows}
        value={text}
        onChange={(e) => {
          setText(e.target.value)
          onChange(lines ? splitLines(e.target.value) : splitList(e.target.value))
        }}
      />
    </Field>
  )
}

export function SectionEditors({ resumeId, sections, onChange, targetRole }: Props) {
  const path = `/curriculo/editar?id=${resumeId}`
  const exps = sections.experiencias ?? []
  const edus = sections.formacao ?? []
  // as listas guardam o texto digitado; muda a chave para recarregar quando a IA troca o conteúdo
  const [skillsKey, setSkillsKey] = useState(0)

  const set = <K extends keyof ResumeSections>(k: K, v: ResumeSections[K]) => onChange({ ...sections, [k]: v })
  const setExp = (i: number, patch: Partial<Experience>) =>
    set(
      'experiencias',
      exps.map((e, j) => (j === i ? { ...e, ...patch } : e)),
    )
  const setEdu = (i: number, patch: Partial<Education>) =>
    set(
      'formacao',
      edus.map((e, j) => (j === i ? { ...e, ...patch } : e)),
    )

  function removeExp(i: number) {
    const before = exps
    set(
      'experiencias',
      exps.filter((_, j) => j !== i),
    )
    toast('Experiência removida.', {
      action: {
        label: 'Desfazer',
        onClick: () => onChange({ ...sections, experiencias: before }),
      },
    })
  }
  function removeEdu(i: number) {
    const before = edus
    set(
      'formacao',
      edus.filter((_, j) => j !== i),
    )
    toast('Formação removida.', {
      action: {
        label: 'Desfazer',
        onClick: () => onChange({ ...sections, formacao: before }),
      },
    })
  }

  return (
    <div className="space-y-4">
      <SectionCard icon={UserRound} title="Resumo" hint="3 ou 4 linhas sobre quem você é e o que procura. É a primeira coisa que o recrutador lê.">
        <div>
          <Field label="Seu resumo" htmlFor="ed-resumo">
            <Textarea id="ed-resumo" rows={5} value={sections.resumo ?? ''} onChange={(e) => set('resumo', e.target.value)} />
          </Field>
          <ImproveWithAi
            taskKey={`melhorar:${resumeId}:resumo`}
            kind="resumo"
            text={sections.resumo ?? ''}
            targetRole={targetRole}
            path={path}
            onUse={(t) => set('resumo', t)}
            onUndo={(t) => set('resumo', t)}
          />
        </div>
      </SectionCard>

      <SectionCard icon={Briefcase} title="Experiência" hint="Da mais recente para a mais antiga. Use as setas para mudar a ordem.">
        {exps.map((e, i) => {
          const current = e.fim === null
          return (
            <fieldset key={i} className="rounded-card-sm border border-line p-3 sm:p-4">
              <legend className="px-1 text-sm font-medium text-muted">Experiência {i + 1}</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Cargo" htmlFor={`ed-exp-${i}-cargo`}>
                  <Input value={e.cargo} onChange={(ev) => setExp(i, { cargo: ev.target.value })} />
                </Field>
                <Field label="Empresa" htmlFor={`ed-exp-${i}-empresa`}>
                  <Input value={e.empresa} onChange={(ev) => setExp(i, { empresa: ev.target.value })} />
                </Field>
                <Field label="Início" htmlFor={`ed-exp-${i}-inicio`} hint="Ex.: 03/2021">
                  <Input
                    inputMode="numeric"
                    value={dateToField(e.inicio)}
                    onChange={(ev) =>
                      setExp(i, {
                        inicio: fieldToDate(ev.target.value) || undefined,
                      })
                    }
                  />
                </Field>
                <div className="flex flex-col gap-1.5">
                  <Field label="Fim" htmlFor={`ed-exp-${i}-fim`} hint={current ? 'Trabalho aqui atualmente' : 'Ex.: 12/2023'}>
                    <Input
                      inputMode="numeric"
                      disabled={current}
                      value={current ? '' : dateToField(e.fim)}
                      onChange={(ev) =>
                        setExp(i, {
                          fim: fieldToDate(ev.target.value) || undefined,
                        })
                      }
                    />
                  </Field>
                  <label className="inline-flex min-h-touch items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="size-4 accent-terra-strong"
                      checked={current}
                      onChange={(ev) => setExp(i, { fim: ev.target.checked ? null : undefined })}
                    />
                    Trabalho aqui atualmente
                  </label>
                </div>
                <Field label="Cidade (opcional)" htmlFor={`ed-exp-${i}-local`} className="sm:col-span-2">
                  <Input value={e.local ?? ''} onChange={(ev) => setExp(i, { local: ev.target.value })} />
                </Field>
              </div>
              <div className="mt-3">
                <Field
                  label="O que você fazia"
                  htmlFor={`ed-exp-${i}-desc`}
                  hint="Uma tarefa ou resultado por linha. Comece com um verbo: Realizei, Implantei…"
                >
                  <Textarea rows={5} value={e.descricao ?? ''} onChange={(ev) => setExp(i, { descricao: ev.target.value })} />
                </Field>
                <ImproveWithAi
                  taskKey={`melhorar:${resumeId}:experiencia:${i}`}
                  kind="experiencia"
                  text={e.descricao ?? ''}
                  targetRole={targetRole}
                  context={{ cargo: e.cargo, empresa: e.empresa }}
                  path={path}
                  onUse={(t) => setExp(i, { descricao: t })}
                  onUndo={(t) => setExp(i, { descricao: t })}
                />
              </div>
              <div className="mt-2 flex flex-wrap justify-end gap-1 border-t border-line pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={i === 0}
                  onClick={() => set('experiencias', move(exps, i, i - 1))}
                  aria-label={`Subir a experiência ${i + 1}`}
                >
                  <ArrowUp aria-hidden />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={i === exps.length - 1}
                  onClick={() => set('experiencias', move(exps, i, i + 1))}
                  aria-label={`Descer a experiência ${i + 1}`}
                >
                  <ArrowDown aria-hidden />
                </Button>
                <Button type="button" variant="ghost" size="sm" className="text-danger" onClick={() => removeExp(i)}>
                  <Trash2 aria-hidden /> Remover
                </Button>
              </div>
            </fieldset>
          )
        })}
        <Button type="button" variant="secondary" onClick={() => set('experiencias', [...exps, { cargo: '', empresa: '' }])}>
          <Plus aria-hidden /> Adicionar experiência
        </Button>
      </SectionCard>

      <SectionCard icon={GraduationCap} title="Formação">
        {edus.map((f, i) => (
          <fieldset key={i} className="rounded-card-sm border border-line p-3 sm:p-4">
            <legend className="px-1 text-sm font-medium text-muted">Formação {i + 1}</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Curso" htmlFor={`ed-edu-${i}-curso`}>
                <Input value={f.curso} onChange={(ev) => setEdu(i, { curso: ev.target.value })} />
              </Field>
              <Field label="Instituição" htmlFor={`ed-edu-${i}-inst`}>
                <Input value={f.instituicao} onChange={(ev) => setEdu(i, { instituicao: ev.target.value })} />
              </Field>
              <Field label="Início" htmlFor={`ed-edu-${i}-inicio`} hint="Ex.: 2016">
                <Input
                  inputMode="numeric"
                  value={dateToField(f.inicio)}
                  onChange={(ev) =>
                    setEdu(i, {
                      inicio: fieldToDate(ev.target.value) || undefined,
                    })
                  }
                />
              </Field>
              <Field label="Conclusão" htmlFor={`ed-edu-${i}-fim`} hint="Ex.: 2020 (ou a previsão)">
                <Input
                  inputMode="numeric"
                  value={dateToField(f.fim)}
                  onChange={(ev) =>
                    setEdu(i, {
                      fim: fieldToDate(ev.target.value) || undefined,
                    })
                  }
                />
              </Field>
            </div>
            <div className="mt-2 flex justify-end border-t border-line pt-2">
              <Button type="button" variant="ghost" size="sm" className="text-danger" onClick={() => removeEdu(i)}>
                <Trash2 aria-hidden /> Remover
              </Button>
            </div>
          </fieldset>
        ))}
        <Button type="button" variant="secondary" onClick={() => set('formacao', [...edus, { curso: '', instituicao: '' }])}>
          <Plus aria-hidden /> Adicionar formação
        </Button>
        <ListField
          id="ed-cursos"
          label="Cursos e certificações"
          hint="Um por linha. Ex.: Biossegurança em laboratório (40 h)"
          value={sections.cursos ?? []}
          onChange={(v) => set('cursos', v)}
          lines
        />
      </SectionCard>

      <SectionCard
        icon={ListChecks}
        title="Habilidades"
        hint="Técnicas, ferramentas e equipamentos que você usa. Os sistemas de recrutamento procuram por elas."
      >
        <div>
          <ListField
            key={skillsKey}
            id="ed-habilidades"
            label="Suas habilidades"
            hint="Separe por vírgula."
            value={sections.habilidades ?? []}
            onChange={(v) => set('habilidades', v)}
          />
          <ImproveWithAi
            taskKey={`melhorar:${resumeId}:habilidades`}
            kind="habilidades"
            text={(sections.habilidades ?? []).join(', ')}
            targetRole={targetRole}
            path={path}
            onUse={(t) => {
              set('habilidades', splitList(t))
              setSkillsKey((k) => k + 1)
            }}
            onUndo={(t) => {
              set('habilidades', splitList(t))
              setSkillsKey((k) => k + 1)
            }}
          />
        </div>
      </SectionCard>

      <SectionCard icon={Languages} title="Idiomas">
        <ListField
          id="ed-idiomas"
          label="Idiomas e nível"
          hint="Separe por vírgula. Ex.: Inglês intermediário, Espanhol básico"
          value={sections.idiomas ?? []}
          onChange={(v) => set('idiomas', v)}
          rows={2}
        />
      </SectionCard>

      <p className="flex items-start gap-2 px-1 text-[13px] text-muted">
        <Sparkles className="mt-0.5 size-3.5 shrink-0" aria-hidden />
        “Melhorar com IA” só sugere. Nada muda no seu currículo até você tocar em “Usar esta versão”.
      </p>
    </div>
  )
}
