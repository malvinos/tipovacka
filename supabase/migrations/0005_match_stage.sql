-- =============================================================================
-- Tipovačka – migrace 0005: fáze / skupina u zápasu (pro turnaje)
-- Volný text, např. "Skupina A", "Osmifinále", "Finále".
-- Spustit v Supabase SQL Editoru po předchozích migracích.
-- =============================================================================

alter table public.matches
  add column if not exists stage text;
