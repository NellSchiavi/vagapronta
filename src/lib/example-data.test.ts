import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Dados de exemplo (seed e vagas de exemplo) NUNCA podem apontar para domínios
 * reais: só os reservados para exemplo (example.com/.org/.net, .example, .invalid, .test).
 */
const FILES = ['supabase/seed.sql', 'supabase/functions/_shared/vagas/exemplo.ts']
const RESERVED = /(^|\.)(example\.(com|org|net)|[a-z0-9-]+\.(example|invalid|test))$|^(127\.0\.0\.1|localhost)$/i

function domainsIn(text: string) {
  const urls = [...text.matchAll(/https?:\/\/([a-z0-9.-]+)/gi)].map((m) => m[1])
  const emails = [...text.matchAll(/[a-z0-9._%+-]+@([a-z0-9.-]+\.[a-z]{2,})/gi)].map((m) => m[1])
  const bare = [...text.matchAll(/\b((?:[a-z0-9-]+\.)+(?:com|com\.br|org|net|io|dev|app|pt|br))\b/gi)].map((m) => m[1])
  return [...new Set([...urls, ...emails, ...bare])]
}

describe('dados de exemplo', () => {
  for (const file of FILES) {
    it(`${file} só usa domínios reservados para exemplo`, () => {
      const text = readFileSync(resolve(__dirname, '../..', file), 'utf8')
      const real = domainsIn(text).filter((d) => !RESERVED.test(d))
      expect(real).toEqual([])
    })
  }
})
