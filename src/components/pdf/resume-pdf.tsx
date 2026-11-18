/**
 * PDF do currículo: modelo "Clássico", uma coluna, otimizado para ATS
 * (texto selecionável, sem tabelas nem colunas). Os outros modelos
 * (Moderno, Compacto, Geométrico) entram com o editor de currículo.
 */
import type { ResumeSections } from '@/lib/resume'
import { loadPdfKit, PDF_COLORS as C, safeName, saveBlob } from './pdf-kit'

export interface ResumePdfData {
  name: string
  role?: string
  contact: string[]
  sections: ResumeSections
  /** texto de rodapé exigido em alguns países (ex.: autorização GDPR na Itália) */
  footerNote?: string
}

const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

/** "2021-03" → "mar/2021"; "2018" → "2018" */
export function formatPeriodPart(v?: string | null) {
  if (!v) return ''
  const m = v.match(/^(\d{4})-(\d{2})/)
  return m ? `${MONTHS[Number(m[2]) - 1] ?? m[2]}/${m[1]}` : v
}

export function formatPeriod(inicio?: string, fim?: string | null) {
  if (!inicio && fim === undefined) return ''
  return [formatPeriodPart(inicio), fim === null ? 'atual' : formatPeriodPart(fim)].filter(Boolean).join(' – ')
}

export async function buildResumePdf(data: ResumePdfData): Promise<Blob> {
  const { Document, Page, Text, View, StyleSheet, pdf } = await loadPdfKit()
  const sx = data.sections

  const s = StyleSheet.create({
    page: { paddingTop: 44, paddingBottom: 52, paddingHorizontal: 52, fontFamily: 'Inter', fontSize: 9.8, lineHeight: 1.45, color: C.ink },
    name: { fontFamily: 'Fraunces', fontWeight: 500, fontSize: 23 },
    role: { marginTop: 2, fontSize: 11, color: C.muted },
    contact: { marginTop: 5, fontSize: 9, color: C.muted },
    rule: { marginTop: 12, height: 2, width: 44, backgroundColor: C.terra },
    h2: {
      marginTop: 16,
      marginBottom: 6,
      paddingBottom: 3,
      borderBottomWidth: 1,
      borderBottomColor: C.line,
      fontFamily: 'Fraunces',
      fontWeight: 500,
      fontSize: 12.5,
    },
    item: { marginBottom: 8 },
    itemHead: { flexDirection: 'row', justifyContent: 'space-between' },
    strong: { fontWeight: 500 },
    muted: { color: C.muted, fontSize: 9 },
    footer: { position: 'absolute', bottom: 22, left: 52, right: 52, fontSize: 7.5, color: C.muted, lineHeight: 1.35 },
  })

  const doc = (
    <Document title={`Currículo — ${data.name}`} author={data.name} language="pt-BR">
      <Page size="A4" style={s.page}>
        <Text style={s.name}>{data.name}</Text>
        {data.role ? <Text style={s.role}>{data.role}</Text> : null}
        {data.contact.length ? <Text style={s.contact}>{data.contact.join('   ·   ')}</Text> : null}
        <View style={s.rule} />

        {sx.resumo ? (
          <View>
            <Text style={s.h2}>Resumo</Text>
            <Text>{sx.resumo}</Text>
          </View>
        ) : null}

        {sx.experiencias?.length ? (
          <View>
            <Text style={s.h2}>Experiência</Text>
            {sx.experiencias.map((e, i) => (
              <View key={i} style={s.item} wrap={false}>
                <View style={s.itemHead}>
                  <Text style={s.strong}>
                    {e.cargo} · {e.empresa}
                  </Text>
                  <Text style={s.muted}>{formatPeriod(e.inicio, e.fim)}</Text>
                </View>
                {e.local ? <Text style={s.muted}>{e.local}</Text> : null}
                {e.descricao ? <Text style={{ marginTop: 2 }}>{e.descricao}</Text> : null}
              </View>
            ))}
          </View>
        ) : null}

        {sx.formacao?.length || sx.cursos?.length ? (
          <View>
            <Text style={s.h2}>Formação</Text>
            {sx.formacao?.map((f, i) => (
              <View key={`f${i}`} style={s.itemHead}>
                <Text>
                  <Text style={s.strong}>{f.curso}</Text> · {f.instituicao}
                </Text>
                <Text style={s.muted}>{formatPeriod(f.inicio, f.fim ?? undefined)}</Text>
              </View>
            ))}
            {sx.cursos?.map((c, i) => (
              <Text key={`c${i}`}>{c}</Text>
            ))}
          </View>
        ) : null}

        {sx.habilidades?.length ? (
          <View>
            <Text style={s.h2}>Habilidades</Text>
            <Text>{sx.habilidades.join(' · ')}</Text>
          </View>
        ) : null}

        {sx.idiomas?.length ? (
          <View>
            <Text style={s.h2}>Idiomas</Text>
            <Text>{sx.idiomas.join(' · ')}</Text>
          </View>
        ) : null}

        {data.footerNote ? (
          <Text style={s.footer} fixed>
            {data.footerNote}
          </Text>
        ) : null}
      </Page>
    </Document>
  )
  return pdf(doc).toBlob()
}

export async function downloadResumePdf(data: ResumePdfData, fileName: string) {
  saveBlob(await buildResumePdf(data), fileName)
}

export function resumeFileName(name: string, company?: string | null) {
  return safeName('Currículo', name, company)
}
