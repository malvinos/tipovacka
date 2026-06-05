-- =============================================================================
-- Tipovačka – migrace 0002: admin smí přepisovat body u tipů (vyhodnocení)
-- Spustit v Supabase SQL Editoru PO migraci 0001.
-- =============================================================================

-- Admin smí upravovat libovolné tipy (kvůli zápisu spočítaných bodů).
create policy "Admin upravuje tipy (bodování)"
  on public.predictions for update
  using (public.is_admin())
  with check (public.is_admin());
