-- =============================================================================
-- Import skupinové fáze MS 2026 (72 zápasů) – vygenerováno z openfootball dat.
-- Časy jsou v UTC; aplikace je zobrazuje v pražském čase.
--
-- NÁVOD:
-- 1) Zjisti ID své tipovačky (Supabase → Table Editor → pools → sloupec id),
--    nebo v adminu z adresy /admin/tipovacky/<TADY-JE-ID>.
-- 2) Níže nahraď <POOL_ID> tímto ID (na dvou místech zůstává v proměnné).
-- 3) Spusť celé v Supabase → SQL Editoru.
-- =============================================================================

do $$
declare
  v_pool uuid := '<POOL_ID>';  -- <<< SEM vlož ID tipovačky
begin
  insert into public.matches (pool_id, home_team, away_team, stage, starts_at, predict_deadline)
  select v_pool, t.home, t.away, t.stage, t.kick, t.kick
  from (values
  ('Mexiko', 'Jihoafrická republika', 'Skupina A', '2026-06-11T19:00:00Z'),
  ('Jižní Korea', 'Česko', 'Skupina A', '2026-06-12T02:00:00Z'),
  ('Česko', 'Jihoafrická republika', 'Skupina A', '2026-06-18T16:00:00Z'),
  ('Mexiko', 'Jižní Korea', 'Skupina A', '2026-06-19T01:00:00Z'),
  ('Česko', 'Mexiko', 'Skupina A', '2026-06-25T01:00:00Z'),
  ('Jihoafrická republika', 'Jižní Korea', 'Skupina A', '2026-06-25T01:00:00Z'),
  ('Kanada', 'Bosna a Hercegovina', 'Skupina B', '2026-06-12T19:00:00Z'),
  ('Katar', 'Švýcarsko', 'Skupina B', '2026-06-13T19:00:00Z'),
  ('Švýcarsko', 'Bosna a Hercegovina', 'Skupina B', '2026-06-18T19:00:00Z'),
  ('Kanada', 'Katar', 'Skupina B', '2026-06-18T22:00:00Z'),
  ('Švýcarsko', 'Kanada', 'Skupina B', '2026-06-24T19:00:00Z'),
  ('Bosna a Hercegovina', 'Katar', 'Skupina B', '2026-06-24T19:00:00Z'),
  ('Brazílie', 'Maroko', 'Skupina C', '2026-06-13T22:00:00Z'),
  ('Haiti', 'Skotsko', 'Skupina C', '2026-06-14T01:00:00Z'),
  ('Skotsko', 'Maroko', 'Skupina C', '2026-06-19T22:00:00Z'),
  ('Brazílie', 'Haiti', 'Skupina C', '2026-06-20T00:30:00Z'),
  ('Skotsko', 'Brazílie', 'Skupina C', '2026-06-24T22:00:00Z'),
  ('Maroko', 'Haiti', 'Skupina C', '2026-06-24T22:00:00Z'),
  ('USA', 'Paraguay', 'Skupina D', '2026-06-13T01:00:00Z'),
  ('Austrálie', 'Turecko', 'Skupina D', '2026-06-14T04:00:00Z'),
  ('USA', 'Austrálie', 'Skupina D', '2026-06-19T19:00:00Z'),
  ('Turecko', 'Paraguay', 'Skupina D', '2026-06-20T03:00:00Z'),
  ('Turecko', 'USA', 'Skupina D', '2026-06-26T02:00:00Z'),
  ('Paraguay', 'Austrálie', 'Skupina D', '2026-06-26T02:00:00Z'),
  ('Německo', 'Curaçao', 'Skupina E', '2026-06-14T17:00:00Z'),
  ('Pobřeží slonoviny', 'Ekvádor', 'Skupina E', '2026-06-14T23:00:00Z'),
  ('Německo', 'Pobřeží slonoviny', 'Skupina E', '2026-06-20T20:00:00Z'),
  ('Ekvádor', 'Curaçao', 'Skupina E', '2026-06-21T00:00:00Z'),
  ('Curaçao', 'Pobřeží slonoviny', 'Skupina E', '2026-06-25T20:00:00Z'),
  ('Ekvádor', 'Německo', 'Skupina E', '2026-06-25T20:00:00Z'),
  ('Nizozemsko', 'Japonsko', 'Skupina F', '2026-06-14T20:00:00Z'),
  ('Švédsko', 'Tunisko', 'Skupina F', '2026-06-15T02:00:00Z'),
  ('Nizozemsko', 'Švédsko', 'Skupina F', '2026-06-20T17:00:00Z'),
  ('Tunisko', 'Japonsko', 'Skupina F', '2026-06-21T04:00:00Z'),
  ('Japonsko', 'Švédsko', 'Skupina F', '2026-06-25T23:00:00Z'),
  ('Tunisko', 'Nizozemsko', 'Skupina F', '2026-06-25T23:00:00Z'),
  ('Belgie', 'Egypt', 'Skupina G', '2026-06-15T19:00:00Z'),
  ('Írán', 'Nový Zéland', 'Skupina G', '2026-06-16T01:00:00Z'),
  ('Belgie', 'Írán', 'Skupina G', '2026-06-21T19:00:00Z'),
  ('Nový Zéland', 'Egypt', 'Skupina G', '2026-06-22T01:00:00Z'),
  ('Egypt', 'Írán', 'Skupina G', '2026-06-27T03:00:00Z'),
  ('Nový Zéland', 'Belgie', 'Skupina G', '2026-06-27T03:00:00Z'),
  ('Španělsko', 'Kapverdy', 'Skupina H', '2026-06-15T16:00:00Z'),
  ('Saúdská Arábie', 'Uruguay', 'Skupina H', '2026-06-15T22:00:00Z'),
  ('Španělsko', 'Saúdská Arábie', 'Skupina H', '2026-06-21T16:00:00Z'),
  ('Uruguay', 'Kapverdy', 'Skupina H', '2026-06-21T22:00:00Z'),
  ('Kapverdy', 'Saúdská Arábie', 'Skupina H', '2026-06-27T00:00:00Z'),
  ('Uruguay', 'Španělsko', 'Skupina H', '2026-06-27T00:00:00Z'),
  ('Francie', 'Senegal', 'Skupina I', '2026-06-16T19:00:00Z'),
  ('Irák', 'Norsko', 'Skupina I', '2026-06-16T22:00:00Z'),
  ('Francie', 'Irák', 'Skupina I', '2026-06-22T21:00:00Z'),
  ('Norsko', 'Senegal', 'Skupina I', '2026-06-23T00:00:00Z'),
  ('Norsko', 'Francie', 'Skupina I', '2026-06-26T19:00:00Z'),
  ('Senegal', 'Irák', 'Skupina I', '2026-06-26T19:00:00Z'),
  ('Argentina', 'Alžírsko', 'Skupina J', '2026-06-17T01:00:00Z'),
  ('Rakousko', 'Jordánsko', 'Skupina J', '2026-06-17T04:00:00Z'),
  ('Argentina', 'Rakousko', 'Skupina J', '2026-06-22T17:00:00Z'),
  ('Jordánsko', 'Alžírsko', 'Skupina J', '2026-06-23T03:00:00Z'),
  ('Alžírsko', 'Rakousko', 'Skupina J', '2026-06-28T02:00:00Z'),
  ('Jordánsko', 'Argentina', 'Skupina J', '2026-06-28T02:00:00Z'),
  ('Portugalsko', 'DR Kongo', 'Skupina K', '2026-06-17T17:00:00Z'),
  ('Uzbekistán', 'Kolumbie', 'Skupina K', '2026-06-18T02:00:00Z'),
  ('Portugalsko', 'Uzbekistán', 'Skupina K', '2026-06-23T17:00:00Z'),
  ('Kolumbie', 'DR Kongo', 'Skupina K', '2026-06-24T02:00:00Z'),
  ('Kolumbie', 'Portugalsko', 'Skupina K', '2026-06-27T23:30:00Z'),
  ('DR Kongo', 'Uzbekistán', 'Skupina K', '2026-06-27T23:30:00Z'),
  ('Anglie', 'Chorvatsko', 'Skupina L', '2026-06-17T20:00:00Z'),
  ('Ghana', 'Panama', 'Skupina L', '2026-06-17T23:00:00Z'),
  ('Anglie', 'Ghana', 'Skupina L', '2026-06-23T20:00:00Z'),
  ('Panama', 'Chorvatsko', 'Skupina L', '2026-06-23T23:00:00Z'),
  ('Panama', 'Anglie', 'Skupina L', '2026-06-27T21:00:00Z'),
  ('Chorvatsko', 'Ghana', 'Skupina L', '2026-06-27T21:00:00Z')
  ) as t(home, away, stage, kick);

  -- Pro každý nový zápas bez tipovací otázky vytvoř výchozí (přesný výsledek).
  insert into public.markets (match_id, type, label, points_config)
  select m.id, 'EXACT_SCORE', 'Výsledek zápasu', '{"exact":3,"outcome":1}'::jsonb
  from public.matches m
  where m.pool_id = v_pool
    and not exists (select 1 from public.markets k where k.match_id = m.id);
end $$;
