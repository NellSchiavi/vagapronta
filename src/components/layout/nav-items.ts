import { FileText, Home, KanbanSquare, PenLine, Search, Sparkles, UserRound, type LucideIcon } from 'lucide-react'

export interface NavItem {
  to: string
  label: string
  /** rótulo curto do menu inferior (celular) */
  short: string
  icon: LucideIcon
  /** aparece no menu inferior do celular */
  mobile: boolean
  /** caminhos que deixam este item ativo */
  match: string[]
}

/**
 * No celular ficam 5 itens. "Cartas" mora dentro de "Adaptar":
 * a carta é feita para uma vaga, junto com o currículo adaptado.
 * Na barra lateral do computador aparecem os 6 itens.
 */
export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Início', short: 'Início', icon: Home, mobile: true, match: ['/'] },
  { to: '/curriculo', label: 'Currículo', short: 'Currículo', icon: FileText, mobile: true, match: ['/curriculo'] },
  { to: '/adaptar', label: 'Adaptar à vaga', short: 'Adaptar', icon: Sparkles, mobile: true, match: ['/adaptar', '/cartas'] },
  { to: '/cartas', label: 'Cartas', short: 'Cartas', icon: PenLine, mobile: false, match: ['/cartas'] },
  { to: '/vagas', label: 'Vagas', short: 'Vagas', icon: Search, mobile: true, match: ['/vagas'] },
  { to: '/candidaturas', label: 'Candidaturas', short: 'Candidaturas', icon: KanbanSquare, mobile: true, match: ['/candidaturas'] },
  // no celular, "Meu perfil" fica no menu do avatar (topo)
  { to: '/perfil', label: 'Meu perfil', short: 'Perfil', icon: UserRound, mobile: false, match: ['/perfil'] },
]

export function isActive(item: NavItem, pathname: string, desktop: boolean) {
  // na barra lateral, "Adaptar" e "Cartas" são itens separados
  const match = desktop ? [item.to] : item.match
  return match.some((m) => (m === '/' ? pathname === '/' : pathname === m || pathname.startsWith(`${m}/`)))
}
