import { useId, useRef, useState } from 'react'
import { CheckCircle2, FileUp, Loader2, RefreshCw } from 'lucide-react'
import { extractPdfText, PdfReadError } from '@/lib/pdf'
import { MIN_RESUME_CHARS } from '@/lib/resume'
import { cn } from '@/lib/utils'

export interface PdfResult {
  file: File
  text: string
  pages: number
}

interface Props {
  onRead: (result: PdfResult) => void
  onError: (message: string) => void
  current?: { name: string; pages: number } | null
  label?: string
}

/** Área para arrastar ou escolher um PDF; extrai o texto no navegador */
export function PdfDropzone({ onRead, onError, current, label = 'Escolha o PDF do seu currículo' }: Props) {
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [reading, setReading] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  async function handleFile(file: File | undefined) {
    if (!file) return
    setReading(true)
    try {
      const { text, pages } = await extractPdfText(file)
      if (text.length < MIN_RESUME_CHARS) {
        throw new PdfReadError(
          'Não conseguimos ler o texto desse PDF (talvez ele seja uma imagem escaneada). Tente exportar de novo ou cole o texto.',
        )
      }
      onRead({ file, text, pages })
    } catch (err) {
      onError(err instanceof PdfReadError ? err.message : 'Não conseguimos ler esse PDF. Tente exportar de novo ou cole o texto.')
    } finally {
      setReading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div>
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept="application/pdf,.pdf"
        className="sr-only"
        onChange={(e) => handleFile(e.target.files?.[0])}
        disabled={reading}
      />
      <label
        htmlFor={inputId}
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          handleFile(e.dataTransfer.files?.[0])
        }}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-card border-2 border-dashed px-5 py-8 text-center transition-colors',
          'focus-within:border-terra hover:border-terra hover:bg-terra-soft/40',
          dragOver ? 'border-terra bg-terra-soft/60' : current ? 'border-success/50 bg-success-soft/50' : 'border-line-strong bg-card',
          reading && 'pointer-events-none opacity-80',
        )}
      >
        {reading ? (
          <>
            <Loader2 className="size-8 animate-spin text-terra" aria-hidden />
            <span className="font-medium" role="status">
              Lendo seu PDF…
            </span>
          </>
        ) : current ? (
          <>
            <CheckCircle2 className="size-8 text-success" aria-hidden />
            <span className="font-medium break-all">{current.name}</span>
            <span className="text-sm text-muted">
              {current.pages} {current.pages === 1 ? 'página lida' : 'páginas lidas'} ·{' '}
              <span className="inline-flex items-center gap-1 text-terra-strong underline underline-offset-[3px]">
                <RefreshCw className="size-3.5" aria-hidden /> trocar arquivo
              </span>
            </span>
          </>
        ) : (
          <>
            <span className="inline-flex size-12 items-center justify-center rounded-full bg-terra-soft text-terra">
              <FileUp className="size-6" aria-hidden />
            </span>
            <span className="font-medium">{label}</span>
            <span className="text-sm text-muted">Toque para escolher ou arraste o arquivo aqui · até 10 MB</span>
          </>
        )}
      </label>
    </div>
  )
}
