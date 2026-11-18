import { useState } from 'react'
import { Plus, ShieldCheck, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { COUNTRY_GROUPS, PAISES } from '@/lib/paises'
import { CAREER_STAGES, type CareerStage, type Certification, type ProfileLink } from '@/lib/profile'
import {
  CONTRACT_LABEL,
  LANGUAGE_LEVEL_LABEL,
  SENIORITY_LABEL,
  type ContractType,
  type LanguageLevel,
  type LanguageSkill,
  type ProfileSuggestions,
  type Seniority,
  type SuggestionKey,
} from '@/lib/queries/preferences'
import { cn } from '@/lib/utils'
import { ChipsInput, SectionCard, SuggestedBadge, SwitchRow, ToggleChips, type SaveState } from './profile-ui'

export interface ProfileDraft {
  full_name: string
  phone: string
  contact_email: string
  city: string
  residence_country: string
  linkedin_url: string
  links: ProfileLink[]
  career_stage: CareerStage | null
  study_course: string
  study_institution: string
  study_period: string
  study_expected_end: string
  registry_council: string
  registry_number: string
  registry_region: string
  specializations: string[]
  certifications: Certification[]
  notify_daily_jobs: boolean
  notify_follow_up: boolean
}

export interface PrefsDraft {
  desired_roles: string[]
  areas: string[]
  seniority: Seniority[]
  work_modes: ('presencial' | 'hibrido' | 'remoto')[]
  cities: string[]
  open_to_relocate: boolean
  contract_types: ContractType[]
  salary_min: string
  salary_max: string
  salary_currency: string
  keywords_include: string[]
  keywords_exclude: string[]
  blocked_companies: string[]
  languages: LanguageSkill[]
  suggestions: ProfileSuggestions
}

interface SugProps {
  sugg: ProfileSuggestions
  accept: (k: SuggestionKey) => void
  dismiss: (k: SuggestionKey) => void
}

// ------------------------------------------------------------ dados pessoais
export function PersonalSection({
  d,
  set,
  status,
  loginEmail,
  nameError,
  sugg,
  accept,
  dismiss,
  photo,
}: { d: ProfileDraft; set: (p: Partial<ProfileDraft>) => void; status: SaveState; loginEmail?: string | null; nameError?: string; photo: React.ReactNode } & SugProps) {
  return (
    <SectionCard
      id="dados"
      title="Foto e dados pessoais"
      description="Vão no cabeçalho do currículo e das cartas. Esses dados nunca são enviados para a IA."
      status={status}
    >
      {photo}
      <Field label="Nome (obrigatório)" htmlFor="perfil-nome" error={nameError}>
        <Input autoComplete="name" value={d.full_name} onChange={(e) => set({ full_name: e.target.value })} />
      </Field>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Field label="Telefone" htmlFor="perfil-telefone">
            <Input type="tel" inputMode="tel" autoComplete="tel" placeholder="(11) 99999-0000" value={d.phone} onChange={(e) => set({ phone: e.target.value })} />
          </Field>
          {sugg.telefone && <SuggestedBadge value={sugg.telefone} onAccept={() => accept('telefone')} onDismiss={() => dismiss('telefone')} />}
        </div>
        <Field label="E-mail de contato" htmlFor="perfil-email" hint={loginEmail ? `Se ficar vazio, usamos o do login: ${loginEmail}` : undefined}>
          <Input type="email" inputMode="email" autoComplete="email" value={d.contact_email} onChange={(e) => set({ contact_email: e.target.value })} />
        </Field>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Field label="Cidade e estado" htmlFor="perfil-cidade">
            <Input autoComplete="address-level2" placeholder="Ex.: Campinas, SP" value={d.city} onChange={(e) => set({ city: e.target.value })} />
          </Field>
          {sugg.cidade && <SuggestedBadge value={sugg.cidade} onAccept={() => accept('cidade')} onDismiss={() => dismiss('cidade')} />}
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="perfil-pais" className="text-sm font-medium">
            País onde mora
          </label>
          <select
            id="perfil-pais"
            value={d.residence_country}
            onChange={(e) => set({ residence_country: e.target.value })}
            className="min-h-touch rounded-field border border-line-strong bg-card px-3 text-[15px]"
          >
            <option value="BR">Brasil</option>
            {COUNTRY_GROUPS.map((g) => (
              <optgroup key={g} label={g}>
                {PAISES.filter((p) => p.group === g).map((p) => (
                  <option key={p.code} value={p.code}>
                    {p.name}
                  </option>
                ))}
              </optgroup>
            ))}
            <option value="OUTRO">Outro</option>
          </select>
        </div>
      </div>
      <div>
        <Field label="LinkedIn" htmlFor="perfil-linkedin">
          <Input inputMode="url" placeholder="linkedin.com/in/seu-nome" value={d.linkedin_url} onChange={(e) => set({ linkedin_url: e.target.value })} />
        </Field>
        {sugg.linkedin && <SuggestedBadge value={sugg.linkedin} onAccept={() => accept('linkedin')} onDismiss={() => dismiss('linkedin')} />}
      </div>
      <LinksEditor links={d.links} onChange={(links) => set({ links })} sugg={sugg} accept={accept} dismiss={dismiss} />
    </SectionCard>
  )
}

function LinksEditor({ links, onChange, sugg, accept, dismiss }: { links: ProfileLink[]; onChange: (l: ProfileLink[]) => void } & SugProps) {
  const upd = (i: number, p: Partial<ProfileLink>) => onChange(links.map((l, k) => (k === i ? { ...l, ...p } : l)))
  return (
    <div>
      <p className="text-sm font-medium">Outros links</p>
      <p className="text-[13px] text-muted">GitHub, portfólio, site, Lattes… O rótulo é livre.</p>
      <ul className="mt-2 space-y-2">
        {links.map((l, i) => (
          <li key={i} className="flex flex-col gap-2 sm:flex-row">
            <Input aria-label={`Rótulo do link ${i + 1}`} placeholder="Rótulo (ex.: GitHub)" value={l.rotulo} onChange={(e) => upd(i, { rotulo: e.target.value })} className="sm:w-40" />
            <Input aria-label={`Endereço do link ${i + 1}`} inputMode="url" placeholder="https://…" value={l.url} onChange={(e) => upd(i, { url: e.target.value })} className="flex-1" />
            <Button variant="ghost" size="icon" onClick={() => onChange(links.filter((_, k) => k !== i))} aria-label={`Remover link ${l.rotulo || i + 1}`}>
              <Trash2 aria-hidden />
            </Button>
          </li>
        ))}
      </ul>
      {sugg.links?.length ? (
        <SuggestedBadge value={sugg.links.map((l) => `${l.rotulo}: ${l.url}`).join(' · ')} onAccept={() => accept('links')} onDismiss={() => dismiss('links')} />
      ) : null}
      <Button variant="secondary" size="sm" className="mt-2" onClick={() => onChange([...links, { rotulo: '', url: '' }])}>
        <Plus aria-hidden /> Adicionar link
      </Button>
    </div>
  )
}

// ---------------------------------------------------- momento profissional
export function CareerSection({ d, set, status, sugg, accept, dismiss }: { d: ProfileDraft; set: (p: Partial<ProfileDraft>) => void; status: SaveState } & SugProps) {
  return (
    <SectionCard
      id="momento"
      title="Momento profissional"
      description="Opcional. Ajuda a IA a valorizar o que você tem (por exemplo, projetos e cursos para quem está começando)."
      status={status}
    >
      <fieldset>
        <legend className="sr-only">Momento profissional</legend>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {CAREER_STAGES.map((s) => {
            const on = d.career_stage === s.value
            return (
              <label
                key={s.value}
                className={cn(
                  'flex cursor-pointer flex-col rounded-card-sm border bg-card px-3.5 py-2.5 focus-within:ring-2 focus-within:ring-terra/40',
                  on ? 'border-terra bg-terra-soft/50' : 'border-line-strong hover:border-terra/60',
                )}
              >
                <input type="radio" name="career" className="sr-only" checked={on} onChange={() => set({ career_stage: s.value })} />
                <span className="font-medium">{s.label}</span>
                <span className="text-[13px] text-muted">{s.help}</span>
              </label>
            )
          })}
        </div>
      </fieldset>
      {d.career_stage && (
        <Button variant="link" className="-mt-2 self-start text-sm" onClick={() => set({ career_stage: null })}>
          Prefiro não informar
        </Button>
      )}
      {sugg.momento && (
        <SuggestedBadge value={CAREER_STAGES.find((c) => c.value === sugg.momento)?.label} onAccept={() => accept('momento')} onDismiss={() => dismiss('momento')} />
      )}
      {d.career_stage === 'estudante' && (
        <div className="grid grid-cols-1 gap-4 rounded-card-sm bg-bg p-4 sm:grid-cols-2">
          <Field label="Curso" htmlFor="estudo-curso">
            <Input value={d.study_course} onChange={(e) => set({ study_course: e.target.value })} placeholder="Ex.: Biomedicina" />
          </Field>
          <Field label="Instituição" htmlFor="estudo-instituicao">
            <Input value={d.study_institution} onChange={(e) => set({ study_institution: e.target.value })} />
          </Field>
          <Field label="Período" htmlFor="estudo-periodo">
            <Input value={d.study_period} onChange={(e) => set({ study_period: e.target.value })} placeholder="Ex.: 5º semestre" />
          </Field>
          <Field label="Previsão de conclusão" htmlFor="estudo-conclusao">
            <Input type="month" value={d.study_expected_end} onChange={(e) => set({ study_expected_end: e.target.value })} />
          </Field>
        </div>
      )}
    </SectionCard>
  )
}

// ------------------------------------------------- formação e qualificações
const SPECIALIZATION_HINTS = ['Análises clínicas', 'Imagenologia', 'Banco de sangue', 'Microbiologia', 'Citologia', 'Estética']

export function QualificationsSection({ d, set, status, sugg, accept, dismiss }: { d: ProfileDraft; set: (p: Partial<ProfileDraft>) => void; status: SaveState } & SugProps) {
  const [hasRegistry, setHasRegistry] = useState(Boolean(d.registry_council))
  const certs = d.certifications
  const updCert = (i: number, p: Partial<Certification>) => set({ certifications: certs.map((c, k) => (k === i ? { ...c, ...p } : c)) })

  return (
    <SectionCard id="qualificacoes" title="Registro, habilitações e certificações" description="Tudo opcional. Preencha só o que fizer sentido para a sua profissão." status={status}>
      <SwitchRow
        id="tem-registro"
        label="Minha profissão tem registro em conselho"
        help="Ex.: CRBM, CRM, COREN, CREA, OAB. Aparece no cabeçalho do currículo."
        checked={hasRegistry}
        onChange={(on) => {
          setHasRegistry(on)
          if (!on) set({ registry_council: '', registry_number: '', registry_region: '' })
        }}
      />
      {sugg.registro && !hasRegistry && (
        <SuggestedBadge
          value={[sugg.registro.conselho, sugg.registro.numero, sugg.registro.regiao].filter(Boolean).join(' · ')}
          onAccept={() => {
            setHasRegistry(true)
            accept('registro')
          }}
          onDismiss={() => dismiss('registro')}
        />
      )}
      {hasRegistry && (
        <div className="grid grid-cols-1 gap-4 rounded-card-sm bg-bg p-4 sm:grid-cols-3">
          <Field label="Conselho" htmlFor="registro-conselho">
            <Input value={d.registry_council} onChange={(e) => set({ registry_council: e.target.value.toUpperCase() })} placeholder="Ex.: CRBM" />
          </Field>
          <Field label="Número" htmlFor="registro-numero">
            <Input value={d.registry_number} onChange={(e) => set({ registry_number: e.target.value })} />
          </Field>
          <Field label="Região / estado" htmlFor="registro-regiao">
            <Input value={d.registry_region} onChange={(e) => set({ registry_region: e.target.value })} placeholder="Ex.: 1ª Região (SP)" />
          </Field>
        </div>
      )}

      <ChipsInput
        id="especializacoes"
        label="Habilitações e especializações"
        hint="Ex.: para biomedicina — análises clínicas, imagenologia, banco de sangue."
        values={d.specializations}
        onChange={(specializations) => set({ specializations })}
        aiSuggestions={sugg.especializacoes}
        suggestions={d.registry_council?.toUpperCase().startsWith('CRBM') ? SPECIALIZATION_HINTS : []}
      />

      <div>
        <p className="text-sm font-medium">Certificações e cursos</p>
        <p className="text-[13px] text-muted">Com validade, quando houver.</p>
        <ul className="mt-2 space-y-3">
          {certs.map((c, i) => (
            <li key={i} className="grid grid-cols-1 gap-2 rounded-card-sm border border-line bg-bg p-3 sm:grid-cols-[2fr_1.5fr_1fr_auto] sm:items-end">
              <Field label="Nome" htmlFor={`cert-${i}-nome`}>
                <Input value={c.nome} onChange={(e) => updCert(i, { nome: e.target.value })} />
              </Field>
              <Field label="Emissor" htmlFor={`cert-${i}-emissor`}>
                <Input value={c.emissor ?? ''} onChange={(e) => updCert(i, { emissor: e.target.value || null })} />
              </Field>
              <Field label="Validade" htmlFor={`cert-${i}-validade`}>
                <Input type="month" value={c.validade ?? ''} onChange={(e) => updCert(i, { validade: e.target.value || null })} />
              </Field>
              <Button variant="ghost" size="icon" onClick={() => set({ certifications: certs.filter((_, k) => k !== i) })} aria-label={`Remover ${c.nome || 'certificação'}`}>
                <Trash2 aria-hidden />
              </Button>
            </li>
          ))}
        </ul>
        {sugg.certificacoes?.length ? (
          <SuggestedBadge value={sugg.certificacoes.map((c) => c.nome).join(' · ')} onAccept={() => accept('certificacoes')} onDismiss={() => dismiss('certificacoes')} />
        ) : null}
        <Button variant="secondary" size="sm" className="mt-2" onClick={() => set({ certifications: [...certs, { nome: '', emissor: null, validade: null }] })}>
          <ShieldCheck className="text-terra" aria-hidden /> Adicionar certificação
        </Button>
      </div>
    </SectionCard>
  )
}

// ---------------------------------------------------- o que estou procurando
const AREA_HINTS = ['Saúde', 'Análises clínicas', 'Tecnologia', 'Dados', 'Administrativo', 'Educação', 'Indústria', 'Pesquisa', 'Vendas', 'Atendimento']

export function SearchSection({ p, set, status, sugg, accept, dismiss }: { p: PrefsDraft; set: (x: Partial<PrefsDraft>) => void; status: SaveState } & SugProps) {
  return (
    <SectionCard id="procura" title="O que estou procurando" description="É a base da busca diária de vagas e da compatibilidade." status={status}>
      <div id="pref-cargos" className="scroll-mt-24">
        <ChipsInput id="pref-cargos-input" label="Cargos que você procura" values={p.desired_roles} onChange={(desired_roles) => set({ desired_roles })} aiSuggestions={sugg.cargos} placeholder="Ex.: Biomédica, Analista de Laboratório" />
      </div>
      <ChipsInput id="pref-areas" label="Áreas de interesse" values={p.areas} onChange={(areas) => set({ areas })} aiSuggestions={sugg.areas} suggestions={AREA_HINTS} />
      <div>
        <ToggleChips<Seniority>
          id="pref-nivel"
          label="Nível"
          options={(Object.keys(SENIORITY_LABEL) as Seniority[]).map((v) => ({ value: v, label: SENIORITY_LABEL[v] }))}
          values={p.seniority}
          onChange={(seniority) => set({ seniority })}
        />
        {sugg.nivel && !p.seniority.includes(sugg.nivel) && (
          <SuggestedBadge value={SENIORITY_LABEL[sugg.nivel]} onAccept={() => accept('nivel')} onDismiss={() => dismiss('nivel')} />
        )}
      </div>
      <ToggleChips
        id="pref-modalidade"
        label="Modalidade"
        options={[
          { value: 'presencial', label: 'Presencial' },
          { value: 'hibrido', label: 'Híbrido' },
          { value: 'remoto', label: 'Remoto' },
        ]}
        values={p.work_modes}
        onChange={(work_modes) => set({ work_modes })}
      />
      <ChipsInput id="pref-cidades" label="Cidades de interesse" values={p.cities} onChange={(cities) => set({ cities })} placeholder="Ex.: Santos, SP" />
      <SwitchRow id="pref-mudar" label="Aceito mudar de cidade ou de país" checked={p.open_to_relocate} onChange={(open_to_relocate) => set({ open_to_relocate })} />
      <ToggleChips<ContractType>
        id="pref-contrato"
        label="Tipo de contrato"
        options={(Object.keys(CONTRACT_LABEL) as ContractType[]).map((v) => ({ value: v, label: CONTRACT_LABEL[v] }))}
        values={p.contract_types}
        onChange={(contract_types) => set({ contract_types })}
      />
      <fieldset>
        <legend className="text-sm font-medium">Pretensão salarial (opcional)</legend>
        <div className="mt-2 grid grid-cols-[1fr_1fr_auto] items-end gap-2">
          <Field label="De" htmlFor="pref-sal-min">
            <Input inputMode="numeric" value={p.salary_min} onChange={(e) => set({ salary_min: e.target.value.replace(/\D/g, '') })} placeholder="4000" />
          </Field>
          <Field label="Até" htmlFor="pref-sal-max">
            <Input inputMode="numeric" value={p.salary_max} onChange={(e) => set({ salary_max: e.target.value.replace(/\D/g, '') })} placeholder="6500" />
          </Field>
          <select
            aria-label="Moeda"
            value={p.salary_currency}
            onChange={(e) => set({ salary_currency: e.target.value })}
            className="min-h-touch rounded-field border border-line-strong bg-card px-2 text-[15px]"
          >
            {['BRL', 'EUR', 'USD', 'GBP', 'CHF', 'CAD'].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
        {p.salary_min && p.salary_max && Number(p.salary_min) > Number(p.salary_max) && (
          <p role="alert" className="mt-1 text-[13px] text-danger">
            O valor “De” está maior que o “Até”. Confira os números.
          </p>
        )}
      </fieldset>
      <ChipsInput id="pref-incluir" label="Palavras-chave para incluir" values={p.keywords_include} onChange={(keywords_include) => set({ keywords_include })} />
      <ChipsInput id="pref-excluir" label="Palavras-chave para excluir" hint="Vagas com essas palavras não aparecem." values={p.keywords_exclude} onChange={(keywords_exclude) => set({ keywords_exclude })} />
      <ChipsInput id="pref-bloqueadas" label="Empresas que não quero ver" values={p.blocked_companies} onChange={(blocked_companies) => set({ blocked_companies })} />
      <LanguagesEditor values={p.languages} onChange={(languages) => set({ languages })} sugg={sugg} accept={accept} dismiss={dismiss} />
    </SectionCard>
  )
}

function LanguagesEditor({ values, onChange, sugg, accept, dismiss }: { values: LanguageSkill[]; onChange: (v: LanguageSkill[]) => void } & SugProps) {
  const upd = (i: number, p: Partial<LanguageSkill>) => onChange(values.map((l, k) => (k === i ? { ...l, ...p } : l)))
  return (
    <div>
      <p className="text-sm font-medium">Idiomas</p>
      <ul className="mt-2 space-y-2">
        {values.map((l, i) => (
          <li key={i} className="flex gap-2">
            <Input aria-label={`Idioma ${i + 1}`} value={l.idioma} onChange={(e) => upd(i, { idioma: e.target.value })} placeholder="Ex.: Inglês" className="flex-1" />
            <select
              aria-label={`Nível de ${l.idioma || 'idioma'}`}
              value={l.nivel}
              onChange={(e) => upd(i, { nivel: e.target.value as LanguageLevel })}
              className="min-h-touch rounded-field border border-line-strong bg-card px-2 text-[15px]"
            >
              {(Object.keys(LANGUAGE_LEVEL_LABEL) as LanguageLevel[]).map((n) => (
                <option key={n} value={n}>
                  {LANGUAGE_LEVEL_LABEL[n]}
                </option>
              ))}
            </select>
            <Button variant="ghost" size="icon" onClick={() => onChange(values.filter((_, k) => k !== i))} aria-label={`Remover ${l.idioma || 'idioma'}`}>
              <Trash2 aria-hidden />
            </Button>
          </li>
        ))}
      </ul>
      {sugg.idiomas?.length ? (
        <SuggestedBadge
          value={sugg.idiomas.map((l) => `${l.idioma} (${LANGUAGE_LEVEL_LABEL[l.nivel]?.toLowerCase() ?? l.nivel})`).join(' · ')}
          onAccept={() => accept('idiomas')}
          onDismiss={() => dismiss('idiomas')}
        />
      ) : null}
      <Button variant="secondary" size="sm" className="mt-2" onClick={() => onChange([...values, { idioma: '', nivel: 'intermediario' }])}>
        <Plus aria-hidden /> Adicionar idioma
      </Button>
    </div>
  )
}
