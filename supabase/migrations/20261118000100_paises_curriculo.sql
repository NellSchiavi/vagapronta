-- =====================================================================
-- VagaPronta · mais países para o currículo
-- Lista oficial: supabase/functions/_shared/paises.ts (manter igual).
-- EU = Europa (formato Europass)
-- =====================================================================

alter table public.profiles drop constraint if exists profiles_resume_country_check;
alter table public.profiles add constraint profiles_resume_country_check
  check (resume_country in ('BR','EU','US','PT','IT','ES','FR','DE','CH','IE','GB','NL','BE','CA'));

alter table public.resumes drop constraint if exists resumes_country_check;
alter table public.resumes add constraint resumes_country_check
  check (country in ('BR','EU','US','PT','IT','ES','FR','DE','CH','IE','GB','NL','BE','CA'));

comment on column public.profiles.preferences is
  'Preferências livres. Ex.: { "resume_language": "it" } = idioma escolhido para o currículo.';
