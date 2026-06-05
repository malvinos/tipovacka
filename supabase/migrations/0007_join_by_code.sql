-- =============================================================================
-- Tipovačka – migrace 0007: připojení do (soukromé) tipovačky přes kód
--
-- Problém: RLS nepustí nečlena ani přečíst soukromou tipovačku, takže se
-- nemůže připojit. Tato funkce (SECURITY DEFINER) najde tipovačku podle kódu
-- a přidá přihlášeného uživatele jako člena – obejde RLS jen pro tento účel.
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
  limit 1;

  if v_pool is null then
    return null;  -- neplatný kód
  end if;

  insert into public.pool_members (pool_id, user_id)
  values (v_pool, auth.uid())
  on conflict (pool_id, user_id) do nothing;

  return v_pool;
end;
$$;

grant execute on function public.join_pool_by_code(text) to authenticated;
