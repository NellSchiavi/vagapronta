/**
 * Carrega a biblioteca de PDF e registra as fontes do app (Fraunces e Inter)
 * uma única vez, só quando alguém baixa um PDF.
 */
type Kit = typeof import('@react-pdf/renderer')

let kitPromise: Promise<Kit> | null = null

export function loadPdfKit(): Promise<Kit> {
  if (kitPromise) return kitPromise
  kitPromise = (async () => {
    const [rpdf, f400, f500, i400, i500] = await Promise.all([
      import('@react-pdf/renderer'),
      import('@fontsource/fraunces/files/fraunces-latin-400-normal.woff?url'),
      import('@fontsource/fraunces/files/fraunces-latin-500-normal.woff?url'),
      import('@fontsource/inter/files/inter-latin-400-normal.woff?url'),
      import('@fontsource/inter/files/inter-latin-500-normal.woff?url'),
    ])
    rpdf.Font.register({ family: 'Fraunces', fonts: [{ src: f400.default }, { src: f500.default, fontWeight: 500 }] })
    rpdf.Font.register({ family: 'Inter', fonts: [{ src: i400.default }, { src: i500.default, fontWeight: 500 }] })
    // sem hifenização automática (fica estranha em português)
    rpdf.Font.registerHyphenationCallback((word) => [word])
    return rpdf
  })()
  return kitPromise
}

export const PDF_COLORS = { ink: '#2B2622', muted: '#756A61', line: '#E8DFD3', terra: '#C2622D' }

export function saveBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

/** Nome de arquivo simples e seguro */
export function safeName(...parts: (string | null | undefined)[]) {
  return parts
    .filter(Boolean)
    .map((p) => p!.replace(/[\\/:*?"<>|]+/g, '').trim())
    .join(' - ')
}
