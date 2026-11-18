/**
 * POST /foto-linkedin  { force?: boolean }
 * Baixa a foto do LinkedIn (claim "picture" do login OIDC) e guarda no
 * Storage (bucket "avatares"), porque o link do LinkedIn expira.
 * Sem "force", não troca uma foto que a pessoa enviou ou removeu.
 */
import { requireUser } from '../_shared/auth.ts'
import { handle, HttpError, json } from '../_shared/http.ts'

const MAX_BYTES = 2 * 1024 * 1024

Deno.serve(
  handle(async (req, body) => {
    const { supabase, user } = await requireUser(req)
    const force = body.force === true

    const linked = (user.identities ?? []).some((i) => i.provider === 'linkedin_oidc')
    const picture = (user.user_metadata?.picture || user.user_metadata?.avatar_url) as string | undefined
    if (!linked || !picture) {
      throw new HttpError(404, 'Não encontramos uma foto do LinkedIn na sua conta.', 'sem_foto_linkedin')
    }

    const { data: profile } = await supabase.from('profiles').select('avatar_source').eq('user_id', user.id).single()
    if (!force && (profile?.avatar_source === 'upload' || profile?.avatar_source === 'removida')) {
      return json({ skipped: true })
    }

    let url: URL
    try {
      url = new URL(picture)
    } catch {
      throw new HttpError(422, 'A foto do LinkedIn veio num formato inesperado.', 'foto_invalida')
    }
    // só baixa do servidor de imagens do LinkedIn
    if (url.protocol !== 'https:' || !(url.hostname === 'media.licdn.com' || url.hostname.endsWith('.licdn.com'))) {
      throw new HttpError(422, 'A foto do LinkedIn veio de um endereço inesperado.', 'foto_invalida')
    }

    let timer: number | undefined
    const res = await Promise.race([
      fetch(url),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new HttpError(503, 'O LinkedIn demorou para responder. Tente de novo.', 'foto_demora')), 10_000)
      }),
    ]).finally(() => clearTimeout(timer))
    const type = res.headers.get('content-type') ?? ''
    if (!res.ok || !type.startsWith('image/')) {
      throw new HttpError(502, 'Não conseguimos baixar a foto do LinkedIn. Tente de novo mais tarde.', 'foto_falhou')
    }
    const bytes = new Uint8Array(await res.arrayBuffer())
    if (bytes.length > MAX_BYTES) throw new HttpError(422, 'A foto do LinkedIn é grande demais.', 'foto_grande')

    const ext = type.includes('png') ? 'png' : type.includes('webp') ? 'webp' : 'jpg'
    const path = `${user.id}/linkedin.${ext}`
    const { error: upErr } = await supabase.storage.from('avatares').upload(path, bytes, { contentType: type, upsert: true })
    if (upErr) throw new HttpError(500, 'Não conseguimos guardar a foto. Tente de novo.', 'foto_storage')

    await supabase.from('profiles').update({ avatar_path: path, avatar_source: 'linkedin' }).eq('user_id', user.id)
    return json({ avatar_path: path })
  }),
)
