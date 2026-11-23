#!/usr/bin/env node
/**
 * Confere que nenhum arquivo, nome de arquivo, mensagem de commit ou autor cita
 * ferramentas de escrita automática de código. Falha (código 1) se encontrar.
 *
 *   node scripts/checar-termos.mjs                    → arquivos preparados (hook pre-commit)
 *   node scripts/checar-termos.mjs --mensagem <arq>   → mensagem do commit (hook commit-msg)
 *   node scripts/checar-termos.mjs --tudo             → todos os arquivos + histórico inteiro (GitHub Actions)
 *
 * A palavra "IA" como funcionalidade do app e o Gemini (serviço usado) são permitidos.
 * Os padrões ficam codificados para que este próprio arquivo não os contenha.
 */
import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const decode = (b64) => new RegExp(Buffer.from(b64, 'base64').toString('utf8'), 'iu')
const TERMS = decode(
  'Y2xhdWRlfGFudGhyb3BpY3xjby0/YXV0aG9yZWQtP2J5fGFpWy0gXWdlbmVyYXRlZHxhaVstIF1hc3Npc3RlZHxnZW5lcmF0ZWQgKGJ5fHdpdGgpIChhbj8gKT8oYWl8YXNzaXN0YW50fGxsbSl8Z2VyYWRbb2FdIChwb3J8Y29tKSAodW1hPyApPyhpYXxpbnRlbGlnW2XDql1uY2lhIGFydGlmaWNpYWwpfGFzc2lzdGlkW29hXSBwb3IgKGlhfGludGVsaWcpfChhaXxpYSkgYXNzaXN0YW50fGFzc2lzdGVudGUgKGRlIGlhfHZpcnR1YWx8ZGUgaW50ZWxpZyl8Y2hhdGdwdHxjb3BpbG90fFx1ezFGOTE2fQ==',
)
const PATHS = decode(
  'KF58LylcLmNsYXVkZSgvfCQpfChefC8pY2xhdWRlXC5tZCR8KF58LylhZ2VudHNcLm1kJHwoXnwvKVwuY3Vyc29yKHJ1bGVzKT8oL3wkKXwoXnwvKVwuYWlkZXJ8KF58LylcLmdpdGh1Yi9jb3BpbG90',
)

const args = process.argv.slice(2)
const ALL = args.includes('--tudo')
const MSG = args.includes('--mensagem') ? args[args.indexOf('--mensagem') + 1] : null
const sh = (cmd) => execSync(cmd, { encoding: 'utf8', maxBuffer: 1 << 28 })
const skip = (f) => /(^|\/)package-lock\.json$|\.(png|jpe?g|gif|webp|ico|pdf|woff2?|ttf)$/i.test(f)
const problems = []

function scanText(where, text) {
  text.split(/\r?\n/).forEach((line, i) => {
    if (TERMS.test(line)) problems.push(`${where} (linha ${i + 1})`)
  })
}

if (MSG) {
  // linhas de comentário (#) não entram no commit
  const text = readFileSync(MSG, 'utf8').split(/\r?\n/).filter((l) => !l.startsWith('#')).join('\n')
  scanText('mensagem do commit', text)
} else {
  const list = (ALL ? sh('git ls-files') : sh('git diff --cached --name-only --diff-filter=ACMR'))
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
  for (const f of list) {
    if (PATHS.test(f) || TERMS.test(f)) problems.push(`${f} (nome de arquivo/pasta não permitido no repositório)`)
    if (skip(f)) continue
    let text = ''
    try {
      text = ALL ? sh(`git show HEAD:"${f}"`) : sh(`git show :"${f}"`)
    } catch {
      continue
    }
    scanText(f, text)
  }
  if (ALL) {
    // histórico inteiro: mensagens, autores e arquivos que já passaram por algum commit
    const log = sh('git log --all --format=%h%x1f%an%x1f%ae%x1f%cn%x1f%ce%x1f%B%x1e')
    for (const rec of log.split('\x1e')) {
      const [hash, ...fields] = rec.trim().split('\x1f')
      if (hash && fields.some((x) => TERMS.test(x))) problems.push(`commit ${hash} (mensagem ou autor)`)
    }
    for (const f of new Set(sh('git log --all --name-only --format=').split('\n').filter(Boolean))) {
      if (PATHS.test(f) || TERMS.test(f)) problems.push(`${f} (já esteve em algum commit)`)
    }
  }
}

if (problems.length) {
  console.error('\n✋ BLOQUEADO: encontrei termo não permitido em:\n')
  for (const p of [...new Set(problems)]) console.error(`   • ${p}`)
  console.error('\n   Remova a menção e tente de novo.\n')
  process.exit(1)
}
console.log(`Checagem de termos: nada encontrado (${MSG ? 'mensagem' : ALL ? 'arquivos e histórico' : 'arquivos preparados'}).`)
