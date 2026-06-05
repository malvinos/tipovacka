-- =============================================================================
-- Tipovačka – migrace 0004: příznak dokončeného uvítání (onboarding)
-- Spustit v Supabase SQL Editoru po předchozích migracích.
-- =============================================================================

alter table public.profiles
  add column if not exists onboarded boolean not null default false;
