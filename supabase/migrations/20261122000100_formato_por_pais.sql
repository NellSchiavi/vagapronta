-- Etapa 11: formato por país
-- * currículo ganha idioma (para títulos das seções e traduções) e o layout Europass
-- * versões traduzidas pela IA ficam marcadas como "traducao"
-- * perfil ganha dados usados só em currículos de outros países (nunca vão para a IA)

alter table public.resumes
  add column if not exists language text not null default 'pt-BR';

alter table public.resumes drop constraint if exists resumes_language_check;
alter table public.resumes
  add constraint resumes_language_check check (language in ('pt-BR', 'pt-PT', 'en', 'it', 'es', 'fr', 'de', 'nl'));

alter table public.resumes drop constraint if exists resumes_template_check;
alter table public.resumes
  add constraint resumes_template_check check (template in ('classico', 'moderno', 'compacto', 'geometrico', 'europass'));

alter table public.resumes drop constraint if exists resumes_source_check;
alter table public.resumes
  add constraint resumes_source_check check (source in ('pdf', 'texto', 'linkedin', 'editor', 'adaptacao', 'traducao'));

comment on column public.resumes.language is 'Idioma do conteúdo (pt-BR, pt-PT, en, it, es, fr, de, nl)';

alter table public.profiles
  add column if not exists birth_date date,
  add column if not exists citizenships text[] not null default '{}';

comment on column public.profiles.birth_date is 'Opcional; só aparece em currículos de países onde é costume';
comment on column public.profiles.citizenships is 'Códigos ISO dos países de cidadania; só aparecem em currículos de países onde é costume';
