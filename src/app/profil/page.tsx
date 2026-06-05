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

  return (
    <div className="max-w-md">
      <h1 className="text-2xl font-bold mb-6">Můj profil</h1>

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
