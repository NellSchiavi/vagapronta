/**
 * Foto do perfil para o PDF do currículo (data URL: o PDF não carrega imagens de outros sites).
 */
import { useQuery } from '@tanstack/react-query'
import type { ResumeOwner } from '@/lib/resume-format'
import { supabase } from '@/lib/supabase'

/** Foto do perfil em data URL (só JPEG ou PNG, que o PDF aceita) */
export async function loadAvatarDataUrl(avatar: ResumeOwner['avatar']): Promise<string | null> {
  if (!avatar || avatar.source === 'removida') return null
  try {
    let blob: Blob | null = null
    if (avatar.path) {
      const { data } = await supabase.storage.from('avatares').download(avatar.path)
      blob = data
    } else if (avatar.url) {
      const r = await fetch(avatar.url)
      blob = r.ok ? await r.blob() : null
    }
    if (!blob || !/image\/(jpe?g|png)/.test(blob.type)) return null
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.onerror = () => reject(reader.error)
      reader.readAsDataURL(blob!)
    })
  } catch {
    return null
  }
}

/** Foto do perfil pronta para o PDF (só carrega quando a versão vai usar foto) */
export function useAvatarDataUrl(avatar: ResumeOwner['avatar'], enabled: boolean) {
  const key = avatar && avatar.source !== 'removida' ? avatar.path ?? avatar.url : null
  const { data } = useQuery({
    queryKey: ['avatar-pdf', key],
    enabled: enabled && Boolean(key),
    staleTime: 30 * 60_000,
    queryFn: () => loadAvatarDataUrl(avatar),
  })
  return enabled && key ? data ?? null : null
}
