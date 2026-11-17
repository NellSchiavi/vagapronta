import { useState } from 'react'
import { AlertCircle, ClipboardPaste, Download, FileText, MoreHorizontal, UserRound } from 'lucide-react'
import { LinkedInIcon } from '@/components/brand/linkedin-icon'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Textarea } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MIN_RESUME_CHARS, type ResumeSource } from '@/lib/resume'
import { PdfDropzone } from './pdf-dropzone'

export type InputMode = 'pdf' | 'texto' | 'linkedin'

export interface ResumeInputValue {
  mode: InputMode
  text: string
  file: File | null
  fileMeta: { name: string; pages: number } | null
}

export const emptyResumeInput: ResumeInputValue = { mode: 'pdf', text: '', file: null, fileMeta: null }

export const sourceFromMode = (mode: InputMode): ResumeSource => (mode === 'texto' ? 'texto' : mode)

/** Valida o que foi informado; retorna a mensagem de erro ou null */
export function validateResumeInput(v: ResumeInputValue): string | null {
  if (v.mode !== 'texto' && !v.file) {
    return v.mode === 'linkedin'
      ? 'Envie o PDF do seu perfil do LinkedIn para continuar.'
      : 'Escolha o PDF do seu currículo para continuar.'
  }
  if (v.text.trim().length < MIN_RESUME_CHARS) {
    return 'O texto está muito curto. Cole o currículo completo, com experiências e formação.'
  }
  return null
}

interface Props {
  value: ResumeInputValue
  onChange: (v: ResumeInputValue) => void
  error?: string | null
}

export function ResumeInput({ value, onChange, error }: Props) {
  const [pdfError, setPdfError] = useState<string | null>(null)

  const setMode = (mode: string) => {
    setPdfError(null)
    // ao trocar de aba, mantém o texto (útil para corrigir) mas solta o arquivo se for para "colar"
    onChange({ ...value, mode: mode as InputMode, ...(mode === 'texto' ? { file: null, fileMeta: null } : {}) })
  }

  const pdfArea = (label: string) => (
    <div className="space-y-4">
      <PdfDropzone
        label={label}
        current={value.fileMeta}
        onRead={({ file, text, pages }) => {
          setPdfError(null)
          onChange({ ...value, file, text, fileMeta: { name: file.name, pages } })
        }}
        onError={(msg) => {
          setPdfError(msg)
          onChange({ ...value, file: null, fileMeta: null })
        }}
      />

      {pdfError && (
        <div role="alert" className="flex items-start gap-3 rounded-card-sm border border-danger/30 bg-danger-soft p-4 text-sm">
          <AlertCircle className="mt-0.5 size-5 shrink-0 text-danger" aria-hidden />
          <div className="flex-1">
            <p>{pdfError}</p>
            <Button variant="link" className="mt-1" onClick={() => setMode('texto')}>
              Colar o texto em vez disso
            </Button>
          </div>
        </div>
      )}

      {value.fileMeta && (
        <details className="group rounded-card-sm border border-line bg-card">
          <summary className="flex min-h-touch cursor-pointer items-center px-4 text-sm font-medium text-ink marker:text-muted">
            Conferir o texto que lemos do PDF
          </summary>
          <div className="px-4 pb-4">
            <Textarea
              aria-label="Texto lido do PDF"
              rows={8}
              value={value.text}
              onChange={(e) => onChange({ ...value, text: e.target.value })}
              className="text-sm"
            />
            <p className="mt-1.5 text-[13px] text-muted">Se algo saiu estranho, pode corrigir aqui mesmo.</p>
          </div>
        </details>
      )}
    </div>
  )

  return (
    <div>
      <Tabs value={value.mode} onValueChange={setMode}>
        <TabsList aria-label="Como você quer enviar o currículo">
          <TabsTrigger value="pdf">
            <FileText aria-hidden />
            <span>
              <span className="sm:hidden">PDF</span>
              <span className="hidden sm:inline">Enviar PDF</span>
            </span>
          </TabsTrigger>
          <TabsTrigger value="texto">
            <ClipboardPaste aria-hidden />
            <span>
              <span className="sm:hidden">Colar</span>
              <span className="hidden sm:inline">Colar texto</span>
            </span>
          </TabsTrigger>
          <TabsTrigger value="linkedin">
            <LinkedInIcon /> <span>
              <span className="sm:hidden">LinkedIn</span>
              <span className="hidden sm:inline">Importar do LinkedIn</span>
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pdf">{pdfArea('Escolha o PDF do seu currículo')}</TabsContent>

        <TabsContent value="texto">
          <Field
            label="Cole aqui o texto do seu currículo"
            htmlFor="resume-text"
            hint="Abra o currículo, selecione tudo (Ctrl+A), copie (Ctrl+C) e cole aqui."
          >
            <Textarea
              rows={10}
              value={value.text}
              onChange={(e) => onChange({ ...value, text: e.target.value })}
              placeholder={'Maria Silva\nAnalista administrativa\n\nExperiência\n…'}
            />
          </Field>
        </TabsContent>

        <TabsContent value="linkedin" className="space-y-4">
          <LinkedInGuide />
          {pdfArea('Envie o PDF do seu perfil')}
        </TabsContent>
      </Tabs>

      {error && !pdfError && (
        <p role="alert" className="mt-3 flex items-start gap-1.5 text-[13px] text-danger">
          <AlertCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          {error}
        </p>
      )}
    </div>
  )
}

/** Passo a passo ilustrado: Perfil → Recursos → Salvar como PDF */
function LinkedInGuide() {
  const steps = [
    {
      icon: UserRound,
      title: 'Abra seu perfil',
      text: 'No computador, entre em linkedin.com e clique na sua foto → “Ver perfil”.',
      mock: (
        <div className="flex items-center gap-2">
          <span className="size-7 rounded-full bg-info-soft" />
          <span className="h-2 w-16 rounded-full bg-track" />
        </div>
      ),
    },
    {
      icon: MoreHorizontal,
      title: 'Clique em “Recursos”',
      text: 'Fica abaixo do seu nome. Em algumas contas o botão se chama “Mais”.',
      mock: (
        <div className="flex gap-1.5">
          <span className="rounded-full bg-linkedin px-2 py-0.5 text-[10px] font-medium text-white">Aberto a</span>
          <span className="rounded-full border-2 border-terra px-2 py-0.5 text-[10px] font-medium text-ink">Recursos</span>
        </div>
      ),
    },
    {
      icon: Download,
      title: 'Escolha “Salvar como PDF”',
      text: 'O arquivo vai para a pasta Downloads. Depois é só enviar aqui embaixo.',
      mock: (
        <div className="w-full space-y-1 rounded-[8px] border border-line bg-card p-1.5 text-[10px]">
          <span className="block rounded px-1.5 py-0.5 text-muted">Enviar perfil</span>
          <span className="block rounded bg-terra-soft px-1.5 py-0.5 font-medium text-terra-strong">Salvar como PDF</span>
        </div>
      ),
    },
  ]

  return (
    <div className="rounded-card border border-line bg-card p-4 sm:p-5">
      <p className="text-sm text-muted">
        O LinkedIn não compartilha suas experiências diretamente, então usamos o PDF do seu perfil. Depois nós
        organizamos experiências, formação e habilidades para você.
      </p>
      <ol className="mt-4 grid gap-3 sm:grid-cols-3">
        {steps.map((s, i) => (
          <li key={s.title} className="flex gap-3 rounded-card-sm bg-bg p-3 sm:flex-col">
            <div className="flex shrink-0 flex-col items-center gap-2 sm:flex-row">
              <span className="inline-flex size-8 items-center justify-center rounded-full bg-terra-strong font-serif text-sm text-on-accent">
                {i + 1}
              </span>
              <div aria-hidden className="hidden h-10 flex-1 items-center rounded-[8px] bg-card px-2 sm:flex">
                {s.mock}
              </div>
            </div>
            <div>
              <p className="flex items-center gap-1.5 font-medium">
                <s.icon className="size-4 text-terra" aria-hidden /> {s.title}
              </p>
              <p className="mt-0.5 text-sm text-muted">{s.text}</p>
            </div>
          </li>
        ))}
      </ol>
      <p className="mt-3 text-[13px] text-muted">Dica: o app do LinkedIn no celular não tem essa opção, use o navegador do computador.</p>
    </div>
  )
}
