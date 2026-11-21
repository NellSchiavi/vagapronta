import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Check, Copy, Download, Eye, FilePlus2, Loader2, PenLine, UserRound } from 'lucide-react'
import { toast } from 'sonner'
import { PdfPreview } from '@/components/pdf/pdf-preview'
import { buildResumePdf, resumeFileName } from '@/components/pdf/resume-pdf'
import { saveBlob } from '@/components/pdf/pdf-kit'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { LoadingCards } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { shortDate, toISODate } from '@/lib/dates'
import { friendlyDataError } from '@/lib/errors'
import { countGaps } from '@/lib/gaps'
import { COUNTRY_CODES, countryInfo, type CountryCode } from '@/lib/paises'
import { duplicateResume, saveResumeEdits, useResumes } from '@/lib/queries/resumes'
import { resumeSearchText, type Resume, type ResumeFormat, type ResumeSections, type ResumeTemplate } from '@/lib/resume'
import { useAvatarDataUrl } from '@/lib/avatar-pdf'
import { effectiveFormat, resumePdfData } from '@/lib/resume-format'
import type { ResumeLanguage } from '@/lib/resume-i18n'
import { cleanSections, emptySections } from '@/lib/resume-edit'
import { useIsDesktop } from '@/lib/use-is-desktop'
import { useSender } from '@/pages/letters/letter-parts'
import { FormatCard } from './FormatCard'
import { SectionEditors } from './SectionEditors'
import { TemplatePicker } from './TemplatePicker'
import { TranslateSheet } from './TranslateSheet'

/** /curriculo/editar?id=… : editor por seções com a prévia do PDF ao lado */
export function ResumeEditorPage() {
  const [params] = useSearchParams()
  const { data: resumes, isLoading } = useResumes()
  const resume = resumes?.find((r) => r.id === params.get('id')) ?? resumes?.find((r) => r.is_principal) ?? resumes?.[0]

  if (isLoading) return <LoadingCards count={2} label="Abrindo o editor…" />
  if (!resume) {
    return (
      <Card className="p-6">
        <p>Você ainda não tem currículo. Envie o seu (PDF ou texto) para começar a editar.</p>
        <Button asChild className="mt-4">
          <Link to="/curriculo">Enviar meu currículo</Link>
        </Button>
      </Card>
    )
  }
  return <Editor key={resume.id} resume={resume} />
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

function Editor({ resume }: { resume: Resume }) {
  const navigate = useNavigate()
  const sender = useSender()
  const desktop = useIsDesktop()
  const [title, setTitle] = useState(resume.title)
  const [template, setTemplate] = useState<ResumeTemplate>(resume.template ?? 'classico')
  const [sections, setSections] = useState<ResumeSections | null>(resume.content.sections ?? null)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [pages, setPages] = useState(1)
  const [downloading, setDownloading] = useState(false)
  const [copyOpen, setCopyOpen] = useState(false)
  const [params, setParams] = useSearchParams()
  // ?versao=PT abre direto "Criar versão para Portugal" (vindo de uma vaga de outro país)
  const asked = params.get('versao')
  const askedCountry = COUNTRY_CODES.find((c) => c === asked) ?? null
  const [translateOpen, setTranslateOpen] = useState(Boolean(asked))
  const [country, setCountry] = useState<CountryCode>(resume.country)
  const [language, setLanguage] = useState<ResumeLanguage>(resume.language ?? 'pt-BR')
  const [formato, setFormato] = useState<ResumeFormat>(resume.content.formato ?? {})
  const [titulo, setTitulo] = useState(resume.content.titulo ?? '')
  const [registryNote, setRegistryNote] = useState(resume.content.registro_nota ?? '')
  const info = countryInfo(country)

  const clean = useMemo(() => (sections ? cleanSections(sections) : null), [sections])
  const extras = { formato, titulo: titulo.trim() || undefined, registro_nota: registryNote.trim() || undefined }
  const extrasKey = JSON.stringify(extras)
  const snapshot = JSON.stringify([title, template, clean, country, language, extras])
  const lastSaved = useRef(
    JSON.stringify([
      resume.title,
      resume.template ?? 'classico',
      resume.content.sections ? cleanSections(resume.content.sections) : null,
      resume.country,
      resume.language ?? 'pt-BR',
      { formato: resume.content.formato ?? {}, titulo: resume.content.titulo?.trim() || undefined, registro_nota: resume.content.registro_nota?.trim() || undefined },
    ]),
  )
  const pending = useRef<null | (() => Promise<void>)>(null)

  const save = useCallback(
    async (
      snap: string,
      edits: {
        title: string
        template: ResumeTemplate
        sections: ResumeSections
        country: CountryCode
        language: ResumeLanguage
        extras: { formato: ResumeFormat; titulo?: string; registro_nota?: string }
      },
    ) => {
      setSaveState('saving')
      try {
        await saveResumeEdits(resume.id, {
          title: edits.title,
          template: edits.template,
          country: edits.country,
          language: edits.language,
          content: { ...resume.content, ...edits.extras, sections: edits.sections },
        })
        lastSaved.current = snap
        setSaveState('saved')
      } catch (e) {
        setSaveState('error')
        toast.error(friendlyDataError(e, 'Não conseguimos salvar agora. Suas mudanças continuam aqui; tentamos de novo na próxima alteração.'))
      }
    },
    [resume.id, resume.content],
  )

  // salvamento automático: 1 segundo depois de parar de mexer
  useEffect(() => {
    if (!clean || snapshot === lastSaved.current) return
    const edits = { title, template, sections: clean, country, language, extras: JSON.parse(extrasKey) as typeof extras }
    pending.current = () => save(snapshot, edits)
    setSaveState('saving')
    const t = window.setTimeout(() => {
      pending.current = null
      void save(snapshot, edits)
    }, 1000)
    return () => window.clearTimeout(t)
  }, [snapshot, clean, title, template, country, language, extrasKey, save])

  // ao sair do editor com algo ainda não salvo, salva na hora
  useEffect(() => () => void pending.current?.(), [])

  const wantsPhoto = effectiveFormat(country, formato).photo
  const hasPhoto = Boolean(sender.avatar && sender.avatar.source !== 'removida' && (sender.avatar.path || sender.avatar.url))
  const photo = useAvatarDataUrl(sender.avatar, wantsPhoto)
  const senderKey = JSON.stringify(sender)
  const pdfData = useMemo(
    () =>
      resumePdfData(
        { country, language, template, content: { ...resume.content, ...(JSON.parse(extrasKey) as typeof extras), sections: clean ?? emptySections() } },
        JSON.parse(senderKey) as typeof sender,
        { photo },
      ),
    [senderKey, clean, template, country, language, extrasKey, photo, resume.content],
  )
  const previewVersion = JSON.stringify(pdfData)
  // só nos textos (o JSON tem colchetes de lista que não são lacunas)
  const gaps = clean ? countGaps(resumeSearchText({ sections: clean })) : 0
  const build = useCallback(() => buildResumePdf(pdfData), [pdfData])

  async function download() {
    setDownloading(true)
    try {
      saveBlob(await buildResumePdf(pdfData), resumeFileName(sender.name, null, language))
    } catch {
      toast.error('Não conseguimos gerar o PDF. Tente de novo.')
    } finally {
      setDownloading(false)
    }
  }

  if (!sections) {
    return (
      <div className="space-y-4">
        <BackLink id={resume.id} />
        <Card className="p-5 sm:p-6">
          <h1 className="text-[26px]">Editar currículo</h1>
          <p className="mt-2 text-muted">
            Este currículo ainda está como texto corrido. Organize em seções (a IA faz isso em segundos) ou comece um em branco.
          </p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Button asChild>
              <Link to={`/curriculo?id=${resume.id}`}>Organizar meu currículo</Link>
            </Button>
            <Button variant="secondary" onClick={() => setSections(emptySections())}>
              <FilePlus2 aria-hidden /> Começar em branco
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  const editor = (
    <div className="space-y-4">
      <Card className="space-y-4 p-4 sm:p-5">
        <Field
          label="Nome desta versão"
          htmlFor="ed-titulo"
          hint={`Criada em ${shortDate(toISODate(new Date(resume.created_at))).replace(/\.$/, '')}. Ajuda a achar depois (ex.: “Laboratório – hospitais”).`}
        >
          <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} />
        </Field>
        <Field
          label="Cargo no topo do currículo"
          htmlFor="ed-cargo-topo"
          hint={sender.role ? `Se ficar vazio, usamos o do Meu perfil: “${sender.role}”.` : 'Ex.: Biomédica. Se ficar vazio, usamos o do Meu perfil.'}
        >
          <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} maxLength={120} placeholder={sender.role} />
        </Field>
        <div>
          <p className="mb-2 text-sm font-medium">Modelo</p>
          <TemplatePicker value={template} onChange={setTemplate} europass={info.europass} />
          <p className="mt-2 text-[13px] text-muted">
            Todos são lidos sem problema pelos sistemas de recrutamento (ATS). Trocar de modelo não muda o conteúdo.
          </p>
        </div>
      </Card>
      <Card className="flex items-start gap-3 p-4 text-sm">
        <UserRound className="mt-0.5 size-4 shrink-0 text-terra" aria-hidden />
        <p>
          Nome, cargo, registro e contatos vêm de{' '}
          <Link to="/perfil" className="font-medium text-terra-strong underline underline-offset-2">
            Meu perfil
          </Link>
          . Mude lá e o currículo acompanha.
        </p>
      </Card>
      <FormatCard
        country={country}
        language={language}
        onCountry={(c) => {
          setCountry(c)
          // o Europass só existe para países que usam esse formato
          if (template === 'europass' && !countryInfo(c).europass) setTemplate('classico')
        }}
        onLanguage={setLanguage}
        formato={formato}
        onFormato={setFormato}
        has={{ photo: hasPhoto, birthDate: Boolean(sender.birthDate), citizenship: sender.citizenships.length > 0 }}
        registry={sender.registry}
        registryNote={registryNote}
        onRegistryNote={setRegistryNote}
        onNewVersion={() => setTranslateOpen(true)}
      />
      <SectionEditors resumeId={resume.id} sections={sections} onChange={setSections} targetRole={sender.role} />
    </div>
  )

  const preview = (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className={pages > info.format.maxPages ? 'font-medium text-warn' : 'text-muted'}>
          {pages === 1 ? '1 página' : `${pages} páginas`}
          {pages > info.format.maxPages
            ? ` · para ${info.name}, o ideal é até ${info.format.maxPages === 1 ? '1 página' : `${info.format.maxPages} páginas`}`
            : ''}
        </span>
        <Button size="sm" onClick={download} loading={downloading}>
          {!downloading && <Download aria-hidden />} Baixar PDF
        </Button>
      </div>
      {gaps > 0 && (
        <p className="rounded-card-sm bg-warn-soft px-3 py-2 text-sm text-warn" role="status">
          {gaps === 1 ? 'Há 1 trecho' : `Há ${gaps} trechos`} entre [colchetes] para completar com o seu dado real (ou apagar) antes de enviar.
        </p>
      )}
      <PdfPreview build={build} version={previewVersion} label="Prévia do currículo em PDF" onPages={setPages} />
    </div>
  )

  return (
    <div className="space-y-4">
      <BackLink id={resume.id} />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-[28px] leading-tight sm:text-[34px]">Editar currículo</h1>
          <SaveStatus state={saveState} />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => setCopyOpen(true)}>
            <Copy aria-hidden /> Criar uma cópia
          </Button>
          {!desktop && (
            <Button onClick={download} loading={downloading}>
              {!downloading && <Download aria-hidden />} Baixar PDF
            </Button>
          )}
        </div>
      </div>

      {desktop ? (
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,460px)] items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,520px)]">
          {editor}
          <aside
            className="sticky top-4 max-h-[calc(100vh-2rem)] overflow-y-auto rounded-card border border-line bg-track/40 p-4"
            aria-label="Prévia"
          >
            {preview}
          </aside>
        </div>
      ) : (
        <Tabs defaultValue="editar">
          <TabsList className="sticky top-2 z-10 bg-bg/95 backdrop-blur">
            <TabsTrigger value="editar">
              <PenLine aria-hidden /> Editar
            </TabsTrigger>
            <TabsTrigger value="ver">
              <Eye aria-hidden /> Ver
            </TabsTrigger>
          </TabsList>
          <TabsContent value="editar">{editor}</TabsContent>
          <TabsContent value="ver">{preview}</TabsContent>
        </Tabs>
      )}

      <Sheet
        open={translateOpen}
        onOpenChange={(o) => {
          setTranslateOpen(o)
          if (!o && asked) {
            params.delete('versao')
            setParams(params, { replace: true })
          }
        }}
      >
        {translateOpen && clean && (
          <TranslateSheet
            resume={{ ...resume, country, language, content: { ...resume.content, ...extras } }}
            current={{ title, template, sections: clean, titulo }}
            owner={sender}
            initialCountry={askedCountry ?? undefined}
            onCreate={async (v) => {
              const id = await duplicateResume(resume, { ...v, source: v.translated ? 'traducao' : 'editor' })
              setTranslateOpen(false)
              toast.success(`Versão para ${countryInfo(v.country).name} criada. Agora você está editando ela; a original ficou como estava.`)
              navigate(`/curriculo/editar?id=${id}`, { replace: true })
            }}
          />
        )}
      </Sheet>

      <Sheet open={copyOpen} onOpenChange={setCopyOpen}>
        {copyOpen && (
          <CopySheet
            resume={resume}
            defaultTitle={`${title} – cópia`}
            onCreate={async (newTitle) => {
              const id = await duplicateResume(resume, {
                title: newTitle,
                template,
                country,
                language,
                content: { ...resume.content, ...extras, sections: clean },
              })
              setCopyOpen(false)
              toast.success('Cópia criada. Agora você está editando a cópia; a original ficou como estava.')
              navigate(`/curriculo/editar?id=${id}`, { replace: true })
            }}
          />
        )}
      </Sheet>
    </div>
  )
}

function BackLink({ id }: { id: string }) {
  return (
    <Link to={`/curriculo?id=${id}`} className="inline-flex min-h-touch items-center gap-1.5 text-sm font-medium text-muted hover:text-ink">
      <ArrowLeft className="size-4" aria-hidden /> Seu currículo
    </Link>
  )
}

function SaveStatus({ state }: { state: SaveState }) {
  return (
    <p className="mt-1 flex min-h-[20px] items-center gap-1.5 text-sm text-muted" role="status" aria-live="polite">
      {state === 'saving' && (
        <>
          <Loader2 className="size-3.5 animate-spin" aria-hidden /> Salvando…
        </>
      )}
      {state === 'saved' && (
        <>
          <Check className="size-3.5 text-success" aria-hidden /> Salvo automaticamente
        </>
      )}
      {state === 'error' && <span className="text-danger">Não salvou. Tentamos de novo na próxima mudança.</span>}
      {state === 'idle' && 'As mudanças são salvas sozinhas.'}
    </p>
  )
}

function CopySheet({ resume, defaultTitle, onCreate }: { resume: Resume; defaultTitle: string; onCreate: (title: string) => Promise<void> }) {
  const [name, setName] = useState(defaultTitle)
  const [busy, setBusy] = useState(false)
  return (
    <SheetContent title="Criar uma cópia" description="Para ter versões diferentes (ex.: uma para laboratório e outra para hospital).">
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault()
          setBusy(true)
          try {
            await onCreate(name)
          } catch (err) {
            toast.error(friendlyDataError(err, 'Não conseguimos criar a cópia. Tente de novo.'))
          } finally {
            setBusy(false)
          }
        }}
      >
        <Field label="Nome da nova versão" htmlFor="copia-nome">
          <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} autoFocus />
        </Field>
        <p className="text-sm text-muted">
          A cópia começa igual a “{resume.title}” como está agora, e as duas ficam guardadas. Dica: para manter uma versão intacta, crie a cópia antes
          de mexer.
        </p>
        <Button type="submit" block loading={busy}>
          Criar e editar a cópia
        </Button>
      </form>
    </SheetContent>
  )
}
