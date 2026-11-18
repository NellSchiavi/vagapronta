/**
 * PDF da carta de apresentação, com o visual do app:
 * nome e texto em Fraunces, detalhes em Inter, filete terracota.
 */
import { loadPdfKit, PDF_COLORS as C, safeName, saveBlob } from './pdf-kit'

export interface LetterPdfData {
  name: string
  role?: string
  /** registro profissional, ex.: "CRBM 12345 · 1ª Região (SP)" */
  registry?: string
  contact: string[]
  place?: string
  date: string
  recipient?: string
  body: string
}

export async function buildLetterPdf(data: LetterPdfData): Promise<Blob> {
  const { Document, Page, Text, View, StyleSheet, pdf } = await loadPdfKit()

  const s = StyleSheet.create({
    page: { paddingVertical: 56, paddingHorizontal: 60, fontFamily: 'Inter', fontSize: 10, color: C.ink },
    name: { fontFamily: 'Fraunces', fontWeight: 500, fontSize: 24, letterSpacing: -0.3 },
    role: { marginTop: 3, fontSize: 10.5, color: C.muted },
    contact: { marginTop: 6, fontSize: 9, color: C.muted },
    rule: { marginTop: 16, marginBottom: 22, height: 2, width: 48, backgroundColor: C.terra },
    meta: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 22, fontSize: 9.5, color: C.muted },
    paragraph: { fontFamily: 'Fraunces', fontSize: 11.5, lineHeight: 1.6, marginBottom: 11 },
    footer: { position: 'absolute', bottom: 28, left: 60, right: 60, borderTopWidth: 1, borderTopColor: C.line, paddingTop: 6 },
  })

  const paragraphs = data.body
    .replace(/\r/g, '')
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)

  const doc = (
    <Document title={`Carta de apresentação — ${data.name}`} author={data.name} language="pt-BR">
      <Page size="A4" style={s.page}>
        <Text style={s.name}>{data.name}</Text>
        {data.role || data.registry ? <Text style={s.role}>{[data.role, data.registry].filter(Boolean).join('  ·  ')}</Text> : null}
        {data.contact.length ? <Text style={s.contact}>{data.contact.join('   ·   ')}</Text> : null}
        <View style={s.rule} />
        <View style={s.meta}>
          <Text>{data.recipient ?? ''}</Text>
          <Text>{[data.place, data.date].filter(Boolean).join(', ')}</Text>
        </View>
        {paragraphs.map((p, i) => (
          <Text key={i} style={s.paragraph}>
            {p}
          </Text>
        ))}
        <View style={s.footer} fixed />
      </Page>
    </Document>
  )
  return pdf(doc).toBlob()
}

export async function downloadLetterPdf(data: LetterPdfData, fileName: string) {
  saveBlob(await buildLetterPdf(data), fileName)
}

/** "Carta - Natura - Maria" */
export function letterFileName(company: string | null | undefined, name: string) {
  return safeName('Carta', company, name.split(' ')[0] || 'VagaPronta')
}
