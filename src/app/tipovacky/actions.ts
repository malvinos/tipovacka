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

/** Připojení k VEŘEJNÉ tipovačce jedním klikem. Soukromé jdou jen přes kód. */
export async function joinPool(formData: FormData) {
  const { supabase, user } = await requireUser();
  const poolId = str(formData.get("pool_id"));

  const { data: pool, error } = await supabase
    .from("pools")
    .select("id, is_public")
    .eq("id", poolId)
    .single();

  if (error || !pool) throw new Error("Tipovačka nenalezena.");
  if (!pool.is_public) {
    throw new Error("Tato tipovačka vyžaduje přístupový kód.");
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

/**
 * Připojení přes kód – nevyžaduje, aby uživatel tipovačku napřed viděl.
 * Použije DB funkci join_pool_by_code (obchází RLS jen pro vyhledání podle kódu).
 */
export async function joinByCode(formData: FormData) {
  const { supabase } = await requireUser();
  const code = str(formData.get("join_code"));
  // Kam se vrátit při chybě (stránka tipovačky, ze které se odesílalo).
  const back = str(formData.get("pool_id"));
  const errTo = (msg: string) =>
    back
      ? `/tipovacky/${back}?join_error=${encodeURIComponent(msg)}`
      : `/?join_error=${encodeURIComponent(msg)}`;

  if (!code) redirect(errTo("Zadej přístupový kód."));

  const { data: poolId, error } = await supabase.rpc("join_pool_by_code", {
    p_code: code,
  });

  if (error) redirect(errTo(error.message));
  if (!poolId) redirect(errTo("Neplatný přístupový kód."));

  redirect(`/tipovacky/${poolId}`);
}

// ---------------------------------------------------------------------------
// Uložení tipu
// ---------------------------------------------------------------------------

/**
 * Uloží (vytvoří/přepíše) tip uživatele. Volá se z klienta při automatickém
 * ukládání, proto vrací výsledek místo vyhození chyby a nedělá revalidaci
 * (aby se uživateli nepřekreslila stránka uprostřed vyplňování).
 */
export async function savePredictionValue(input: {
  marketId: string;
  value: Record<string, unknown>;
}): Promise<{ ok: boolean; error?: string }> {
  const { supabase, user } = await requireUser();
  const { marketId, value } = input;

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

  if (!match) return { ok: false, error: "Tip nelze uložit." };

  const deadlinePassed = match.predict_deadline
    ? new Date(match.predict_deadline).getTime() < Date.now()
    : false;

  if (match.status !== "scheduled" || deadlinePassed) {
    return { ok: false, error: "Tipování je už uzavřené." };
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

  if (error) return { ok: false, error: error.message };

  return { ok: true };
}
