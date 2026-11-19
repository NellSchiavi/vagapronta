-- =====================================================================
-- Cota diária de IA:
--  - guarda o limite do dia na própria linha (a tela mostra "restam N usos hoje");
--  - estorno: chamada de IA que FALHA (erro, 429, 503, tempo esgotado) não conta.
-- =====================================================================

alter table public.ai_usage add column if not exists daily_limit integer not null default 40 check (daily_limit > 0);

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

  insert into public.ai_usage as u (user_id, day, calls, by_feature, daily_limit)
  values (v_uid, v_day, 0, '{}'::jsonb, p_daily_limit)
  on conflict (user_id, day) do update set daily_limit = excluded.daily_limit;

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

/** Devolve uma chamada à cota do dia (a chamada de IA falhou). */
create or replace function public.refund_ai_quota(p_feature text)
returns integer
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
  update public.ai_usage as u
     set calls = greatest(u.calls - 1, 0),
         by_feature = case
           when coalesce((u.by_feature ->> p_feature)::int, 0) > 0
             then jsonb_set(u.by_feature, array[p_feature], to_jsonb((u.by_feature ->> p_feature)::int - 1))
           else u.by_feature
         end
   where u.user_id = v_uid and u.day = v_day and u.calls > 0
  returning u.calls into v_calls;
  return coalesce(v_calls, 0);
end;
$$;

revoke all on function public.refund_ai_quota(text) from public, anon;
grant execute on function public.refund_ai_quota(text) to authenticated;
