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

function parseMarkets(raw: string) {
  if (!raw) return DEFAULT_MARKETS;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : DEFAULT_MARKETS;
  } catch {
    return DEFAULT_MARKETS;
  }
}

// ---------------------------------------------------------------------------
// Tipovačky
// ---------------------------------------------------------------------------

export async function createPool(formData: FormData) {
  const { supabase, user } = await requireAdmin();

  const isPublic = formData.get("is_public") === "on";

  const { data, error } = await supabase
    .from("pools")
    .insert({
      name: str(formData.get("name")),
      description: str(formData.get("description")) || null,
      rules: str(formData.get("rules")) || null,
      is_public: isPublic,
      join_code: isPublic ? null : str(formData.get("join_code")) || null,
      status: str(formData.get("status")) || "active",
      default_markets: DEFAULT_MARKETS,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  revalidatePath("/admin");
  revalidatePath("/");
  redirect(`/admin/tipovacky/${data.id}`);
}

export async function updatePool(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = str(formData.get("id"));
  const isPublic = formData.get("is_public") === "on";

  const { error } = await supabase
    .from("pools")
    .update({
      name: str(formData.get("name")),
      description: str(formData.get("description")) || null,
      rules: str(formData.get("rules")) || null,
      is_public: isPublic,
      join_code: isPublic ? null : str(formData.get("join_code")) || null,
      status: str(formData.get("status")) || "active",
      default_markets: parseMarkets(str(formData.get("default_markets"))),
    })
    .eq("id", id);

  if (error) throw new Error(error.message);

  revalidatePath("/admin");
  revalidatePath(`/admin/tipovacky/${id}`);
  revalidatePath(`/tipovacky/${id}`);
}

// ---------------------------------------------------------------------------
// Zápasy
// ---------------------------------------------------------------------------

export async function createMatch(formData: FormData) {
  const { supabase } = await requireAdmin();
  const poolId = str(formData.get("pool_id"));

  const startsAt = str(formData.get("starts_at"));
  const deadline = str(formData.get("predict_deadline"));

  const { data: match, error } = await supabase
    .from("matches")
    .insert({
      pool_id: poolId,
      home_team: str(formData.get("home_team")),
      away_team: str(formData.get("away_team")),
      stage: str(formData.get("stage")) || null,
      starts_at: startsAt ? new Date(startsAt).toISOString() : null,
      predict_deadline: deadline
        ? new Date(deadline).toISOString()
        : startsAt
          ? new Date(startsAt).toISOString()
          : null,
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
}

export async function deleteMatch(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = str(formData.get("match_id"));
  const poolId = str(formData.get("pool_id"));

  const { error } = await supabase.from("matches").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath(`/admin/tipovacky/${poolId}`);
  revalidatePath(`/tipovacky/${poolId}`);
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
    return;
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
}
