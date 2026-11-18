/**
 * Lacunas deixadas pela IA para a pessoa completar, como "[X]%" ou
 * "[número de clientes]". Uma sugestão com lacuna não pode ser aplicada
 * até ser completada (ou a lacuna apagada).
 */
const GAP = /\[[^[\]\n]{1,40}\]/g

export function hasGaps(text: string) {
  return new RegExp(GAP.source).test(text)
}

export function countGaps(text: string) {
  return text.match(GAP)?.length ?? 0
}

/** Divide o texto em pedaços normais e lacunas, para destacar na tela */
export function splitGaps(text: string): { text: string; gap: boolean }[] {
  const parts: { text: string; gap: boolean }[] = []
  let last = 0
  for (const m of text.matchAll(GAP)) {
    if (m.index! > last) parts.push({ text: text.slice(last, m.index), gap: false })
    parts.push({ text: m[0], gap: true })
    last = m.index! + m[0].length
  }
  if (last < text.length) parts.push({ text: text.slice(last), gap: false })
  return parts
}
