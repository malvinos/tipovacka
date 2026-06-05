# Tipovačka – poznámky k projektu

> Živý dokument. Zaznamenávám sem všechny poznatky, rozhodnutí a nápady, které během vývoje zazní.
> Poslední aktualizace: 2026-06-04

## Kontext a historie

- Původně byl záměr postavit **Discord bota** na tipování výsledků.
- Od Discord bota se ustoupilo – **web je vhodnější platforma** pro postupné rozšiřování celého systému tipování.
- Cíl: vytvořit **web pro tipování** s admin panelem, který půjde časem rozšiřovat.

## Hlavní požadavky (od uživatele)

### Autentizace / registrace
- Klasická registrace přes **e-mail**.
- Přihlášení přes **Google** (chtěné).
- Přihlášení přes **Discord** (chtěné).
- Apple – zatím nejisté, uvidíme jak to vyjde (možná později).

### Design
- **Čistý, moderní design.**

### Funkcionality (zatím)
- **Admin panel** (správa systému).
- **Zobrazení aktivních tipovaček.**
- Možnost mít tipovačku **soukromou** nebo **veřejnou**.
- **Detail tipovačky** obsahuje:
  - **Pravidla tipování.**
  - **Seznam zápasů** (hlavní část).
  - **Celkový žebříček.**

## Rozhodnutí o architektuře

### Zadávání zápasů: **Kombinace**
- Start: zápasy zakládá a výsledky vyplňuje **admin ručně** v panelu.
- Později: rozšíření o napojení na **sportovní API** (automatické rozpisy a výsledky).
- → Datový model navrhnout tak, aby zápas mohl mít zdroj `manual` i `api` (připravit na pozdější import).

### Bodování: **flexibilní / konfigurovatelné per tipovačka**
- Každá tipovačka si nastaví, **co se tipuje** a jak se boduje. Příklady typů tipů:
  - přesný výsledek (skóre),
  - vítěz / remíza (1X2),
  - první střelec,
  - (a další – systém musí jít rozšiřovat).
- → Klíčový princip: **typy tipů a jejich bodování jsou data, ne natvrdo zadrátovaný kód.**
  - Tipovačka definuje sadu „pravidel/tipovacích polí“ se způsobem výpočtu bodů.
  - Architektura: generický model „market / tip type“ (např. `match_result`, `first_scorer`) + konfigurace bodů na úrovni tipovačky.

### Technologický stack
- **Backend/DB/Auth: Supabase** (free tier stačí pro start).
  - Free tier je pro všechny (ne jen studenty): Postgres 500 MB, auth ~50k MAU, 1 GB storage.
  - Zabudovaná auth: e-mail + Google + Discord (+ Apple) → pokrývá požadované přihlašování.
  - Pozor: na free plánu se projekt po ~7 dnech nečinnosti uspí.
  - Pozn.: GitHub Student Pack může dát kredity navíc, ale pro start netřeba.
- **Frontend + serverová logika: Next.js (React)** – potvrzeno. Píšeme my; zvládá web i API (přepočet bodů, ověření kódu k soukromé tipovačce). Čistý moderní design, hosting Vercel (zdarma).
- Shrnutí stacku: **Next.js (náš kód) + Supabase (hotová auth + DB + storage).**

### Soukromá tipovačka: **přístup přes kód**
- Veřejná tipovačka je vidět/přístupná všem.
- Soukromá tipovačka má **přístupový kód** – uživatel se připojí jen po jeho zadání.

### Role
- Prozatím **jediný globální admin = vlastník projektu** (já). Žádný složitý systém rolí.
- **Tipovačky zakládá pouze admin.** Běžní uživatelé se jen připojují (veřejné) / přes kód (soukromé) a tipují.

## Datový model (návrh)

Myšlenka: zápas nemá tip „natvrdo“, ale **jednu či víc tipovacích otázek (markety)**. Každá
otázka má typ, vlastní bodování a po zápase správnou odpověď → aplikace porovná tip a přidělí
body. Nový typ tipu = jen nová logika výpočtu + UI, databáze se nemění.

### Tabulky

- **profiles** – profil uživatele (navázáno na Supabase `auth.users`)
  - `user_id` (PK, FK auth.users), `display_name`, `avatar_url`, `is_admin`, `created_at`
- **pools** – tipovačka
  - `id`, `name`, `description`, `rules` (text), `is_public` (bool), `join_code` (kód pro soukromé),
    `status` (`active`/`finished`), `default_markets` (JSON šablona otázek+bodů), `created_at`
- **pool_members** – členství
  - `id`, `pool_id`, `user_id`, `joined_at`; UNIQUE(`pool_id`,`user_id`)
- **matches** – zápasy
  - `id`, `pool_id`, `home_team`, `away_team`, `starts_at`, `predict_deadline`,
    `status` (`scheduled`/`locked`/`finished`), `source` (`manual`/`api`), `external_id`,
    `home_score`, `away_score`, `created_at`
- **markets** – tipovací otázky u zápasu (flexibilní část)
  - `id`, `match_id`, `type` (`EXACT_SCORE`/`OUTCOME_1X2`/`FIRST_SCORER`/…), `label`,
    `points_config` (JSON), `correct_answer` (JSON, doplní admin po zápase)
- **predictions** – tipy uživatelů
  - `id`, `market_id`, `user_id`, `value` (JSON), `points_awarded`, `created_at`, `updated_at`;
    UNIQUE(`market_id`,`user_id`)

### Žebříček
- Databázový pohled (view): součet `predictions.points_awarded` na uživatele v rámci tipovačky.

### Bodování (rozhodnuto)
- Výchozí model: **přesný výsledek + směr.**
  - Přesné skóre = víc bodů (default např. 3), správný vítěz/remíza = míň (default např. 1).
  - Uloženo v `markets.points_config` (JSON), takže lze časem přenastavit per tipovačka.

### Stavy / pravidla
- Po `predict_deadline` už nejde tip měnit; zápas: `scheduled → locked → finished`.
- Šablona otázek (`pools.default_markets`) – nový zápas z ní automaticky vytvoří markety
  (jdou ručně přepsat), ať admin neklikà dokola.
- `matches.source = manual/api` připravuje pozdější import zápasů z API.

## Otevřené otázky / k rozhodnutí

- [ ] Konkrétní výchozí počty bodů (přesný / směr) – předběžně 3 / 1.
- [ ] Sdílí se zápasy mezi tipovačkami, nebo má každá tipovačka vlastní (zatím: vlastní per pool).

## Vyřešeno

- Apple přihlášení – **vynecháno** (placený Apple Developer účet, není potřeba).

## Stav implementace

- ✅ Node.js LTS (v24) + npm nainstalováno přes winget.
- ✅ Next.js 16 projekt (TypeScript, App Router, Tailwind v4, src/, alias `@/*`).
- ✅ Supabase balíčky (`@supabase/supabase-js`, `@supabase/ssr`).
- ✅ Supabase klienti: `src/lib/supabase/client.ts` (browser), `server.ts` (server), `middleware.ts` (session).
- ✅ `src/proxy.ts` – obnova session (Next 16 nahradil `middleware` → `proxy`).
- ✅ `.env.local` – Supabase URL + anon klíč (service_role klíč je třeba doplnit).
- ✅ SQL migrace `supabase/migrations/0001_init.sql` – schéma + RLS + view žebříčku.
- ✅ UI: layout + header, `/prihlaseni` (e-mail/heslo + Google/Discord), `/auth/callback`,
  `/odhlaseni`, domovská stránka (seznam tipovaček), `/tipovacky/[id]` (pravidla + zápasy + žebříček).
- ✅ Build i dev server běží (HTTP 200).
- ✅ Přepínač světlý/tmavý režim (`next-themes`, výchozí světlý, volba se pamatuje).
  Komponenty `ThemeProvider.tsx`, `ThemeToggle.tsx`; tmavé barvy přes třídu `.dark` v `globals.css`.
- ✅ Admin panel (`/admin`, přístup jen pro `is_admin`):
  - přehled tipovaček, vytvoření nové, úprava nastavení (vč. JSON šablony otázek),
  - přidání zápasu (auto-vytvoří tipovací otázky ze šablony), smazání zápasu,
  - zadání výsledku → automatický přepočet bodů hráčům (`src/lib/scoring.ts`).
  - Serverové akce: `src/app/admin/actions.ts`; kontrola admina: `src/lib/auth.ts`.
- ✅ Migrace `0002_admin_scoring.sql` – admin smí zapisovat body do cizích tipů.
- ✅ Migrace `0003_grants.sql` – GRANT oprávnění pro role `anon`/`authenticated`.
  POZOR (poznatek z provozu): bez těchto GRANTů Supabase vrací
  „permission denied for table …" a aplikace nepřečte žádnou tabulku.
  RLS jen filtruje řádky; přístup k tabulce musí povolit GRANT.

### Ještě potřebuje udělat uživatel (v Supabase dashboardu)
- [ ] Spustit SQL migraci (SQL Editor → vložit obsah `0001_init.sql` → Run).
- [ ] Zapnout přihlašovací providery: Email, Google, Discord (Authentication → Providers).
- [ ] Nastavit Redirect URL: `http://localhost:3000/auth/callback`.
- [ ] Doplnit `SUPABASE_SERVICE_ROLE_KEY` do `.env.local`.
- [ ] Nastavit sám sebe jako admina (`update profiles set is_admin = true ...`).

- ✅ Uživatelská část tipování (`src/app/tipovacky/actions.ts` + detail tipovačky):
  - připojení do tipovačky (veřejná = klik, soukromá = kód),
  - zadání/změna tipu u zápasu do uzávěrky, pak zámek + zobrazení bodů,
  - podpora typů EXACT_SCORE / OUTCOME_1X2 / FIRST_SCORER ve formuláři.
- ✅ Detail tipovačky se záložkami (layout + `PoolTabs.tsx`): Zápasy + Žebříček.
  Pravidla jsou na stránce Zápasy (rozbalovací karta nad zápasy).
- ✅ Profil hráče (`/profil`): nastavení přezdívky (display_name), kterou ukazuje žebříček.
  Jméno v hlavičce odkazuje na profil.
- ✅ Onboarding (`/vitej`): po 1. přihlášení se vyžádá přezdívka. Příznak `profiles.onboarded`
  (migrace `0004_onboarding.sql`); guard v `src/lib/supabase/middleware.ts` přesměruje
  nepřihl.→ /vitej. Funguje pro e-mail i budoucí OAuth (jedno místo).

- ✅ Vizuální vylepšení (1. kolo): barevné stavy zápasů (otevřený/uzamčený/dohraný)
  vč. proužku u karty, ikony týmů (`TeamBadge.tsx` – iniciály + barva z názvu),
  jemné animace (`fade-in`, hover). Štítky `badge-success/-warning/-info` v `globals.css`.

- ✅ Fáze/skupiny u zápasů (turnaje): sloupec `matches.stage` (migrace `0005_match_stage.sql`),
  admin vyplňuje volný text (Skupina A / Osmifinále…). Detail tipovačky seskupuje zápasy
  Karta zápasu vyčleněna do komponenty `MatchCard` v `tipovacky/[id]/page.tsx`.
  ČLENĚNÍ: primárně podle DATA (oddělovače dnů, chronologicky), fáze/skupina se ukazuje
  jako štítek přímo na kartě zápasu (badge-info).

## Nápady na pozdější rozšíření

- Tabulky skupin (týmy, body, skóre) – zatím jen členění zápasů.
- Napojení na sportovní API (zdroj `api`).
- Automatický přechod zápasu do stavu `locked` po uzávěrce (zatím se řeší jen v UI/akcích).
- Stránka „moje tipovačky“, notifikace, profil/přezdívka.
- Další typy tipů (počet gólů, poločas, …) přes šablonu `default_markets`.
- Pozvánky do soukromé tipovačky odkazem.

## Rozhodnutí (changelog)

- 2026-06-04 – Opuštěn Discord bot, zvolena webová platforma.
- 2026-06-04 – Zápasy: kombinace (ruční start, API později).
- 2026-06-04 – Bodování: flexibilní, konfigurovatelné per tipovačka (typy tipů jako data).
- 2026-06-04 – Stack: Supabase (auth + DB), předběžně Next.js frontend.
- 2026-06-04 – Stack potvrzen: Next.js + Supabase. Apple auth vynecháno.
- 2026-06-04 – Soukromá tipovačka = přístup přes kód. Admin prozatím jen vlastník projektu.
- 2026-06-04 – Tipovačky zakládá pouze admin (ne běžní uživatelé).
- 2026-06-04 – Navržen datový model (markety = flexibilní tipovací otázky). Bodování: přesný výsledek + směr.
