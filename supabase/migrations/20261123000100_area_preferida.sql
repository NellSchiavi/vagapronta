-- Busca por área: a área preferida (uma das escolhidas em "areas") ganha mais
-- peso na ordenação das vagas. As áreas conhecidas ficam em
-- supabase/functions/_shared/vagas/areas.ts (ex.: "Laboratório", "Qualidade").

alter table public.job_preferences
  add column if not exists preferred_area text;

comment on column public.job_preferences.preferred_area is 'Área preferida (nome do chip, ex.: "Qualidade"); ganha mais peso na ordenação das vagas';
