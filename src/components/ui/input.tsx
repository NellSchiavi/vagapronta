import * as React from 'react'
import { cn } from '@/lib/utils'

const fieldBase =
  'w-full rounded-field border border-line-strong bg-card px-3.5 text-[15px] text-ink placeholder:text-muted/80 transition-colors focus-visible:border-terra focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terra/30 disabled:cursor-not-allowed disabled:opacity-60 aria-[invalid=true]:border-danger aria-[invalid=true]:focus-visible:ring-danger/25'

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type = 'text', ...props }, ref) => (
    <input ref={ref} type={type} className={cn(fieldBase, 'min-h-touch py-2', className)} {...props} />
  ),
)
Input.displayName = 'Input'

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, rows = 5, ...props }, ref) => (
  <textarea ref={ref} rows={rows} className={cn(fieldBase, 'py-3 leading-relaxed', className)} {...props} />
))
Textarea.displayName = 'Textarea'
