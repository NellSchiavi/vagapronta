import { describe, expect, it } from 'vitest'
import {
  assertSafeUrl,
  extractJob,
  findJobPosting,
  findOriginalLink,
  htmlToText,
  isAggregator,
  isBotChallenge,
  looksClosed,
} from './fetch-job'

describe('assertSafeUrl', () => {
  it('aceita links públicos http/https', () => {
    expect(assertSafeUrl('https://vagas.example.com/jobs/123').hostname).toBe('vagas.example.com')
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
      'https://example.org:8443/x',
      'http://intranet/',
      'http://kong.internal/',
      'http://[::1]/',
      'http://100.100.100.200/',
      'http://app.localhost/',
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

  it('lê o JSON-LD publicado com aspas escapadas (Gupy) e os campos extras', () => {
    const ld = JSON.stringify({
      '@context': 'http://schema.org',
      '@type': 'JobPosting',
      title: 'Biomédica',
      hiringOrganization: { name: 'Laboratório Exemplo' },
      jobLocation: [{ address: { addressLocality: 'Lisboa', addressCountry: 'PT' } }],
      employmentType: ['FULL_TIME'],
      datePosted: '2026-11-01T10:00:00Z',
      validThrough: '2026-12-31',
      description: '<p>' + 'Colheitas e análises clínicas. '.repeat(10) + '</p>',
    }).replace(/"/g, '&quot;')
    const job = extractJob(`<script type="application/ld+json">${ld}</script><body>menu</body>`)!
    expect(job.via).toBe('json-ld')
    expect(job.location).toBe('Lisboa, PT')
    expect(job.employmentType).toBe('Tempo integral')
    expect(job.datePosted).toBe('2026-11-01')
    expect(job.text).toContain('Inscrições até: 2026-12-31')
  })

  it('sem JSON-LD, usa o Open Graph; sem os dois, o texto do <main>', () => {
    const desc = 'Responsável por garantia da qualidade e acreditação ISO 15189. '.repeat(5)
    const og = extractJob(`<meta property="og:title" content="Analista da Qualidade"><meta property="og:description" content="${desc}">`)!
    expect(og.via).toBe('open-graph')
    expect(og.title).toBe('Analista da Qualidade')
    const visible = extractJob(`<body><div>Menu Entrar Cadastrar</div><main><h1>Vaga</h1><p>${desc}</p></main></body>`)!
    expect(visible.via).toBe('texto')
    expect(visible.text.startsWith('Vaga')).toBe(true)
  })

  it('acha o link do anúncio original numa página de agregador', () => {
    const html = `<a href="/outra">Ver vagas parecidas</a><a href="https://br.jooble.org/x">Candidatar-se</a>
      <a class="btn" href="https://empresa.example.com/vagas/123?utm_source=jooble">Ver vaga original</a>`
    expect(isAggregator('br.jooble.org')).toBe(true)
    expect(findOriginalLink(html, 'https://br.jooble.org/jdp/1')).toBe('https://empresa.example.com/vagas/123?utm_source=jooble')
    expect(findOriginalLink('<a href="https://br.jooble.org/y">Candidatar</a>', 'https://br.jooble.org/jdp/1')).toBeNull()
  })

  it('reconhece proteção anti-robô e vaga encerrada', () => {
    expect(isBotChallenge(403, '<html><head><title>Just a moment...</title>')).toBe(true)
    expect(isBotChallenge(200, '<title>Vaga de Biomédica</title>')).toBe(false)
    const req = new URL('https://job-boards.greenhouse.io/pfm/jobs/6181085004')
    expect(looksClosed(req, new URL('https://job-boards.greenhouse.io/pfm?error=true'))).toBe(true)
    expect(looksClosed(req, new URL('https://job-boards.greenhouse.io/pfm'))).toBe(true)
    expect(looksClosed(new URL('http://site.example.com/vaga/1'), new URL('https://site.example.com/vaga/1/'))).toBe(false)
  })

  it('transforma HTML em texto sem scripts e estilos', () => {
    const t = htmlToText('<style>a{}</style><h1>Vaga</h1><p>Linha 1<br>Linha 2</p><script>x()</script>')
    expect(t).toBe('Vaga\nLinha 1\nLinha 2')
  })
})
