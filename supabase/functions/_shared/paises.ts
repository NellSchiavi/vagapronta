/**
 * PAÍSES DO CURRÍCULO: arquivo único com as regras de cada país.
 * Usado pelo app (src/lib/paises.ts reexporta este arquivo) e pela IA
 * (Edge Functions), então qualquer país novo entra aqui uma vez só.
 *
 * Para incluir um país: adicione um item em PAISES (código ISO de 2 letras)
 * e o código na lista da restrição do banco (migration *_paises_curriculo.sql).
 *
 * Fontes consultadas (nov/2026): guias de carreira e recrutamento sobre CV na
 * Europa, Suíça e Itália. Onde as fontes divergem, usamos a opção mais segura
 * (ex.: Holanda: foto opcional, poucos dados pessoais). Um anúncio de vaga que
 * peça outra coisa sempre vale mais que estas regras gerais.
 */

export type CountryCode =
  | 'BR' | 'EU' | 'US' | 'PT'
  | 'IT' | 'ES' | 'FR' | 'DE' | 'CH' | 'IE' | 'GB' | 'NL' | 'BE'
  | 'CA'

export type CountryGroup = 'Europa' | 'Américas'
export type PhotoRule = 'nao' | 'opcional' | 'comum'

export interface Language {
  code: string
  label: string
}

export interface CountryInfo {
  code: CountryCode
  name: string
  /** aparece nos 4 cartões em destaque */
  featured: boolean
  /** grupo na lista "Outro país" (Brasil e Europass ficam só nos destaques) */
  group?: CountryGroup
  /** resumo curto exibido no cartão */
  summary: string
  photo: PhotoRule
  /** o que incluir e o que evitar nos dados pessoais */
  personalData: string
  length: string
  /** idiomas recomendados, do mais indicado para o menos */
  languages: Language[]
  /** costumes e dicas práticas */
  customs: string[]
  /** o formato Europass é comum/aceito ali (oferecer o layout Europass na exportação) */
  europass: boolean
  /** texto obrigatório ou costumeiro no rodapé do currículo */
  footer?: { language: string; text: string }
}

const L = {
  pt: { code: 'pt-BR', label: 'Português (Brasil)' },
  ptPT: { code: 'pt-PT', label: 'Português (Portugal)' },
  en: { code: 'en', label: 'Inglês' },
  it: { code: 'it', label: 'Italiano' },
  es: { code: 'es', label: 'Espanhol' },
  fr: { code: 'fr', label: 'Francês' },
  de: { code: 'de', label: 'Alemão' },
  nl: { code: 'nl', label: 'Holandês' },
} satisfies Record<string, Language>

export const PAISES: CountryInfo[] = [
  // ---------------------------------------------------------------- destaques
  {
    code: 'BR',
    name: 'Brasil',
    featured: true,
    summary: 'Foto opcional, até 2 páginas, contato e cidade no topo.',
    photo: 'opcional',
    personalData: 'Nome, cidade/UF, telefone, e-mail e LinkedIn. Não coloque CPF, RG, estado civil ou endereço completo.',
    length: 'Até 2 páginas (1 página no início de carreira).',
    languages: [L.pt],
    customs: [
      'Comece com um resumo de 3 a 4 linhas.',
      'Experiências da mais recente para a mais antiga.',
      'Pretensão salarial só quando o anúncio pedir.',
    ],
    europass: false,
  },
  {
    code: 'EU',
    name: 'Europa (Europass)',
    featured: true,
    summary: 'Modelo oficial da União Europeia, aceito em todo o bloco.',
    photo: 'opcional',
    personalData: 'Nome, contato, cidade e país. Data de nascimento e nacionalidade são opcionais no Europass.',
    length: 'Até 2 ou 3 páginas.',
    languages: [L.en, L.es, L.fr, L.de, L.it, L.ptPT],
    customs: [
      'Use o idioma da vaga; o inglês é aceito em muitas empresas.',
      'Informe o nível dos idiomas pelo Quadro Europeu (A1 a C2).',
      'Indique se você tem autorização de trabalho na UE (ex.: cidadania europeia).',
    ],
    europass: true,
  },
  {
    code: 'US',
    name: 'Estados Unidos',
    featured: true,
    group: 'Américas',
    summary: 'Sem foto, idade ou estado civil. Uma página, direto ao ponto.',
    photo: 'nao',
    personalData: 'Só nome, cidade/estado, telefone, e-mail e LinkedIn. Nunca foto, idade, data de nascimento, estado civil ou nacionalidade.',
    length: '1 página (2 só com muitos anos de experiência).',
    languages: [L.en],
    customs: [
      'Chama-se "resume". Use verbos de ação e resultados com números.',
      'Datas no formato mês/ano (ex.: Mar 2021 – Present).',
      'Não inclua "references available upon request".',
    ],
    europass: false,
  },
  {
    code: 'PT',
    name: 'Portugal',
    featured: true,
    group: 'Europa',
    summary: 'Europass muito usado, foto comum, português de Portugal.',
    photo: 'comum',
    personalData: 'Nome, contacto, localidade; data de nascimento e nacionalidade são comuns.',
    length: 'Até 2 páginas.',
    languages: [L.ptPT, L.en],
    customs: [
      'O Europass é muito conhecido, principalmente no setor público.',
      'Revise termos do português do Brasil (ex.: "celular" → "telemóvel", "equipe" → "equipa").',
      'Mencione a situação de autorização de residência/trabalho, se tiver.',
    ],
    europass: true,
  },

  // ------------------------------------------------------------------- Europa
  {
    code: 'IT',
    name: 'Itália',
    featured: false,
    group: 'Europa',
    summary: 'Europass comum, foto comum e autorização de dados no rodapé.',
    photo: 'comum',
    personalData: 'Nome, contato, cidade; data de nascimento e nacionalidade são comuns.',
    length: 'Até 2 páginas.',
    languages: [L.it, L.en],
    customs: [
      'O formato Europass é muito usado.',
      'Inclua no rodapé a autorização de tratamento de dados pessoais (GDPR), em italiano.',
      'Para concursos públicos, siga o modelo pedido no edital.',
    ],
    europass: true,
    footer: {
      language: 'it',
      text:
        'Autorizzo il trattamento dei miei dati personali contenuti nel presente curriculum vitae ai sensi del D.Lgs. 196/2003, ' +
        'come modificato dal D.Lgs. 101/2018, e del Regolamento UE 2016/679 (GDPR), ai fini della ricerca e selezione del personale.',
    },
  },
  {
    code: 'ES',
    name: 'Espanha',
    featured: false,
    group: 'Europa',
    summary: 'Foto e data de nascimento ainda são comuns.',
    photo: 'comum',
    personalData: 'Nome, contato, cidade; data de nascimento é comum. Evite documento (DNI/NIE) e estado civil.',
    length: '1 a 2 páginas.',
    languages: [L.es, L.en],
    customs: ['Europass é aceito, mas um CV próprio e objetivo costuma causar melhor impressão.', 'Destaque o nível de espanhol.'],
    europass: true,
  },
  {
    code: 'FR',
    name: 'França',
    featured: false,
    group: 'Europa',
    summary: '1 página, foto comum, em francês.',
    photo: 'comum',
    personalData: 'Nome, contato, cidade; idade é comum. Estado civil é opcional.',
    length: '1 página (2 com muita experiência).',
    languages: [L.fr, L.en],
    customs: ['Comece com um título claro do cargo desejado.', 'A carta de motivação ("lettre de motivation") pesa bastante.'],
    europass: true,
  },
  {
    code: 'DE',
    name: 'Alemanha',
    featured: false,
    group: 'Europa',
    summary: 'Lebenslauf: foto profissional e data de nascimento são comuns.',
    photo: 'comum',
    personalData: 'Nome, contato, cidade; data de nascimento e nacionalidade são comuns. A foto é opcional por lei, mas esperada.',
    length: 'Até 2 páginas.',
    languages: [L.de, L.en],
    customs: [
      'Ordem cronológica inversa, com mês e ano em todas as datas.',
      'Costuma terminar com cidade, data e assinatura.',
      'Explique lacunas no currículo.',
    ],
    europass: true,
  },
  {
    code: 'CH',
    name: 'Suíça',
    featured: false,
    group: 'Europa',
    summary: 'Foto, nacionalidade e permissão de trabalho. Até 2 páginas.',
    photo: 'comum',
    personalData:
      'Nome, contato, cidade, nacionalidade. Se tiver permissão de trabalho suíça, informe o tipo (ex.: permis B); se não tiver, informe só a nacionalidade.',
    length: 'Até 2 páginas.',
    languages: [L.de, L.fr, L.it, L.en],
    customs: [
      'Use o idioma da região: alemão (Zurique, Basileia), francês (Genebra, Lausanne) ou italiano (Ticino).',
      'Foto é padrão na parte alemã e opcional na francesa.',
      'Certificados de trabalho e diplomas costumam ir junto.',
    ],
    europass: false,
  },
  {
    code: 'IE',
    name: 'Irlanda',
    featured: false,
    group: 'Europa',
    summary: 'Sem foto e sem data de nascimento. Até 2 páginas.',
    photo: 'nao',
    personalData: 'Só nome, contato e cidade. Sem foto, data de nascimento, estado civil ou nacionalidade. Informe o visto/permissão, se precisar.',
    length: 'Até 2 páginas.',
    languages: [L.en],
    customs: ['Use inglês britânico (organise, CV).', 'Destaque resultados e responsabilidades com verbos de ação.'],
    europass: false,
  },
  {
    code: 'GB',
    name: 'Reino Unido',
    featured: false,
    group: 'Europa',
    summary: 'Sem foto e sem data de nascimento. Até 2 páginas.',
    photo: 'nao',
    personalData: 'Só nome, contato e cidade. Sem foto, data de nascimento, idade, estado civil ou nacionalidade (leis de igualdade).',
    length: 'Até 2 páginas.',
    languages: [L.en],
    customs: [
      'Use inglês britânico (organise, CV).',
      'Comece com um "personal profile" curto.',
      'Informe o direito de trabalhar no Reino Unido (visto), se for o caso.',
    ],
    europass: false,
  },
  {
    code: 'NL',
    name: 'Países Baixos',
    featured: false,
    group: 'Europa',
    summary: 'Direto e curto. Foto opcional, poucos dados pessoais.',
    photo: 'opcional',
    personalData: 'Nome, contato e cidade. Evite data de nascimento, estado civil e nacionalidade.',
    length: '1 a 2 páginas.',
    languages: [L.en, L.nl],
    customs: ['O inglês é muito aceito, principalmente em empresas internacionais.', 'Estilo objetivo, sem exageros.'],
    europass: true,
  },
  {
    code: 'BE',
    name: 'Bélgica',
    featured: false,
    group: 'Europa',
    summary: 'Europass aceito; idioma depende da região.',
    photo: 'opcional',
    personalData: 'Nome, contato, cidade; data de nascimento e nacionalidade são comuns.',
    length: 'Até 2 páginas.',
    languages: [L.fr, L.nl, L.en],
    customs: [
      'Use francês (Bruxelas, Valônia) ou holandês (Flandres); inglês em empresas internacionais.',
      'Mencione todos os idiomas que você fala, com o nível.',
    ],
    europass: true,
  },

  // ----------------------------------------------------------------- Américas
  {
    code: 'CA',
    name: 'Canadá',
    featured: false,
    group: 'Américas',
    summary: 'Sem foto, idade ou estado civil. 1 a 2 páginas.',
    photo: 'nao',
    personalData: 'Só nome, cidade/província, telefone, e-mail e LinkedIn. Nunca foto, idade, estado civil ou nacionalidade.',
    length: '1 a 2 páginas.',
    languages: [L.en, L.fr],
    customs: ['Em Quebec, use francês.', 'Informe se você tem permissão de trabalho no Canadá.', 'Use resultados com números.'],
    europass: false,
  },
]

export const COUNTRY_CODES = PAISES.map((p) => p.code)
export const FEATURED = PAISES.filter((p) => p.featured)
export const COUNTRY_GROUPS: CountryGroup[] = ['Europa', 'Américas']

export function countryInfo(code: string | null | undefined): CountryInfo {
  return PAISES.find((p) => p.code === code) ?? PAISES[0]
}

export const countryName = (code: string | null | undefined) => countryInfo(code).name

const PHOTO_TEXT: Record<PhotoRule, string> = {
  nao: 'NÃO usar foto',
  opcional: 'foto opcional',
  comum: 'foto profissional é comum',
}

/** Regras do país em texto, para os prompts da IA */
export function promptRules(code: string | null | undefined): string {
  const c = countryInfo(code)
  return [
    `${c.name}: ${PHOTO_TEXT[c.photo]}.`,
    `Dados pessoais: ${c.personalData}`,
    `Tamanho: ${c.length}`,
    `Idiomas recomendados: ${c.languages.map((l) => l.label).join(', ')}.`,
    ...c.customs,
    c.europass ? 'O formato Europass é comum/aceito.' : '',
    c.footer ? `Incluir no rodapé (em ${c.footer.language}): "${c.footer.text}"` : '',
  ]
    .filter(Boolean)
    .join(' ')
}
