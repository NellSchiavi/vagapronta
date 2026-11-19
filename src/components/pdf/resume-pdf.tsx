/**
 * PDF do currículo em 4 modelos: Clássico, Moderno, Compacto e Geométrico.
 * Todos otimizados para ATS: uma coluna, texto selecionável, ordem de leitura
 * de cima para baixo, sem tabelas. Os enfeites (faixas, formas) são só desenho,
 * sem texto, e não atrapalham a leitura dos sistemas de recrutamento.
 */
import type { ReactNode } from 'react'
import type { ResumeSections, ResumeTemplate } from '@/lib/resume'
import { loadPdfKit, PDF_COLORS as C, safeName, saveBlob } from './pdf-kit'

export interface ResumePdfData {
  name: string
  role?: string
  /** registro profissional, ex.: "CRBM 12345 · 1ª Região (SP)" */
  registry?: string
  contact: string[]
  sections: ResumeSections
  /** modelo visual (padrão: clássico) */
  template?: ResumeTemplate
  /** texto de rodapé exigido em alguns países (ex.: autorização GDPR na Itália) */
  footerNote?: string
}

export const TEMPLATES: {
  id: ResumeTemplate
  name: string
  description: string
}[] = [
  {
    id: 'classico',
    name: 'Clássico',
    description: 'Sóbrio e elegante. Serve para qualquer área.',
  },
  {
    id: 'moderno',
    name: 'Moderno',
    description: 'Faixa de cor no topo e títulos limpos.',
  },
  {
    id: 'compacto',
    name: 'Compacto',
    description: 'Cabe mais em uma página. Bom para experiência longa.',
  },
  {
    id: 'geometrico',
    name: 'Geométrico',
    description: 'Formas discretas no canto, com personalidade.',
  },
]

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

/** Medidas e cores de cada modelo (o resto do desenho é igual) */
const LOOK: Record<
  ResumeTemplate,
  {
    pad: number
    padTop: number
    size: number
    line: number
    nameFont: string
    nameSize: number
    headFont: string
    headSize: number
    headUpper: boolean
    gap: number
    itemGap: number
  }
> = {
  classico: {
    pad: 52,
    padTop: 44,
    size: 9.8,
    line: 1.45,
    nameFont: 'Fraunces',
    nameSize: 23,
    headFont: 'Fraunces',
    headSize: 12.5,
    headUpper: false,
    gap: 16,
    itemGap: 8,
  },
  moderno: {
    pad: 48,
    padTop: 34,
    size: 9.6,
    line: 1.45,
    nameFont: 'Inter',
    nameSize: 22,
    headFont: 'Inter',
    headSize: 9.2,
    headUpper: true,
    gap: 15,
    itemGap: 8,
  },
  compacto: {
    pad: 36,
    padTop: 30,
    size: 8.8,
    line: 1.32,
    nameFont: 'Inter',
    nameSize: 17,
    headFont: 'Inter',
    headSize: 8.6,
    headUpper: true,
    gap: 10,
    itemGap: 5,
  },
  geometrico: {
    pad: 50,
    padTop: 48,
    size: 9.6,
    line: 1.45,
    nameFont: 'Fraunces',
    nameSize: 24,
    headFont: 'Fraunces',
    headSize: 12.5,
    headUpper: false,
    gap: 16,
    itemGap: 8,
  },
}

const TERRA_SOFT = '#F3E2D6'
const SAND = '#EADFD2'

export async function buildResumePdf(data: ResumePdfData): Promise<Blob> {
  const { Document, Page, Text, View, StyleSheet, pdf } = await loadPdfKit()
  const sx = data.sections
  const t: ResumeTemplate = data.template ?? 'classico'
  const L = LOOK[t]

  const s = StyleSheet.create({
    page: {
      paddingTop: L.padTop,
      paddingBottom: 52,
      paddingHorizontal: L.pad,
      fontFamily: 'Inter',
      fontSize: L.size,
      lineHeight: L.line,
      color: C.ink,
    },
    name: {
      fontFamily: L.nameFont,
      fontWeight: 500,
      fontSize: L.nameSize,
      // altura de linha própria: a da página vem em pontos e é pequena demais para o nome
      lineHeight: 1.2,
      color: t === 'moderno' ? '#FFFFFF' : C.ink,
    },
    role: {
      marginTop: 2,
      fontSize: L.size + 1.2,
      lineHeight: 1.35,
      color: t === 'moderno' ? '#FBEDE3' : C.muted,
    },
    contact: {
      marginTop: t === 'compacto' ? 3 : 5,
      fontSize: L.size - 0.6,
      color: t === 'moderno' ? '#FBEDE3' : C.muted,
    },
    rule: { marginTop: 12, height: 2, width: 44, backgroundColor: C.terra },
    h2: {
      marginTop: L.gap,
      marginBottom: t === 'compacto' ? 4 : 6,
      paddingBottom: t === 'classico' ? 3 : 0,
      borderBottomWidth: t === 'classico' || t === 'compacto' ? 1 : 0,
      borderBottomColor: C.line,
      fontFamily: L.headFont,
      fontWeight: 500,
      fontSize: L.headSize,
      letterSpacing: L.headUpper ? 1.1 : 0,
      color: t === 'moderno' ? C.terra : C.ink,
    },
    item: { marginBottom: L.itemGap },
    itemHead: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
    strong: { fontWeight: 500 },
    muted: { color: C.muted, fontSize: L.size - 0.8 },
    footer: {
      position: 'absolute',
      bottom: 22,
      left: L.pad,
      right: L.pad,
      fontSize: 7.5,
      color: C.muted,
      lineHeight: 1.35,
    },
  })

  const heading = (label: string) => {
    const text = L.headUpper ? label.toUpperCase() : label
    if (t === 'geometrico') {
      return (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginTop: L.gap,
            marginBottom: 6,
          }}
        >
          <View
            style={{
              width: 7,
              height: 7,
              backgroundColor: C.terra,
              transform: 'rotate(45deg)',
              marginRight: 8,
            }}
          />
          <Text style={[s.h2, { marginTop: 0, marginBottom: 0 }]}>{text}</Text>
          <View
            style={{
              flexGrow: 1,
              height: 1,
              backgroundColor: C.line,
              marginLeft: 10,
            }}
          />
        </View>
      )
    }
    return <Text style={s.h2}>{text}</Text>
  }

  const section = (label: string, body: ReactNode) => (
    <View>
      {heading(label)}
      {body}
    </View>
  )

  const subtitle = [data.role, data.registry].filter(Boolean).join('  ·  ')
  const header =
    t === 'moderno' ? (
      // faixa de cor de ponta a ponta no topo
      <View
        style={{
          marginTop: -L.padTop,
          marginHorizontal: -L.pad,
          paddingTop: 30,
          paddingBottom: 18,
          paddingHorizontal: L.pad,
          backgroundColor: C.terra,
        }}
      >
        <Text style={s.name}>{data.name}</Text>
        {subtitle ? <Text style={s.role}>{subtitle}</Text> : null}
        {data.contact.length ? <Text style={s.contact}>{data.contact.join('   ·   ')}</Text> : null}
      </View>
    ) : (
      <View>
        <Text style={s.name}>{data.name}</Text>
        {subtitle ? <Text style={s.role}>{subtitle}</Text> : null}
        {data.contact.length ? <Text style={s.contact}>{data.contact.join(t === 'compacto' ? '  ·  ' : '   ·   ')}</Text> : null}
        {t === 'classico' ? <View style={s.rule} /> : null}
        {t === 'compacto' ? <View style={{ marginTop: 8, height: 1.5, backgroundColor: C.terra }} /> : null}
      </View>
    )

  // formas do modelo Geométrico (só desenho, no canto superior direito)
  const shapes =
    t === 'geometrico' ? (
      <View
        fixed
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: 150,
          height: 120,
        }}
      >
        <View
          style={{
            position: 'absolute',
            top: -60,
            right: -40,
            width: 150,
            height: 150,
            borderRadius: 75,
            backgroundColor: TERRA_SOFT,
          }}
        />
        <View
          style={{
            position: 'absolute',
            top: 34,
            right: 70,
            width: 26,
            height: 26,
            backgroundColor: C.terra,
            transform: 'rotate(45deg)',
          }}
        />
        <View
          style={{
            position: 'absolute',
            top: 78,
            right: 34,
            width: 14,
            height: 14,
            borderRadius: 7,
            backgroundColor: SAND,
          }}
        />
      </View>
    ) : null

  const doc = (
    <Document title={`Currículo — ${data.name}`} author={data.name} language="pt-BR">
      <Page size="A4" style={s.page}>
        {shapes}
        {header}

        {sx.resumo ? section('Resumo', <Text>{sx.resumo}</Text>) : null}

        {sx.experiencias?.length
          ? section(
              'Experiência',
              sx.experiencias.map((e, i) => (
                <View key={i} style={s.item} wrap={false}>
                  <View style={s.itemHead}>
                    <Text style={[s.strong, { flexShrink: 1 }]}>{[e.cargo, e.empresa].filter(Boolean).join(' · ')}</Text>
                    <Text style={s.muted}>{formatPeriod(e.inicio, e.fim)}</Text>
                  </View>
                  {e.local ? <Text style={s.muted}>{e.local}</Text> : null}
                  {e.descricao ? <Text style={{ marginTop: 2 }}>{e.descricao}</Text> : null}
                </View>
              )),
            )
          : null}

        {sx.formacao?.length || sx.cursos?.length
          ? section(
              'Formação',
              <>
                {sx.formacao?.map((f, i) => (
                  <View key={`f${i}`} style={[s.itemHead, { marginBottom: 2 }]}>
                    <Text style={{ flexShrink: 1 }}>
                      <Text style={s.strong}>{f.curso}</Text>
                      {f.instituicao ? ` · ${f.instituicao}` : ''}
                    </Text>
                    <Text style={s.muted}>{formatPeriod(f.inicio, f.fim ?? undefined)}</Text>
                  </View>
                ))}
                {sx.cursos?.map((c, i) => (
                  <Text key={`c${i}`}>{c}</Text>
                ))}
              </>,
            )
          : null}

        {sx.habilidades?.length ? section('Habilidades', <Text>{sx.habilidades.join(' · ')}</Text>) : null}

        {sx.idiomas?.length ? section('Idiomas', <Text>{sx.idiomas.join(' · ')}</Text>) : null}

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
