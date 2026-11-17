import { Toaster as Sonner } from 'sonner'
import { useTheme } from '@/lib/theme'

/** Toasts no estilo do app. Uso: import { toast } from 'sonner'; toast.success('Salvo!') */
export function Toaster() {
  const { theme } = useTheme()
  return (
    <Sonner
      theme={theme}
      position="top-center"
      closeButton
      duration={4000}
      toastOptions={{
        classNames: {
          toast:
            'group !rounded-card !border !border-line !bg-card !text-ink !font-sans !text-[15px] !shadow-soft',
          description: '!text-muted',
          actionButton: '!bg-terra-strong !text-on-accent !rounded-field !font-medium',
          cancelButton: '!bg-track !text-ink !rounded-field',
          success: '[&_[data-icon]]:!text-success',
          error: '[&_[data-icon]]:!text-danger',
          info: '[&_[data-icon]]:!text-info',
        },
      }}
    />
  )
}
