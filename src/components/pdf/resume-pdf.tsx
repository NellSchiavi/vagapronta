/**
 * PDF do currículo em 5 modelos: Clássico, Moderno, Compacto, Geométrico e
 * Europass (este só para países onde o formato é usado).
 * Todos otimizados para ATS: uma coluna de leitura, texto selecionável, ordem de
 * leitura de cima para baixo, sem tabelas. Os enfeites (faixas, formas) são só
 * desenho, sem texto, e não atrapalham a leitura dos sistemas de recrutamento.
 *
 * O formato do país (ordem das seções, dados pessoais, foto, rodapé, idioma dos
 * títulos) chega pronto em ResumePdfData; ver src/lib/resume-format.ts.
 */
import type { ReactNode } from 'react'
import type { SectionKey } from '@/lib/paises'
import type { ResumeSections, ResumeTemplate } from '@/lib/resume'
import { formatPeriod, labelsFor } from '@/lib/resume-i18n'
import { loadPdfKit, PDF_COLORS as C, safeName, saveBlob } from './pdf-kit'

export { formatPeriod, formatPeriodPart } from '@/lib/resume-i18n'

export interface ResumePdfData {
  name: string
  role?: string
  /** registro profissional, ex.: "CRBM 12345 · 1ª Região (SP)" */
  registry?: string
  /** explicação curta do registro para outros países (ex.: "Brazilian Regional Council of Biomedicine") */
  registryNote?: string
  contact: string[]
  /** dados pessoais extras permitidos no país (data de nascimento, nacionalidade…), já com rótulo */
  personal?: string[]
  /** foto em data URL (só quando o país e a pessoa querem) */
  photo?: string | null
  sections: ResumeSections
  /** ordem das seções (padrão: resumo, experiência, formação, habilidades, idiomas) */
  sectionOrder?: SectionKey[]
  /** idioma da versão: títulos das seções e datas (padrão: pt-BR) */
  language?: string
  /** modelo visual (padrão: clássico) */
  template?: ResumeTemplate
  /** texto de rodapé exigido em alguns países (ex.: autorização GDPR na Itália) */
  footerNote?: string
  /** última linha, ex.: "Berlin, 19.11.2026" (costume alemão) */
  closing?: string
}

export const TEMPLATES: {
  id: ResumeTemplate
  name: string
  description: string
  /** só aparece para países onde o formato Europass é usado */
  europassOnly?: boolean
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
  {
    id: 'europass',
    name: 'Europass',
    description: 'No estilo do modelo europeu: datas à esquerda, dados pessoais no topo.',
    europassOnly: true,
  },
]

const DEFAULT_ORDER: SectionKey[] = ['resumo', 'experiencias', 'formacao', 'habilidades', 'idiomas']

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
    photo: number
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
    photo: 66,
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
    photo: 64,
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
    photo: 52,
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
    photo: 66,
  },
  europass: {
    pad: 42,
    padTop: 38,
    size: 9.4,
    line: 1.42,
    nameFont: 'Inter',
    nameSize: 20,
    headFont: 'Inter',
    headSize: 9.4,
    headUpper: true,
    gap: 14,
    itemGap: 8,
    photo: 0,
  },
}

const TERRA_SOFT = '#F3E2D6'
const SAND = '#EADFD2'
/** azul do layout Europass */
const EP_BLUE = '#1D4E89'
const EP_LINE = '#C9D6E6'
/** largura da coluna de datas no Europass */
const EP_LEFT = 104

export async function buildResumePdf(data: ResumePdfData): Promise<Blob> {
  const { Document, Page, Text, View, Image, StyleSheet, pdf } = await loadPdfKit()
  const sx = data.sections
  const t: ResumeTemplate = data.template ?? 'classico'
  const L = LOOK[t]
  const lang = data.language ?? 'pt-BR'
  const labels = labelsFor(lang)
  const order = data.sectionOrder ?? DEFAULT_ORDER
  const europass = t === 'europass'

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
      color: t === 'moderno' ? '#FFFFFF' : europass ? EP_BLUE : C.ink,
    },
    role: {
      marginTop: 2,
      fontSize: L.size + 1.2,
      lineHeight: 1.35,
      color: t === 'moderno' ? '#FBEDE3' : C.muted,
    },
    note: {
      marginTop: 1,
      fontSize: L.size - 1,
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
      paddingBottom: t === 'classico' || europass ? 3 : 0,
      borderBottomWidth: t === 'classico' || t === 'compacto' || europass ? 1 : 0,
      borderBottomColor: europass ? EP_LINE : C.line,
      fontFamily: L.headFont,
      fontWeight: 500,
      fontSize: L.headSize,
      letterSpacing: L.headUpper ? 1.1 : 0,
      color: t === 'moderno' ? C.terra : europass ? EP_BLUE : C.ink,
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

  // ---------------------------------------------------------------- títulos
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

  /** no Europass, o conteúdo fica à direita da coluna de datas */
  const body = (children: ReactNode) => (europass ? <View style={{ marginLeft: EP_LEFT + 12 }}>{children}</View> : children)

  const section = (label: string, content: ReactNode) => (
    <View>
      {heading(label)}
      {content}
    </View>
  )

  // ---------------------------------------------------------------- seções
  const experiences = () =>
    sx.experiencias?.length
      ? section(
          labels.sections.experiencias,
          sx.experiencias.map((e, i) => {
            const period = formatPeriod(e.inicio, e.fim, lang)
            const title = [e.cargo, e.empresa].filter(Boolean).join(' · ')
            if (europass) {
              return (
                <View key={i} style={[s.item, { flexDirection: 'row' }]} wrap={false}>
                  <Text style={[s.muted, { width: EP_LEFT, textAlign: 'right', marginRight: 12 }]}>{period}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.strong, { color: EP_BLUE }]}>{e.cargo}</Text>
                    {e.empresa || e.local ? <Text>{[e.empresa, e.local].filter(Boolean).join(' · ')}</Text> : null}
                    {e.descricao ? <Text style={{ marginTop: 2 }}>{e.descricao}</Text> : null}
                  </View>
                </View>
              )
            }
            return (
              <View key={i} style={s.item} wrap={false}>
                <View style={s.itemHead}>
                  <Text style={[s.strong, { flexShrink: 1 }]}>{title}</Text>
                  <Text style={s.muted}>{period}</Text>
                </View>
                {e.local ? <Text style={s.muted}>{e.local}</Text> : null}
                {e.descricao ? <Text style={{ marginTop: 2 }}>{e.descricao}</Text> : null}
              </View>
            )
          }),
        )
      : null

  const education = () =>
    sx.formacao?.length || sx.cursos?.length
      ? section(
          labels.sections.formacao,
          <>
            {sx.formacao?.map((f, i) => {
              const period = formatPeriod(f.inicio, f.fim ?? undefined, lang)
              if (europass) {
                return (
                  <View key={`f${i}`} style={{ flexDirection: 'row', marginBottom: 4 }} wrap={false}>
                    <Text style={[s.muted, { width: EP_LEFT, textAlign: 'right', marginRight: 12 }]}>{period}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.strong, { color: EP_BLUE }]}>{f.curso}</Text>
                      {f.instituicao ? <Text>{f.instituicao}</Text> : null}
                    </View>
                  </View>
                )
              }
              return (
                <View key={`f${i}`} style={[s.itemHead, { marginBottom: 2 }]}>
                  <Text style={{ flexShrink: 1 }}>
                    <Text style={s.strong}>{f.curso}</Text>
                    {f.instituicao ? ` · ${f.instituicao}` : ''}
                  </Text>
                  <Text style={s.muted}>{period}</Text>
                </View>
              )
            })}
            {sx.cursos?.length
              ? body(
                  <View style={{ marginTop: europass ? 2 : 0 }}>
                    {sx.cursos.map((c, i) => (
                      <Text key={`c${i}`}>{c}</Text>
                    ))}
                  </View>,
                )
              : null}
          </>,
        )
      : null

  const render: Record<SectionKey, () => ReactNode> = {
    resumo: () => (sx.resumo ? section(labels.sections.resumo, body(<Text>{sx.resumo}</Text>)) : null),
    experiencias: experiences,
    formacao: education,
    habilidades: () => (sx.habilidades?.length ? section(labels.sections.habilidades, body(<Text>{sx.habilidades.join(' · ')}</Text>)) : null),
    idiomas: () =>
      sx.idiomas?.length
        ? section(
            labels.sections.idiomas,
            body(
              europass ? (
                // um idioma por linha, como no Europass
                <View>
                  {sx.idiomas.map((l, i) => (
                    <Text key={i}>{l}</Text>
                  ))}
                </View>
              ) : (
                <Text>{sx.idiomas.join(' · ')}</Text>
              ),
            ),
          )
        : null,
  }

  // ---------------------------------------------------------------- topo
  const subtitle = [data.role, data.registry].filter(Boolean).join('  ·  ')
  const personal = data.personal?.length ? data.personal : null
  const photoStyle = {
    width: L.photo,
    height: L.photo,
    borderRadius: L.photo / 2,
    objectFit: 'cover' as const,
  }

  // "flex: 1" só ao lado da foto (numa linha); sozinho, numa coluna, ele achataria o topo
  const headerText = (sep: string) => (
    <View style={data.photo ? { flex: 1 } : {}}>
      <Text style={s.name}>{data.name}</Text>
      {subtitle ? <Text style={s.role}>{subtitle}</Text> : null}
      {data.registryNote ? <Text style={s.note}>{data.registryNote}</Text> : null}
      {data.contact.length ? <Text style={s.contact}>{data.contact.join(sep)}</Text> : null}
      {personal ? <Text style={[s.contact, { marginTop: 2 }]}>{personal.join(sep)}</Text> : null}
    </View>
  )

  // foto: à direita (ou à esquerda no Geométrico, cujas formas ocupam o canto direito)
  const withPhoto = (text: ReactNode, left = false) =>
    data.photo ? (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
        {left ? <Image src={data.photo} style={photoStyle} /> : null}
        {text}
        {!left ? <Image src={data.photo} style={photoStyle} /> : null}
      </View>
    ) : (
      text
    )

  let header: ReactNode
  if (t === 'moderno') {
    // faixa de cor de ponta a ponta no topo
    header = (
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
        {withPhoto(headerText('   ·   '))}
      </View>
    )
  } else if (europass) {
    // Europass: foto retangular à esquerda, um dado por linha
    header = (
      <View>
        <View style={{ flexDirection: 'row', gap: 16 }}>
          {data.photo ? <Image src={data.photo} style={{ width: 72, height: 90, objectFit: 'cover' }} /> : null}
          <View style={{ flex: 1 }}>
            <Text style={s.name}>{data.name}</Text>
            {subtitle ? <Text style={s.role}>{subtitle}</Text> : null}
            {data.registryNote ? <Text style={s.note}>{data.registryNote}</Text> : null}
            <View style={{ marginTop: 6 }}>
              {[...data.contact, ...(personal ?? [])].map((line, i) => (
                <Text key={i} style={{ fontSize: L.size - 0.6, color: C.ink }}>
                  {line}
                </Text>
              ))}
            </View>
          </View>
        </View>
        <View style={{ marginTop: 10, height: 2, backgroundColor: EP_BLUE }} />
      </View>
    )
  } else {
    header = (
      <View>
        {withPhoto(headerText(t === 'compacto' ? '  ·  ' : '   ·   '), t === 'geometrico')}
        {t === 'classico' ? <View style={s.rule} /> : null}
        {t === 'compacto' ? <View style={{ marginTop: 8, height: 1.5, backgroundColor: C.terra }} /> : null}
      </View>
    )
  }

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
    <Document title={`${labels.docTitle} — ${data.name}`} author={data.name} language={lang}>
      <Page size="A4" style={s.page}>
        {shapes}
        {header}

        {order.map((key) => (
          <View key={key}>{render[key]()}</View>
        ))}

        {data.closing ? body(<Text style={{ marginTop: 22 }}>{data.closing}</Text>) : null}

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

export function resumeFileName(name: string, company?: string | null, lang?: string) {
  return safeName(labelsFor(lang).docTitle, name, company)
}
