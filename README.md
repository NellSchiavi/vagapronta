# VagaPronta

App pessoal de busca de emprego: analise o currículo, adapte para cada vaga, gere cartas de apresentação e acompanhe as candidaturas num só lugar.

> O passo a passo completo de configuração (Supabase, LinkedIn, Gemini, Adzuna e GitHub Pages) será adicionado aqui ao longo do desenvolvimento.

## Rodar localmente

Pré-requisitos: [Node.js](https://nodejs.org/) 20 ou mais recente.

```bash
npm install
npm run dev
```

Abra http://localhost:5173 no navegador.

## Estrutura

```
src/
  components/
    ui/        componentes base (botão, campo, cartão, tooltip, toasts…)
    brand/     componentes da identidade (logo, rodapé, anel de nota, pílulas…)
  lib/         utilitários e tema claro/escuro
  pages/       telas
  styles/      tokens do design system (cores, fontes, raios)
```
