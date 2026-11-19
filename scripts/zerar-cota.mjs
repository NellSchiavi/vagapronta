#!/usr/bin/env node
/**
 * DESENVOLVIMENTO: zera a cota de IA de hoje no Supabase LOCAL (npm run dev:zerar-cota).
 * Recusa rodar se o app estiver apontando para um Supabase que não seja o local.
 * Não mexe no limite do Gemini (esse é do Google).
 */
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'

const envFile = existsSync('.env.local') ? readFileSync('.env.local', 'utf8') : ''
const url = envFile.match(/^VITE_SUPABASE_URL=(.*)$/m)?.[1]?.trim() ?? ''
let host = ''
try {
  host = new URL(url).hostname
} catch {
  /* sem .env.local */
}
if (!['127.0.0.1', 'localhost'].includes(host)) {
  console.error('✋ Só funciona no ambiente local: o .env.local precisa ter VITE_SUPABASE_URL=http://127.0.0.1:54321.')
  process.exit(1)
}

const projectId = readFileSync('supabase/config.toml', 'utf8').match(/^project_id\s*=\s*"([^"]+)"/m)?.[1] ?? 'vagapronta'
const container = `supabase_db_${projectId}`
const sql = "delete from public.ai_usage where day = (now() at time zone 'America/Sao_Paulo')::date returning (select email from auth.users u where u.id = user_id), calls;"
try {
  const out = execFileSync('docker', ['exec', container, 'psql', '-U', 'postgres', '-At', '-c', sql], { encoding: 'utf8' })
  const rows = out.trim().split('\n').filter((l) => l.includes('|'))
  if (!rows.length) console.log('Ninguém tinha usado a IA hoje. Nada a zerar.')
  for (const r of rows) {
    const [email, calls] = r.split('|')
    console.log(`Cota de hoje zerada: ${email} (tinha usado ${calls})`)
  }
} catch {
  console.error(`Não consegui falar com o banco local (${container}). O Supabase local está ligado? (npx supabase start)`)
  process.exit(1)
}
