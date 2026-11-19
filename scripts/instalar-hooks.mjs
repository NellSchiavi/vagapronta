#!/usr/bin/env node
/** Instala o hook pre-commit que roda a checagem de segredos (npm run hooks:instalar). */
import { writeFileSync, chmodSync } from 'node:fs'

const hook = '#!/bin/sh\n# Bloqueia o commit se houver algo parecido com chave de API nos arquivos preparados.\nnode scripts/checar-segredos.mjs || exit 1\n'
writeFileSync('.git/hooks/pre-commit', hook)
try {
  chmodSync('.git/hooks/pre-commit', 0o755)
} catch {
  /* no Windows não precisa */
}
console.log('Hook pre-commit instalado: todo commit passa pela checagem de segredos.')
