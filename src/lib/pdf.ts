/**
 * Leitura de PDF no navegador com pdf.js (carregado só quando necessário).
 */
export class PdfReadError extends Error {}

export const MAX_PDF_BYTES = 10 * 1024 * 1024

let pdfjsPromise: Promise<typeof import('pdfjs-dist')> | null = null

/** pdf.js com o worker configurado (carregado uma vez, só quando precisa) */
export function loadPdfjs() {
  pdfjsPromise ??= Promise.all([import('pdfjs-dist'), import('pdfjs-dist/build/pdf.worker.min.mjs?url')]).then(([pdfjs, worker]) => {
    pdfjs.GlobalWorkerOptions.workerSrc = worker.default
    return pdfjs
  })
  return pdfjsPromise
}

export async function extractPdfText(file: File): Promise<{ text: string; pages: number }> {
  if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
    throw new PdfReadError('Esse arquivo não é um PDF. Escolha um arquivo terminado em .pdf ou cole o texto.')
  }
  if (file.size > MAX_PDF_BYTES) {
    throw new PdfReadError('Esse PDF passa de 10 MB. Tente exportar de novo, sem imagens, ou cole o texto.')
  }

  const pdfjs = await loadPdfjs()

  try {
    const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise
    const parts: string[] = []
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i)
      const content = await page.getTextContent()
      let pageText = ''
      for (const item of content.items) {
        if ('str' in item) {
          pageText += item.str
          pageText += item.hasEOL ? '\n' : item.str.endsWith(' ') ? '' : ' '
        }
      }
      parts.push(pageText)
    }
    const text = parts
      .join('\n\n')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/[ \t]{2,}/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
    return { text, pages: doc.numPages }
  } catch {
    throw new PdfReadError('Não conseguimos ler esse PDF. Tente exportar de novo ou cole o texto.')
  }
}
