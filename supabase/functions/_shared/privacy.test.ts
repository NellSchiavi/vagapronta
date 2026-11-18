import { describe, expect, it } from 'vitest'
import { redactPersonalData } from './privacy'

const CV = `Maria Silva
Analista de RH · São Paulo, SP
maria.silva+cv@gmail.com | +55 (11) 98765-4321 | (11) 3333-4444
linkedin.com/in/maria-silva-rh · https://maria.dev/portfolio
CPF: 123.456.789-09
Rua das Flores, 123 - Apto 45 - Vila Mariana
CEP 04012-000

Experiência
Assistente de RH na Clínica Bem Viver (03/2021 – atual)
Conduzo cerca de 15 processos seletivos por mês. Salário pretendido: R$ 4.500.
Auxiliar administrativa (2019-2021)`

describe('redactPersonalData', () => {
  const r = redactPersonalData(CV)

  it('remove e-mail, telefones, CPF, CEP, endereço e links', () => {
    for (const secret of [
      'maria.silva+cv@gmail.com',
      '98765-4321',
      '3333-4444',
      '123.456.789-09',
      '04012-000',
      'Rua das Flores',
      'linkedin.com/in/maria-silva-rh',
      'https://maria.dev/portfolio',
    ]) {
      expect(r.text).not.toContain(secret)
    }
    expect(r.text).toContain('[EMAIL_1]')
    expect(r.text).toContain('[TELEFONE_1]')
    expect(r.text).toContain('[TELEFONE_2]')
    expect(r.text).toContain('[CPF_1]')
    expect(r.text).toContain('[ENDERECO_1]')
    expect(r.text).toContain('[LINK_1]')
  })

  it('mantém nome, cidade, empresas, datas e valores', () => {
    for (const keep of ['Maria Silva', 'São Paulo, SP', 'Clínica Bem Viver', '03/2021', '2019-2021', 'R$ 4.500', '15 processos']) {
      expect(r.text).toContain(keep)
    }
  })

  it('recoloca os dados originais em textos e objetos', () => {
    const tokenOf = (value: string) => [...r.map].find(([, v]) => v === value)?.[0]
    const fromAi = {
      contato: { email: '[EMAIL_1]', telefone: '[TELEFONE_1]', linkedin: tokenOf('linkedin.com/in/maria-silva-rh') },
      lista: ['Ligue em [TELEFONE_2]'],
      nota: 80,
    }
    const back = r.restore(fromAi)
    expect(back.contato.email).toBe('maria.silva+cv@gmail.com')
    expect(back.contato.telefone).toBe('+55 (11) 98765-4321')
    expect(back.contato.linkedin).toBe('linkedin.com/in/maria-silva-rh')
    expect(back.lista[0]).toBe('Ligue em (11) 3333-4444')
    expect(back.nota).toBe(80)
  })

  it('usa o mesmo marcador para o mesmo valor repetido', () => {
    const t = redactPersonalData('a@b.com e de novo a@b.com').text
    expect(t).toBe('[EMAIL_1] e de novo [EMAIL_1]')
  })

  it('aceita telefones internacionais', () => {
    const t = redactPersonalData('Tel. +39 333 123 4567 / +1 (415) 555-0100').text
    expect(t).not.toMatch(/333 123|555-0100/)
  })

  it('não altera texto sem dados pessoais', () => {
    const plain = 'Gestão de Recursos Humanos (2018–2020), Excel intermediário'
    expect(redactPersonalData(plain).text).toBe(plain)
  })
})
