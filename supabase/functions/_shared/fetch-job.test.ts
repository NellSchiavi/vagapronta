import { describe, expect, it } from 'vitest'
import { assertSafeUrl, findJobPosting, htmlToText } from './fetch-job'

describe('assertSafeUrl', () => {
  it('aceita links públicos http/https', () => {
    expect(assertSafeUrl('https://empresa.gupy.io/jobs/123').hostname).toBe('empresa.gupy.io')
  })
  it('recusa endereços internos, outras portas e protocolos', () => {
    for (const bad of [
      'http://localhost:54321/rest/v1',
      'http://127.0.0.1/',
      'http://192.168.15.162:5173',
      'http://10.0.0.5',
      'http://172.20.1.1',
      'http://169.254.169.254/latest/meta-data',
      'file:///etc/passwd',
      'https://site.com:8443/x',
      'http://intranet/',
      'http://kong.internal/',
      'http://[::1]/',
    ]) {
      expect(() => assertSafeUrl(bad), bad).toThrow()
    }
  })
})

describe('extração do anúncio', () => {
  it('lê o JobPosting (JSON-LD) quando o site publica', () => {
    const html = `<html><head><script type="application/ld+json">${JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'JobPosting',
      title: 'Analista de RH Jr',
      hiringOrganization: { '@type': 'Organization', name: 'Magalu' },
      jobLocation: { '@type': 'Place', address: { addressLocality: 'São Paulo', addressRegion: 'SP' } },
      description: '<p>Responsabilidades:</p><ul><li>Recrutamento &amp; seleção</li><li>Indicadores</li></ul>',
    })}</script></head><body>menu</body></html>`
    const job = findJobPosting(html)!
    expect(job.title).toBe('Analista de RH Jr')
    expect(job.company).toBe('Magalu')
    expect(job.location).toBe('São Paulo, SP')
    expect(job.text).toContain('• Recrutamento & seleção')
  })

  it('transforma HTML em texto sem scripts e estilos', () => {
    const t = htmlToText('<style>a{}</style><h1>Vaga</h1><p>Linha 1<br>Linha 2</p><script>x()</script>')
    expect(t).toBe('Vaga\nLinha 1\nLinha 2')
  })
})
