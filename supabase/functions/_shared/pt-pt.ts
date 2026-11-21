/**
 * Português do Brasil → de Portugal: troca de palavras comuns em currículos.
 * A IA já escreve em português de Portugal; esta lista é uma rede de segurança
 * para o que ela deixar passar. Só troca palavras inteiras e mantém a maiúscula.
 * Usada no servidor (tradução) e testada em src/lib/resume-format.test.ts.
 */
const WORDS: [string, string][] = [
  ['currículo', 'CV'],
  ['currículos', 'CV'],
  ['celular', 'telemóvel'],
  ['celulares', 'telemóveis'],
  ['equipe', 'equipa'],
  ['equipes', 'equipas'],
  ['contato', 'contacto'],
  ['contatos', 'contactos'],
  ['registro', 'registo'],
  ['registros', 'registos'],
  ['cadastro', 'registo'],
  ['usuário', 'utilizador'],
  ['usuários', 'utilizadores'],
  ['usuária', 'utilizadora'],
  ['arquivo', 'ficheiro'],
  ['arquivos', 'ficheiros'],
  ['tela', 'ecrã'],
  ['telas', 'ecrãs'],
  ['planilha', 'folha de cálculo'],
  ['planilhas', 'folhas de cálculo'],
  ['treinamento', 'formação'],
  ['treinamentos', 'formações'],
  ['gerenciamento', 'gestão'],
  ['gerenciar', 'gerir'],
  ['gerenciei', 'geri'],
  ['gerenciava', 'geria'],
  ['acadêmico', 'académico'],
  ['acadêmica', 'académica'],
  ['acadêmicos', 'académicos'],
  ['econômico', 'económico'],
  ['econômica', 'económica'],
  ['eletrônico', 'eletrónico'],
  ['eletrônica', 'eletrónica'],
  ['eletrônicos', 'eletrónicos'],
]

const MAP = new Map(WORDS.map(([br, pt]) => [br, pt]))
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
// palavra inteira, inclusive com acentos (\b não serve para "ô", "é"…)
const RE = new RegExp(`(?<![\\p{L}\\p{N}])(${WORDS.map(([br]) => escape(br)).join('|')})(?![\\p{L}\\p{N}])`, 'giu')

function keepCase(original: string, replacement: string) {
  if (replacement === 'CV') return 'CV'
  if (original === original.toUpperCase() && original.length > 1) return replacement.toUpperCase()
  if (original[0] === original[0].toUpperCase()) return replacement[0].toUpperCase() + replacement.slice(1)
  return replacement
}

/** Troca o vocabulário do Brasil pelo de Portugal num texto (lacunas [X] ficam como estão) */
export function toPortugalVocabulary(text: string): string {
  return text
    .split(/(\[[^\]\n]{0,60}\])/)
    .map((part) => (part.startsWith('[') ? part : part.replace(RE, (m) => keepCase(m, MAP.get(m.toLowerCase()) ?? m))))
    .join('')
}
