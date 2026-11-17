import { Briefcase } from 'lucide-react'
import { cn } from '@/lib/utils'

export function LogoMark({ size = 36, className }: { size?: number; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn('inline-flex shrink-0 items-center justify-center rounded-[10px] bg-terra text-white', className)}
      style={{ width: size, height: size }}
    >
      <Briefcase style={{ width: size * 0.55, height: size * 0.55 }} strokeWidth={2} />
    </span>
  )
}

export function Logo({ size = 36, className }: { size?: number; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <LogoMark size={size} />
      <span className="font-serif font-medium tracking-tight text-ink" style={{ fontSize: size * 0.62 }}>
        VagaPronta
      </span>
    </span>
  )
}
