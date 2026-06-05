// Vygeneruje SQL import skupinové fáze MS 2026 z openfootball datasetu.
// Použití: node scripts/generate-wc2026-sql.mjs wc2026_raw.json > supabase/import/wc2026_skupiny.sql
import fs from "node:fs";

const input = process.argv[2] ?? "wc2026_raw.json";
const data = JSON.parse(fs.readFileSync(input, "utf8"));

// Překlad anglických názvů týmů na české (sednou na vlajky v countries.ts).
const CZ = {
  Algeria: "Alžírsko",
  Argentina: "Argentina",
  Australia: "Austrálie",
  Austria: "Rakousko",
  Belgium: "Belgie",
  "Bosnia & Herzegovina": "Bosna a Hercegovina",
  Brazil: "Brazílie",
  Canada: "Kanada",
  "Cape Verde": "Kapverdy",
  Colombia: "Kolumbie",
  Croatia: "Chorvatsko",
  "Curaçao": "Curaçao",
  "Czech Republic": "Česko",
  "DR Congo": "DR Kongo",
  Ecuador: "Ekvádor",
  Egypt: "Egypt",
  England: "Anglie",
  France: "Francie",
  Germany: "Německo",
  Ghana: "Ghana",
  Haiti: "Haiti",
  Iran: "Írán",
  Iraq: "Irák",
  "Ivory Coast": "Pobřeží slonoviny",
  Japan: "Japonsko",
  Jordan: "Jordánsko",
  Mexico: "Mexiko",
  Morocco: "Maroko",
  Netherlands: "Nizozemsko",
  "New Zealand": "Nový Zéland",
  Norway: "Norsko",
  Panama: "Panama",
  Paraguay: "Paraguay",
  Portugal: "Portugalsko",
  Qatar: "Katar",
  "Saudi Arabia": "Saúdská Arábie",
  Scotland: "Skotsko",
  Senegal: "Senegal",
  "South Africa": "Jihoafrická republika",
  "South Korea": "Jižní Korea",
  Spain: "Španělsko",
  Sweden: "Švédsko",
  Switzerland: "Švýcarsko",
  Tunisia: "Tunisko",
  Turkey: "Turecko",
  USA: "USA",
  Uruguay: "Uruguay",
  Uzbekistan: "Uzbekistán",
};

function toUtcIso(date, time) {
  // time např. "13:00 UTC-6"
  const m = time.match(/^(\d{1,2}):(\d{2})\s*UTC([+-]\d{1,2})$/);
  if (!m) throw new Error("Neznámý formát času: " + time);
  const [, hh, mm, off] = m;
  const [y, mo, d] = date.split("-").map(Number);
  // UTC = local - offset
  const utc = Date.UTC(y, mo - 1, d, Number(hh) - Number(off), Number(mm));
  return new Date(utc).toISOString().replace(".000", "");
}

function cz(name) {
  return CZ[name] ?? name;
}
function esc(s) {
  return s.replace(/'/g, "''");
}

const groupMatches = data.matches.filter((m) => m.group);

const rows = groupMatches.map((m) => {
  const iso = toUtcIso(m.date, m.time);
  const stage = "Skupina " + m.group.replace("Group ", "");
  return `  ('${esc(cz(m.team1))}', '${esc(cz(m.team2))}', '${esc(stage)}', '${iso}')`;
});

const sql = `-- =============================================================================
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
${rows.join(",\n")}
  ) as t(home, away, stage, kick);

  -- Pro každý nový zápas bez tipovací otázky vytvoř výchozí (přesný výsledek).
  insert into public.markets (match_id, type, label, points_config)
  select m.id, 'EXACT_SCORE', 'Výsledek zápasu', '{"exact":3,"outcome":1}'::jsonb
  from public.matches m
  where m.pool_id = v_pool
    and not exists (select 1 from public.markets k where k.match_id = m.id);
end $$;
`;

process.stdout.write(sql);
process.stderr.write(`Vygenerováno ${rows.length} zápasů.\n`);
