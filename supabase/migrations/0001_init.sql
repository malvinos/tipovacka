-- =============================================================================
-- Tipovačka – inicializační schéma
-- Spustit v Supabase: Dashboard → SQL Editor → vložit → Run
-- =============================================================================

-- ------------------------------------------------------------------
-- ENUM typy
-- ------------------------------------------------------------------
create type pool_status   as enum ('active', 'finished');
create type match_status  as enum ('scheduled', 'locked', 'finished');
create type match_source  as enum ('manual', 'api');

-- ------------------------------------------------------------------
-- profiles – profil uživatele (1:1 s auth.users)
-- ------------------------------------------------------------------
create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  avatar_url   text,
  is_admin     boolean not null default false,
  created_at   timestamptz not null default now()
);

-- Automaticky vytvoří profil po registraci uživatele.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Pomocná funkce: je přihlášený uživatel admin?
create or replace function public.is_admin()
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select coalesce(
    (select is_admin from public.profiles where id = auth.uid()),
    false
  );
$$;

-- ------------------------------------------------------------------
-- pools – tipovačky
-- ------------------------------------------------------------------
create table public.pools (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  description     text,
  rules           text,
  is_public       boolean not null default true,
  join_code       text,                          -- kód pro připojení k soukromé tipovačce
  status          pool_status not null default 'active',
  default_markets jsonb not null default '[]'::jsonb,  -- šablona tipovacích otázek pro nové zápasy
  created_by      uuid references public.profiles (id),
  created_at      timestamptz not null default now()
);

-- ------------------------------------------------------------------
-- pool_members – členství uživatelů v tipovačkách
-- ------------------------------------------------------------------
create table public.pool_members (
  id        uuid primary key default gen_random_uuid(),
  pool_id   uuid not null references public.pools (id) on delete cascade,
  user_id   uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  unique (pool_id, user_id)
);

-- Pomocná funkce: je uživatel členem dané tipovačky?
create or replace function public.is_pool_member(p_pool_id uuid)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from public.pool_members
    where pool_id = p_pool_id and user_id = auth.uid()
  );
$$;

-- Pomocná funkce: smí uživatel vidět tipovačku? (veřejná | člen | admin)
create or replace function public.can_see_pool(p_pool_id uuid)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select
    public.is_admin()
    or public.is_pool_member(p_pool_id)
    or exists (
      select 1 from public.pools
      where id = p_pool_id and is_public = true
    );
$$;

-- ------------------------------------------------------------------
-- matches – zápasy v tipovačce
-- ------------------------------------------------------------------
create table public.matches (
  id               uuid primary key default gen_random_uuid(),
  pool_id          uuid not null references public.pools (id) on delete cascade,
  home_team        text not null,
  away_team        text not null,
  starts_at        timestamptz not null,
  predict_deadline timestamptz,                  -- po tomto čase nejde tip měnit
  status           match_status not null default 'scheduled',
  source           match_source not null default 'manual',
  external_id      text,                         -- id z externího API (pro pozdější import)
  home_score       integer,
  away_score       integer,
  created_at       timestamptz not null default now()
);

create index matches_pool_id_idx on public.matches (pool_id);

-- ------------------------------------------------------------------
-- markets – tipovací otázky u zápasu (flexibilní typy tipů)
-- type: 'EXACT_SCORE' | 'OUTCOME_1X2' | 'FIRST_SCORER' | ...
-- ------------------------------------------------------------------
create table public.markets (
  id             uuid primary key default gen_random_uuid(),
  match_id       uuid not null references public.matches (id) on delete cascade,
  type           text not null,
  label          text,
  points_config  jsonb not null default '{}'::jsonb,  -- např. {"exact": 3, "outcome": 1}
  correct_answer jsonb,                               -- doplní admin po zápase
  created_at     timestamptz not null default now()
);

create index markets_match_id_idx on public.markets (match_id);

-- ------------------------------------------------------------------
-- predictions – tipy uživatelů
-- ------------------------------------------------------------------
create table public.predictions (
  id             uuid primary key default gen_random_uuid(),
  market_id      uuid not null references public.markets (id) on delete cascade,
  user_id        uuid not null references public.profiles (id) on delete cascade,
  value          jsonb not null,               -- např. {"home": 2, "away": 1}
  points_awarded integer,                       -- vyplní se po vyhodnocení
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (market_id, user_id)
);

create index predictions_market_id_idx on public.predictions (market_id);
create index predictions_user_id_idx on public.predictions (user_id);

-- ------------------------------------------------------------------
-- Žebříček – součet bodů na uživatele v rámci tipovačky
-- ------------------------------------------------------------------
create view public.pool_standings
with (security_invoker = true)
as
  select
    m.pool_id,
    p.user_id,
    pr.display_name,
    pr.avatar_url,
    coalesce(sum(p.points_awarded), 0) as total_points,
    count(p.points_awarded)            as scored_predictions
  from public.predictions p
  join public.markets  mk on mk.id = p.market_id
  join public.matches  m  on m.id = mk.match_id
  join public.profiles pr on pr.id = p.user_id
  group by m.pool_id, p.user_id, pr.display_name, pr.avatar_url;

-- =============================================================================
-- RLS (Row Level Security)
-- =============================================================================
alter table public.profiles     enable row level security;
alter table public.pools        enable row level security;
alter table public.pool_members enable row level security;
alter table public.matches      enable row level security;
alter table public.markets      enable row level security;
alter table public.predictions  enable row level security;

-- ---- profiles ----
create policy "Profily jsou veřejně čitelné (kvůli žebříčku)"
  on public.profiles for select using (true);

create policy "Uživatel upravuje svůj profil"
  on public.profiles for update using (auth.uid() = id);

-- ---- pools ----
create policy "Tipovačky vidí kdo na ně má právo"
  on public.pools for select using (public.can_see_pool(id));

create policy "Tipovačky spravuje jen admin"
  on public.pools for all using (public.is_admin()) with check (public.is_admin());

-- ---- pool_members ----
create policy "Členství vidí ten, kdo vidí tipovačku"
  on public.pool_members for select using (public.can_see_pool(pool_id));

create policy "Uživatel se připojí sám za sebe"
  on public.pool_members for insert with check (auth.uid() = user_id);

create policy "Uživatel se může odhlásit"
  on public.pool_members for delete using (auth.uid() = user_id or public.is_admin());

-- ---- matches ----
create policy "Zápasy vidí kdo vidí tipovačku"
  on public.matches for select using (public.can_see_pool(pool_id));

create policy "Zápasy spravuje jen admin"
  on public.matches for all using (public.is_admin()) with check (public.is_admin());

-- ---- markets ----
create policy "Markety vidí kdo vidí tipovačku"
  on public.markets for select using (
    public.can_see_pool((select pool_id from public.matches where id = match_id))
  );

create policy "Markety spravuje jen admin"
  on public.markets for all using (public.is_admin()) with check (public.is_admin());

-- ---- predictions ----
-- Vlastní tipy uživatel vidí vždy; cizí tipy až po uzamčení zápasu (proti opisování).
create policy "Tipy: vlastní vždy, cizí po uzamčení"
  on public.predictions for select using (
    auth.uid() = user_id
    or public.is_admin()
    or exists (
      select 1
      from public.markets mk
      join public.matches m on m.id = mk.match_id
      where mk.id = market_id and m.status <> 'scheduled'
    )
  );

create policy "Uživatel zakládá vlastní tip"
  on public.predictions for insert with check (auth.uid() = user_id);

create policy "Uživatel upravuje vlastní tip"
  on public.predictions for update using (auth.uid() = user_id);
