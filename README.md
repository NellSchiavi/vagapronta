# VagaPronta

App pessoal de busca de emprego: analise o currículo, adapte para cada vaga, gere cartas de apresentação e acompanhe as candidaturas num só lugar.

- **Frontend:** React + Vite + TypeScript + Tailwind, publicado no GitHub Pages.
- **Backend:** Supabase (login, banco Postgres, arquivos e funções), no plano gratuito.
- **IA:** Google Gemini, chamado só pelas funções do Supabase. A chave nunca vai para o navegador.

> Algumas seções abaixo ainda estão marcadas como **(em construção)**. Elas serão completadas ao longo do desenvolvimento.

---

## 1. Rodar no seu computador

Pré-requisitos: [Node.js](https://nodejs.org/) 20 ou mais recente e o [Docker Desktop](https://www.docker.com/products/docker-desktop/) **aberto**.

```bash
npm install
npx supabase start      # sobe o Supabase local (a 1ª vez baixa as imagens e demora)
```

No fim, o comando mostra a **API URL** e a **Publishable key** (ou "anon key").
Copie `.env.example` para `.env.local` e cole esses dois valores. Depois:

```bash
npm run dev
```

Abra http://localhost:5173 no navegador.

| O quê | Onde |
| --- | --- |
| App | http://localhost:5173 |
| E-mails de acesso (nenhum e-mail sai de verdade no ambiente local) | http://127.0.0.1:54324 |
| Painel do banco local (Studio) | http://127.0.0.1:54323 |

Comandos úteis:

- `npx supabase db reset`: recria o banco do zero (migrations e dados de exemplo).
- `npx supabase stop`: desliga o Supabase local.
- `npm run db:types`: atualiza os tipos TypeScript depois de mudar o banco.

O login com LinkedIn só funciona depois de configurado (seção 4). Até lá, use "Entrar com e-mail".

### IA no ambiente local

As ações de IA (organizar e analisar o currículo, adaptar à vaga, cartas) rodam nas **Edge Functions** do Supabase, em `supabase/functions/`. Os secrets locais ficam em `supabase/functions/.env`. Esse arquivo não vai para o git, e o modelo dele é `supabase/functions/.env.example`.

- **Sem chave (modo de exemplo):** `AI_PROVIDER=mock`. As funções devolvem respostas de exemplo depois de um segundo. Serve para testar as telas sem gastar a cota.
- **Com a IA de verdade:** crie a chave grátis do Gemini (veja a seção 6) e use:
  ```
  AI_PROVIDER=gemini
  GEMINI_API_KEY=sua-chave
  ```

Depois de mudar o `.env` ou criar uma função nova, reinicie: `npx supabase stop` e `npx supabase start`. Mudanças no código de uma função que já existe recarregam sozinhas.

Cada pessoa pode usar a IA até `AI_DAILY_LIMIT` vezes por dia (padrão: 40). Depois disso, o app mostra um aviso amigável e libera de novo no dia seguinte.

### Dados de exemplo (seed)

O arquivo `supabase/seed.sql` cria dois usuários com as telas já preenchidas (vagas, candidaturas, notas e cartas):

| Usuário | E-mail | Perfil |
| --- | --- | --- |
| Nelson | `nelson@exemplo.com` | Desenvolvedor front-end |
| Esposa | `esposa@exemplo.com` | Analista de RH |

Para entrar com um deles, clique em **Entrar com e-mail**, digite o e-mail acima e abra a mensagem em http://127.0.0.1:54324 (clique no botão ou digite o código).

O seed **só existe no ambiente local**. Ele roda no primeiro `npx supabase start` e a cada `npx supabase db reset`, e **não é enviado** ao projeto na nuvem pelo `supabase db push`.

**Como apagar os dados de exemplo:**

- **Só os dois usuários de exemplo, mantendo os seus:** abra o Studio (http://127.0.0.1:54323) → **SQL Editor**, cole o conteúdo de `supabase/apagar_seed.sql` e clique em **Run**. Isso apaga os dois e tudo o que é deles.
- **Recomeçar com o banco vazio, sem nenhum dado de exemplo:** em `supabase/config.toml`, mude `[db.seed]` → `enabled = false` e rode `npx supabase db reset`. Para voltar a ter os exemplos, mude de novo para `true` e rode o reset.

### Testar no celular (Wi-Fi de casa)

Dá para abrir o app que está rodando no seu computador pelo celular, desde que os dois estejam **no mesmo Wi-Fi**.

**1. Deixe o Wi-Fi de casa como rede "Privada" no Windows (só uma vez)**

O Windows bloqueia conexões vindas de redes "Públicas". Para conferir:
**Configurações → Rede e Internet → Wi-Fi → (nome da sua rede) → Tipo de perfil de rede → Rede privada.**
Faça isso **só para o Wi-Fi de casa**, nunca para Wi-Fi de café, hotel ou aeroporto.

**2. Confira o `.env.local`**

Ele precisa ter esta linha (já está no `.env.example`):

```
VITE_SUPABASE_URL_REDE=auto
```

Com ela, quando o app é aberto pelo IP do PC, ele fala com o Supabase por esse mesmo IP, e não pelo `127.0.0.1` (que, no celular, seria o próprio celular). No PC, em `localhost`, nada muda.

**3. Suba o app aberto para a rede**

Feche o `npm run dev`, se estiver aberto, e rode:

```bash
npm run dev:rede
```

O terminal mostra um quadro como este:

```
📱 Abra no celular:        http://192.168.15.162:5173
✉️  Códigos de acesso (PC): http://192.168.15.162:54324
```

**4. Permissão do Firewall do Windows**

Na primeira vez, o Windows pode abrir a janela **"O Firewall do Windows Defender bloqueou alguns recursos deste aplicativo"** para o **Node.js** (o servidor do app) e, talvez, para o **Docker Desktop Backend** (Supabase e Mailpit).
Em cada uma, marque **somente "Redes privadas"**, deixe **"Redes públicas" desmarcado** e clique em **Permitir acesso**.

Se a janela não aparecer e o celular não abrir o app, veja em **Segurança do Windows → Firewall e proteção de rede → Permitir um aplicativo pelo firewall** se "Node.js JavaScript Runtime" e "Docker Desktop Backend" estão marcados na coluna **Privada**.
Em computador da empresa, o firewall pode ser controlado pela TI. Nesse caso, a liberação talvez não seja possível.

**5. Entrar no celular**

1. No celular, abra o endereço "📱 Abra no celular".
2. Toque em **Entrar com e-mail**, digite o e-mail e toque em **Enviar link de acesso**.
3. No **computador**, abra o endereço "✉️ Códigos de acesso", clique no e-mail mais recente e veja o **código de 6 dígitos**.
4. Digite o código no celular, no campo **"Abriu o e-mail em outro aparelho?"**.

O **link** do e-mail não funciona no celular nesse modo de teste (ele aponta para o computador). Use sempre o código.

**Problemas comuns**

- **A página não abre no celular:** confira se o celular está no mesmo Wi-Fi (e não nos dados móveis), se a rede está como Privada e se o Firewall liberou o Node.js. Se o PC tiver VPN ligada, desligue-a.
- **Abre, mas fica carregando ou diz "Sem conexão com o servidor":** o celular não está alcançando o Supabase (porta 54321). Libere o Docker Desktop Backend no Firewall (rede privada).
- **O IP mudou:** o roteador às vezes troca o IP do PC. É só rodar `npm run dev:rede` de novo e usar o endereço novo.

---

## 2. Criar o projeto no Supabase (em construção)

## 3. Login por e-mail na nuvem

### 3.1 URLs do app (obrigatório)

No painel do Supabase: **Authentication → URL Configuration**

- **Site URL:** `https://nellschiavi.github.io/vagapronta/`
- **Redirect URLs** (botão "Add URL"), adicione as duas:
  - `https://nellschiavi.github.io/vagapronta/`
  - `http://localhost:5173/`

Sem isso, o link do e-mail e o retorno do LinkedIn mandam a pessoa para o endereço errado.

### 3.2 E-mail próprio (SMTP), muito recomendado

O envio de e-mails que vem com o Supabase é só para testes. Ele manda **poucos e-mails por hora** e pode **não entregar para endereços de fora da organização** do projeto, ou seja, sua esposa pode não receber o link. Configure um SMTP próprio em **Authentication → SMTP Settings** → ative **Enable Custom SMTP**.

#### Opção A: Gmail com senha de app (mais simples, sem domínio próprio)

1. Use uma conta Gmail. Pode ser uma criada só para o app, como `vagapronta.app@gmail.com`.
2. Ative a **verificação em duas etapas** em https://myaccount.google.com/security. Ela é obrigatória para a próxima etapa.
3. Abra https://myaccount.google.com/apppasswords, crie uma senha com o nome "VagaPronta" e **copie os 16 caracteres** (sem os espaços).
4. No Supabase (SMTP Settings), preencha:

   | Campo | Valor |
   | --- | --- |
   | Sender email | o seu Gmail (o mesmo do usuário) |
   | Sender name | `VagaPronta` |
   | Host | `smtp.gmail.com` |
   | Port number | `465` |
   | Username | o seu Gmail completo |
   | Password | a senha de app de 16 caracteres |

5. Clique em **Save**. O Gmail aceita cerca de 500 e-mails por dia, bem mais do que o app precisa.

#### Opção B: Resend (plano grátis, exige um domínio seu)

O Resend é um serviço de e-mail com plano grátis de 3.000 e-mails por mês. **Atenção:** para enviar a outras pessoas, ele exige que você tenha um **domínio próprio** (por exemplo, `seusite.com.br`). Sem domínio, ele só envia para o seu próprio e-mail. Nesse caso, use a opção A.

1. Crie a conta em https://resend.com.
2. Vá em **Domains → Add Domain**, digite seu domínio e copie os registros DNS que ele mostra (TXT e MX) para o painel onde o domínio foi comprado (Registro.br, Hostinger…). Espere o status ficar **Verified**.
3. Vá em **API Keys → Create API Key**, com a permissão **Sending access**, e copie a chave (começa com `re_`).
4. No Supabase (SMTP Settings):

   | Campo | Valor |
   | --- | --- |
   | Sender email | `nao-responda@seudominio.com.br` |
   | Sender name | `VagaPronta` |
   | Host | `smtp.resend.com` |
   | Port number | `465` |
   | Username | `resend` |
   | Password | a chave `re_...` |

5. Clique em **Save**.

Depois de configurar o SMTP, confira em **Authentication → Rate Limits** se "Rate limit for sending emails" está em pelo menos 30 por hora.

### 3.3 Textos dos e-mails (link e código)

O app aceita tanto o **link** quanto o **código de 6 dígitos** do e-mail, que é útil quando a pessoa pede o acesso no computador e abre o e-mail no celular. Os modelos padrão do Supabase estão em inglês e não trazem o código. Para trocá-los:

1. No painel: **Authentication → Emails → Templates**.
2. **Magic Link:**
   - Subject: `Seu link de acesso ao VagaPronta`
   - Body (aba "Source"): apague tudo e cole o conteúdo de [`supabase/templates/magic_link.html`](supabase/templates/magic_link.html).
3. **Confirm signup:**
   - Subject: `Confirme seu e-mail no VagaPronta`
   - Body: cole o conteúdo de [`supabase/templates/confirm_signup.html`](supabase/templates/confirm_signup.html).
4. Clique em **Save** em cada um.

Os dois modelos usam `{{ .ConfirmationURL }}` (o link) e `{{ .Token }}` (o código). No ambiente local, eles já são aplicados automaticamente pelo `supabase/config.toml`.

## 4. Login com LinkedIn (em construção)

## 5. Banco de dados na nuvem (em construção)

## 6. Chaves do Gemini e da Adzuna

### 6.1 Gemini (IA), no nível gratuito

> ⚠️ **NÃO ATIVE O FATURAMENTO (billing).**
> O app foi feito para o **nível gratuito** do Gemini, que não pede cartão. Se você ativar o faturamento ou vincular um cartão ao projeto do Google, as chamadas além da cota gratuita **passam a ser cobradas**. Se algum dia aparecer um botão "Set up billing", "Ativar faturamento" ou "Upgrade", **não clique**.

**Criar a chave num projeto novo, sem cartão:**

1. Acesse https://aistudio.google.com e entre com uma conta Google. Pode ser uma conta só para o app.
2. No menu, abra **Get API key** (ou "Chaves de API").
3. Clique em **Create API key** e escolha **"Create API key in new project"** (criar em um projeto novo). Assim a chave fica num projeto separado, sem faturamento.
4. Copie a chave. Ela aparece uma vez só e não deve ser compartilhada nem colada em arquivos que vão para o git.
5. Confira que a coluna **"Plan"** (ou "Plano") da chave mostra **"Free"** (gratuito). Se mostrar "Paid", o projeto tem faturamento: crie outro projeto novo.

**Onde colocar a chave:**

- **Local:** em `supabase/functions/.env` (nunca no `.env.example`):
  ```
  AI_PROVIDER=gemini
  GEMINI_API_KEY=sua-chave
  ```
  Depois rode `npx supabase stop` e `npx supabase start`.
- **Nuvem:** (em construção, junto com o deploy das funções)

**Limites do nível gratuito:**

- **Pedidos por minuto e por dia:** o Google limita os dois. Quando o limite do dia acaba, o app mostra "A IA descansou por hoje. Tente de novo amanhã!". O limite por pessoa (`AI_DAILY_LIMIT`, padrão 40) existe para que vocês dois juntos não cheguem lá.
- **Horários de pico:** o Google às vezes responde "alta demanda". O app tenta de novo sozinho e, se preciso, usa outro modelo. Por isso uma análise pode levar até 1 minuto.

**Modelos:**

- **Tarefas simples (organizar o currículo):** usam um modelo "lite", que é mais leve e economiza cota.
- **Análise, adaptação e cartas:** usam o modelo "flash".
- **Troca de modelo:** as variáveis `GEMINI_MODEL` e `GEMINI_MODEL_LITE` aceitam uma lista, em ordem de preferência. Os modelos da versão 2.5 não são mais oferecidos a chaves novas.

**Privacidade:** antes de enviar o currículo para a IA, o app troca **e-mail, telefone, CPF, CEP, endereço e links pessoais** por marcadores (`[EMAIL_1]`, `[TELEFONE_1]`…). Esses dados nunca saem do servidor do app e são recolocados no resultado. Veja `supabase/functions/_shared/privacy.ts`.

### 6.2 Adzuna (vagas) (em construção)

## 7. Funções e busca diária de vagas (em construção)

## 8. Publicar no GitHub Pages (em construção)

---

## Banco de dados

Todas as tabelas têm `user_id`, `created_at`, `updated_at` e **RLS**: cada pessoa só vê e altera os próprios dados.

| Tabela | Para quê |
| --- | --- |
| `profiles` | nome, foto, cargo desejado, cidade, país do currículo e preferências |
| `resumes` | currículos e versões (a versão adaptada aponta para a vaga em `job_id`) |
| `resume_analyses` | histórico das análises: nota geral, notas por critério e sugestões |
| `jobs` | vagas sugeridas (Adzuna, Remotive) ou cadastradas à mão |
| `cover_letters` | cartas de apresentação |
| `applications` | candidaturas do kanban |
| `ai_usage` | quantas vezes cada pessoa usou a IA no dia (limite da cota gratuita) |

PDFs ficam no bucket privado `curriculos`, numa pasta com o id de cada pessoa, e são acessados por URL assinada.

As migrations estão em `supabase/migrations/`.

## Estrutura do código

```
src/
  components/
    ui/        componentes base (botão, campo, cartão, abas, tooltip, toasts…)
    brand/     identidade visual (logo, rodapé, anel de nota, pílulas…)
    resume/    envio de currículo (PDF, texto, LinkedIn)
  lib/         Supabase, login, perfil, tipos, leitura de PDF, tema
  pages/       telas
  routes/      proteção das rotas (login e onboarding)
  styles/      tokens do design system (cores, fontes, raios)
supabase/
  migrations/  estrutura do banco
  templates/   e-mails de acesso
  seed.sql     dados de exemplo (só local)
```
