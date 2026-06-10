import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updateProfile } from "./actions";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/prihlaseni");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .single();

  // Statistiky napříč celým webem
  const [{ count: poolCount }, { data: preds }, { data: placement }, { data: extra }] =
    await Promise.all([
      supabase
        .from("pool_members")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id),
      supabase.from("predictions").select("points_awarded").eq("user_id", user.id),
      supabase
        .from("placement_predictions")
        .select("points_awarded")
        .eq("user_id", user.id),
      supabase
        .from("extra_predictions")
        .select("points_awarded")
        .eq("user_id", user.id),
    ]);

  const tipsTotal = preds?.length ?? 0;
  const scored = (preds ?? []).filter((p) => p.points_awarded != null);
  const hits = scored.filter((p) => (p.points_awarded ?? 0) > 0).length;
  const successRate =
    scored.length > 0 ? Math.round((hits / scored.length) * 100) : null;

  const sum = (rows: { points_awarded: number | null }[] | null) =>
    (rows ?? []).reduce((acc, r) => acc + (r.points_awarded ?? 0), 0);
  const totalPoints = sum(preds) + sum(placement) + sum(extra);

  const stats = [
    { label: "Tipovaček", value: poolCount ?? 0 },
    { label: "Celkem bodů", value: totalPoints },
    { label: "Zadaných tipů", value: tipsTotal },
    {
      label: "Úspěšnost",
      value: successRate === null ? "—" : `${successRate} %`,
    },
  ];

  return (
    <div className="max-w-md">
      <h1 className="text-2xl font-bold mb-6">Můj profil</h1>

      {/* Statistiky napříč webem */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {stats.map((s) => (
          <div key={s.label} className="card p-4">
            <div className="text-2xl font-bold">{s.value}</div>
            <div className="text-xs text-muted">{s.label}</div>
          </div>
        ))}
      </div>

      <form action={updateProfile} className="card p-6 flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Přezdívka</span>
          <input
            name="display_name"
            required
            maxLength={40}
            className="input"
            defaultValue={profile?.display_name ?? ""}
            placeholder="Jak se zobrazíš v žebříčku"
          />
          <span className="text-xs text-muted">
            Toto jméno uvidí ostatní v žebříčku.
          </span>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">E-mail</span>
          <input
            className="input opacity-60"
            value={user.email ?? ""}
            disabled
          />
        </label>

        <div className="flex justify-end">
          <button type="submit" className="btn btn-primary">
            Uložit
          </button>
        </div>
      </form>
    </div>
  );
}
