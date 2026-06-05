-- =============================================================================
-- Tipovačka – migrace 0003: oprávnění (GRANT) pro role anon a authenticated
--
-- Bez těchto GRANTů vrací databáze "permission denied for table ...".
-- Skutečné omezení přístupu řeší RLS politiky z migrace 0001/0002 – tyto
-- GRANTy jen otevírají tabulky rolím, RLS pak filtruje řádky a operace.
-- Spustit v Supabase SQL Editoru PO migraci 0001 a 0002.
-- =============================================================================

grant usage on schema public to anon, authenticated;

-- Tabulky
grant select, insert, update, delete
  on all tables in schema public
  to anon, authenticated;

-- Sekvence (kdyby nějaké vznikly)
grant usage, select
  on all sequences in schema public
  to anon, authenticated;

-- Aby i budoucí tabulky/sekvence dostaly oprávnění automaticky
alter default privileges in schema public
  grant select, insert, update, delete on tables to anon, authenticated;
alter default privileges in schema public
  grant usage, select on sequences to anon, authenticated;
