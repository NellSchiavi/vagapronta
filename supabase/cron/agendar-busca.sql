-- =====================================================================
-- Busca diária de vagas (pg_cron + pg_net) — rode UMA vez no SQL Editor
-- do projeto na nuvem (README, seção 7). Troque os dois valores abaixo.
-- Os valores ficam no Vault do Supabase (criptografados), não no git.
-- =====================================================================

-- 1) endereço do projeto e o mesmo CRON_SECRET configurado nos secrets das Edge Functions
select vault.create_secret('https://SEU-PROJETO.supabase.co', 'vp_project_url');
select vault.create_secret('COLE-AQUI-O-CRON_SECRET', 'vp_cron_secret');

-- 2) todos os dias às 10h UTC (7h em Brasília)
select cron.schedule(
  'vagapronta-busca-diaria',
  '0 10 * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'vp_project_url') || '/functions/v1/buscar-vagas',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'vp_cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 150000
  );
  $$
);

-- Conferir:   select * from cron.job;
-- Histórico:  select * from cron.job_run_details order by start_time desc limit 5;
-- Desligar:   select cron.unschedule('vagapronta-busca-diaria');
