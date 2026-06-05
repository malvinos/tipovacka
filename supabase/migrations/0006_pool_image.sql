-- =============================================================================
-- Tipovačka – migrace 0006: obrázek tipovačky (URL)
-- Spustit v Supabase SQL Editoru po předchozích migracích.
-- =============================================================================

alter table public.pools
  add column if not exists image_url text;
