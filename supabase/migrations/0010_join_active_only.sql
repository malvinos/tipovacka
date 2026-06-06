-- =============================================================================
-- Tipovačka – migrace 0010: do ukončené tipovačky se nelze připojit přes kód
-- Aktualizuje join_pool_by_code, aby přijímala jen aktivní tipovačky.
-- Spustit v Supabase SQL Editoru po předchozích migracích.
-- =============================================================================

create or replace function public.join_pool_by_code(p_code text)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_pool uuid;
begin
  if auth.uid() is null then
    raise exception 'Není přihlášený uživatel';
  end if;

  select id into v_pool
  from public.pools
  where join_code is not null
    and join_code = p_code
    and status <> 'finished'
  limit 1;

  if v_pool is null then
    return null;  -- neplatný kód nebo ukončená tipovačka
  end if;

  insert into public.pool_members (pool_id, user_id)
  values (v_pool, auth.uid())
  on conflict (pool_id, user_id) do nothing;

  return v_pool;
end;
$$;
