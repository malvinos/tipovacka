import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Ověří, že je přihlášený uživatel admin. Pokud ne, přesměruje.
 * Vrací Supabase klienta a uživatele pro další použití.
 */
export async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/prihlaseni");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) redirect("/");

  return { supabase, user };
}
