"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { correctAnswerFromResult, scorePrediction } from "@/lib/scoring";

/** Výchozí šablona tipovacích otázek pro nové tipovačky. */
const DEFAULT_MARKETS = [
  {
    type: "EXACT_SCORE",
    label: "Výsledek zápasu",
    points_config: { exact: 3, outcome: 1 },
  },
];

function str(v: FormDataEntryValue | null): string {
  return typeof v === "string" ? v.trim() : "";
}

/** Sestaví šablonu otázek (bodování) z formuláře. */
function buildMarkets(formData: FormData) {
  const exact = Number(str(formData.get("points_exact"))) || 3;
  const outcome = Number(str(formData.get("points_outcome"))) || 1;
  return [
    {
      type: "EXACT_SCORE",
      label: "Výsledek zápasu",
      points_config: { exact, outcome },
    },
  ];
}

// ---------------------------------------------------------------------------
// Tipovačky
// ---------------------------------------------------------------------------

export async function createPool(formData: FormData) {
  const { supabase, user } = await requireAdmin();

  // Soukromá = vyžaduje kód; jinak veřejná.
  const isPrivate = formData.get("private") === "on";

  const { data, error } = await supabase
    .from("pools")
    .insert({
      name: str(formData.get("name")),
      description: str(formData.get("description")) || null,
      rules: str(formData.get("rules")) || null,
      is_public: !isPrivate,
      join_code: isPrivate ? str(formData.get("join_code")) || null : null,
      status: str(formData.get("status")) || "active",
      image_url: str(formData.get("image_url")) || null,
      event_start: str(formData.get("event_start")) || null,
      event_end: str(formData.get("event_end")) || null,
      default_markets: buildMarkets(formData),
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  revalidatePath("/admin");
  revalidatePath("/");
  redirect(
    `/admin/tipovacky/${data.id}?msg=${encodeURIComponent("Tipovačka vytvořena")}`,
  );
}

export async function updatePool(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = str(formData.get("id"));
  const isPrivate = formData.get("private") === "on";

  // Nastavení tipu na umístění
  const placementPoints = {
    "1": Number(str(formData.get("placement_points_1"))) || 0,
    "2": Number(str(formData.get("placement_points_2"))) || 0,
    "3": Number(str(formData.get("placement_points_3"))) || 0,
  };
  const placementCorrect: Record<string, string> = {};
  for (const pos of ["1", "2", "3"]) {
    const t = str(formData.get(`placement_correct_${pos}`));
    if (t) placementCorrect[pos] = t;
  }

  // Bonusové tipy (střelec / asistence)
  const extras: Record<
    string,
    { enabled: boolean; points: number; correct: string }
  > = {};
  for (const kind of ["scorer", "assists"]) {
    extras[kind] = {
      enabled: formData.get(`${kind}_enabled`) === "on",
      points: Number(str(formData.get(`${kind}_points`))) || 0,
      correct: str(formData.get(`${kind}_correct`)),
    };
  }

  const { error } = await supabase
    .from("pools")
    .update({
      name: str(formData.get("name")),
      description: str(formData.get("description")) || null,
      rules: str(formData.get("rules")) || null,
      is_public: !isPrivate,
      join_code: isPrivate ? str(formData.get("join_code")) || null : null,
      status: str(formData.get("status")) || "active",
      image_url: str(formData.get("image_url")) || null,
      event_start: str(formData.get("event_start")) || null,
      event_end: str(formData.get("event_end")) || null,
      placement_enabled: formData.get("placement_enabled") === "on",
      placement_points: placementPoints,
      placement_correct: placementCorrect,
      extras,
      default_markets: buildMarkets(formData),
    })
    .eq("id", id);

  if (error) throw new Error(error.message);

  // Promítni nové bodování i do už založených zápasů (otázky typu EXACT_SCORE).
  const markets = buildMarkets(formData);
  const exactConfig = markets[0].points_config;
  const { data: poolMatches } = await supabase
    .from("matches")
    .select("id")
    .eq("pool_id", id);
  const matchIds = (poolMatches ?? []).map((m) => m.id);
  if (matchIds.length > 0) {
    await supabase
      .from("markets")
      .update({ points_config: exactConfig })
      .eq("type", "EXACT_SCORE")
      .in("match_id", matchIds);
  }

  revalidatePath("/admin");
  revalidatePath(`/admin/tipovacky/${id}`);
  revalidatePath(`/tipovacky/${id}`);
  redirect(
    `/admin/tipovacky/${id}?msg=${encodeURIComponent("Nastavení uloženo")}`,
  );
}

export async function deletePool(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = str(formData.get("pool_id"));

  // Smaže tipovačku včetně zápasů, otázek, tipů a členství (kaskádově).
  const { error } = await supabase.from("pools").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/admin");
  revalidatePath("/");
  redirect(`/admin?msg=${encodeURIComponent("Tipovačka smazána")}`);
}

// ---------------------------------------------------------------------------
// Zápasy
// ---------------------------------------------------------------------------

export async function createMatch(formData: FormData) {
  const { supabase } = await requireAdmin();
  const poolId = str(formData.get("pool_id"));

  const startsAt = str(formData.get("starts_at"));
  // Tipování se uzavírá výkopem → deadline = začátek zápasu.
  const startsIso = startsAt ? new Date(startsAt).toISOString() : null;

  const { data: match, error } = await supabase
    .from("matches")
    .insert({
      pool_id: poolId,
      home_team: str(formData.get("home_team")),
      away_team: str(formData.get("away_team")),
      stage: str(formData.get("stage")) || null,
      starts_at: startsIso,
      predict_deadline: startsIso,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  // Vytvoří tipovací otázky podle šablony tipovačky.
  const { data: pool } = await supabase
    .from("pools")
    .select("default_markets")
    .eq("id", poolId)
    .single();

  const template = Array.isArray(pool?.default_markets)
    ? pool.default_markets
    : DEFAULT_MARKETS;

  if (template.length > 0) {
    await supabase.from("markets").insert(
      template.map((m: Record<string, unknown>) => ({
        match_id: match.id,
        type: m.type,
        label: m.label ?? null,
        points_config: m.points_config ?? {},
      })),
    );
  }

  revalidatePath(`/admin/tipovacky/${poolId}`);
  revalidatePath(`/tipovacky/${poolId}`);
  redirect(
    `/admin/tipovacky/${poolId}?msg=${encodeURIComponent("Zápas přidán")}`,
  );
}

export async function deleteMatch(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = str(formData.get("match_id"));
  const poolId = str(formData.get("pool_id"));

  const { error } = await supabase.from("matches").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath(`/admin/tipovacky/${poolId}`);
  revalidatePath(`/tipovacky/${poolId}`);
  redirect(
    `/admin/tipovacky/${poolId}?msg=${encodeURIComponent("Zápas smazán")}`,
  );
}

export async function deleteAllMatches(formData: FormData) {
  const { supabase } = await requireAdmin();
  const poolId = str(formData.get("pool_id"));

  // Smaže všechny zápasy tipovačky (kaskádově i jejich otázky a tipy).
  const { error } = await supabase
    .from("matches")
    .delete()
    .eq("pool_id", poolId);
  if (error) throw new Error(error.message);

  revalidatePath(`/admin/tipovacky/${poolId}`);
  revalidatePath(`/tipovacky/${poolId}`);
  redirect(
    `/admin/tipovacky/${poolId}?msg=${encodeURIComponent("Zápasy smazány")}`,
  );
}

// ---------------------------------------------------------------------------
// Výsledek zápasu + přepočet bodů
// ---------------------------------------------------------------------------

export async function saveResult(formData: FormData) {
  const { supabase } = await requireAdmin();
  const matchId = str(formData.get("match_id"));
  const poolId = str(formData.get("pool_id"));
  const home = Number(str(formData.get("home_score")));
  const away = Number(str(formData.get("away_score")));

  if (Number.isNaN(home) || Number.isNaN(away)) {
    throw new Error("Skóre musí být čísla.");
  }

  // 1) Ulož výsledek a označ zápas jako dohraný.
  const { error: matchErr } = await supabase
    .from("matches")
    .update({ home_score: home, away_score: away, status: "finished" })
    .eq("id", matchId);
  if (matchErr) throw new Error(matchErr.message);

  // 2) Načti tipovací otázky zápasu.
  const { data: markets } = await supabase
    .from("markets")
    .select("id, type, points_config, correct_answer")
    .eq("match_id", matchId);

  if (!markets) {
    revalidatePath(`/admin/tipovacky/${poolId}`);
    redirect(
      `/admin/tipovacky/${poolId}?msg=${encodeURIComponent("Výsledek uložen")}`,
    );
  }

  // 3) Pro každou otázku odvoď správnou odpověď (kde to jde) a přepočítej tipy.
  for (const market of markets) {
    const derived = correctAnswerFromResult(market.type, home, away);
    const correct = derived ?? market.correct_answer;

    if (derived) {
      await supabase
        .from("markets")
        .update({ correct_answer: derived })
        .eq("id", market.id);
    }

    if (!correct) continue; // bez správné odpovědi nelze bodovat (např. střelec)

    const { data: predictions } = await supabase
      .from("predictions")
      .select("id, value")
      .eq("market_id", market.id);

    for (const pred of predictions ?? []) {
      const points = scorePrediction(
        market.type,
        pred.value,
        correct,
        market.points_config ?? {},
      );
      await supabase
        .from("predictions")
        .update({ points_awarded: points })
        .eq("id", pred.id);
    }
  }

  revalidatePath(`/admin/tipovacky/${poolId}`);
  revalidatePath(`/tipovacky/${poolId}`);
  redirect(
    `/admin/tipovacky/${poolId}?msg=${encodeURIComponent("Výsledek uložen")}`,
  );
}

// ---------------------------------------------------------------------------
// Vyhodnocení tipu na umístění
// ---------------------------------------------------------------------------

export async function evaluatePlacement(formData: FormData) {
  const { supabase } = await requireAdmin();
  const poolId = str(formData.get("pool_id"));

  const { data: pool } = await supabase
    .from("pools")
    .select("placement_points, placement_correct, extras")
    .eq("id", poolId)
    .single();

  const points = (pool?.placement_points ?? {}) as Record<string, number>;
  const correct = (pool?.placement_correct ?? {}) as Record<string, string>;

  const { data: preds } = await supabase
    .from("placement_predictions")
    .select("id, position, team")
    .eq("pool_id", poolId);

  for (const p of preds ?? []) {
    const key = String(p.position);
    const awarded =
      correct[key] && p.team === correct[key] ? (points[key] ?? 0) : 0;
    await supabase
      .from("placement_predictions")
      .update({ points_awarded: awarded })
      .eq("id", p.id);
  }

  // Bonusové tipy (střelec / asistence) – porovnání bez ohledu na velikost/mezery.
  const extras = (pool?.extras ?? {}) as Record<
    string,
    { points?: number; correct?: string }
  >;
  const norm = (s: string) => s.trim().toLowerCase();

  const { data: extraPreds } = await supabase
    .from("extra_predictions")
    .select("id, kind, answer")
    .eq("pool_id", poolId);

  for (const e of extraPreds ?? []) {
    const cfg = extras[e.kind];
    const awarded =
      cfg?.correct && norm(e.answer) === norm(cfg.correct)
        ? (cfg.points ?? 0)
        : 0;
    await supabase
      .from("extra_predictions")
      .update({ points_awarded: awarded })
      .eq("id", e.id);
  }

  revalidatePath(`/admin/tipovacky/${poolId}`);
  revalidatePath(`/tipovacky/${poolId}/umisteni`);
  revalidatePath(`/tipovacky/${poolId}/zebricek`);
  redirect(
    `/admin/tipovacky/${poolId}?msg=${encodeURIComponent("Speciální tipy vyhodnoceny")}`,
  );
}

// ---------------------------------------------------------------------------
// Hromadný import zápasů (CSV/řádky)
// ---------------------------------------------------------------------------

/** Offset časové zóny (ms) v daný okamžik: local = utc + offset. */
function tzOffsetMs(timeZone: string, date: Date): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = Object.fromEntries(
    dtf.formatToParts(date).map((p) => [p.type, p.value]),
  );
  const asUTC = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour === "24" ? "0" : parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
  return asUTC - date.getTime();
}

/** Pražský „nástěnný" čas (datum + HH:MM) → UTC ISO řetězec. */
function pragueToUtcIso(dateStr: string, timeStr: string): string {
  const [y, mo, d] = dateStr.split("-").map(Number);
  const [hh, mm] = timeStr.split(":").map(Number);
  const guess = Date.UTC(y, mo - 1, d, hh, mm);
  const offset = tzOffsetMs("Europe/Prague", new Date(guess));
  return new Date(guess - offset).toISOString().replace(".000", "");
}

export async function importMatches(formData: FormData) {
  const { supabase } = await requireAdmin();
  const poolId = str(formData.get("pool_id"));

  // Obsah importu (soubor přečte prohlížeč a vloží do tohoto textového pole).
  const raw = str(formData.get("rows"));

  const dateRe = /^\d{4}-\d{2}-\d{2}$/;
  const timeRe = /^\d{1,2}:\d{2}$/;

  type Row = {
    pool_id: string;
    home_team: string;
    away_team: string;
    stage: string | null;
    starts_at: string;
    predict_deadline: string;
  };

  const rows: Row[] = [];
  let skipped = 0;

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    // Oddělovač: středník nebo tabulátor.
    const parts = trimmed.split(/[;\t]/).map((p) => p.trim());

    // Přeskoč hlavičku.
    if (/datum/i.test(parts[0]) || /^date$/i.test(parts[0])) continue;

    const [date, time, home, away, stage] = parts;
    if (!dateRe.test(date ?? "") || !timeRe.test(time ?? "") || !home || !away) {
      skipped++;
      continue;
    }

    const iso = pragueToUtcIso(date, time);
    rows.push({
      pool_id: poolId,
      home_team: home,
      away_team: away,
      stage: stage || null,
      starts_at: iso,
      predict_deadline: iso,
    });
  }

  if (rows.length === 0) {
    redirect(
      `/admin/tipovacky/${poolId}?err=${encodeURIComponent("Nenašel jsem žádný platný řádek. Zkontroluj formát.")}`,
    );
  }

  const { data: inserted, error } = await supabase
    .from("matches")
    .insert(rows)
    .select("id");

  if (error) {
    redirect(`/admin/tipovacky/${poolId}?err=${encodeURIComponent(error.message)}`);
  }

  // Vytvoř tipovací otázky podle šablony tipovačky.
  const { data: pool } = await supabase
    .from("pools")
    .select("default_markets")
    .eq("id", poolId)
    .single();

  const template = Array.isArray(pool?.default_markets)
    ? pool.default_markets
    : DEFAULT_MARKETS;

  if (template.length > 0 && inserted) {
    const markets = inserted.flatMap((m) =>
      template.map((t: Record<string, unknown>) => ({
        match_id: m.id,
        type: t.type,
        label: t.label ?? null,
        points_config: t.points_config ?? {},
      })),
    );
    await supabase.from("markets").insert(markets);
  }

  revalidatePath(`/admin/tipovacky/${poolId}`);
  revalidatePath(`/tipovacky/${poolId}`);
  const count = inserted?.length ?? 0;
  const note =
    skipped > 0
      ? `Naimportováno ${count} zápasů (přeskočeno ${skipped})`
      : `Naimportováno ${count} zápasů`;
  redirect(`/admin/tipovacky/${poolId}?msg=${encodeURIComponent(note)}`);
}
