"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function updateProfile(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/prihlaseni");

  const displayName =
    typeof formData.get("display_name") === "string"
      ? (formData.get("display_name") as string).trim()
      : "";

  if (!displayName) throw new Error("Přezdívka nesmí být prázdná.");

  const { error } = await supabase
    .from("profiles")
    .update({ display_name: displayName })
    .eq("id", user.id);

  if (error) throw new Error(error.message);

  revalidatePath("/profil");
  revalidatePath("/", "layout");
}
