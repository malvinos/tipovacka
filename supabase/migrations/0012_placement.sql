-- =============================================================================
-- Tipovačka – migrace 0012: tip na konečné umístění (pořadí turnaje)
--
-- Hráč tipuje 1./2./3. místo (z týmů, které jsou v zápasech). Admin po skončení
-- zadá správné pořadí a body se přičtou do žebříčku.
-- Spustit v Supabase SQL Editoru po předchozích migracích.
-- =============================================================================

-- Nastavení umístění na úrovni tipovačky
alter table public.pools
  add column if not exists placement_enabled boolean not null default false,
  add column if not exists placement_points jsonb not null default '{"1":5,"2":3,"3":2}'::jsonb,
  add column if not exists placement_correct jsonb not null default '{}'::jsonb;

-- Tipy hráčů na umístění
create table if not exists public.placement_predictions (
  id             uuid primary key default gen_random_uuid(),
  pool_id        uuid not null references public.pools (id) on delete cascade,
  user_id        uuid not null references public.profiles (id) on delete cascade,
  position       smallint not null,            -- 1, 2, 3
  team           text not null,
  points_awarded integer,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (pool_id, user_id, position)
);

create index if not exists placement_pool_user_idx
  on public.placement_predictions (pool_id, user_id);

-- RLS
alter table public.placement_predictions enable row level security;

-- Vlastní tipy vždy; cizí až po začátku turnaje (jakmile začal nějaký zápas) nebo po ukončení.
create policy "Umístění: vlastní vždy, cizí po začátku"
  on public.placement_predictions for select using (
    auth.uid() = user_id
    or public.is_admin()
    or exists (
      select 1 from public.matches m
      where m.pool_id = placement_predictions.pool_id and m.starts_at <= now()
    )
    or exists (
      select 1 from public.pools po
      where po.id = placement_predictions.pool_id and po.status = 'finished'
    )
  );

create policy "Umístění: vlastní zakládá uživatel"
  on public.placement_predictions for insert with check (auth.uid() = user_id);

create policy "Umístění: vlastní upravuje uživatel"
  on public.placement_predictions for update using (auth.uid() = user_id);

create policy "Umístění: admin upravuje (body)"
  on public.placement_predictions for update
  using (public.is_admin()) with check (public.is_admin());

create policy "Umístění: smazat vlastní nebo admin"
  on public.placement_predictions for delete
  using (auth.uid() = user_id or public.is_admin());

-- Žebříček: zahrnout body z umístění (vedle bodů ze zápasů)
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
