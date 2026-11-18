import { useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { ImageUp, Link2, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { LinkedInIcon } from '@/components/brand/linkedin-icon'
import { Avatar } from '@/components/brand/avatar'
import { Button } from '@/components/ui/button'
import { invokeAi } from '@/lib/ai'
import { useAuth } from '@/lib/auth'
import { friendlyDataError } from '@/lib/errors'
import { useAvatarUrl, useUpdateProfile, type Profile } from '@/lib/profile'
import { appUrl, fetchAuthSettings, supabase } from '@/lib/supabase'
import { AvatarCropper } from './AvatarCropper'

const MAX_INPUT = 10 * 1024 * 1024

export function PhotoBlock({ profile }: { profile: Profile }) {
  const { user } = useAuth()
  const update = useUpdateProfile()
  const qc = useQueryClient()
  const src = useAvatarUrl(profile)
  const input = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState<'upload' | 'linkedin' | 'remove' | 'connect' | null>(null)
  const hasLinkedIn = (user?.identities ?? []).some((i) => i.provider === 'linkedin_oidc')

  async function upload(blob: Blob) {
    setBusy('upload')
    try {
      const path = `${user!.id}/foto-${Date.now()}.jpg`
      const { error } = await supabase.storage.from('avatares').upload(path, blob, { contentType: 'image/jpeg' })
      if (error) throw error
      const old = profile.avatar_source === 'upload' ? profile.avatar_path : null
      await update.mutateAsync({ avatar_path: path, avatar_source: 'upload' })
      if (old) await supabase.storage.from('avatares').remove([old])
      setFile(null)
      toast.success('Foto atualizada!')
    } catch (e) {
      toast.error(friendlyDataError(e, 'Não conseguimos enviar a foto.'))
    } finally {
      setBusy(null)
    }
  }

  async function applyLinkedInPhoto() {
    setBusy('linkedin')
    try {
      await invokeAi('foto-linkedin', { force: true })
      await qc.invalidateQueries({ queryKey: ['profile', user?.id] })
      toast.success('Agora sua foto é a do LinkedIn.')
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setBusy(null)
    }
  }

  async function remove() {
    setBusy('remove')
    try {
      const old = profile.avatar_path
      await update.mutateAsync({ avatar_path: null, avatar_source: 'removida' })
      if (old) await supabase.storage.from('avatares').remove([old])
      toast('Foto removida. Mostramos suas iniciais no lugar.')
    } catch (e) {
      toast.error(friendlyDataError(e, 'Não conseguimos remover a foto.'))
    } finally {
      setBusy(null)
    }
  }

  async function connectLinkedIn() {
    setBusy('connect')
    const { linkedin } = await fetchAuthSettings()
    if (!linkedin) {
      setBusy(null)
      toast.info('O login com LinkedIn ainda não foi configurado.', { description: 'Em breve você poderá conectar sua conta do LinkedIn aqui.' })
      return
    }
    const { error } = await supabase.auth.linkIdentity({ provider: 'linkedin_oidc', options: { redirectTo: `${appUrl()}#/perfil` } })
    if (error) {
      setBusy(null)
      toast.error('Não conseguimos conectar o LinkedIn agora. Tente de novo.')
    }
  }

  return (
    <div id="foto" className="flex scroll-mt-24 flex-col items-center gap-4 sm:flex-row sm:items-start">
      <Avatar name={profile.full_name} src={src} size={96} />
      <div className="flex min-w-0 flex-1 flex-col items-center gap-2 sm:items-start">
        <p className="text-sm text-muted">Foto de perfil (opcional). Aparece no app e no menu da conta.</p>
        <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
          <input
            ref={input}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            aria-label="Escolher foto"
            onChange={(e) => {
              const f = e.target.files?.[0]
              e.target.value = ''
              if (!f) return
              if (f.size > MAX_INPUT) return toast.error('Essa imagem passa de 10 MB. Escolha uma foto menor.')
              if (!/^image\/(jpeg|png|webp)$/.test(f.type)) return toast.error('Use uma foto em JPG, PNG ou WebP.')
              setFile(f)
            }}
          />
          <Button variant="secondary" size="sm" onClick={() => input.current?.click()} loading={busy === 'upload'}>
            <ImageUp className="text-terra" aria-hidden /> Enviar outra foto
          </Button>
          {hasLinkedIn && (
            <Button variant="secondary" size="sm" onClick={applyLinkedInPhoto} loading={busy === 'linkedin'}>
              <LinkedInIcon className="size-4 text-linkedin" /> Usar foto do LinkedIn
            </Button>
          )}
          {(profile.avatar_path || (profile.avatar_url && profile.avatar_source !== 'removida')) && (
            <Button variant="ghost" size="sm" onClick={remove} loading={busy === 'remove'} className="text-muted">
              <Trash2 aria-hidden /> Remover foto
            </Button>
          )}
        </div>
        {!hasLinkedIn && (
          <Button
            variant="ghost"
            size="sm"
            onClick={connectLinkedIn}
            loading={busy === 'connect'}
            className="h-auto whitespace-normal py-2 text-center text-linkedin sm:-ml-2 sm:text-left"
          >
            <Link2 aria-hidden /> Conectar LinkedIn para usar sua foto e nome
          </Button>
        )}
      </div>
      <AvatarCropper file={file} onCancel={() => setFile(null)} onDone={upload} saving={busy === 'upload'} />
    </div>
  )
}
