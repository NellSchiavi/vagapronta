-- =====================================================================
-- VagaPronta · "Meu perfil e preferências"
-- Tudo aqui pode ser editado à mão pela pessoa. A IA e o LinkedIn só
-- SUGEREM (coluna job_preferences.suggestions) até ela confirmar.
-- Estas preferências são a base da busca de vagas e da compatibilidade.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Dados pessoais e de contato (nunca são enviados para a IA)
-- ---------------------------------------------------------------------
alter table public.profiles
  add column phone             text,
  add column contact_email     text,          -- pode ser diferente do e-mail de login
  add column residence_country text not null default 'BR',
  add column linkedin_url      text,
  -- outros links com rótulo livre: [{ "rotulo": "GitHub", "url": "https://…" }] (GitHub, portfólio, site, Lattes…)
  add column links             jsonb not null default '[]'::jsonb,
  add column avatar_path       text,          -- foto guardada no bucket "avatares"
  add column avatar_source     text check (avatar_source in ('linkedin', 'upload', 'removida')),
  add column notify_daily_jobs boolean not null default true,
  add column notify_follow_up  boolean not null default true,
  -- profissões regulamentadas (CRBM, CRM, COREN, CREA, OAB…): aparece no cabeçalho do currículo
  add column registry_council  text,          -- sigla do conselho, ex.: "CRBM"
  add column registry_number   text,          -- número do registro
  add column registry_region   text,          -- região/estado, ex.: "1ª Região" ou "SP"
  -- habilitações e especializações, ex.: análises clínicas, imagenologia, banco de sangue
  add column specializations   text[] not null default '{}',
  -- certificações e cursos: [{ "nome": "...", "emissor": "...", "validade": "AAAA-MM" | null }]
  add column certifications    jsonb not null default '[]'::jsonb,
  -- momento profissional (opcional): a IA adapta as sugestões a ele
  add column career_stage      text check (career_stage in ('na_area', 'primeiro_emprego', 'estudante', 'mudando_area', 'voltando')),
  -- para estudantes
  add column study_course      text,
  add column study_institution text,
  add column study_period      text,          -- ex.: "5º semestre"
  add column study_expected_end text;         -- previsão de conclusão, "AAAA-MM"

comment on column public.profiles.career_stage is
  'na_area = já trabalho na área; primeiro_emprego; estudante = estudante/estágio; mudando_area; voltando = voltando ao mercado.';

comment on column public.profiles.avatar_source is
  'De onde veio a foto. "upload" e "removida" impedem que o login com LinkedIn troque a foto.';

-- ---------------------------------------------------------------------
-- O que a pessoa está procurando
-- ---------------------------------------------------------------------
create table public.job_preferences (
  user_id           uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  desired_roles     text[] not null default '{}',
  areas             text[] not null default '{}',
  seniority         text[] not null default '{}'
                      check (seniority <@ array['estagio', 'trainee', 'junior', 'pleno', 'senior']),
  work_modes        text[] not null default '{}'
                      check (work_modes <@ array['presencial', 'hibrido', 'remoto']),
  cities            text[] not null default '{}',
  open_to_relocate  boolean not null default false,
  contract_types    text[] not null default '{}'
                      check (contract_types <@ array['clt', 'pj', 'estagio', 'temporario', 'freelancer']),
  salary_min        integer check (salary_min is null or salary_min >= 0),
  salary_max        integer check (salary_max is null or salary_max >= 0),
  salary_currency   text not null default 'BRL' check (salary_currency in ('BRL', 'EUR', 'USD', 'GBP', 'CHF', 'CAD')),
  keywords_include  text[] not null default '{}',
  keywords_exclude  text[] not null default '{}',
  blocked_companies text[] not null default '{}',
  -- [{ "idioma": "Inglês", "nivel": "intermediario" }]
  languages         jsonb not null default '[]'::jsonb,
  -- sugestões pendentes (da IA ou do LinkedIn), só aplicadas quando a pessoa aceitar
  suggestions       jsonb not null default '{}'::jsonb,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint job_preferences_salary_range check (salary_min is null or salary_max is null or salary_min <= salary_max)
);

comment on table public.job_preferences is 'Preferências de vaga de cada pessoa: base da busca diária e da compatibilidade.';

create trigger job_preferences_updated_at before update on public.job_preferences
  for each row execute function public.set_updated_at();

alter table public.job_preferences enable row level security;

create policy "preferências: ver as próprias" on public.job_preferences
  for select to authenticated using (user_id = (select auth.uid()));
create policy "preferências: criar as próprias" on public.job_preferences
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "preferências: editar as próprias" on public.job_preferences
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "preferências: excluir as próprias" on public.job_preferences
  for delete to authenticated using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------
-- "Onde quero trabalhar": destinos em ordem de preferência (1 = principal).
-- Diferente do "formato do currículo" (profiles.resume_country), que segue
-- o país de cada vaga. A busca diária distribui as vagas pela prioridade
-- (pesos em supabase/functions/_shared/destinos.ts).
-- ---------------------------------------------------------------------
create table public.job_destinations (
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  country_code  text not null
                  check (country_code in ('BR','EU','US','PT','IT','ES','FR','DE','CH','IE','GB','NL','BE','CA')),
  priority      smallint not null check (priority >= 1),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  primary key (user_id, country_code),
  constraint job_destinations_priority_key unique (user_id, priority)
);

comment on table public.job_destinations is 'Países/regiões onde a pessoa quer trabalhar, em ordem de preferência (EU = Europa).';

create trigger job_destinations_updated_at before update on public.job_destinations
  for each row execute function public.set_updated_at();

alter table public.job_destinations enable row level security;

create policy "destinos: ver os próprios" on public.job_destinations
  for select to authenticated using (user_id = (select auth.uid()));
create policy "destinos: criar os próprios" on public.job_destinations
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "destinos: editar os próprios" on public.job_destinations
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "destinos: excluir os próprios" on public.job_destinations
  for delete to authenticated using (user_id = (select auth.uid()));

/**
 * Grava a lista inteira de destinos na ordem recebida, de uma vez (transação),
 * para reordenar sem conflito de prioridade. Roda com as permissões de quem chama (RLS).
 */
create or replace function public.set_job_destinations(p_codes text[])
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  delete from public.job_destinations where user_id = (select auth.uid());
  insert into public.job_destinations (user_id, country_code, priority)
  select (select auth.uid()), code, ord::smallint
  from unnest(p_codes) with ordinality as t(code, ord);
end;
$$;

revoke all on function public.set_job_destinations(text[]) from public, anon;
grant execute on function public.set_job_destinations(text[]) to authenticated;

-- quem já tem perfil ganha as preferências vazias (as novas contas recebem no gatilho abaixo)
insert into public.job_preferences (user_id)
select user_id from public.profiles
on conflict (user_id) do nothing;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (user_id, full_name, email, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.email,
    coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture')
  )
  on conflict (user_id) do nothing;
  insert into public.job_preferences (user_id) values (new.id) on conflict (user_id) do nothing;
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- Storage: fotos de perfil (privado, pasta com o id de cada pessoa)
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatares', 'avatares', false, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "foto: ver a própria" on storage.objects
  for select to authenticated
  using (bucket_id = 'avatares' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "foto: enviar a própria" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatares' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "foto: atualizar a própria" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatares' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "foto: excluir a própria" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatares' and (storage.foldername(name))[1] = (select auth.uid())::text);
