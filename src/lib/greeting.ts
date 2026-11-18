/** "Bom dia" (5h–11h), "Boa tarde" (12h–17h) ou "Boa noite" (18h–4h) */
export function greetingFor(date: Date = new Date()) {
  const h = date.getHours()
  if (h >= 5 && h < 12) return 'Bom dia'
  if (h >= 12 && h < 18) return 'Boa tarde'
  return 'Boa noite'
}

/** Escolhe singular ou plural: plural(1, 'vaga', 'vagas') → "1 vaga" */
export function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`
}
