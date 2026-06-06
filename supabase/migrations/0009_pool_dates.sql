-- =============================================================================
-- Tipovačka – migrace 0009: ruční termín konání tipovačky
--
-- Umožní adminovi nastavit datum od–do (např. když ještě nejsou vypsané
-- zápasy playoff). Pokud je vyplněno, použije se přednostně před odvozeným
-- termínem ze zápasů.
-- Spustit v Supabase SQL Editoru po předchozích migracích.
-- =============================================================================

alter table public.pools
  add column if not exists event_start date,
  add column if not exists event_end date;
