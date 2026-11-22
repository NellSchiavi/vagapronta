-- =====================================================================
-- Busca diária de vagas (pg_cron + pg_net) sem segredo manual:
--  * o segredo do agendamento é gerado aqui dentro, aleatório, e fica no
--    Vault (criptografado). Ninguém precisa copiar ou colar esse valor.
--  * a função buscar-vagas confere o cabeçalho x-cron-secret chamando
--    public.cron_secret_ok (só a service_role pode chamar).
--  * para ligar na nuvem, rode UMA vez (já feito na publicação):
--      select public.agendar_busca_diaria('https://<projeto>.supabase.co');
-- =====================================================================

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

/** O segredo recebido é o do agendamento? */
create or replace function public.cron_secret_ok(secret text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  -- "cron_secret_ok.secret" = o parâmetro (a view do Vault também tem uma coluna "secret")
  select coalesce(length(cron_secret_ok.secret) >= 32, false)
     and exists (
       select 1 from vault.decrypted_secrets d
       where d.name = 'vp_cron_secret' and d.decrypted_secret = cron_secret_ok.secret
     );
$$;

revoke all on function public.cron_secret_ok(text) from public, anon, authenticated;
grant execute on function public.cron_secret_ok(text) to service_role;

comment on function public.cron_secret_ok(text) is 'Confere o segredo do agendamento diário (Vault: vp_cron_secret). Só service_role.';

/** Liga (ou atualiza) a busca diária: todos os dias às 10h UTC (7h em Brasília) */
create or replace function public.agendar_busca_diaria(project_url text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if project_url !~ '^https://[a-z0-9]+\.supabase\.co$' then
    raise exception 'Endereço inválido: use https://<projeto>.supabase.co';
  end if;

  select id into v_id from vault.secrets where name = 'vp_project_url';
  if v_id is null then
    perform vault.create_secret(project_url, 'vp_project_url');
  else
    perform vault.update_secret(v_id, project_url);
  end if;

  -- segredo aleatório, gerado uma vez e guardado só no Vault
  if not exists (select 1 from vault.secrets where name = 'vp_cron_secret') then
    perform vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'vp_cron_secret');
  end if;

  -- mesmo nome = atualiza o agendamento existente
  perform cron.schedule(
    'vagapronta-busca-diaria',
    '0 10 * * *',
    $job$
    select net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'vp_project_url') || '/functions/v1/buscar-vagas',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'vp_cron_secret')
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 150000
    );
    $job$
  );
  return 'Busca diária agendada para 10h UTC (7h em Brasília).';
end;
$$;

revoke all on function public.agendar_busca_diaria(text) from public, anon, authenticated;

comment on function public.agendar_busca_diaria(text) is 'Agenda a busca diária de vagas (pg_cron). Rodar uma vez no projeto da nuvem.';
