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
    .select("id, is_public, status")
    .eq("id", poolId)
    .single();

  if (error || !pool) throw new Error("Tipovačka nenalezena.");
  if (pool.status === "finished") {
    throw new Error("Tipovačka je ukončená.");
  }
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

/** Uloží tip na konečné umístění (1./2./3. místo). Jen do začátku turnaje. */
export async function savePlacement(formData: FormData) {
  const { supabase, user } = await requireUser();
  const poolId = str(formData.get("pool_id"));

  // Zámek: jakmile začal první zápas, umístění už nejde měnit.
  const { data: started } = await supabase
    .from("matches")
    .select("id")
    .eq("pool_id", poolId)
    .lte("starts_at", new Date().toISOString())
    .limit(1);
  if (started && started.length > 0) {
    redirect(
      `/tipovacky/${poolId}/umisteni?placement_error=${encodeURIComponent(
        "Tip na umístění je už uzavřený (turnaj začal).",
      )}`,
    );
  }

  const rows = [1, 2, 3]
    .map((position) => ({
      pool_id: poolId,
      user_id: user.id,
      position,
      team: str(formData.get(`team_${position}`)),
      updated_at: new Date().toISOString(),
    }))
    .filter((r) => r.team);

  if (rows.length > 0) {
    const { error } = await supabase
      .from("placement_predictions")
      .upsert(rows, { onConflict: "pool_id,user_id,position" });
    if (error) throw new Error(error.message);
  }

  // Bonusové tipy (střelec / asistence)
  const extras = (["scorer", "assists"] as const)
    .map((kind) => ({
      pool_id: poolId,
      user_id: user.id,
      kind,
      answer: str(formData.get(`extra_${kind}`)),
      updated_at: new Date().toISOString(),
    }))
    .filter((r) => r.answer);

  if (extras.length > 0) {
    const { error } = await supabase
      .from("extra_predictions")
      .upsert(extras, { onConflict: "pool_id,user_id,kind" });
    if (error) throw new Error(error.message);
  }

  revalidatePath(`/tipovacky/${poolId}/umisteni`);
  redirect(`/tipovacky/${poolId}/umisteni?placement_saved=1`);
}

async function placementLocked(
  supabase: Awaited<ReturnType<typeof createClient>>,
  poolId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("matches")
    .select("id")
    .eq("pool_id", poolId)
    .lte("starts_at", new Date().toISOString())
    .limit(1);
  return !!(data && data.length > 0);
}

/** Auto-uložení jednoho místa v pořadí (volá se z klienta). */
export async function savePlacementTeam(input: {
  poolId: string;
  position: number;
  team: string;
}): Promise<{ ok: boolean; error?: string }> {
  const { supabase, user } = await requireUser();
  if (await placementLocked(supabase, input.poolId))
    return { ok: false, error: "Tip je uzamčený (turnaj začal)." };

  if (!input.team) {
    await supabase
      .from("placement_predictions")
      .delete()
      .eq("pool_id", input.poolId)
      .eq("user_id", user.id)
      .eq("position", input.position);
    return { ok: true };
  }

  const { error } = await supabase.from("placement_predictions").upsert(
    {
      pool_id: input.poolId,
      user_id: user.id,
      position: input.position,
      team: input.team,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "pool_id,user_id,position" },
  );
  return error ? { ok: false, error: error.message } : { ok: true };
}

/** Auto-uložení bonusového tipu (střelec/asistence). */
export async function saveExtraAnswer(input: {
  poolId: string;
  kind: string;
  answer: string;
}): Promise<{ ok: boolean; error?: string }> {
  const { supabase, user } = await requireUser();
  if (await placementLocked(supabase, input.poolId))
    return { ok: false, error: "Tip je uzamčený (turnaj začal)." };

  if (!input.answer.trim()) {
    await supabase
      .from("extra_predictions")
      .delete()
      .eq("pool_id", input.poolId)
      .eq("user_id", user.id)
      .eq("kind", input.kind);
    return { ok: true };
  }

  const { error } = await supabase.from("extra_predictions").upsert(
    {
      pool_id: input.poolId,
      user_id: user.id,
      kind: input.kind,
      answer: input.answer.trim(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "pool_id,user_id,kind" },
  );
  return error ? { ok: false, error: error.message } : { ok: true };
}

/** Opuštění tipovačky (odhlášení členství). */
export async function leavePool(formData: FormData) {
  const { supabase, user } = await requireUser();
  const poolId = str(formData.get("pool_id"));

  const { error } = await supabase
    .from("pool_members")
    .delete()
    .eq("pool_id", poolId)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);

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
