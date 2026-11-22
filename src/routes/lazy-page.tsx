/**
 * Páginas carregadas sob demanda (cada rota vira um arquivo separado no build).
 * Se o arquivo da página não existir mais (o app foi atualizado enquanto a aba
 * estava aberta), recarrega a página UMA vez para pegar a versão nova.
 */
import { lazy, type ComponentType } from 'react'

const RELOAD_FLAG = 'vp-recarregou-versao'

export function lazyPage<K extends string>(load: () => Promise<Record<K, ComponentType>>, name: K) {
  return lazy(async () => {
    try {
      const mod = await load()
      try {
        sessionStorage.removeItem(RELOAD_FLAG)
      } catch {
        /* sem sessionStorage: segue normalmente */
      }
      return { default: mod[name] }
    } catch (err) {
      let alreadyReloaded = true
      try {
        alreadyReloaded = sessionStorage.getItem(RELOAD_FLAG) === '1'
        if (!alreadyReloaded) sessionStorage.setItem(RELOAD_FLAG, '1')
      } catch {
        /* sem sessionStorage: não arrisca recarregar em loop */
      }
      if (!alreadyReloaded) {
        window.location.reload()
        // a página vai recarregar; enquanto isso não mostra nada
        return { default: (() => null) as ComponentType }
      }
      throw err
    }
  })
}
