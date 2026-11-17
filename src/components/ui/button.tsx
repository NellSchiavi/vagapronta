import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-field font-medium transition-colors duration-150 disabled:pointer-events-none disabled:opacity-55 [&_svg]:size-[18px] [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary: 'bg-terra-strong text-on-accent hover:bg-terra-strong/90 active:bg-terra-strong/80',
        secondary:
          'border border-line-strong bg-card text-ink hover:bg-bg active:bg-track',
        soft: 'bg-terra-soft text-terra-strong hover:bg-terra-soft/70',
        ghost: 'text-ink hover:bg-track/70 active:bg-track',
        link: 'h-auto min-h-0 px-0 text-terra-strong underline underline-offset-[3px] hover:text-terra',
        linkedin: 'bg-linkedin text-white hover:bg-linkedin-hover',
        danger: 'bg-danger text-on-accent hover:bg-danger/90',
      },
      size: {
        md: 'min-h-touch px-4 text-[15px]',
        sm: 'min-h-[40px] px-3 text-sm',
        lg: 'min-h-[48px] px-5 text-base',
        icon: 'size-11 p-0',
      },
      block: { true: 'w-full' },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  loading?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, block, asChild, loading, disabled, children, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size, block }), className)}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {asChild ? (
          children
        ) : (
          <>
            {loading && <Loader2 className="animate-spin" aria-hidden />}
            {children}
          </>
        )}
      </Comp>
    )
  },
)
Button.displayName = 'Button'

export { buttonVariants }
