import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { Check, Copy, Lock, Monitor, MousePointer2, Send, Smartphone, Star } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { bookmarkletHref } from '@/lib/bookmarklet'

const LABEL = 'Enviar para o VagaPronta'

/**
 * "Instalar botão": o favorito que leva a vaga aberta no LinkedIn, Gupy, Indeed…
 * para Adaptar, já preenchida. Só no computador (Chrome e Edge).
 */
export function InstallButtonPage() {
  const linkRef = useRef<HTMLAnchorElement>(null)
  const [copied, setCopied] = useState(false)
  const [touch] = useState(() => typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches)
  const href = bookmarkletHref()

  // o endereço "javascript:" vai direto no elemento (o React não aceita esse tipo de link)
  useEffect(() => {
    linkRef.current?.setAttribute('href', href)
  }, [href])

  async function copy() {
    try {
      await navigator.clipboard.writeText(href)
      setCopied(true)
      toast.success('Código copiado. Agora cole no campo do endereço (URL) do favorito.')
      setTimeout(() => setCopied(false), 4000)
    } catch {
      toast.error('Não conseguimos copiar. Use o botão de arrastar.')
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Botão “Enviar para o VagaPronta”"
        description="Achou uma vaga no LinkedIn, na Gupy ou no Indeed? Um clique e ela abre aqui em Adaptar, já preenchida."
      />

      {touch && (
        <Card className="flex items-start gap-3 border-warn/30 bg-warn-soft p-4 text-[15px]">
          <Smartphone className="mt-0.5 size-5 shrink-0 text-warn" aria-hidden />
          <p>
            Este botão funciona no <strong className="font-medium">computador</strong> (Chrome ou Edge). No celular, copie o link da vaga e cole em{' '}
            <Link to="/adaptar" className="font-medium underline underline-offset-2">
              Adaptar
            </Link>
            .
          </p>
        </Card>
      )}

      <Card className="p-5 sm:p-8">
        <div className="grid gap-8 lg:grid-cols-[1fr_1.1fr] lg:items-center">
          <div>
            <h2 className="flex items-center gap-2 text-[22px]">
              <Monitor className="size-5 text-terra" aria-hidden /> Instale em 2 passos
            </h2>
            <ol className="mt-4 space-y-4 text-[15px]">
              <li className="flex gap-3">
                <StepNumber n={1} />
                <span>
                  Mostre a barra de favoritos: aperte <Kbd>Ctrl</Kbd> + <Kbd>Shift</Kbd> + <Kbd>B</Kbd> (no Mac, <Kbd>⌘</Kbd> + <Kbd>Shift</Kbd> + <Kbd>B</Kbd>).
                </span>
              </li>
              <li className="flex gap-3">
                <StepNumber n={2} />
                <span>
                  <strong className="font-medium">Arraste</strong> o botão laranja abaixo até a barra de favoritos e solte.
                </span>
              </li>
            </ol>

            <div className="mt-6 flex flex-col items-start gap-2">
              <a
                ref={linkRef}
                draggable
                onClick={(e) => {
                  e.preventDefault()
                  toast.info('Arraste este botão para a barra de favoritos. Clicar aqui não faz nada.')
                }}
                className="inline-flex min-h-[52px] cursor-grab items-center gap-2 rounded-full bg-terra px-6 text-base font-medium text-on-accent shadow-soft ring-4 ring-terra/15 active:cursor-grabbing"
                title="Arraste para a barra de favoritos"
              >
                <Send className="size-5" aria-hidden /> {LABEL}
              </a>
              <p className="text-xs text-muted">Arraste, não clique.</p>
            </div>
          </div>

          <DragDemo />
        </div>
      </Card>

      <Card className="p-5 sm:p-8">
        <h2 className="text-[22px]">Como usar</h2>
        <ol className="mt-4 space-y-3 text-[15px]">
          <li className="flex gap-3">
            <StepNumber n={1} />
            <span>Abra a vaga no site (LinkedIn, Gupy, Indeed, site da empresa…), na página com a descrição completa.</span>
          </li>
          <li className="flex gap-3">
            <StepNumber n={2} />
            <span>
              Clique no favorito <strong className="font-medium">{LABEL}</strong>.
            </span>
          </li>
          <li className="flex gap-3">
            <StepNumber n={3} />
            <span>O VagaPronta abre em Adaptar com o título, a empresa, o texto e o link da vaga. Confira e toque em “Adaptar meu currículo”.</span>
          </li>
        </ol>
        <p className="mt-4 text-sm text-muted">
          Dica: se a página tiver muita coisa além da vaga, selecione o texto do anúncio com o mouse antes de clicar no favorito.
        </p>
      </Card>

      <Card className="flex items-start gap-3 p-5 text-[15px]">
        <Lock className="mt-0.5 size-5 shrink-0 text-success" aria-hidden />
        <div>
          <h2 className="font-sans text-base font-medium">O que o botão faz (e o que não faz)</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-ink/85">
            <li>Lê só o que já está na sua tela: título, empresa e texto da vaga, mais o link sem rastreamento.</li>
            <li>Abre o VagaPronta com isso. Nada é enviado a outros servidores.</li>
            <li>Não faz login, não clica nem navega por você, e não se candidata a nada.</li>
          </ul>
        </div>
      </Card>

      <details className="rounded-card border border-line bg-card p-5 text-[15px]">
        <summary className="cursor-pointer font-medium">Não conseguiu arrastar?</summary>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-ink/85">
          <li>Copie o código do botão.</li>
          <li>Clique com o botão direito na barra de favoritos e escolha a opção de adicionar página ou favorito.</li>
          <li>
            Em <strong className="font-medium">Nome</strong>, escreva “{LABEL}”. Em <strong className="font-medium">URL</strong> (endereço), cole o código e salve.
          </li>
        </ol>
        <Button variant="secondary" className="mt-4" onClick={copy}>
          {copied ? <Check aria-hidden /> : <Copy aria-hidden />} {copied ? 'Copiado' : 'Copiar código do botão'}
        </Button>
      </details>
    </div>
  )
}

function StepNumber({ n }: { n: number }) {
  return (
    <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-terra-soft text-sm font-medium text-terra-strong" aria-hidden>
      {n}
    </span>
  )
}

function Kbd({ children }: { children: React.ReactNode }) {
  return <kbd className="rounded-[6px] border border-line-strong bg-bg px-1.5 py-0.5 font-sans text-[13px] font-medium">{children}</kbd>
}

/** Animação: o botão sai da página e vai para a barra de favoritos */
function DragDemo() {
  const reduce = useReducedMotion()
  const loop = { duration: 4.2, repeat: Infinity, repeatDelay: 0.8, ease: 'easeInOut' as const }
  return (
    <figure aria-label="Animação: arrastando o botão para a barra de favoritos" className="select-none">
      <div className="overflow-hidden rounded-card border border-line-strong bg-bg shadow-soft">
        {/* janela do navegador */}
        <div className="flex items-center gap-1.5 border-b border-line bg-track/70 px-3 py-2">
          <span className="size-2.5 rounded-full bg-danger/60" />
          <span className="size-2.5 rounded-full bg-warn/60" />
          <span className="size-2.5 rounded-full bg-success/60" />
          <span className="ml-3 h-5 flex-1 rounded-full bg-card" />
        </div>
        {/* barra de favoritos */}
        <div className="relative flex h-9 items-center gap-2 border-b border-line bg-card px-3 text-[11px] text-muted">
          <Star className="size-3.5" aria-hidden />
          <span className="h-2 w-10 rounded bg-track" />
          <span className="h-2 w-14 rounded bg-track" />
          <motion.span
            className="inline-flex items-center gap-1 rounded-full bg-terra-soft px-2 py-0.5 font-medium text-terra-strong"
            initial={false}
            animate={reduce ? { opacity: 1 } : { opacity: [0, 0, 0, 1, 1] }}
            transition={reduce ? undefined : { ...loop, times: [0, 0.55, 0.62, 0.7, 1] }}
          >
            <Send className="size-3" aria-hidden /> {LABEL}
          </motion.span>
        </div>
        {/* página */}
        <div className="relative h-44 p-4">
          <span className="block h-2.5 w-2/3 rounded bg-track" />
          <span className="mt-2 block h-2.5 w-1/2 rounded bg-track" />
          <span className="mt-6 inline-flex items-center gap-1.5 rounded-full bg-terra px-3 py-1.5 text-xs font-medium text-on-accent">
            <Send className="size-3.5" aria-hidden /> {LABEL}
          </span>
          {!reduce && (
            <motion.div
              className="pointer-events-none absolute left-4 top-[4.4rem] flex items-start"
              animate={{ x: [0, 0, 120, 150, 150], y: [0, 0, -95, -108, -108], opacity: [0, 1, 1, 0, 0] }}
              transition={{ ...loop, times: [0, 0.12, 0.5, 0.62, 1] }}
            >
              <span className="inline-flex items-center gap-1.5 rounded-full bg-terra/80 px-3 py-1.5 text-xs font-medium text-on-accent shadow-soft">
                <Send className="size-3.5" aria-hidden /> {LABEL}
              </span>
              <MousePointer2 className="-ml-2 mt-4 size-5 fill-ink text-card" aria-hidden />
            </motion.div>
          )}
        </div>
      </div>
      <figcaption className="mt-2 text-center text-xs text-muted">Segure o botão, leve até a barra de favoritos e solte.</figcaption>
    </figure>
  )
}
