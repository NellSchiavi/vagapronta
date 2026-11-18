/**
 * POST /excluir-conta  { confirm: "EXCLUIR" }
 * Exclui a conta da pessoa logada (LGPD): apaga os arquivos do Storage
 * (currículos e foto) e o usuário. Todas as tabelas apagam em cascata.
 * Usa a chave de serviço SÓ para isso, e sempre com o id vindo do JWT.
 */
import { createClient } from 'npm:@supabase/supabase-js@2.49.1'
import { requireUser } from '../_shared/auth.ts'
import { handle, HttpError, json } from '../_shared/http.ts'

Deno.serve(
  handle(async (req, body) => {
    const { user } = await requireUser(req)
    if (body.confirm !== 'EXCLUIR') {
      throw new HttpError(400, 'Para excluir, digite EXCLUIR para confirmar.', 'sem_confirmacao')
    }

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    // arquivos da pessoa: pasta com o id dela em cada bucket
    for (const bucket of ['curriculos', 'avatares']) {
      for (let page = 0; page < 20; page++) {
        const { data: files, error } = await admin.storage.from(bucket).list(user.id, { limit: 1000 })
        if (error) throw new HttpError(500, 'Não conseguimos apagar seus arquivos. Tente de novo.', 'storage')
        if (!files?.length) break
        const { error: rmErr } = await admin.storage.from(bucket).remove(files.map((f) => `${user.id}/${f.name}`))
        if (rmErr) throw new HttpError(500, 'Não conseguimos apagar seus arquivos. Tente de novo.', 'storage')
      }
    }

    const { error } = await admin.auth.admin.deleteUser(user.id)
    if (error) {
      console.error('[excluir-conta]', error)
      throw new HttpError(500, 'Não conseguimos excluir a conta agora. Tente de novo.', 'auth')
    }
    return json({ ok: true })
  }),
)
