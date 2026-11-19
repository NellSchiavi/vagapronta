import { useEffect, useRef, useState } from 'react'
import { loadPdfjs } from '@/lib/pdf'
import { cn } from '@/lib/utils'

interface Props {
  /** gera o PDF; é chamado de novo sempre que `version` muda */
  build: () => Promise<Blob>
  /** muda quando o conteúdo muda (ex.: JSON do currículo + modelo) */
  version: string
  /** nome para leitores de tela */
  label: string
  onPages?: (n: number) => void
  className?: string
}

/**
 * Pré-visualização fiel: gera o PDF de verdade e desenha as páginas com pdf.js.
 * O que aparece aqui é exatamente o que vai ser baixado (em qualquer celular).
 */
export function PdfPreview({ build, version, label, onPages, className }: Props) {
  const host = useRef<HTMLDivElement>(null)
  const [busy, setBusy] = useState(true)
  const [failed, setFailed] = useState(false)
  const [width, setWidth] = useState(0)
  const buildRef = useRef(build)
  buildRef.current = build
  const pagesRef = useRef(onPages)
  pagesRef.current = onPages

  // redesenha se a largura mudar (girar o celular, abrir o painel)
  useEffect(() => {
    const el = host.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setWidth(Math.round(e.contentRect.width)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    if (!width) return
    let cancelled = false
    setBusy(true)
    // espera a pessoa parar de digitar um instante antes de gerar de novo
    const timer = setTimeout(async () => {
      try {
        const [blob, pdfjs] = await Promise.all([buildRef.current(), loadPdfjs()])
        if (cancelled) return
        const doc = await pdfjs.getDocument({
          data: new Uint8Array(await blob.arrayBuffer()),
        }).promise
        const ratio = Math.min(window.devicePixelRatio || 1, 2)
        const canvases: HTMLCanvasElement[] = []
        for (let i = 1; i <= doc.numPages; i++) {
          const page = await doc.getPage(i)
          const base = page.getViewport({ scale: 1 })
          const viewport = page.getViewport({
            scale: (width / base.width) * ratio,
          })
          const canvas = document.createElement('canvas')
          canvas.width = Math.floor(viewport.width)
          canvas.height = Math.floor(viewport.height)
          canvas.style.width = '100%'
          canvas.className = 'block rounded-[4px] bg-white shadow-soft ring-1 ring-line'
          canvas.setAttribute('aria-hidden', 'true')
          await page.render({
            canvasContext: canvas.getContext('2d')!,
            viewport,
          }).promise
          canvases.push(canvas)
        }
        if (cancelled || !host.current) return
        // troca tudo de uma vez (sem piscar)
        host.current.replaceChildren(...canvases)
        pagesRef.current?.(doc.numPages)
        setFailed(false)
        void doc.destroy()
      } catch {
        if (!cancelled) setFailed(true)
      } finally {
        if (!cancelled) setBusy(false)
      }
    }, 450)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [version, width])

  return (
    <figure className={cn('relative', className)} aria-label={label} aria-busy={busy}>
      <div ref={host} className="flex flex-col gap-4" />
      {busy && (
        <p className="absolute right-2 top-2 rounded-full bg-card/90 px-2.5 py-1 text-xs text-muted shadow-soft" role="status">
          Atualizando…
        </p>
      )}
      {failed && (
        <p className="rounded-card-sm border border-danger/30 bg-danger-soft p-3 text-sm" role="alert">
          Não conseguimos montar a prévia agora. O conteúdo continua salvo; tente de novo em instantes.
        </p>
      )}
    </figure>
  )
}
