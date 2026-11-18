/** Data local no formato AAAA-MM-DD (o que o Postgres usa em colunas "date") */
export function toISODate(d: Date = new Date()) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Início do dia de hoje no horário local */
export function startOfToday() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

/** Diferença em dias entre duas datas AAAA-MM-DD (b - a) */
export function daysBetween(a: string, b: string) {
  const [ya, ma, da] = a.split('-').map(Number)
  const [yb, mb, db] = b.split('-').map(Number)
  return Math.round((Date.UTC(yb, mb - 1, db) - Date.UTC(ya, ma - 1, da)) / 86_400_000)
}

/** "hoje", "amanhã", "em 3 dias", "ontem", "há 4 dias" */
export function relativeDay(date: string, today = toISODate()) {
  const diff = daysBetween(today, date)
  if (diff === 0) return 'hoje'
  if (diff === 1) return 'amanhã'
  if (diff === -1) return 'ontem'
  return diff > 0 ? `em ${diff} dias` : `há ${-diff} dias`
}

/** "17 de nov." */
export function shortDate(date: string) {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })
}
