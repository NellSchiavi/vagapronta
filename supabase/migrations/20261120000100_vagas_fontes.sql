-- =====================================================================
-- VagaPronta · vagas sugeridas (Etapa 9)
-- Fontes 100% gratuitas e permitidas pelos termos (ver README, seção 6.2).
-- A Adzuna fica no código, desligada (não é gratuita).
-- =====================================================================

-- novas origens de vaga
alter table public.jobs drop constraint if exists jobs_source_check;
alter table public.jobs add constraint jobs_source_check
  check (source in ('jobicy', 'himalayas', 'arbeitnow', 'remotive', 'jooble', 'usajobs', 'adzuna', 'exemplo', 'link', 'manual'));

alter table public.jobs
  add column destination        text,            -- destino da pessoa que esta vaga atende (BR, EU, PT…)
  add column country            text,            -- país da vaga, quando informado
  add column language_required  text,            -- idioma exigido (vagas no exterior)
  add column visa_sponsorship   boolean,         -- oferece visto / relocation
  add column remote_from_brazil boolean,         -- dá para trabalhar remoto a partir do Brasil
  add column source_url         text;            -- página da fonte (atribuição exigida pelos termos)

comment on column public.jobs.source_url is 'Link para a fonte original (Jobicy, Himalayas…). Mostrado no card como atribuição.';

create index jobs_user_destination_idx on public.jobs (user_id, destination) where status <> 'descartada';

-- ---------------------------------------------------------------------
-- Cache das fontes externas: cada consulta (ex.: "jobicy:brazil:data")
-- fica guardada e é reaproveitada por todos até vencer o intervalo mínimo
-- que os termos pedem (Jobicy: 1 h; Remotive: no máx. 4 vezes por dia).
-- Só a Edge Function (chave de serviço) lê e grava: sem políticas de RLS.
-- ---------------------------------------------------------------------
create table public.source_cache (
  key         text primary key,
  jobs        jsonb not null default '[]'::jsonb,
  fetched_at  timestamptz not null default now()
);
alter table public.source_cache enable row level security;

-- ---------------------------------------------------------------------
-- Registro de cada busca (diária ou "Buscar agora")
-- ---------------------------------------------------------------------
create table public.job_search_runs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  trigger     text not null check (trigger in ('agendada', 'manual')),
  found       integer not null default 0,
  inserted    integer not null default 0,
  sources     jsonb not null default '{}'::jsonb,   -- { "jobicy": 12, "himalayas": 0, … }
  mode        text not null default 'real' check (mode in ('real', 'exemplo')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index job_search_runs_user_idx on public.job_search_runs (user_id, created_at desc);
create trigger job_search_runs_updated_at before update on public.job_search_runs
  for each row execute function public.set_updated_at();
alter table public.job_search_runs enable row level security;
create policy "buscas: ver as próprias" on public.job_search_runs
  for select to authenticated using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------
-- Agendamento diário: extensões para o cron chamar a Edge Function.
-- O agendamento em si é criado pelo script supabase/cron/agendar-busca.sql
-- (precisa da URL do projeto e de um segredo — veja o README, seção 7).
-- ---------------------------------------------------------------------
create extension if not exists pg_cron;
create extension if not exists pg_net;
