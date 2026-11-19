import { describe, expect, it } from 'vitest'
import { blockedSite, cleanJobUrl } from './links'

// mesmo formato do link de um e-mail de alerta de vagas do LinkedIn (tokens inventados)
const LINKEDIN_EMAIL =
  'https://www.linkedin.com/comm/jobs/view/4318822739/?trackingId=Zq1mXbYvRk2%2B8aB3cD4eFg%3D%3D' +
  '&refId=hJ7k2LmN9pQ%2FrS1tU3vWxY%3D%3D&lipi=urn%3Ali%3Apage%3Aemail_email_job_alert_digest_01%3BAbCdEf%3D%3D' +
  '&midToken=AQHf8kd93JdkeLQ&midSig=2xYzAbC9d8E1&trk=eml-email_job_alert_digest_01-job_card-0-view_job' +
  '&trkEmail=eml-email_job_alert_digest_01-job_card-0-view_job-null-1a2b3c~m4n5o6p7~qr-null-null' +
  '&eid=1a2b3c-m4n5o6p7-qr&otpToken=EXEMPLO-token-falso-de-teste'

describe('limpeza de links de vaga', () => {
  it('LinkedIn do e-mail de alerta: tira trackingId, refId, trk, midToken, otpToken, eid, lipi e normaliza', () => {
    const clean = cleanJobUrl(LINKEDIN_EMAIL)
    expect(clean).toBe('https://www.linkedin.com/jobs/view/4318822739/')
    for (const p of ['trackingId', 'refId', 'trk', 'midToken', 'otpToken', 'eid', 'lipi']) expect(clean).not.toContain(p)
  })

  it('LinkedIn: outros formatos viram o mesmo link', () => {
    expect(cleanJobUrl('https://br.linkedin.com/jobs/view/biomedica-at-laboratorio-alfa-4318822739?refId=x&trk=public_jobs_topcard-title')).toBe(
      'https://www.linkedin.com/jobs/view/4318822739/',
    )
    expect(cleanJobUrl('https://www.linkedin.com/jobs/search/?currentJobId=4318822739&geoId=106057199&keywords=biom%C3%A9dica')).toBe(
      'https://www.linkedin.com/jobs/view/4318822739/',
    )
    expect(cleanJobUrl('linkedin.com/jobs/view/4318822739')).toBe('https://www.linkedin.com/jobs/view/4318822739/')
  })

  it('Indeed: só o número da vaga fica', () => {
    expect(cleanJobUrl('https://br.indeed.com/viewjob?jk=a1b2c3d4e5f6&tk=1hxyz&from=serp&vjs=3&advn=123')).toBe('https://br.indeed.com/viewjob?jk=a1b2c3d4e5f6')
    expect(cleanJobUrl('https://pt.indeed.com/q-biomedica-vagas.html?vjk=0f9e8d7c6b5a&from=email')).toBe('https://pt.indeed.com/viewjob?jk=0f9e8d7c6b5a')
  })

  it('outros sites: tira utm_, gclid, fbclid e tokens, mantém o que identifica a vaga', () => {
    expect(cleanJobUrl('https://empresa.gupy.io/jobs/1234567?jobBoardSource=gupy_portal&utm_source=email&utm_campaign=x&gclid=abc')).toBe(
      'https://empresa.gupy.io/jobs/1234567?jobBoardSource=gupy_portal',
    )
    expect(cleanJobUrl('https://www.net-empregos.com/123456/biomedica/?fbclid=IwAR0&token=segredo#access_token=abc')).toBe(
      'https://www.net-empregos.com/123456/biomedica/',
    )
    expect(cleanJobUrl('https://site.com/#/vaga/123')).toBe('https://site.com/#/vaga/123')
  })

  it('texto que não é link volta como está', () => {
    expect(cleanJobUrl('  não é link  ')).toBe('não é link')
  })
})

describe('sites que não deixam ler a vaga', () => {
  it('LinkedIn, Indeed e Glassdoor pedem o texto colado', () => {
    expect(blockedSite(LINKEDIN_EMAIL)?.message).toBe(
      'O LinkedIn não deixa a gente ler a vaga automaticamente. Abra a vaga, copie o texto e cole aqui.',
    )
    expect(blockedSite('https://br.indeed.com/viewjob?jk=1')?.name).toBe('Indeed')
    expect(blockedSite('https://www.glassdoor.com.br/job-listing/x')?.name).toBe('Glassdoor')
  })
  it('Gupy e outros sites: tenta ler', () => {
    expect(blockedSite('https://empresa.gupy.io/jobs/1')).toBeNull()
    expect(blockedSite('https://notlinkedin.com.evil.io/jobs/view/1')).toBeNull()
  })
})
