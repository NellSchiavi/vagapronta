import * as React from 'react'
import * as LabelPrimitive from '@radix-ui/react-label'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

export const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>
>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root ref={ref} className={cn('text-sm font-medium text-ink', className)} {...props} />
))
Label.displayName = 'Label'

interface FieldProps {
  label: React.ReactNode
  /** id do campo; o label e as mensagens são ligados a ele */
  htmlFor: string
  hint?: React.ReactNode
  error?: string
  className?: string
  children: React.ReactElement
}

/**
 * Agrupa label + campo + dica + erro inline (logo abaixo do campo).
 * Injeta aria-invalid e aria-describedby no campo filho.
 */
export function Field({ label, htmlFor, hint, error, className, children }: FieldProps) {
  const hintId = hint ? `${htmlFor}-hint` : undefined
  const errorId = error ? `${htmlFor}-error` : undefined
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {React.cloneElement(children, {
        id: htmlFor,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': describedBy,
      })}
      {hint && !error && (
        <p id={hintId} className="text-[13px] text-muted">
          {hint}
        </p>
      )}
      <AnimatePresence initial={false}>
        {error && (
          <motion.p
            key="err"
            id={errorId}
            role="alert"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="flex items-start gap-1.5 text-[13px] text-danger"
          >
            <AlertCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  )
}
