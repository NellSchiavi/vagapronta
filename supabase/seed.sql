-- =====================================================================
-- VagaPronta · dados de exemplo (SÓ PARA O AMBIENTE LOCAL)
--
-- Cria dois usuários com telas preenchidas:
--   nelson@exemplo.com   e   esposa@exemplo.com
-- Para entrar: tela de login → "Entrar com e-mail" → abra o e-mail em
-- http://127.0.0.1:54324 e clique no link (ou digite o código).
--
-- Este arquivo roda em "npx supabase start" (1ª vez) e "npx supabase db reset".
-- Ele NÃO é enviado ao projeto na nuvem pelo "supabase db push".
-- Para apagar só estes dados: rode supabase/apagar_seed.sql (veja o README).
-- =====================================================================

-- datas relativas (current_date) no horário de Brasília, não em UTC
set time zone 'America/Sao_Paulo';

-- ---------------------------------------------------------------------
-- Usuários (o perfil é criado pelo gatilho handle_new_user)
-- ---------------------------------------------------------------------
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change, email_change_token_new
) values
  ('00000000-0000-0000-0000-000000000000', '5eed0000-0000-4000-8000-00000000000a', 'authenticated', 'authenticated',
   'nelson@exemplo.com', '', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Nelson"}',
   now() - interval '30 days', now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '5eed0000-0000-4000-8000-00000000000b', 'authenticated', 'authenticated',
   'esposa@exemplo.com', '', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Esposa"}',
   now() - interval '30 days', now(), '', '', '', '');

insert into auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at) values
  (gen_random_uuid(), '5eed0000-0000-4000-8000-00000000000a', '5eed0000-0000-4000-8000-00000000000a', 'email',
   '{"sub":"5eed0000-0000-4000-8000-00000000000a","email":"nelson@exemplo.com","email_verified":true}', now(), now(), now()),
  (gen_random_uuid(), '5eed0000-0000-4000-8000-00000000000b', '5eed0000-0000-4000-8000-00000000000b', 'email',
   '{"sub":"5eed0000-0000-4000-8000-00000000000b","email":"esposa@exemplo.com","email_verified":true}', now(), now(), now());

update public.profiles set
  desired_role = 'Desenvolvedor front-end',
  city = 'São Paulo, SP',
  resume_country = 'BR',
  onboarded_at = now() - interval '30 days'
where user_id = '5eed0000-0000-4000-8000-00000000000a';

update public.profiles set
  desired_role = 'Analista de RH',
  city = 'São Paulo, SP',
  resume_country = 'BR',
  onboarded_at = now() - interval '30 days'
where user_id = '5eed0000-0000-4000-8000-00000000000b';

-- =====================================================================
-- ESPOSA · Analista de RH
-- =====================================================================

-- Vagas
insert into public.jobs (id, user_id, source, external_id, title, company, location, work_mode, url, description, salary, compatibility, match_notes, status, published_at, created_at) values
  ('5eed0000-0000-4000-8000-0000000b0101', '5eed0000-0000-4000-8000-00000000000b', 'adzuna', 'demo-b-1',
   'Analista de RH jr', 'Magalu', 'São Paulo, SP', 'hibrido', 'https://exemplo.com/vagas/magalu-rh-jr',
   'Buscamos analista de RH júnior para atuar com recrutamento e seleção, integração de novos colaboradores, indicadores de RH (turnover, absenteísmo) e apoio ao departamento pessoal. Desejável experiência com ATS e Excel intermediário.',
   'R$ 4.000 a R$ 4.800', 89, '{"pontos_fortes":["Recrutamento e seleção","Integração de colaboradores"],"lacunas":["Indicadores de RH"]}', 'nova', now() - interval '6 hours', now() - interval '2 hours'),
  ('5eed0000-0000-4000-8000-0000000b0102', '5eed0000-0000-4000-8000-00000000000b', 'adzuna', 'demo-b-2',
   'Assistente de Departamento Pessoal', 'Natura', 'São Paulo, SP', 'presencial', 'https://exemplo.com/vagas/natura-dp',
   'Rotinas de departamento pessoal: admissão, férias, folha de pagamento, benefícios e eSocial.',
   'R$ 3.200', 91, '{"pontos_fortes":["Folha de pagamento","Benefícios"],"lacunas":[]}', 'nova', now() - interval '8 hours', now() - interval '2 hours'),
  ('5eed0000-0000-4000-8000-0000000b0103', '5eed0000-0000-4000-8000-00000000000b', 'adzuna', 'demo-b-3',
   'Analista de Recrutamento e Seleção jr', 'iFood', 'Osasco, SP', 'remoto', 'https://exemplo.com/vagas/ifood-rs',
   'Condução de processos seletivos de ponta a ponta, triagem de currículos, entrevistas por competências e relacionamento com gestores.',
   null, 87, '{"pontos_fortes":["Entrevistas por competências"],"lacunas":["Recrutamento de tecnologia"]}', 'nova', now() - interval '10 hours', now() - interval '2 hours'),
  ('5eed0000-0000-4000-8000-0000000b0104', '5eed0000-0000-4000-8000-00000000000b', 'remotive', 'demo-b-4',
   'HR Coordinator (LATAM)', 'Deel', 'América Latina', 'remoto', 'https://exemplo.com/vagas/deel-hr',
   'Support HR operations for LATAM employees: onboarding, documentation, benefits questions. Intermediate English required.',
   'US$ 1.800', 72, '{"pontos_fortes":["Onboarding"],"lacunas":["Inglês intermediário"]}', 'nova', now() - interval '1 day', now() - interval '1 day'),
  ('5eed0000-0000-4000-8000-0000000b0105', '5eed0000-0000-4000-8000-00000000000b', 'adzuna', 'demo-b-5',
   'Analista de Treinamento e Desenvolvimento', 'Ambev', 'São Paulo, SP', 'hibrido', 'https://exemplo.com/vagas/ambev-td',
   'Planejamento e execução de treinamentos, trilhas de desenvolvimento e avaliação de desempenho.',
   'R$ 5.000', 78, '{"pontos_fortes":["Treinamentos"],"lacunas":["Avaliação de desempenho"]}', 'salva', now() - interval '9 days', now() - interval '9 days'),
  ('5eed0000-0000-4000-8000-0000000b0106', '5eed0000-0000-4000-8000-00000000000b', 'adzuna', 'demo-b-6',
   'Analista de Gente e Gestão Pleno', 'Itaú', 'São Paulo, SP', 'presencial', 'https://exemplo.com/vagas/itau-gg',
   'Business partner de RH para áreas de negócio. Exige 5 anos de experiência.',
   null, 61, '{"pontos_fortes":[],"lacunas":["Experiência como business partner","5 anos de experiência"]}', 'descartada', now() - interval '5 days', now() - interval '5 days');

-- Currículos: principal + versão adaptada para a vaga da Magalu
insert into public.resumes (id, user_id, title, template, country, source, is_principal, job_id, content, created_at) values
  ('5eed0000-0000-4000-8000-0000000b0201', '5eed0000-0000-4000-8000-00000000000b', 'Currículo principal', 'moderno', 'BR', 'texto', true, null,
   $json${
     "raw_text": "Esposa · Analista de RH · São Paulo, SP\nAssistente de RH na Clínica Bem Viver (2021–atual)...",
     "sections": {
       "contato": { "email": "esposa@exemplo.com", "telefone": "(11) 99999-0000", "cidade": "São Paulo, SP" },
       "resumo": "Profissional de Recursos Humanos com 4 anos de experiência em recrutamento e seleção, integração de colaboradores e rotinas de departamento pessoal. Comunicativa, organizada e com foco em boa experiência do candidato.",
       "experiencias": [
         { "cargo": "Assistente de RH", "empresa": "Clínica Bem Viver", "local": "São Paulo, SP", "inicio": "2021-03", "fim": null,
           "descricao": "Conduzo processos seletivos para áreas administrativas e de saúde (cerca de 15 vagas por mês). Organizo a integração de novos colaboradores e apoio a folha de pagamento e benefícios." },
         { "cargo": "Auxiliar administrativa", "empresa": "Escritório Contábil Souza", "local": "São Paulo, SP", "inicio": "2019-01", "fim": "2021-02",
           "descricao": "Controle de documentos de admissão e demissão, atendimento a clientes e lançamentos em planilhas." }
       ],
       "formacao": [
         { "curso": "Gestão de Recursos Humanos (Tecnólogo)", "instituicao": "Universidade Paulista", "inicio": "2018", "fim": "2020" }
       ],
       "habilidades": ["Recrutamento e seleção", "Entrevista por competências", "Integração de colaboradores", "Folha de pagamento", "Excel intermediário", "Gupy"],
       "idiomas": ["Português (nativo)", "Inglês (básico)"],
       "cursos": ["Departamento Pessoal na prática — SENAC (2022)"]
     }
   }$json$, now() - interval '28 days'),
  ('5eed0000-0000-4000-8000-0000000b0202', '5eed0000-0000-4000-8000-00000000000b', 'Analista de RH jr — Magalu', 'moderno', 'BR', 'adaptacao', false, '5eed0000-0000-4000-8000-0000000b0101',
   $json${
     "raw_text": "",
     "sections": {
       "contato": { "email": "esposa@exemplo.com", "telefone": "(11) 99999-0000", "cidade": "São Paulo, SP" },
       "resumo": "Analista de RH com 4 anos de experiência em recrutamento e seleção de ponta a ponta, integração de novos colaboradores e acompanhamento de indicadores como turnover e absenteísmo. Experiência com sistemas de recrutamento (ATS) e Excel.",
       "experiencias": [
         { "cargo": "Assistente de RH", "empresa": "Clínica Bem Viver", "local": "São Paulo, SP", "inicio": "2021-03", "fim": null,
           "descricao": "Conduzo cerca de 15 processos seletivos por mês usando a Gupy (ATS). Estruturei a integração de novos colaboradores, reduzindo o turnover dos primeiros 90 dias. Acompanho indicadores de absenteísmo e apoio a folha de pagamento." },
         { "cargo": "Auxiliar administrativa", "empresa": "Escritório Contábil Souza", "local": "São Paulo, SP", "inicio": "2019-01", "fim": "2021-02",
           "descricao": "Controle de documentos de admissão e demissão e rotinas de departamento pessoal." }
       ],
       "formacao": [
         { "curso": "Gestão de Recursos Humanos (Tecnólogo)", "instituicao": "Universidade Paulista", "inicio": "2018", "fim": "2020" }
       ],
       "habilidades": ["Recrutamento e seleção", "Indicadores de RH (turnover, absenteísmo)", "Integração de colaboradores", "ATS (Gupy)", "Folha de pagamento", "Excel intermediário"],
       "idiomas": ["Português (nativo)", "Inglês (básico)"]
     }
   }$json$, now() - interval '1 day');

-- Análises: a nota foi subindo
insert into public.resume_analyses (user_id, resume_id, overall_score, scores, suggestions, summary, created_at) values
  ('5eed0000-0000-4000-8000-00000000000b', '5eed0000-0000-4000-8000-0000000b0201', 58,
   '{"ats":55,"palavras_chave":48,"estrutura":66,"clareza":63}',
   '[{"secao":"resumo","titulo":"Crie um resumo profissional","explicacao":"Um resumo de 3 linhas no topo ajuda quem lê a entender seu perfil em segundos.","antes":"","depois":"Profissional de RH com 4 anos de experiência em recrutamento e seleção...","aplicada":true}]',
   'Bom ponto de partida. Falta um resumo e palavras-chave da área.', now() - interval '20 days'),
  ('5eed0000-0000-4000-8000-00000000000b', '5eed0000-0000-4000-8000-0000000b0201', 71,
   '{"ats":70,"palavras_chave":64,"estrutura":78,"clareza":74}',
   '[{"secao":"experiencia","titulo":"Mostre resultados com números","explicacao":"Números chamam atenção: quantas vagas por mês, quanto tempo para fechar uma vaga.","antes":"Conduzo processos seletivos.","depois":"Conduzo cerca de 15 processos seletivos por mês.","aplicada":true}]',
   'Evoluiu bem! Agora vale mostrar resultados com números.', now() - interval '12 days'),
  ('5eed0000-0000-4000-8000-00000000000b', '5eed0000-0000-4000-8000-0000000b0201', 76,
   '{"ats":78,"palavras_chave":70,"estrutura":82,"clareza":77}',
   '[{"secao":"habilidades","titulo":"Inclua o nome do sistema que você usa","explicacao":"Muitas vagas pedem experiência com ATS. Citar a Gupy ajuda nos filtros.","antes":"Recrutamento e seleção","depois":"Recrutamento e seleção, ATS (Gupy)","aplicada":false},{"secao":"formacao","titulo":"Adicione cursos livres","explicacao":"Cursos recentes mostram que você continua se atualizando.","antes":"","depois":"Departamento Pessoal na prática — SENAC (2022)","aplicada":false}]',
   'Currículo claro e bem organizado. Faltam poucas palavras-chave.', now() - interval '3 days'),
  ('5eed0000-0000-4000-8000-00000000000b', '5eed0000-0000-4000-8000-0000000b0202', 89,
   '{"ats":91,"palavras_chave":88,"estrutura":86,"clareza":90}',
   '[]', 'Muito bem adaptado para a vaga da Magalu.', now() - interval '1 day');

-- Carta de apresentação
insert into public.cover_letters (id, user_id, job_id, resume_id, title, tone, content, created_at) values
  ('5eed0000-0000-4000-8000-0000000b0301', '5eed0000-0000-4000-8000-00000000000b', '5eed0000-0000-4000-8000-0000000b0101', '5eed0000-0000-4000-8000-0000000b0202',
   'Analista de RH jr — Magalu', 'caloroso',
   $txt$Olá, equipe de Gente e Gestão da Magalu!

Foi com muita alegria que encontrei a vaga de Analista de RH jr. Há quatro anos trabalho com recrutamento e seleção e sei como um bom processo faz diferença na vida de quem está procurando uma oportunidade — e na equipe que recebe essa pessoa.

Na Clínica Bem Viver, conduzo cerca de 15 processos seletivos por mês e estruturei a integração dos novos colaboradores, o que ajudou a reduzir as saídas nos primeiros 90 dias. Também acompanho indicadores como turnover e absenteísmo, que vi que são parte importante dessa vaga.

Admiro o jeito como a Magalu cuida das pessoas e adoraria contribuir com esse trabalho. Fico à disposição para conversarmos.

Com carinho,
Esposa$txt$, now() - interval '1 day');

-- Candidaturas
insert into public.applications (user_id, job_id, resume_id, cover_letter_id, company, role, url, status, applied_on, notes, follow_up_on, position, created_at) values
  ('5eed0000-0000-4000-8000-00000000000b', '5eed0000-0000-4000-8000-0000000b0101', '5eed0000-0000-4000-8000-0000000b0202', '5eed0000-0000-4000-8000-0000000b0301',
   'Magalu', 'Analista de RH jr', 'https://exemplo.com/vagas/magalu-rh-jr', 'preparacao', null,
   'Revisar a carta antes de enviar.', null, 0, now() - interval '1 day'),
  ('5eed0000-0000-4000-8000-00000000000b', '5eed0000-0000-4000-8000-0000000b0105', '5eed0000-0000-4000-8000-0000000b0201', null,
   'Ambev', 'Analista de Treinamento e Desenvolvimento', 'https://exemplo.com/vagas/ambev-td', 'enviada', current_date - 7,
   'Candidatura pela Gupy.', current_date + 2, 0, now() - interval '7 days'),
  ('5eed0000-0000-4000-8000-00000000000b', null, '5eed0000-0000-4000-8000-0000000b0201', null,
   'Localiza', 'Analista de Departamento Pessoal', 'https://exemplo.com/vagas/localiza-dp', 'enviada', current_date - 5,
   null, current_date + 4, 1, now() - interval '5 days'),
  ('5eed0000-0000-4000-8000-00000000000b', null, '5eed0000-0000-4000-8000-0000000b0201', null,
   'Grupo Boticário', 'Analista de RH jr', 'https://exemplo.com/vagas/boticario-rh', 'entrevista', current_date - 14,
   'Entrevista com a gestora na quinta, às 14h (online). Levar exemplos de indicadores.', current_date + 3, 0, now() - interval '14 days'),
  ('5eed0000-0000-4000-8000-00000000000b', null, '5eed0000-0000-4000-8000-0000000b0201', null,
   'Raia Drogasil', 'Assistente de RH', null, 'recusada', current_date - 27,
   'Responderam que seguiram com outro perfil. Pedir feedback.', null, 0, now() - interval '27 days');

insert into public.ai_usage (user_id, day, calls, by_feature) values
  ('5eed0000-0000-4000-8000-00000000000b', (now() at time zone 'America/Sao_Paulo')::date, 3, '{"analisar-curriculo":1,"adaptar-vaga":1,"carta":1}');

-- =====================================================================
-- NELSON · Desenvolvedor front-end
-- =====================================================================

insert into public.jobs (id, user_id, source, external_id, title, company, location, work_mode, url, description, salary, compatibility, match_notes, status, published_at, created_at) values
  ('5eed0000-0000-4000-8000-0000000a0101', '5eed0000-0000-4000-8000-00000000000a', 'adzuna', 'demo-a-1',
   'Desenvolvedor Front-end Pleno', 'Nubank', 'São Paulo, SP', 'remoto', 'https://exemplo.com/vagas/nubank-front',
   'React, TypeScript e testes automatizados. Experiência com design systems e acessibilidade é um diferencial.',
   'R$ 12.000', 86, '{"pontos_fortes":["React","TypeScript","Design systems"],"lacunas":["Testes automatizados"]}', 'nova', now() - interval '5 hours', now() - interval '3 hours'),
  ('5eed0000-0000-4000-8000-0000000a0102', '5eed0000-0000-4000-8000-00000000000a', 'remotive', 'demo-a-2',
   'Senior React Developer', 'Automattic', 'Qualquer lugar', 'remoto', 'https://exemplo.com/vagas/automattic-react',
   'Build accessible, performant interfaces with React. Fluent written English required.',
   null, 74, '{"pontos_fortes":["React","Acessibilidade"],"lacunas":["Inglês fluente","Nível sênior"]}', 'nova', now() - interval '20 hours', now() - interval '3 hours'),
  ('5eed0000-0000-4000-8000-0000000a0103', '5eed0000-0000-4000-8000-00000000000a', 'adzuna', 'demo-a-3',
   'Engenheiro de Software Front-end', 'PicPay', 'São Paulo, SP', 'hibrido', 'https://exemplo.com/vagas/picpay-front',
   'Desenvolvimento de micro front-ends com React e Next.js.',
   null, 68, '{"pontos_fortes":["React"],"lacunas":["Next.js","Micro front-ends"]}', 'nova', now() - interval '1 day', now() - interval '1 day'),
  ('5eed0000-0000-4000-8000-0000000a0104', '5eed0000-0000-4000-8000-00000000000a', 'adzuna', 'demo-a-4',
   'Desenvolvedor React', 'Stone', 'Rio de Janeiro, RJ', 'hibrido', 'https://exemplo.com/vagas/stone-react',
   'Aplicações web para lojistas com React, TypeScript e Tailwind.',
   'R$ 10.500', 81, '{"pontos_fortes":["React","Tailwind"],"lacunas":[]}', 'salva', now() - interval '8 days', now() - interval '8 days');

insert into public.resumes (id, user_id, title, template, country, source, is_principal, content, created_at) values
  ('5eed0000-0000-4000-8000-0000000a0201', '5eed0000-0000-4000-8000-00000000000a', 'Currículo principal', 'classico', 'BR', 'texto', true,
   $json${
     "raw_text": "Nelson · Desenvolvedor front-end · São Paulo, SP\n...",
     "sections": {
       "contato": { "email": "nelson@exemplo.com", "cidade": "São Paulo, SP", "linkedin": "linkedin.com/in/exemplo" },
       "resumo": "Desenvolvedor front-end com experiência em React, TypeScript e criação de sites e aplicações web para pequenos negócios.",
       "experiencias": [
         { "cargo": "Desenvolvedor front-end (autônomo)", "empresa": "NS Soluções Digitais", "local": "Remoto", "inicio": "2022-01", "fim": null,
           "descricao": "Criação de sites e aplicações web com React, TypeScript e Tailwind para clientes de diversos segmentos." },
         { "cargo": "Analista de suporte", "empresa": "Empresa Exemplo", "local": "São Paulo, SP", "inicio": "2018-05", "fim": "2021-12",
           "descricao": "Atendimento a usuários e automação de rotinas internas." }
       ],
       "formacao": [
         { "curso": "Análise e Desenvolvimento de Sistemas", "instituicao": "Faculdade Exemplo", "inicio": "2016", "fim": "2018" }
       ],
       "habilidades": ["React", "TypeScript", "Tailwind CSS", "Acessibilidade", "Git", "Supabase"],
       "idiomas": ["Português (nativo)", "Inglês (intermediário)"]
     }
   }$json$, now() - interval '29 days');

insert into public.resume_analyses (user_id, resume_id, overall_score, scores, suggestions, summary, created_at) values
  ('5eed0000-0000-4000-8000-00000000000a', '5eed0000-0000-4000-8000-0000000a0201', 64,
   '{"ats":62,"palavras_chave":60,"estrutura":70,"clareza":66}', '[]', 'Bom início. Detalhe projetos e resultados.', now() - interval '15 days'),
  ('5eed0000-0000-4000-8000-00000000000a', '5eed0000-0000-4000-8000-0000000a0201', 77,
   '{"ats":80,"palavras_chave":72,"estrutura":79,"clareza":78}',
   '[{"secao":"experiencia","titulo":"Cite projetos com resultados","explicacao":"Mostre o que mudou para o cliente: mais vendas, site mais rápido, menos trabalho manual.","antes":"Criação de sites e aplicações web.","depois":"Criei 12 sites e aplicações web; um deles reduziu em 40% o tempo de atendimento do cliente.","aplicada":false},{"secao":"habilidades","titulo":"Inclua testes automatizados","explicacao":"Aparece em muitas vagas de front-end.","antes":"","depois":"Testes com Vitest e Testing Library","aplicada":false}]',
   'Currículo bem estruturado; faltam resultados concretos.', now() - interval '4 days');

insert into public.cover_letters (id, user_id, job_id, resume_id, title, tone, content, created_at) values
  ('5eed0000-0000-4000-8000-0000000a0301', '5eed0000-0000-4000-8000-00000000000a', '5eed0000-0000-4000-8000-0000000a0104', '5eed0000-0000-4000-8000-0000000a0201',
   'Desenvolvedor React — Stone', 'direto',
   $txt$Prezada equipe da Stone,

Sou desenvolvedor front-end e trabalho há três anos com React, TypeScript e Tailwind — exatamente a base da vaga de Desenvolvedor React.

Nos últimos projetos, criei aplicações web para pequenos negócios, com foco em desempenho e acessibilidade. Gosto de transformar necessidades do dia a dia do lojista em interfaces simples.

Tenho interesse em contribuir com o time e aprender com produtos de grande escala. Fico à disposição para uma conversa.

Atenciosamente,
Nelson$txt$, now() - interval '8 days');

insert into public.applications (user_id, job_id, resume_id, cover_letter_id, company, role, url, status, applied_on, notes, follow_up_on, position, created_at) values
  ('5eed0000-0000-4000-8000-00000000000a', '5eed0000-0000-4000-8000-0000000a0101', '5eed0000-0000-4000-8000-0000000a0201', null,
   'Nubank', 'Desenvolvedor Front-end Pleno', 'https://exemplo.com/vagas/nubank-front', 'preparacao', null,
   'Adaptar o currículo destacando design systems.', null, 0, now() - interval '1 day'),
  ('5eed0000-0000-4000-8000-00000000000a', '5eed0000-0000-4000-8000-0000000a0104', '5eed0000-0000-4000-8000-0000000a0201', '5eed0000-0000-4000-8000-0000000a0301',
   'Stone', 'Desenvolvedor React', 'https://exemplo.com/vagas/stone-react', 'enviada', current_date - 8,
   'Mandar mensagem para a recrutadora perguntando sobre o andamento.', current_date - 1, 0, now() - interval '8 days'),
  ('5eed0000-0000-4000-8000-00000000000a', null, '5eed0000-0000-4000-8000-0000000a0201', null,
   'Mercado Livre', 'Desenvolvedor Front-end', null, 'entrevista', current_date - 16,
   'Teste técnico entregue. Próxima etapa: entrevista com o time.', current_date + 2, 0, now() - interval '16 days'),
  ('5eed0000-0000-4000-8000-00000000000a', null, '5eed0000-0000-4000-8000-0000000a0201', null,
   'Totvs', 'Desenvolvedor React Pleno', null, 'oferta', current_date - 25,
   'Proposta recebida! Responder até sexta.', current_date + 3, 0, now() - interval '25 days'),
  ('5eed0000-0000-4000-8000-00000000000a', null, '5eed0000-0000-4000-8000-0000000a0201', null,
   'VTEX', 'Front-end Developer', null, 'recusada', current_date - 30,
   null, null, 0, now() - interval '30 days');
