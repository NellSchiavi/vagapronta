# VagaPronta

App pessoal de busca de emprego: analise o currículo, adapte para cada vaga, gere cartas de apresentação e acompanhe as candidaturas num só lugar.

> O passo a passo completo de configuração (Supabase, LinkedIn, Gemini, Adzuna e GitHub Pages) será adicionado aqui ao longo do desenvolvimento.

## Rodar localmente

Pré-requisitos: [Node.js](https://nodejs.org/) 20 ou mais recente e o [Docker Desktop](https://www.docker.com/products/docker-desktop/) aberto.

```bash
npm install
npx supabase start      # sobe o Supabase local (a 1ª vez baixa as imagens e demora)
```

No fim, o comando mostra a **API URL** e a **anon key** (ou "Publishable key").
Copie `.env.example` para `.env.local` e cole esses dois valores. Depois:

```bash
npm run dev
```

Abra http://localhost:5173 no navegador.

- **E-mails de acesso (magic link):** no ambiente local, nenhum e-mail sai de verdade. Eles aparecem em http://127.0.0.1:54324.
- **Painel do banco local (Studio):** http://127.0.0.1:54323
- **Recriar o banco do zero** (roda as migrations e o seed de novo): `npx supabase db reset`
- **Desligar:** `npx supabase stop`

O login com LinkedIn só funciona depois de configurado (veja a seção do LinkedIn, mais abaixo). Até lá, use "Entrar com e-mail".

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
