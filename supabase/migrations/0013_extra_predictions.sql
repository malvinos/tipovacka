-- =============================================================================
-- Tipovačka – migrace 0013: bonusové tipy (nejlepší střelec, nejvíc asistencí)
--
-- Volné textové tipy na úrovni turnaje (jméno hráče). Admin po skončení zadá
-- správnou odpověď a body se přičtou do žebříčku.
-- Spustit v Supabase SQL Editoru po předchozích migracích.
-- =============================================================================

-- Konfigurace bonusových tipů na úrovni tipovačky.
-- Tvar: { "scorer": {"enabled":true,"points":5,"correct":"Jméno"},
--         "assists": {"enabled":true,"points":5,"correct":"Jméno"} }
alter table public.pools
  add column if not exists extras jsonb not null default '{}'::jsonb;

create table if not exists public.extra_predictions (
  id             uuid primary key default gen_random_uuid(),
  pool_id        uuid not null references public.pools (id) on delete cascade,
  user_id        uuid not null references public.profiles (id) on delete cascade,
  kind           text not null,                -- 'scorer' | 'assists'
  answer         text not null,
  points_awarded integer,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (pool_id, user_id, kind)
);

create index if not exists extra_pool_user_idx
  on public.extra_predictions (pool_id, user_id);

alter table public.extra_predictions enable row level security;

create policy "Bonus: vlastní vždy, cizí po začátku"
  on public.extra_predictions for select using (
    auth.uid() = user_id
    or public.is_admin()
    or exists (
      select 1 from public.matches m
      where m.pool_id = extra_predictions.pool_id and m.starts_at <= now()
    )
    or exists (
      select 1 from public.pools po
      where po.id = extra_predictions.pool_id and po.status = 'finished'
    )
  );

create policy "Bonus: vlastní zakládá uživatel"
  on public.extra_predictions for insert with check (auth.uid() = user_id);

create policy "Bonus: vlastní upravuje uživatel"
  on public.extra_predictions for update using (auth.uid() = user_id);

create policy "Bonus: admin upravuje (body)"
  on public.extra_predictions for update
  using (public.is_admin()) with check (public.is_admin());

create policy "Bonus: smazat vlastní nebo admin"
  on public.extra_predictions for delete
  using (auth.uid() = user_id or public.is_admin());

-- Žebříček: zahrnout i body z bonusových tipů.
create or replace view public.pool_standings
with (security_invoker = true)
as
  with pts as (
    select m.pool_id, p.user_id, p.points_awarded
    from public.predictions p
    join public.markets mk on mk.id = p.market_id
    join public.matches m on m.id = mk.match_id
    union all
    select pp.pool_id, pp.user_id, pp.points_awarded
    from public.placement_predictions pp
    union all
    select ep.pool_id, ep.user_id, ep.points_awarded
    from public.extra_predictions ep
  )
  select
    pts.pool_id,
    pts.user_id,
    pr.display_name,
    pr.avatar_url,
    coalesce(sum(pts.points_awarded), 0) as total_points,
    count(pts.points_awarded)            as scored_predictions
  from pts
  join public.profiles pr on pr.id = pts.user_id
  group by pts.pool_id, pts.user_id, pr.display_name, pr.avatar_url;
