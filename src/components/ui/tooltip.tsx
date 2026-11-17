import * as React from 'react'
import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import { HelpCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

export const TooltipProvider = TooltipPrimitive.Provider

export function Tooltip({
  content,
  children,
  side = 'top',
}: {
  content: React.ReactNode
  children: React.ReactNode
  side?: 'top' | 'bottom' | 'left' | 'right'
}) {
  return (
    <TooltipPrimitive.Root delayDuration={150}>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side={side}
          sideOffset={6}
          collisionPadding={12}
          className={cn(
            'z-50 max-w-[260px] rounded-field bg-ink px-3 py-2 text-[13px] leading-snug text-bg',
            'data-[state=delayed-open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=delayed-open]:fade-in-0',
          )}
        >
          {content}
          <TooltipPrimitive.Arrow className="fill-ink" />
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  )
}

/**
 * Termo com explicação simples. Funciona com mouse, teclado e toque
 * (no celular, tocar abre a explicação).
 */
export function Term({ children, explain }: { children: React.ReactNode; explain: React.ReactNode }) {
  const [open, setOpen] = React.useState(false)
  return (
    <TooltipPrimitive.Root open={open} onOpenChange={setOpen} delayDuration={150}>
      <TooltipPrimitive.Trigger asChild>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="inline-flex items-center gap-0.5 border-b border-dotted border-muted font-medium text-inherit"
        >
          {children}
          <HelpCircle className="size-3.5 text-muted" aria-hidden />
          <span className="sr-only">: {explain}</span>
        </button>
      </TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          sideOffset={6}
          collisionPadding={12}
          className="z-50 max-w-[260px] rounded-field bg-ink px-3 py-2 text-[13px] leading-snug text-bg"
        >
          {explain}
          <TooltipPrimitive.Arrow className="fill-ink" />
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  )
}

/** Atalho para o termo mais comum do app */
export function AtsTerm({ children = 'ATS' }: { children?: React.ReactNode }) {
  return <Term explain="Sistema que as empresas usam para filtrar currículos.">{children}</Term>
}
