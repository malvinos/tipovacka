-- =============================================================================
-- Tipovačka – migrace 0011: cizí tipy viditelné po začátku zápasu / uzávěrce
--
-- Původně se cizí tipy odhalily až když zápas nebyl 'scheduled' (tj. po zadání
-- výsledku). Nově se odhalí i po uplynutí uzávěrky nebo po začátku zápasu –
-- aby šly „tipy ostatních" zobrazit hned po zamčení, ne až po výsledku.
-- Vlastní tip vidí uživatel vždy. Spustit po předchozích migracích.
-- =============================================================================

drop policy if exists "Tipy: vlastní vždy, cizí po uzamčení" on public.predictions;

create policy "Tipy: vlastní vždy, cizí po uzamčení"
  on public.predictions for select using (
    auth.uid() = user_id
    or public.is_admin()
    or exists (
      select 1
      from public.markets mk
      join public.matches m on m.id = mk.match_id
      where mk.id = market_id
        and (
          m.status <> 'scheduled'
          or m.starts_at <= now()
          or (m.predict_deadline is not null and m.predict_deadline <= now())
        )
    )
  );
