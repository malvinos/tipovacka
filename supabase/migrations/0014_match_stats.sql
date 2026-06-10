-- =============================================================================
-- Tipovačka – migrace 0014: souhrnná statistika tipů u zápasu (1 / X / 2)
--
-- Vrací jen POČTY (kolik lidí tipuje výhru domácích / remízu / výhru hostů),
-- nikoliv konkrétní tipy → neporušuje skrytí cizích tipů do výkopu.
-- Pohled běží s právy vlastníka (obchází RLS), proto vrací agregát za všechny.
-- Spustit v Supabase SQL Editoru po předchozích migracích.
-- =============================================================================

create or replace view public.match_outcome_stats
with (security_invoker = false)
as
  select
    mk.match_id,
    count(*) as total,
    count(*) filter (
      where (p.value->>'home')::numeric > (p.value->>'away')::numeric
    ) as home_wins,
    count(*) filter (
      where (p.value->>'home')::numeric = (p.value->>'away')::numeric
    ) as draws,
    count(*) filter (
      where (p.value->>'home')::numeric < (p.value->>'away')::numeric
    ) as away_wins
  from public.predictions p
  join public.markets mk on mk.id = p.market_id
  where mk.type = 'EXACT_SCORE'
    and jsonb_typeof(p.value->'home') = 'number'
    and jsonb_typeof(p.value->'away') = 'number'
  group by mk.match_id;

grant select on public.match_outcome_stats to anon, authenticated;
