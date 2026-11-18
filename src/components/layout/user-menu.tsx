import { useNavigate } from 'react-router-dom'
import { ChevronsUpDown, LogOut, Moon, Sun, UserRound } from 'lucide-react'
import { Avatar } from '@/components/brand/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuth } from '@/lib/auth'
import { useAvatarUrl, useProfile } from '@/lib/profile'
import { useTheme } from '@/lib/theme'
import { cn } from '@/lib/utils'

function MenuItems() {
  const { signOut, user } = useAuth()
  const { data: profile } = useProfile()
  const { theme, toggle } = useTheme()
  const navigate = useNavigate()
  return (
    <>
      <DropdownMenuLabel>
        <p className="truncate font-medium">{profile?.full_name || 'Você'}</p>
        <p className="truncate text-sm text-muted">{profile?.email || user?.email}</p>
      </DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuItem onSelect={() => navigate('/perfil')}>
        <UserRound aria-hidden /> Meu perfil
      </DropdownMenuItem>
      <DropdownMenuItem onSelect={(e) => { e.preventDefault(); toggle() }}>
        {theme === 'dark' ? <Sun aria-hidden /> : <Moon aria-hidden />}
        {theme === 'dark' ? 'Usar modo claro' : 'Usar modo escuro'}
      </DropdownMenuItem>
      <DropdownMenuItem onSelect={() => signOut()}>
        <LogOut aria-hidden /> Sair
      </DropdownMenuItem>
    </>
  )
}

/** Avatar + nome no rodapé da barra lateral (computador) */
export function SidebarUserMenu() {
  const { data: profile } = useProfile()
  const src = useAvatarUrl(profile)
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex min-h-[56px] w-full items-center gap-3 rounded-field px-2 text-left hover:bg-track/60 data-[state=open]:bg-track/60"
        aria-label="Menu da conta"
      >
        <Avatar name={profile?.full_name} src={src} size={36} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{profile?.full_name || 'Você'}</span>
          <span className="block truncate text-xs text-muted">{profile?.desired_role || 'Minha conta'}</span>
        </span>
        <ChevronsUpDown className="size-4 text-muted" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" className="w-[232px]">
        <MenuItems />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** Avatar no topo (celular) */
export function TopBarUserMenu({ className }: { className?: string }) {
  const { data: profile } = useProfile()
  const src = useAvatarUrl(profile)
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={cn('inline-flex size-11 items-center justify-center rounded-full', className)} aria-label="Menu da conta">
        <Avatar name={profile?.full_name} src={src} size={36} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <MenuItems />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
