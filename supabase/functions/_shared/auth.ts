import { createClient, type SupabaseClient, type User } from 'npm:@supabase/supabase-js@2.49.1'
import { HttpError } from './http.ts'

/**
 * Cria um cliente Supabase que age COMO o usuário (com o JWT dele).
 * Assim todo acesso ao banco continua passando pelo RLS.
 * O gateway já recusa chamadas sem JWT válido (verify_jwt); aqui
 * confirmamos o usuário e obtemos o id dele.
 */
export async function requireUser(req: Request): Promise<{ supabase: SupabaseClient; user: User }> {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    throw new HttpError(401, 'Sua sessão expirou. Entre de novo para continuar.', 'sessao')
  }

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data, error } = await supabase.auth.getUser(authHeader.slice('Bearer '.length))
  if (error || !data.user) {
    throw new HttpError(401, 'Sua sessão expirou. Entre de novo para continuar.', 'sessao')
  }
  return { supabase, user: data.user }
}
