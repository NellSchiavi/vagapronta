#!/usr/bin/env node
/** Instala os hooks do git que rodam as checagens antes de cada commit (npm run hooks:instalar). */
import { writeFileSync, chmodSync } from 'node:fs'

const hooks = {
  'pre-commit':
    '#!/bin/sh\n# Bloqueia o commit se houver chave de API ou termo não permitido nos arquivos preparados.\n' +
    'node scripts/checar-segredos.mjs || exit 1\nnode scripts/checar-termos.mjs || exit 1\n',
  'commit-msg':
    '#!/bin/sh\n# Bloqueia o commit se a mensagem tiver termo não permitido.\nnode scripts/checar-termos.mjs --mensagem "$1" || exit 1\n',
}
for (const [name, body] of Object.entries(hooks)) {
  writeFileSync(`.git/hooks/${name}`, body)
  try {
    chmodSync(`.git/hooks/${name}`, 0o755)
  } catch {
    /* no Windows não precisa */
  }
}
console.log('Hooks instalados: todo commit passa pela checagem de segredos e de termos não permitidos.')
