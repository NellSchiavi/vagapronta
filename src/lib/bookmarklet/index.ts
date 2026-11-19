/**
 * Botão de favoritos "Enviar para o VagaPronta" (o código está em enviar-vaga.js,
 * importado como texto para não passar pela compilação).
 */
import source from './enviar-vaga.js?raw'

/** Código enxuto: sem comentários nem recuo (cabe com folga num favorito) */
export function compactSource(src = source) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .join('\n')
}

/** Endereço do app onde o favorito vai abrir Adaptar (o deste navegador, sem o "#…") */
export function appBaseUrl() {
  return window.location.href.split('#')[0]
}

/** O "endereço" do favorito: javascript:(função)("https://…/vagapronta/") */
export function bookmarkletHref(appUrl = appBaseUrl()) {
  return 'javascript:' + encodeURIComponent(`(${compactSource()})(${JSON.stringify(appUrl)});void 0`)
}

/** Monta o texto do anúncio que chega pelo botão (título e empresa no começo) */
export function textFromBookmarklet(p: { titulo?: string | null; empresa?: string | null; texto?: string | null }) {
  const body = (p.texto ?? '').trim()
  const head = [p.titulo, p.empresa].map((s) => (s ?? '').trim()).filter((s) => s && !body.slice(0, 300).includes(s))
  return [...head, body].filter(Boolean).join('\n')
}
