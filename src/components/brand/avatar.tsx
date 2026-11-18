import { useState } from 'react'
import { cn } from '@/lib/utils'

function initials(name?: string | null) {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '?'
  return ((parts[0][0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase()
}

/** Foto do perfil (LinkedIn) ou iniciais num círculo terracota suave */
export function Avatar({ name, src, size = 40, className }: { name?: string | null; src?: string | null; size?: number; className?: string }) {
  const [broken, setBroken] = useState(false)
  return (
    <span
      className={cn('inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-terra-soft font-medium text-terra-strong', className)}
      style={{ width: size, height: size, fontSize: size * 0.38 }}
      aria-hidden
    >
      {src && !broken ? (
        <img src={src} alt="" className="size-full object-cover" referrerPolicy="no-referrer" onError={() => setBroken(true)} />
      ) : (
        initials(name)
      )}
    </span>
  )
}
