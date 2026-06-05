"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function completeOnboarding(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/prihlaseni");

  const displayName =
    typeof formData.get("display_name") === "string"
      ? (formData.get("display_name") as string).trim()
      : "";

  if (!displayName) throw new Error("Zadej prosím přezdívku.");

  const { error } = await supabase
    .from("profiles")
    .update({ display_name: displayName, onboarded: true })
    .eq("id", user.id);

  if (error) throw new Error(error.message);

  redirect("/");
}
