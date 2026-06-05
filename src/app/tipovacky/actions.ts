"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function str(v: FormDataEntryValue | null): string {
  return typeof v === "string" ? v.trim() : "";
}

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/prihlaseni");
  return { supabase, user };
}

// ---------------------------------------------------------------------------
// Připojení do tipovačky
// ---------------------------------------------------------------------------

export async function joinPool(formData: FormData) {
  const { supabase, user } = await requireUser();
  const poolId = str(formData.get("pool_id"));
  const code = str(formData.get("join_code"));

  const { data: pool, error } = await supabase
    .from("pools")
    .select("id, is_public, join_code")
    .eq("id", poolId)
    .single();

  if (error || !pool) throw new Error("Tipovačka nenalezena.");

  // U soukromé tipovačky musí sedět kód.
  if (!pool.is_public) {
    if (!code || code !== pool.join_code) {
      throw new Error("Neplatný přístupový kód.");
    }
  }

  const { error: joinErr } = await supabase
    .from("pool_members")
    .insert({ pool_id: poolId, user_id: user.id });

  // Duplicitní členství (kód 23505) ignorujeme – už je členem.
  if (joinErr && joinErr.code !== "23505") {
    throw new Error(joinErr.message);
  }

  revalidatePath(`/tipovacky/${poolId}`);
}

// ---------------------------------------------------------------------------
// Uložení tipu
// ---------------------------------------------------------------------------

export async function savePrediction(formData: FormData) {
  const { supabase, user } = await requireUser();
  const marketId = str(formData.get("market_id"));
  const poolId = str(formData.get("pool_id"));
  const type = str(formData.get("type"));

  // Ověř, že zápas ještě nezačal / není po uzávěrce.
  const { data: market } = await supabase
    .from("markets")
    .select("id, match:matches ( status, predict_deadline )")
    .eq("id", marketId)
    .single();

  const match = (market?.match ?? null) as {
    status: string;
    predict_deadline: string | null;
  } | null;

  if (!match) throw new Error("Tip nelze uložit.");

  const deadlinePassed = match.predict_deadline
    ? new Date(match.predict_deadline).getTime() < Date.now()
    : false;

  if (match.status !== "scheduled" || deadlinePassed) {
    throw new Error("Tipování je už uzavřené.");
  }

  // Sestav hodnotu tipu podle typu otázky.
  let value: Record<string, unknown>;
  switch (type) {
    case "EXACT_SCORE":
      value = {
        home: Number(str(formData.get("home"))),
        away: Number(str(formData.get("away"))),
      };
      break;
    case "OUTCOME_1X2":
      value = { outcome: str(formData.get("outcome")) };
      break;
    case "FIRST_SCORER":
      value = { player: str(formData.get("player")) };
      break;
    default:
      throw new Error("Neznámý typ tipu.");
  }

  const { error } = await supabase.from("predictions").upsert(
    {
      market_id: marketId,
      user_id: user.id,
      value,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "market_id,user_id" },
  );

  if (error) throw new Error(error.message);

  revalidatePath(`/tipovacky/${poolId}`);
}
