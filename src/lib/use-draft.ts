import { useEffect, useRef, useState } from 'react'

/**
 * Salvamento automático de rascunho no navegador.
 * Lê o rascunho salvo uma vez e grava as mudanças com um pequeno atraso.
 */
export function loadDraft<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

export function clearDraft(key: string) {
  try {
    localStorage.removeItem(key)
  } catch {
    /* sem armazenamento disponível */
  }
}

function writeDraft(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    return false /* sem armazenamento disponível: segue sem rascunho */
  }
}

export function useAutosaveDraft<T>(key: string | null, value: T, delay = 600) {
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const first = useRef(true)
  const pending = useRef<{ key: string; value: T } | null>(null)

  useEffect(() => {
    if (!key) return
    if (first.current) {
      first.current = false
      return
    }
    pending.current = { key, value }
    const t = window.setTimeout(() => {
      pending.current = null
      if (writeDraft(key, value)) setSavedAt(new Date())
    }, delay)
    return () => window.clearTimeout(t)
  }, [key, value, delay])

  // grava na hora se a página for fechada/recarregada ou a tela sair antes do atraso
  useEffect(() => {
    const flush = () => {
      if (pending.current) writeDraft(pending.current.key, pending.current.value)
      pending.current = null
    }
    window.addEventListener('pagehide', flush)
    return () => {
      window.removeEventListener('pagehide', flush)
      flush()
    }
  }, [])

  /** apaga o rascunho e cancela qualquer gravação pendente */
  const discard = () => {
    pending.current = null
    if (key) clearDraft(key)
  }

  return { savedAt, discard }
}
