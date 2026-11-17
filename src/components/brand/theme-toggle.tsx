import { Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTheme } from '@/lib/theme'

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggle } = useTheme()
  const dark = theme === 'dark'
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggle}
      className={className}
      aria-label={dark ? 'Usar modo claro' : 'Usar modo escuro'}
      title={dark ? 'Modo claro' : 'Modo escuro'}
    >
      {dark ? <Sun aria-hidden /> : <Moon aria-hidden />}
    </Button>
  )
}
