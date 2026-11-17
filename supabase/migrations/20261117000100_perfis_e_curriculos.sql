-- =====================================================================
-- VagaPronta · perfis, currículos e armazenamento de PDFs
-- Cada pessoa só enxerga e altera os próprios dados (RLS por auth.uid()).
-- =====================================================================

-- Atualiza updated_at automaticamente em qualquer tabela
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- profiles: um por usuário
-- ---------------------------------------------------------------------
create table public.profiles (
  user_id         uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  full_name       text,
  email           text,
  avatar_url      text,
  desired_role    text,
  city            text,
  resume_country  text not null default 'BR' check (resume_country in ('BR', 'US', 'DE', 'CH')),
  preferences     jsonb not null default '{}'::jsonb,
  onboarded_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

comment on table public.profiles is 'Dados do perfil de cada pessoa (nome, cargo desejado, cidade, país do currículo).';

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;

create policy "perfil: ver o próprio" on public.profiles
  for select to authenticated using (user_id = (select auth.uid()));
create policy "perfil: criar o próprio" on public.profiles
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "perfil: editar o próprio" on public.profiles
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "perfil: excluir o próprio" on public.profiles
  for delete to authenticated using (user_id = (select auth.uid()));

-- Cria o perfil no primeiro login, aproveitando nome, e-mail e foto do LinkedIn
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
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- resumes: currículos e suas versões
-- content (jsonb) guarda as seções; ver src/lib/resume.ts
-- ---------------------------------------------------------------------
create table public.resumes (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title         text not null default 'Meu currículo',
  template      text not null default 'classico'
                  check (template in ('classico', 'moderno', 'compacto', 'geometrico')),
  country       text not null default 'BR' check (country in ('BR', 'US', 'DE', 'CH')),
  content       jsonb not null default '{}'::jsonb,
  source        text not null default 'texto'
                  check (source in ('pdf', 'texto', 'linkedin', 'editor', 'adaptacao')),
  file_path     text,          -- PDF original no Storage (bucket "curriculos")
  is_principal  boolean not null default false,
  job_id        uuid,          -- vaga à qual a versão adaptada pertence (FK criada junto com a tabela jobs)
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table public.resumes is 'Currículos de cada pessoa; versões adaptadas apontam para a vaga em job_id.';

create index resumes_user_idx on public.resumes (user_id, updated_at desc);
-- no máximo um currículo principal por pessoa
create unique index resumes_one_principal_idx on public.resumes (user_id) where is_principal;

create trigger resumes_updated_at
  before update on public.resumes
  for each row execute function public.set_updated_at();

-- Ao marcar um currículo como principal, desmarca os outros
create or replace function public.resumes_single_principal()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.is_principal then
    update public.resumes
       set is_principal = false
     where user_id = new.user_id
       and id <> new.id
       and is_principal;
  end if;
  return new;
end;
$$;

create trigger resumes_single_principal
  before insert or update of is_principal on public.resumes
  for each row when (new.is_principal) execute function public.resumes_single_principal();

alter table public.resumes enable row level security;

create policy "currículo: ver os próprios" on public.resumes
  for select to authenticated using (user_id = (select auth.uid()));
create policy "currículo: criar os próprios" on public.resumes
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "currículo: editar os próprios" on public.resumes
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "currículo: excluir os próprios" on public.resumes
  for delete to authenticated using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------
-- Storage: bucket privado de PDFs. Cada pessoa usa a pasta com o próprio id:
--   curriculos/<user_id>/<arquivo>.pdf  (acesso por URL assinada)
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('curriculos', 'curriculos', false, 10485760, array['application/pdf'])
on conflict (id) do nothing;

create policy "pdf: ver os próprios" on storage.objects
  for select to authenticated
  using (bucket_id = 'curriculos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "pdf: enviar os próprios" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'curriculos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "pdf: atualizar os próprios" on storage.objects
  for update to authenticated
  using (bucket_id = 'curriculos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "pdf: excluir os próprios" on storage.objects
  for delete to authenticated
  using (bucket_id = 'curriculos' and (storage.foldername(name))[1] = (select auth.uid())::text);
