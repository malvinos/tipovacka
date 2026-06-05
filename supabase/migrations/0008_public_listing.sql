-- =============================================================================
-- Tipovačka – migrace 0008: tipovačky vidí všichni, soukromé vyžadují kód
--
-- Změna modelu: i soukromé tipovačky jsou vidět v seznamu (název, obrázek,
-- počet členů). Obsah (zápasy/tipy) ale zůstává skrytý nečlenům (řeší RLS na
-- matches/markets přes can_see_pool). Připojení k soukromé vyžaduje kód.
-- Přístupový kód NESMÍ být veřejně čitelný → skryjeme sloupec a čteme ho jen
-- adminovi přes funkci.
-- Spustit v Supabase SQL Editoru po předchozích migracích.
-- =============================================================================

-- 1) Tipovačky (řádky) vidí všichni
drop policy if exists "Tipovačky vidí kdo na ně má právo" on public.pools;
create policy "Tipovačky vidí všichni"
  on public.pools for select using (true);

-- 2) Přístupový kód zůstane tajný (nečitelný běžným dotazem)
revoke select (join_code) on public.pools from anon, authenticated;

-- 3) Admin si kód přečte přes funkci (kvůli sdílení)
create or replace function public.get_join_code(p_pool uuid)
returns text
language sql
security definer set search_path = public
stable
as $$
  select case when public.is_admin() then join_code else null end
  from public.pools where id = p_pool;
$$;
grant execute on function public.get_join_code(uuid) to authenticated;

-- 4) Veřejné počty členů (i u soukromých), bez odhalení kdo je členem
create or replace view public.pool_member_counts as
  select pool_id, count(*)::int as members
  from public.pool_members
  group by pool_id;
grant select on public.pool_member_counts to anon, authenticated;
