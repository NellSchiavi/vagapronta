-- =====================================================================
-- VagaPronta · vagas, análises, cartas, candidaturas e uso da IA
-- Todas as tabelas: user_id, created_at, updated_at e RLS por auth.uid().
--
-- Integridade entre usuários: as referências (vaga, currículo, carta)
-- usam chaves compostas (id, user_id). Assim ninguém consegue ligar o
-- próprio registro ao registro de outra pessoa, mesmo sabendo o id.
-- =====================================================================

-- chaves compostas usadas pelas referências
alter table public.resumes add constraint resumes_id_user_key unique (id, user_id);

-- ---------------------------------------------------------------------
-- jobs: vagas sugeridas (Adzuna, Remotive) ou cadastradas à mão
-- ---------------------------------------------------------------------
create table public.jobs (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  source         text not null default 'manual' check (source in ('adzuna', 'remotive', 'manual')),
  external_id    text,                 -- id da vaga na origem (evita duplicar na busca diária)
  title          text not null,
  company        text,
  location       text,
  work_mode      text check (work_mode in ('presencial', 'hibrido', 'remoto')),
  url            text,
  description    text,
  salary         text,
  compatibility  smallint check (compatibility between 0 and 100),
  match_notes    jsonb not null default '{}'::jsonb,  -- motivos da compatibilidade (IA)
  status         text not null default 'nova' check (status in ('nova', 'salva', 'descartada')),
  published_at   timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint jobs_id_user_key unique (id, user_id)
);

comment on table public.jobs is 'Vagas de cada pessoa: sugeridas pela busca diária ou adicionadas manualmente.';

create unique index jobs_external_idx on public.jobs (user_id, source, external_id) where external_id is not null;
create index jobs_user_status_idx on public.jobs (user_id, status, compatibility desc nulls last);

create trigger jobs_updated_at before update on public.jobs
  for each row execute function public.set_updated_at();

-- versão adaptada do currículo aponta para a vaga
alter table public.resumes
  add constraint resumes_job_fk foreign key (job_id, user_id)
  references public.jobs (id, user_id) on delete set null (job_id);
create index resumes_job_idx on public.resumes (job_id) where job_id is not null;

-- ---------------------------------------------------------------------
-- resume_analyses: histórico das análises de currículo
-- ---------------------------------------------------------------------
create table public.resume_analyses (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  resume_id      uuid not null,
  overall_score  smallint not null check (overall_score between 0 and 100),
  -- notas por critério: { ats, palavras_chave, estrutura, clareza } (0–100)
  scores         jsonb not null default '{}'::jsonb,
  -- sugestões por seção: [{ secao, titulo, explicacao, antes, depois, aplicada }]
  suggestions    jsonb not null default '[]'::jsonb,
  summary        text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint resume_analyses_resume_fk foreign key (resume_id, user_id)
    references public.resumes (id, user_id) on delete cascade
);

comment on table public.resume_analyses is 'Cada análise feita pela IA, para acompanhar a evolução da nota.';

create index resume_analyses_resume_idx on public.resume_analyses (resume_id, created_at desc);
create index resume_analyses_user_idx on public.resume_analyses (user_id, created_at desc);

create trigger resume_analyses_updated_at before update on public.resume_analyses
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- cover_letters: cartas de apresentação
-- ---------------------------------------------------------------------
create table public.cover_letters (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  job_id      uuid,
  resume_id   uuid,
  title       text not null default 'Carta de apresentação',
  tone        text not null default 'caloroso' check (tone in ('formal', 'caloroso', 'direto')),
  content     text not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint cover_letters_id_user_key unique (id, user_id),
  constraint cover_letters_job_fk foreign key (job_id, user_id)
    references public.jobs (id, user_id) on delete set null (job_id),
  constraint cover_letters_resume_fk foreign key (resume_id, user_id)
    references public.resumes (id, user_id) on delete set null (resume_id)
);

comment on table public.cover_letters is 'Cartas de apresentação, geralmente ligadas a uma vaga.';

create index cover_letters_user_idx on public.cover_letters (user_id, updated_at desc);
create index cover_letters_job_idx on public.cover_letters (job_id) where job_id is not null;

create trigger cover_letters_updated_at before update on public.cover_letters
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- applications: candidaturas (kanban)
-- ---------------------------------------------------------------------
create table public.applications (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default auth.uid() references auth.users (id) on delete cascade,
  job_id           uuid,
  resume_id        uuid,
  cover_letter_id  uuid,
  company          text not null,
  role             text not null,
  url              text,
  status           text not null default 'preparacao'
                     check (status in ('preparacao', 'enviada', 'entrevista', 'oferta', 'recusada')),
  applied_on       date,              -- data da candidatura
  notes            text,
  follow_up_on     date,              -- lembrete de follow-up
  position         integer not null default 0,  -- ordem dentro da coluna
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint applications_job_fk foreign key (job_id, user_id)
    references public.jobs (id, user_id) on delete set null (job_id),
  constraint applications_resume_fk foreign key (resume_id, user_id)
    references public.resumes (id, user_id) on delete set null (resume_id),
  constraint applications_letter_fk foreign key (cover_letter_id, user_id)
    references public.cover_letters (id, user_id) on delete set null (cover_letter_id)
);

comment on table public.applications is 'Candidaturas acompanhadas no kanban (Preparação → Oferta/Recusada).';

create index applications_user_status_idx on public.applications (user_id, status, position);
create index applications_follow_up_idx on public.applications (user_id, follow_up_on) where follow_up_on is not null;
create unique index applications_one_per_job_idx on public.applications (user_id, job_id) where job_id is not null;

create trigger applications_updated_at before update on public.applications
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- ai_usage: chamadas de IA por pessoa e por dia (limite da cota gratuita)
-- Só leitura para o usuário; a contagem é feita por consume_ai_quota().
-- ---------------------------------------------------------------------
create table public.ai_usage (
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  day         date not null default (now() at time zone 'America/Sao_Paulo')::date,
  calls       integer not null default 0 check (calls >= 0),
  -- detalhamento por função: { "analisar-curriculo": 3, "carta": 1 }
  by_feature  jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  primary key (user_id, day)
);

comment on table public.ai_usage is 'Quantas vezes cada pessoa usou a IA em cada dia (horário de Brasília).';

create trigger ai_usage_updated_at before update on public.ai_usage
  for each row execute function public.set_updated_at();

/**
 * Registra uma chamada de IA do usuário logado, se ainda houver cota no dia.
 * Retorna se foi permitida, quantas chamadas já foram usadas e o limite.
 * Chamada pelas Edge Functions com o JWT do próprio usuário.
 */
create or replace function public.consume_ai_quota(p_feature text, p_daily_limit integer default 40)
returns table (allowed boolean, used integer, daily_limit integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid   uuid := auth.uid();
  v_day   date := (now() at time zone 'America/Sao_Paulo')::date;
  v_calls integer;
begin
  if v_uid is null then
    raise exception 'não autenticado' using errcode = '28000';
  end if;

  insert into public.ai_usage as u (user_id, day, calls, by_feature)
  values (v_uid, v_day, 0, '{}'::jsonb)
  on conflict (user_id, day) do nothing;

  update public.ai_usage as u
     set calls = u.calls + 1,
         by_feature = jsonb_set(u.by_feature, array[p_feature],
                        to_jsonb(coalesce((u.by_feature ->> p_feature)::int, 0) + 1))
   where u.user_id = v_uid and u.day = v_day and u.calls < p_daily_limit
  returning u.calls into v_calls;

  if v_calls is null then
    select u.calls into v_calls from public.ai_usage u where u.user_id = v_uid and u.day = v_day;
    return query select false, v_calls, p_daily_limit;
  else
    return query select true, v_calls, p_daily_limit;
  end if;
end;
$$;

revoke all on function public.consume_ai_quota(text, integer) from public, anon;
grant execute on function public.consume_ai_quota(text, integer) to authenticated;

-- ---------------------------------------------------------------------
-- RLS: cada pessoa só vê e altera o que é seu
-- ---------------------------------------------------------------------
alter table public.jobs enable row level security;
alter table public.resume_analyses enable row level security;
alter table public.cover_letters enable row level security;
alter table public.applications enable row level security;
alter table public.ai_usage enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array['jobs', 'resume_analyses', 'cover_letters', 'applications'] loop
    execute format('create policy "%1$s: ver os próprios" on public.%1$I for select to authenticated using (user_id = (select auth.uid()))', t);
    execute format('create policy "%1$s: criar os próprios" on public.%1$I for insert to authenticated with check (user_id = (select auth.uid()))', t);
    execute format('create policy "%1$s: editar os próprios" on public.%1$I for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', t);
    execute format('create policy "%1$s: excluir os próprios" on public.%1$I for delete to authenticated using (user_id = (select auth.uid()))', t);
  end loop;
end;
$$;

-- uso da IA: só leitura (a escrita passa por consume_ai_quota)
create policy "ai_usage: ver o próprio" on public.ai_usage
  for select to authenticated using (user_id = (select auth.uid()));
revoke insert, update, delete on public.ai_usage from anon, authenticated;
