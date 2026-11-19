-- =====================================================================
-- VagaPronta · dados de exemplo (SÓ PARA O AMBIENTE LOCAL)
--
-- Cria dois usuários com telas preenchidas:
--   nelson@example.com   (desenvolvedor front-end)
--   esposa@example.com   (biomédica)
-- Empresas, pessoas e números são FICTÍCIOS.
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
-- Usuários (perfil e preferências são criados pelo gatilho handle_new_user)
-- ---------------------------------------------------------------------
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change, email_change_token_new
) values
  ('00000000-0000-0000-0000-000000000000', '5eed0000-0000-4000-8000-00000000000a', 'authenticated', 'authenticated',
   'nelson@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Nelson"}',
   now() - interval '30 days', now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '5eed0000-0000-4000-8000-00000000000b', 'authenticated', 'authenticated',
   'esposa@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Esposa"}',
   now() - interval '30 days', now(), '', '', '', '');

insert into auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at) values
  (gen_random_uuid(), '5eed0000-0000-4000-8000-00000000000a', '5eed0000-0000-4000-8000-00000000000a', 'email',
   '{"sub":"5eed0000-0000-4000-8000-00000000000a","email":"nelson@example.com","email_verified":true}', now(), now(), now()),
  (gen_random_uuid(), '5eed0000-0000-4000-8000-00000000000b', '5eed0000-0000-4000-8000-00000000000b', 'email',
   '{"sub":"5eed0000-0000-4000-8000-00000000000b","email":"esposa@example.com","email_verified":true}', now(), now(), now());

-- Nelson: TI (dados, IA e desenvolvimento), SEM conselho profissional.
-- Sem modalidade definida de propósito: mostra o "Complete seu perfil" no Início.
update public.profiles set
  desired_role = 'Engenheiro de Dados',
  city = 'São Paulo, SP',
  resume_country = 'BR',
  onboarded_at = now() - interval '30 days',
  career_stage = 'na_area',
  linkedin_url = null,
  links = '[{"rotulo":"Portfólio","url":"https://portfolio.example.com/nelson"}]',
  certifications = '[{"nome":"Certificação em fundamentos de nuvem (exemplo)","emissor":"Provedor de Nuvem Exemplo","validade":"2027-03"},{"nome":"Curso de Machine Learning","emissor":"Plataforma de Cursos Exemplo","validade":null}]'
where user_id = '5eed0000-0000-4000-8000-00000000000a';

update public.job_preferences set
  desired_roles = array['Engenheiro de Dados', 'Desenvolvedor Python'],
  areas = array['Dados', 'Inteligência Artificial'],
  seniority = array['pleno']
where user_id = '5eed0000-0000-4000-8000-00000000000a';

-- Onde quero trabalhar (ordem de preferência)
insert into public.job_destinations (user_id, country_code, priority) values
  ('5eed0000-0000-4000-8000-00000000000a', 'BR', 1),
  ('5eed0000-0000-4000-8000-00000000000a', 'EU', 2),
  ('5eed0000-0000-4000-8000-00000000000a', 'US', 3),
  ('5eed0000-0000-4000-8000-00000000000b', 'BR', 1),
  ('5eed0000-0000-4000-8000-00000000000b', 'PT', 2);

-- Esposa: biomédica, perfil quase completo
update public.profiles set
  desired_role = 'Biomédica',
  city = 'São Paulo, SP',
  resume_country = 'BR',
  onboarded_at = now() - interval '30 days',
  career_stage = 'na_area',
  phone = '(11) 99999-0000',
  contact_email = 'esposa@example.com',
  linkedin_url = null,
  registry_council = 'CRBM',
  registry_number = '00000',
  registry_region = '1ª Região (SP)',
  specializations = array['Análises clínicas', 'Microbiologia', 'Banco de sangue'],
  certifications = '[{"nome":"Biossegurança em laboratório (NR-32)","emissor":"Escola Técnica Exemplo","validade":"2027-06"},{"nome":"Coleta de sangue venoso e capilar","emissor":"Hospital Escola Exemplo","validade":null}]'
where user_id = '5eed0000-0000-4000-8000-00000000000b';

update public.job_preferences set
  desired_roles = array['Biomédica', 'Analista de Laboratório'],
  areas = array['Análises clínicas', 'Controle de qualidade', 'Pesquisa'],
  seniority = array['junior', 'pleno'],
  work_modes = array['presencial', 'hibrido'],
  cities = array['São Paulo, SP', 'Guarulhos, SP'],
  contract_types = array['clt'],
  salary_min = 4000, salary_max = 6500, salary_currency = 'BRL',
  keywords_include = array['análises clínicas', 'controle de qualidade'],
  blocked_companies = array['Laboratório Que Não Quero'],
  languages = '[{"idioma":"Português","nivel":"nativo"},{"idioma":"Inglês","nivel":"intermediario"}]'
where user_id = '5eed0000-0000-4000-8000-00000000000b';

-- =====================================================================
-- ESPOSA · Biomédica
-- =====================================================================

-- Vagas
insert into public.jobs (id, user_id, source, external_id, title, company, location, work_mode, url, description, salary, compatibility, match_notes, status, published_at, created_at) values
  ('5eed0000-0000-4000-8000-0000000b0101', '5eed0000-0000-4000-8000-00000000000b', 'adzuna', 'demo-b-1',
   'Biomédico(a) — Análises Clínicas', 'Laboratório Diagnóstico Alfa', 'São Paulo, SP', 'presencial', null,
   E'Buscamos biomédico(a) para o setor técnico de análises clínicas.\n\nResponsabilidades\n• Realizar e liberar exames de bioquímica, hematologia e imunologia\n• Executar o controle de qualidade interno (regras de Westgard) e participar do controle externo\n• Conferir laudos no sistema LIS e tratar valores críticos\n• Apoiar a coleta em dias de maior movimento\n\nRequisitos\n• Graduação em Biomedicina com habilitação em Análises Clínicas e registro ativo no CRBM\n• Experiência com automação em bioquímica e hematologia\n• Desejável: especialização em análises clínicas',
   'R$ 4.800 a R$ 5.500', 89, '{"pontos_fortes":["Bioquímica e hematologia","Controle de qualidade"],"lacunas":["Imunologia"]}', 'nova', now() - interval '6 hours', now() - interval '2 hours'),
  ('5eed0000-0000-4000-8000-0000000b0102', '5eed0000-0000-4000-8000-00000000000b', 'adzuna', 'demo-b-2',
   'Analista de Controle de Qualidade Microbiológico', 'Indústria Farmacêutica Beta', 'Guarulhos, SP', 'presencial', null,
   E'Sobre a vaga\nVocê vai garantir a qualidade microbiológica de medicamentos e do ambiente produtivo, seguindo as Boas Práticas de Fabricação.\n\nResponsabilidades\n• Realizar análises microbiológicas de matérias-primas, água purificada e produto acabado\n• Fazer o monitoramento ambiental de áreas limpas\n• Registrar resultados e abrir desvios quando necessário\n• Preparar meios de cultura e controlar cepas de referência\n\nRequisitos\n• Formação em Biomedicina, Farmácia ou Biologia\n• Experiência em laboratório de microbiologia\n• Conhecimento de Boas Práticas (BPF/BPL)\n\nDiferenciais\n• Vivência em indústria farmacêutica ou de alimentos\n• Inglês intermediário para leitura de procedimentos',
   'R$ 5.200', 91, '{"pontos_fortes":["Microbiologia","Rotina de laboratório"],"lacunas":["Boas Práticas de Fabricação"]}', 'nova', now() - interval '8 hours', now() - interval '2 hours'),
  ('5eed0000-0000-4000-8000-0000000b0103', '5eed0000-0000-4000-8000-00000000000b', 'adzuna', 'demo-b-3',
   'Biomédico(a) de Banco de Sangue', 'Hemocentro Regional Exemplo', 'São Paulo, SP', 'presencial', null,
   E'Atuação no setor de imuno-hematologia: tipagem ABO/Rh, pesquisa de anticorpos irregulares, provas de compatibilidade e liberação de hemocomponentes. Escala 12x36. Requisitos: registro no CRBM e habilitação em banco de sangue ou experiência na área.',
   null, 87, '{"pontos_fortes":["Banco de sangue"],"lacunas":["Experiência em hemocentro"]}', 'nova', now() - interval '10 hours', now() - interval '2 hours'),
  ('5eed0000-0000-4000-8000-0000000b0104', '5eed0000-0000-4000-8000-00000000000b', 'remotive', 'demo-b-4',
   'Clinical Data Coordinator (LATAM)', 'Remote Health Research', 'América Latina', 'remoto', null,
   'Support clinical research studies: data entry review, query management and documentation following GCP. Life sciences degree required. Intermediate English.',
   'US$ 1.900', 72, '{"pontos_fortes":["Formação em ciências da vida"],"lacunas":["Boas Práticas Clínicas (GCP)","Inglês avançado"]}', 'nova', now() - interval '1 day', now() - interval '1 day'),
  ('5eed0000-0000-4000-8000-0000000b0105', '5eed0000-0000-4000-8000-00000000000b', 'adzuna', 'demo-b-5',
   'Biomédico(a) de Imagenologia', 'Clínica Imagem Mais', 'São Paulo, SP', 'hibrido', null,
   'Apoio a exames de ressonância e tomografia, preparo de pacientes e controle de agenda técnica. Habilitação em imagenologia desejável.',
   'R$ 5.000', 78, '{"pontos_fortes":["Atendimento a pacientes"],"lacunas":["Habilitação em imagenologia"]}', 'salva', now() - interval '9 days', now() - interval '9 days'),
  ('5eed0000-0000-4000-8000-0000000b0106', '5eed0000-0000-4000-8000-00000000000b', 'adzuna', 'demo-b-6',
   'Coordenador(a) de Laboratório', 'Hospital Grande Exemplo', 'São Paulo, SP', 'presencial', null,
   'Gestão da equipe técnica do laboratório hospitalar, indicadores e acreditação. Exige 5 anos de experiência e liderança.',
   null, 61, '{"pontos_fortes":[],"lacunas":["Experiência em liderança","5 anos de experiência"]}', 'descartada', now() - interval '5 days', now() - interval '5 days');

-- Currículos: principal + versão adaptada para a vaga do Laboratório Alfa
insert into public.resumes (id, user_id, title, template, country, source, is_principal, job_id, content, created_at) values
  ('5eed0000-0000-4000-8000-0000000b0201', '5eed0000-0000-4000-8000-00000000000b', 'Currículo principal', 'moderno', 'BR', 'texto', true, null,
   $json${
     "raw_text": "Esposa · Biomédica · CRBM 00000 · São Paulo, SP\nBiomédica no Laboratório Vida Diagnósticos (2021–atual)...",
     "sections": {
       "contato": { "email": "esposa@example.com", "telefone": "(11) 99999-0000", "cidade": "São Paulo, SP" },
       "resumo": "Biomédica com habilitação em análises clínicas e 4 anos de experiência em laboratório, atuando em bioquímica, hematologia e coleta. Cuidadosa com biossegurança e com o controle de qualidade dos resultados.",
       "experiencias": [
         { "cargo": "Biomédica", "empresa": "Laboratório Vida Diagnósticos", "local": "São Paulo, SP", "inicio": "2021-03", "fim": null,
           "descricao": "Realizo e libero exames de bioquímica e hematologia em equipamentos automatizados (cerca de 300 amostras por plantão). Executo o controle de qualidade interno e apoio a coleta de sangue venoso." },
         { "cargo": "Estagiária de Microbiologia", "empresa": "Hospital Santa Clara Exemplo", "local": "São Paulo, SP", "inicio": "2019-08", "fim": "2020-12",
           "descricao": "Semeadura e leitura de culturas, identificação bacteriana e antibiograma, sob supervisão." }
       ],
       "formacao": [
         { "curso": "Biomedicina (bacharelado)", "instituicao": "Universidade Exemplo", "inicio": "2016", "fim": "2020" },
         { "curso": "Especialização em Análises Clínicas", "instituicao": "Faculdade Exemplo", "inicio": "2021", "fim": "2022" }
       ],
       "habilidades": ["Bioquímica clínica", "Hematologia", "Coleta de sangue", "Controle de qualidade interno", "Microbiologia", "Sistema LIS", "Biossegurança"],
       "idiomas": ["Português (nativo)", "Inglês (intermediário)"],
       "cursos": ["Biossegurança em laboratório (NR-32) — Escola Técnica Exemplo (2023)"]
     }
   }$json$, now() - interval '28 days'),
  ('5eed0000-0000-4000-8000-0000000b0202', '5eed0000-0000-4000-8000-00000000000b', 'Biomédico(a) — Análises Clínicas — Laboratório Diagnóstico Alfa', 'moderno', 'BR', 'adaptacao', false, '5eed0000-0000-4000-8000-0000000b0101',
   $json${
     "raw_text": "",
     "sections": {
       "contato": { "email": "esposa@example.com", "telefone": "(11) 99999-0000", "cidade": "São Paulo, SP" },
       "resumo": "Biomédica com habilitação em análises clínicas, registro ativo no CRBM e 4 anos de rotina em bioquímica e hematologia automatizadas. Experiência com controle de qualidade interno (regras de Westgard), liberação de laudos no sistema LIS e apoio à coleta.",
       "experiencias": [
         { "cargo": "Biomédica", "empresa": "Laboratório Vida Diagnósticos", "local": "São Paulo, SP", "inicio": "2021-03", "fim": null,
           "descricao": "Realizo e libero exames de bioquímica e hematologia em equipamentos automatizados (cerca de 300 amostras por plantão), conferindo laudos no sistema LIS e comunicando valores críticos. Executo o controle de qualidade interno com as regras de Westgard e apoio a coleta de sangue venoso." },
         { "cargo": "Estagiária de Microbiologia", "empresa": "Hospital Santa Clara Exemplo", "local": "São Paulo, SP", "inicio": "2019-08", "fim": "2020-12",
           "descricao": "Semeadura e leitura de culturas, identificação bacteriana e antibiograma, sob supervisão." }
       ],
       "formacao": [
         { "curso": "Biomedicina (bacharelado)", "instituicao": "Universidade Exemplo", "inicio": "2016", "fim": "2020" },
         { "curso": "Especialização em Análises Clínicas", "instituicao": "Faculdade Exemplo", "inicio": "2021", "fim": "2022" }
       ],
       "habilidades": ["Bioquímica clínica", "Hematologia", "Controle de qualidade interno (Westgard)", "Sistema LIS", "Valores críticos", "Coleta de sangue", "Biossegurança"],
       "idiomas": ["Português (nativo)", "Inglês (intermediário)"]
     }
   }$json$, now() - interval '1 day');

-- Análises: a nota foi subindo (a última tem uma sugestão com lacuna [X] para completar)
insert into public.resume_analyses (user_id, resume_id, overall_score, scores, suggestions, summary, created_at) values
  ('5eed0000-0000-4000-8000-00000000000b', '5eed0000-0000-4000-8000-0000000b0201', 58,
   '{"ats":55,"palavras_chave":48,"estrutura":66,"clareza":63}',
   '[{"secao":"resumo","titulo":"Crie um resumo profissional","explicacao":"Um resumo de 3 linhas no topo mostra logo sua habilitação e onde você já atuou.","antes":"","depois":"Biomédica com habilitação em análises clínicas e 4 anos de experiência em laboratório...","aplicada":true}]',
   'Bom ponto de partida. Falta um resumo e os nomes dos setores em que você atua.', now() - interval '20 days'),
  ('5eed0000-0000-4000-8000-00000000000b', '5eed0000-0000-4000-8000-0000000b0201', 71,
   '{"ats":70,"palavras_chave":64,"estrutura":78,"clareza":74}',
   '[{"secao":"experiencia","titulo":"Mostre o volume da sua rotina","explicacao":"O volume de amostras mostra a sua experiência com automação.","antes":"Realizo e libero exames de bioquímica e hematologia em equipamentos automatizados.","depois":"Realizo e libero exames de bioquímica e hematologia em equipamentos automatizados (cerca de 300 amostras por plantão).","aplicada":true}]',
   'Evoluiu bem! Agora vale citar os controles de qualidade que você faz.', now() - interval '12 days'),
  ('5eed0000-0000-4000-8000-00000000000b', '5eed0000-0000-4000-8000-0000000b0201', 76,
   '{"ats":78,"palavras_chave":70,"estrutura":82,"clareza":77}',
   '[{"secao":"experiencia","titulo":"Mostre o tempo de liberação dos exames","explicacao":"Um número concreto mostra eficiência na rotina. Complete com o seu dado real.","antes":"Executo o controle de qualidade interno e apoio a coleta de sangue venoso.","depois":"Executo o controle de qualidade interno (regras de Westgard) e apoio a coleta de sangue venoso, liberando os exames de rotina em média em [X] horas.","aplicada":false},{"secao":"habilidades","titulo":"Use os termos que os laboratórios procuram","explicacao":"Vagas de análises clínicas costumam citar esses termos. Inclua só o que você realmente faz.","antes":"","depois":"Regras de Westgard, Valores críticos, Liberação de laudos","aplicada":false},{"secao":"formacao","titulo":"Destaque sua habilitação","explicacao":"Muitas vagas pedem habilitação em análises clínicas e registro ativo no conselho.","antes":"","depois":"Habilitação em Análises Clínicas — CRBM 1ª Região","aplicada":false}]',
   'Currículo claro e bem organizado. Faltam alguns termos técnicos que os laboratórios usam.', now() - interval '3 days'),
  ('5eed0000-0000-4000-8000-00000000000b', '5eed0000-0000-4000-8000-0000000b0202', 89,
   '{"ats":91,"palavras_chave":88,"estrutura":86,"clareza":90}',
   '[]', 'Muito bem adaptado para a vaga do Laboratório Diagnóstico Alfa.', now() - interval '1 day');

-- Carta de apresentação
insert into public.cover_letters (id, user_id, job_id, resume_id, title, tone, content, created_at) values
  ('5eed0000-0000-4000-8000-0000000b0301', '5eed0000-0000-4000-8000-00000000000b', '5eed0000-0000-4000-8000-0000000b0101', '5eed0000-0000-4000-8000-0000000b0202',
   'Biomédico(a) — Análises Clínicas — Laboratório Diagnóstico Alfa', 'caloroso',
   $txt$Olá, equipe técnica do Laboratório Diagnóstico Alfa!

Foi com muita alegria que encontrei a vaga de Biomédico(a) em Análises Clínicas. Sou biomédica, com habilitação em análises clínicas e registro ativo no CRBM, e trabalho há quatro anos na rotina de um laboratório que atende muitos pacientes por dia.

No Laboratório Vida Diagnósticos, realizo e libero exames de bioquímica e hematologia em equipamentos automatizados, cerca de 300 amostras por plantão. Também executo o controle de qualidade interno com as regras de Westgard e confiro os laudos no sistema LIS, comunicando os valores críticos com agilidade.

Gosto do cuidado que um bom resultado exige, porque sei que por trás de cada amostra existe uma pessoa esperando uma resposta. Adoraria levar essa atenção para a equipe de vocês.

Fico à disposição para conversarmos.

Com carinho,
Esposa$txt$, now() - interval '1 day');

-- Candidaturas
insert into public.applications (user_id, job_id, resume_id, cover_letter_id, company, role, url, status, applied_on, notes, follow_up_on, position, created_at) values
  ('5eed0000-0000-4000-8000-00000000000b', '5eed0000-0000-4000-8000-0000000b0101', '5eed0000-0000-4000-8000-0000000b0202', '5eed0000-0000-4000-8000-0000000b0301',
   'Laboratório Diagnóstico Alfa', 'Biomédico(a) — Análises Clínicas', null, 'preparacao', null,
   'Revisar a carta antes de enviar.', null, 0, now() - interval '1 day'),
  ('5eed0000-0000-4000-8000-00000000000b', '5eed0000-0000-4000-8000-0000000b0105', '5eed0000-0000-4000-8000-0000000b0201', null,
   'Clínica Imagem Mais', 'Biomédico(a) de Imagenologia', null, 'enviada', current_date - 7,
   'Candidatura pelo site da clínica.', current_date + 2, 0, now() - interval '7 days'),
  ('5eed0000-0000-4000-8000-00000000000b', null, '5eed0000-0000-4000-8000-0000000b0201', null,
   'Hospital Santa Luzia Exemplo', 'Biomédico(a) Plantonista', null, 'enviada', current_date - 5,
   null, current_date + 4, 1, now() - interval '5 days'),
  ('5eed0000-0000-4000-8000-00000000000b', null, '5eed0000-0000-4000-8000-0000000b0201', null,
   'Laboratório Gama Exemplo', 'Biomédico(a) — Coleta e Triagem', null, 'entrevista', current_date - 14,
   'Entrevista técnica na quinta, às 14h. Revisar hematologia e controle de qualidade.', current_date + 3, 0, now() - interval '14 days'),
  ('5eed0000-0000-4000-8000-00000000000b', null, '5eed0000-0000-4000-8000-0000000b0201', null,
   'Clínica Bem Estar Exemplo', 'Técnico(a) de Laboratório', null, 'recusada', current_date - 27,
   'Responderam que seguiram com outro perfil. Pedir feedback.', null, 0, now() - interval '27 days');

insert into public.ai_usage (user_id, day, calls, by_feature) values
  ('5eed0000-0000-4000-8000-00000000000b', (now() at time zone 'America/Sao_Paulo')::date, 3, '{"analisar-curriculo":1,"adaptar-vaga":1,"carta":1}');

-- =====================================================================
-- NELSON · TI (dados, IA e desenvolvimento) · sem conselho profissional
-- =====================================================================

insert into public.jobs (id, user_id, source, external_id, title, company, location, work_mode, url, description, salary, compatibility, match_notes, status, published_at, created_at) values
  ('5eed0000-0000-4000-8000-0000000a0101', '5eed0000-0000-4000-8000-00000000000a', 'adzuna', 'demo-a-1',
   'Engenheiro(a) de Dados Pleno', 'Fintech Exemplo', 'São Paulo, SP', 'remoto', null,
   E'Construir e manter pipelines de dados em Python e SQL, modelar dados no data warehouse e orquestrar rotinas com Airflow.\n\nRequisitos\n• Python e SQL avançado\n• Experiência com nuvem (AWS ou GCP)\n• Desejável: dbt e Spark',
   'R$ 12.000', 86, '{"pontos_fortes":["Python","SQL"],"lacunas":["Airflow","dbt"]}', 'nova', now() - interval '5 hours', now() - interval '3 hours'),
  ('5eed0000-0000-4000-8000-0000000a0102', '5eed0000-0000-4000-8000-00000000000a', 'remotive', 'demo-a-2',
   'Machine Learning Engineer', 'Remote AI Company Exemplo', 'Qualquer lugar', 'remoto', null,
   'Deploy and monitor ML models in production, build feature pipelines and APIs. Python, Docker and cloud experience. Fluent English.',
   null, 74, '{"pontos_fortes":["Python","APIs"],"lacunas":["MLOps","Inglês fluente"]}', 'nova', now() - interval '20 hours', now() - interval '3 hours'),
  ('5eed0000-0000-4000-8000-0000000a0103', '5eed0000-0000-4000-8000-00000000000a', 'adzuna', 'demo-a-3',
   'Analista de Dados', 'Varejo Exemplo', 'São Paulo, SP', 'hibrido', null,
   'Construção de dashboards em Power BI, análises em SQL e apoio às áreas de negócio.',
   null, 68, '{"pontos_fortes":["SQL"],"lacunas":["Power BI"]}', 'nova', now() - interval '1 day', now() - interval '1 day'),
  ('5eed0000-0000-4000-8000-0000000a0104', '5eed0000-0000-4000-8000-00000000000a', 'adzuna', 'demo-a-4',
   'Desenvolvedor(a) Python', 'Pagamentos Exemplo', 'Rio de Janeiro, RJ', 'hibrido', null,
   'APIs em Python (FastAPI), integração com bancos de dados e testes automatizados.',
   'R$ 10.500', 81, '{"pontos_fortes":["Python","APIs"],"lacunas":[]}', 'salva', now() - interval '8 days', now() - interval '8 days');

insert into public.resumes (id, user_id, title, template, country, source, is_principal, content, created_at) values
  ('5eed0000-0000-4000-8000-0000000a0201', '5eed0000-0000-4000-8000-00000000000a', 'Currículo principal', 'classico', 'BR', 'texto', true,
   $json${
     "raw_text": "Nelson · Engenheiro de Dados · São Paulo, SP\n...",
     "sections": {
       "contato": { "email": "nelson@example.com", "cidade": "São Paulo, SP" },
       "resumo": "Profissional de tecnologia com experiência em desenvolvimento web e dados, criando aplicações com Python, SQL, React e TypeScript.",
       "experiencias": [
         { "cargo": "Desenvolvedor e analista de dados (autônomo)", "empresa": "NS Soluções Digitais", "local": "Remoto", "inicio": "2022-01", "fim": null,
           "descricao": "Desenvolvimento de aplicações web e automações de dados com Python, SQL e React para clientes de diversos segmentos." },
         { "cargo": "Analista de suporte", "empresa": "Empresa Exemplo", "local": "São Paulo, SP", "inicio": "2018-05", "fim": "2021-12",
           "descricao": "Atendimento a usuários e automação de rotinas internas com scripts e planilhas." }
       ],
       "formacao": [
         { "curso": "Análise e Desenvolvimento de Sistemas", "instituicao": "Faculdade Exemplo", "inicio": "2016", "fim": "2018" }
       ],
       "habilidades": ["Python", "SQL", "React", "TypeScript", "Git", "Supabase"],
       "idiomas": ["Português (nativo)", "Inglês (intermediário)"],
       "cursos": ["Curso de Machine Learning — Plataforma de Cursos Exemplo"]
     }
   }$json$, now() - interval '29 days');

insert into public.resume_analyses (user_id, resume_id, overall_score, scores, suggestions, summary, created_at) values
  ('5eed0000-0000-4000-8000-00000000000a', '5eed0000-0000-4000-8000-0000000a0201', 64,
   '{"ats":62,"palavras_chave":60,"estrutura":70,"clareza":66}', '[]', 'Bom início. Detalhe projetos e resultados.', now() - interval '15 days'),
  ('5eed0000-0000-4000-8000-00000000000a', '5eed0000-0000-4000-8000-0000000a0201', 77,
   '{"ats":80,"palavras_chave":72,"estrutura":79,"clareza":78}',
   '[{"secao":"experiencia","titulo":"Cite projetos com resultados","explicacao":"Mostre o que mudou para o cliente: menos trabalho manual, dados mais rápidos.","antes":"Desenvolvimento de aplicações web e automações de dados com Python, SQL e React para clientes de diversos segmentos.","depois":"Desenvolvimento de [X] aplicações web e automações de dados com Python, SQL e React; uma automação reduziu em [X] horas por semana o trabalho manual do cliente.","aplicada":false},{"secao":"habilidades","titulo":"Inclua ferramentas de dados","explicacao":"Aparecem em muitas vagas de dados. Inclua só o que você realmente usa.","antes":"","depois":"Pandas, Airflow, dbt","aplicada":false}]',
   'Currículo bem estruturado; faltam resultados concretos e ferramentas de dados.', now() - interval '4 days');

insert into public.cover_letters (id, user_id, job_id, resume_id, title, tone, content, created_at) values
  ('5eed0000-0000-4000-8000-0000000a0301', '5eed0000-0000-4000-8000-00000000000a', '5eed0000-0000-4000-8000-0000000a0104', '5eed0000-0000-4000-8000-0000000a0201',
   'Desenvolvedor(a) Python — Pagamentos Exemplo', 'direto',
   $txt$Prezada equipe da Pagamentos Exemplo,

Sou profissional de tecnologia e trabalho com Python, SQL e desenvolvimento de APIs — a base da vaga de Desenvolvedor(a) Python.

Nos últimos projetos, criei aplicações web e automações de dados para clientes de diferentes áreas, sempre com atenção à qualidade do código e à clareza para quem usa.

Tenho interesse em contribuir com o time. Fico à disposição para uma conversa.

Atenciosamente,
Nelson$txt$, now() - interval '8 days');

insert into public.applications (user_id, job_id, resume_id, cover_letter_id, company, role, url, status, applied_on, notes, follow_up_on, position, created_at) values
  ('5eed0000-0000-4000-8000-00000000000a', '5eed0000-0000-4000-8000-0000000a0101', '5eed0000-0000-4000-8000-0000000a0201', null,
   'Fintech Exemplo', 'Engenheiro(a) de Dados Pleno', null, 'preparacao', null,
   'Adaptar o currículo destacando pipelines de dados.', null, 0, now() - interval '1 day'),
  ('5eed0000-0000-4000-8000-00000000000a', '5eed0000-0000-4000-8000-0000000a0104', '5eed0000-0000-4000-8000-0000000a0201', '5eed0000-0000-4000-8000-0000000a0301',
   'Pagamentos Exemplo', 'Desenvolvedor(a) Python', null, 'enviada', current_date - 8,
   'Mandar mensagem para a recrutadora perguntando sobre o andamento.', current_date - 1, 0, now() - interval '8 days'),
  ('5eed0000-0000-4000-8000-00000000000a', null, '5eed0000-0000-4000-8000-0000000a0201', null,
   'Logística Exemplo', 'Analista de Dados', null, 'entrevista', current_date - 16,
   'Case técnico entregue. Próxima etapa: entrevista com o time.', current_date + 2, 0, now() - interval '16 days'),
  ('5eed0000-0000-4000-8000-00000000000a', null, '5eed0000-0000-4000-8000-0000000a0201', null,
   'Software Exemplo', 'Desenvolvedor(a) Full Stack Pleno', null, 'oferta', current_date - 25,
   'Proposta recebida! Responder até sexta.', current_date + 3, 0, now() - interval '25 days'),
  ('5eed0000-0000-4000-8000-00000000000a', null, '5eed0000-0000-4000-8000-0000000a0201', null,
   'E-commerce Exemplo', 'Cientista de Dados Jr', null, 'recusada', current_date - 30,
   null, null, 0, now() - interval '30 days');

-- ---------------------------------------------------------------------
-- Vagas do seed: origem "exemplo", destino Brasil; e algumas no exterior
-- para mostrar os avisos (idioma, visto, remoto a partir do Brasil).
-- ---------------------------------------------------------------------
update public.jobs set source = 'exemplo', destination = 'BR', country = 'BR' where external_id like 'demo-%';

insert into public.jobs (user_id, source, external_id, title, company, location, country, destination, work_mode, url, description,
  compatibility, match_notes, status, published_at, language_required, visa_sponsorship, remote_from_brazil) values
  ('5eed0000-0000-4000-8000-00000000000b', 'exemplo', 'demo-b-pt-1', 'Técnica(o) Superior de Análises Clínicas', 'Clínica Exemplo do Porto', 'Porto', 'PT', 'PT', 'presencial',
   null, 'Laboratório de análises clínicas no Porto procura profissional para hematologia e bioquímica, com controle de qualidade interno e registo de resultados. Requisito: reconhecimento do diploma em Portugal.',
   74, '{"estimada": true, "termos": ["hematologia", "bioquimica", "qualidade"]}', 'nova', now() - interval '1 day', null, null, null),
  ('5eed0000-0000-4000-8000-00000000000a', 'exemplo', 'demo-a-eu-1', 'Data Engineer (m/w/d)', 'Exemplo Analytics GmbH', 'Berlin', 'DE', 'EU', 'hibrido',
   null, 'We build data pipelines with Python, SQL and Airflow. Fluent German (C1) is required for client meetings. We offer visa sponsorship and relocation support.',
   81, '{"estimada": true, "termos": ["python", "sql", "airflow"]}', 'nova', now() - interval '2 days', 'de', true, null),
  ('5eed0000-0000-4000-8000-00000000000a', 'exemplo', 'demo-a-us-1', 'Senior Data Analyst', 'Exemplo Health Inc.', 'Americas, Brazil', 'US', 'US', 'remoto',
   null, 'Remote role open to candidates in the Americas, including Brazil. SQL, Python and dashboards. English required for daily meetings.',
   77, '{"estimada": true, "termos": ["sql", "python", "dashboards"]}', 'nova', now() - interval '1 day', 'en', null, true);