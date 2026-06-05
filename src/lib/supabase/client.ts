import { createBrowserClient } from "@supabase/ssr";

/**
 * Supabase klient pro použití v prohlížeči (client komponenty).
 * Používá veřejný anon klíč.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
