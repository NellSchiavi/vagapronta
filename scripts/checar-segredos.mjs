#!/usr/bin/env node
/**
 * Checagem de segredos antes do commit (rodada pelo hook .git/hooks/pre-commit).
 * Bloqueia o commit se algum arquivo preparado tiver algo parecido com chave de API.
 *
 *   node scripts/checar-segredos.mjs          → confere só o que está preparado (git add)
 *   node scripts/checar-segredos.mjs --tudo   → confere todos os arquivos do repositório
 *
 * Nunca imprime o valor encontrado: mostra só o arquivo, a linha e o tipo.
 */
import { execSync } from 'node:child_process'

const ALL = process.argv.includes('--tudo')
const sh = (cmd) => execSync(cmd, { encoding: 'utf8', maxBuffer: 1 << 28 })

/** padrões de chaves conhecidos (valem para qualquer arquivo) */
const KNOWN = [
  ['chave do Google/Gemini', /AIza[0-9A-Za-z_-]{30,}/],
  ['chave do Gemini', /AQ\.Ab8[0-9A-Za-z_-]{10,}/],
  ['token JWT (ex.: service_role do Supabase)', /eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}/],
  ['chave privada', /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
  ['token do GitHub', /\bgh[pousr]_[A-Za-z0-9]{30,}/],
  ['chave da OpenAI/Stripe', /\b(sk|rk)_(live|test)?_?[A-Za-z0-9]{24,}/],
  ['chave da AWS', /\bAKIA[0-9A-Z]{16}\b/],
  ['token do Slack', /\bxox[abprs]-[A-Za-z0-9-]{10,}/],
]

/** NOME_DA_CHAVE = valor (em .env, .example, .toml, .json, .yml…) */
const ASSIGN = /^\s*(?:export\s+)?([A-Za-z0-9_]*(?:KEY|SECRET|TOKEN|PASSWORD|PASSWD|SENHA|APP_ID|CREDENTIAL)[A-Za-z0-9_]*)\s*[=:]\s*["']?([^\s"'#]+)/i
/** em código: apiKey: 'xxxxxxxxxxxxxxxx' */
const INLINE = /\b(api[_-]?key|secret|token|password|senha)\w*["']?\s*[:=]\s*["']([A-Za-z0-9_\-./+=]{20,})["']/i
const UUID = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i

/** valores que são claramente de exemplo */
const PLACEHOLDER = /^(|false|true|mock|real|offline|null|none|0|\d{1,3}|x+|\.\.\.|<.*>|\$\{?\w+\}?|\$\{\{.*|your[_-].*|seu[_-].*|cole[_-].*|COLE-AQUI.*|changeme|env\(.*\)|exemplo.*)$/i

const isEnvFile = (f) => /(^|\/)\.env(\..+)?$/.test(f)
const isExample = (f) => /\.(example|sample|template)$|\.example\./.test(f)
const configLike = (f) => isEnvFile(f) || isExample(f) || /\.(toml|ya?ml|json|ini|cfg|conf|properties)$/.test(f)
const skip = (f) => /(^|\/)(package-lock\.json|.*\.lock|.*\.(png|jpe?g|gif|webp|ico|pdf|woff2?|ttf))$/.test(f)

function files() {
  const list = ALL ? sh('git ls-files') : sh('git diff --cached --name-only --diff-filter=ACMR')
  return list.split('\n').map((s) => s.trim()).filter(Boolean)
}

function content(f) {
  try {
    // o que vai para o commit é a versão preparada (git add), não a do disco
    return ALL ? sh(`git show HEAD:"${f}"`) : sh(`git show :"${f}"`)
  } catch {
    return ''
  }
}

const problems = []
for (const f of files()) {
  if (skip(f)) continue
  // um .env de verdade nunca deve ir para o git (o .env.example pode)
  if (isEnvFile(f) && !isExample(f)) {
    problems.push({ f, line: '-', why: 'arquivo .env com segredos (deve ficar fora do git)' })
    continue
  }
  const lines = content(f).split(/\r?\n/)
  lines.forEach((text, i) => {
    if (text.length > 2000) return
    for (const [why, re] of KNOWN) if (re.test(text)) problems.push({ f, line: i + 1, why })
    if (configLike(f) && !text.trim().startsWith('#')) {
      const m = text.match(ASSIGN)
      if (m && !PLACEHOLDER.test(m[2])) problems.push({ f, line: i + 1, why: `${m[1]} preenchida (deixe vazio)` })
      else if (UUID.test(text) && (isEnvFile(f) || isExample(f))) problems.push({ f, line: i + 1, why: 'valor com formato de chave (UUID)' })
    }
    const inl = text.match(INLINE)
    if (inl && !/process\.env|Deno\.env|import\.meta\.env/.test(text)) problems.push({ f, line: i + 1, why: `${inl[1]} escrita direto no código` })
  })
}

if (problems.length) {
  const seen = new Set()
  console.error('\n✋ COMMIT BLOQUEADO: encontrei algo parecido com chave de API.\n')
  for (const p of problems) {
    const k = `${p.f}:${p.line}:${p.why}`
    if (seen.has(k)) continue
    seen.add(k)
    console.error(`   • ${p.f}  (linha ${p.line}): ${p.why}`)
  }
  console.error(
    '\n   Chaves ficam SÓ em supabase/functions/.env (fora do git) e nos Secrets do Supabase.' +
      '\n   Os arquivos .example vão para o GitHub: deixe os valores vazios (ex.: JOOBLE_API_KEY=).' +
      '\n   Corrija o arquivo, rode "git add" de novo e faça o commit.\n',
  )
  process.exit(1)
}
console.log(`Checagem de segredos: nada encontrado (${ALL ? 'todos os arquivos' : 'arquivos preparados'}).`)
