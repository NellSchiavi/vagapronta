import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { COUNTRY_CODES, countryInfo, FEATURED, PAISES, promptRules } from './paises'

describe('paises', () => {
  it('não repete códigos e todo país tem idioma e resumo', () => {
    expect(new Set(COUNTRY_CODES).size).toBe(COUNTRY_CODES.length)
    for (const p of PAISES) {
      expect(p.languages.length, p.code).toBeGreaterThan(0)
      expect(p.summary.length, p.code).toBeGreaterThan(10)
    }
  })

  it('tem os 4 destaques na ordem pedida', () => {
    expect(FEATURED.map((p) => p.code)).toEqual(['BR', 'EU', 'US', 'PT'])
  })

  it('regras pedidas: Reino Unido, Irlanda, EUA e Canadá sem foto; Itália com rodapé da GDPR', () => {
    for (const c of ['GB', 'IE', 'US', 'CA']) expect(countryInfo(c).photo).toBe('nao')
    expect(countryInfo('IT').footer?.text).toMatch(/2016\/679/)
    expect(countryInfo('IT').languages.map((l) => l.code)).toEqual(['it', 'en'])
  })

  it('código desconhecido cai no Brasil', () => {
    expect(countryInfo('XX').code).toBe('BR')
    expect(promptRules(null)).toMatch(/^Brasil/)
  })

  it('a restrição do banco aceita exatamente os mesmos países', () => {
    const dir = join(__dirname, '..', '..', 'migrations')
    const file = readdirSync(dir).filter((f) => f.endsWith('_paises_curriculo.sql')).sort().pop()!
    const sql = readFileSync(join(dir, file), 'utf8')
    const lists = [...sql.matchAll(/in \(([^)]+)\)/g)].map((m) => m[1].match(/'([A-Z]{2})'/g)!.map((s) => s.slice(1, 3)).sort())
    expect(lists.length).toBe(2)
    for (const l of lists) expect(l).toEqual([...COUNTRY_CODES].sort())
  })
})
