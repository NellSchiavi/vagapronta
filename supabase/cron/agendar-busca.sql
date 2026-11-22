-- =====================================================================
-- Busca diária de vagas (pg_cron + pg_net).
-- Não há segredo para copiar: a migration 20261124000100_agendamento_busca.sql
-- gera o segredo do agendamento dentro do banco (Vault). Rode UMA vez, no
-- SQL Editor do projeto na nuvem ou pela CLI (README, seção 7):
--
--   npx supabase db query --linked "select public.agendar_busca_diaria('https://<ref>.supabase.co');"
-- =====================================================================

select public.agendar_busca_diaria('https://SEU-PROJETO.supabase.co');

-- Conferir:   select * from cron.job;
-- Histórico:  select * from cron.job_run_details order by start_time desc limit 5;
-- Desligar:   select cron.unschedule('vagapronta-busca-diaria');
