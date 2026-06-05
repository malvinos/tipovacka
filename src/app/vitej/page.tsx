import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { completeOnboarding } from "./actions";

export const dynamic = "force-dynamic";

export default async function WelcomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/prihlaseni");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, onboarded")
    .eq("id", user.id)
    .single();

  // Kdo už prošel uvítáním, sem nemá co dělat.
  if (profile?.onboarded) redirect("/");

  // Předvyplníme jen pokud to nevypadá jako automatická hodnota z e-mailu.
  const emailPrefix = user.email?.split("@")[0] ?? "";
  const suggested =
    profile?.display_name && profile.display_name !== emailPrefix
      ? profile.display_name
      : "";

  return (
    <div className="max-w-md mx-auto">
      <div className="card p-8">
        <h1 className="text-2xl font-bold mb-1">Vítej v Tipovačce! 👋</h1>
        <p className="text-muted text-sm mb-6">
          Než začneš, vyber si přezdívku. Pod tímhle jménem tě uvidí ostatní
          v žebříčku.
        </p>

        <form action={completeOnboarding} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Přezdívka</span>
            <input
              name="display_name"
              required
              maxLength={40}
              autoFocus
              className="input"
              defaultValue={suggested}
              placeholder="Např. Honza, Mistr tipér…"
            />
          </label>
          <button type="submit" className="btn btn-primary">
            Pokračovat
          </button>
        </form>
      </div>
    </div>
  );
}
