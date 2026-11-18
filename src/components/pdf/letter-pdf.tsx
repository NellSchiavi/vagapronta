/**
 * PDF da carta de apresentação, com o visual do app:
 * nome e texto em Fraunces, detalhes em Inter, filete terracota.
 * A biblioteca de PDF e as fontes só são carregadas quando a pessoa baixa.
 */
export interface LetterPdfData {
  name: string
  role?: string
  contact: string[]
  place?: string
  date: string
  recipient?: string
  body: string
}

const COLORS = { ink: '#2B2622', muted: '#756A61', line: '#E8DFD3', terra: '#C2622D' }

export async function buildLetterPdf(data: LetterPdfData): Promise<Blob> {
  const [rpdf, f400, f500, i400, i500] = await Promise.all([
    import('@react-pdf/renderer'),
    import('@fontsource/fraunces/files/fraunces-latin-400-normal.woff?url'),
    import('@fontsource/fraunces/files/fraunces-latin-500-normal.woff?url'),
    import('@fontsource/inter/files/inter-latin-400-normal.woff?url'),
    import('@fontsource/inter/files/inter-latin-500-normal.woff?url'),
  ])
  const { Document, Page, Text, View, Font, StyleSheet, pdf } = rpdf

  Font.register({ family: 'Fraunces', fonts: [{ src: f400.default }, { src: f500.default, fontWeight: 500 }] })
  Font.register({ family: 'Inter', fonts: [{ src: i400.default }, { src: i500.default, fontWeight: 500 }] })
  // sem hifenização automática (fica estranho em português)
  Font.registerHyphenationCallback((word) => [word])

  const s = StyleSheet.create({
    page: { paddingVertical: 56, paddingHorizontal: 60, fontFamily: 'Inter', fontSize: 10, color: COLORS.ink },
    name: { fontFamily: 'Fraunces', fontWeight: 500, fontSize: 24, letterSpacing: -0.3 },
    role: { marginTop: 3, fontSize: 10.5, color: COLORS.muted },
    contact: { marginTop: 6, fontSize: 9, color: COLORS.muted },
    rule: { marginTop: 16, marginBottom: 22, height: 2, width: 48, backgroundColor: COLORS.terra },
    meta: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 22, fontSize: 9.5, color: COLORS.muted },
    paragraph: { fontFamily: 'Fraunces', fontSize: 11.5, lineHeight: 1.6, marginBottom: 11 },
    footer: { position: 'absolute', bottom: 28, left: 60, right: 60, borderTopWidth: 1, borderTopColor: COLORS.line, paddingTop: 6 },
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
        {data.role ? <Text style={s.role}>{data.role}</Text> : null}
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
  const blob = await buildLetterPdf(data)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

/** Nome de arquivo simples: "Carta - Natura - Maria.pdf" */
export function letterFileName(company: string | null | undefined, name: string) {
  const clean = (s: string) => s.replace(/[\\/:*?"<>|]+/g, '').trim()
  return ['Carta', company && clean(company), clean(name.split(' ')[0] || 'VagaPronta')].filter(Boolean).join(' - ')
}
