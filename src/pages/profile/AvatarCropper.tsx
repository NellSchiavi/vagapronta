import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent } from '@/components/ui/sheet'

const VIEW = 260 // tamanho da prévia na tela
const OUT = 512 // tamanho final da foto (px)

interface Props {
  file: File | null
  onCancel: () => void
  onDone: (blob: Blob) => void
  saving: boolean
}

/**
 * Recorte da foto: quadrado com prévia redonda. Arraste para posicionar,
 * use o controle para aproximar. Gera um JPEG de 512 × 512 comprimido.
 */
export function AvatarCropper({ file, onCancel, onDone, saving }: Props) {
  const [img, setImg] = useState<HTMLImageElement | null>(null)
  const [zoom, setZoom] = useState(1)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null)

  useEffect(() => {
    if (!file) return
    const url = URL.createObjectURL(file)
    const i = new Image()
    i.onload = () => {
      setImg(i)
      setZoom(1)
      setPos({ x: 0, y: 0 })
    }
    i.src = url
    return () => URL.revokeObjectURL(url)
  }, [file])

  const base = img ? Math.max(VIEW / img.naturalWidth, VIEW / img.naturalHeight) : 1
  const w = img ? img.naturalWidth * base * zoom : VIEW
  const h = img ? img.naturalHeight * base * zoom : VIEW
  // mantém a imagem cobrindo todo o quadrado
  const clamp = (p: { x: number; y: number }) => ({
    x: Math.min((w - VIEW) / 2, Math.max(-(w - VIEW) / 2, p.x)),
    y: Math.min((h - VIEW) / 2, Math.max(-(h - VIEW) / 2, p.y)),
  })
  const c = clamp(pos)
  const left = (VIEW - w) / 2 + c.x
  const top = (VIEW - h) / 2 + c.y

  async function save() {
    if (!img) return
    const canvas = document.createElement('canvas')
    canvas.width = OUT
    canvas.height = OUT
    const ctx = canvas.getContext('2d')!
    const f = OUT / VIEW
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, OUT, OUT)
    ctx.drawImage(img, left * f, top * f, w * f, h * f)
    const toBlob = (q: number) => new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', q))
    let blob = await toBlob(0.85)
    if (blob && blob.size > 400_000) blob = await toBlob(0.7)
    if (blob) onDone(blob)
  }

  return (
    <Sheet open={Boolean(file)} onOpenChange={(o) => !o && onCancel()}>
      <SheetContent
        title="Ajustar a foto"
        description="Arraste para posicionar e use o controle para aproximar."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onCancel}>
              Cancelar
            </Button>
            <Button onClick={save} loading={saving} disabled={!img}>
              Salvar foto
            </Button>
          </div>
        }
      >
        <div className="flex flex-col items-center gap-5 py-2">
          <div
            role="img"
            aria-label="Prévia da foto recortada"
            tabIndex={0}
            className="relative cursor-grab touch-none select-none overflow-hidden rounded-[18px] bg-track active:cursor-grabbing"
            style={{ width: VIEW, height: VIEW }}
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId)
              drag.current = { x: e.clientX, y: e.clientY, px: c.x, py: c.y }
            }}
            onPointerMove={(e) => {
              if (!drag.current) return
              setPos(clamp({ x: drag.current.px + e.clientX - drag.current.x, y: drag.current.py + e.clientY - drag.current.y }))
            }}
            onPointerUp={() => (drag.current = null)}
            onKeyDown={(e) => {
              const step = 8
              const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key]
              if (d) {
                e.preventDefault()
                setPos(clamp({ x: c.x + d[0], y: c.y + d[1] }))
              }
            }}
          >
            {img && <img src={img.src} alt="" draggable={false} className="absolute max-w-none" style={{ left, top, width: w, height: h }} />}
            {/* máscara redonda: mostra como a foto aparece no app */}
            <div className="pointer-events-none absolute inset-0 rounded-full shadow-[0_0_0_200px_rgba(43,38,34,0.45)] ring-2 ring-white/80" />
          </div>

          <label className="flex w-full max-w-[280px] items-center gap-3 text-sm">
            <span className="shrink-0 text-muted">Zoom</span>
            <input
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="h-11 w-full accent-[rgb(var(--terra-strong))]"
              aria-label="Aproximar a foto"
            />
          </label>
          <p className="text-center text-[13px] text-muted">A foto fica guardada só na sua conta e aparece no app e, se você quiser, no currículo.</p>
        </div>
      </SheetContent>
    </Sheet>
  )
}
