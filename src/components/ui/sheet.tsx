import * as React from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

export const Sheet = Dialog.Root

interface SheetContentProps {
  title: React.ReactNode
  description?: React.ReactNode
  children: React.ReactNode
  footer?: React.ReactNode
  className?: string
}

/**
 * Painel de detalhes: sobe de baixo no celular e abre à direita no computador.
 * Foco preso dentro dele, fecha com Esc ou no X (acessível via Radix Dialog).
 */
export function SheetContent({ title, description, children, footer, className }: SheetContentProps) {
  return (
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/30 backdrop-blur-[1px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
      <Dialog.Content
        className={cn(
          'fixed z-50 flex flex-col bg-bg shadow-soft focus:outline-none',
          'inset-x-0 bottom-0 max-h-[92dvh] rounded-t-[20px] border-t border-line',
          'sm:inset-y-0 sm:left-auto sm:right-0 sm:max-h-none sm:w-[460px] sm:rounded-none sm:border-l sm:border-t-0',
          'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom',
          'sm:data-[state=closed]:slide-out-to-right sm:data-[state=open]:slide-in-from-right sm:data-[state=closed]:slide-out-to-bottom-0 sm:data-[state=open]:slide-in-from-bottom-0',
          className,
        )}
      >
        <div className="flex items-start justify-between gap-3 border-b border-line px-5 pb-3 pt-4">
          <div className="min-w-0">
            <Dialog.Title className="font-serif text-[21px] leading-snug">{title}</Dialog.Title>
            {description ? (
              <Dialog.Description className="text-sm text-muted">{description}</Dialog.Description>
            ) : (
              <Dialog.Description className="sr-only">Detalhes</Dialog.Description>
            )}
          </div>
          <Dialog.Close className="-mr-2 inline-flex size-11 shrink-0 items-center justify-center rounded-field text-muted hover:bg-track hover:text-ink" aria-label="Fechar">
            <X className="size-5" aria-hidden />
          </Dialog.Close>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="border-t border-line bg-card px-5 py-3" style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}>{footer}</div>}
      </Dialog.Content>
    </Dialog.Portal>
  )
}
