import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ThemeToggle } from "@/components/ThemeToggle";

export async function Header() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let isAdmin = false;
  let displayName: string | null = null;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name, is_admin")
      .eq("id", user.id)
      .single();
    isAdmin = profile?.is_admin ?? false;
    displayName = profile?.display_name ?? user.email ?? null;
  }

  return (
    <header className="border-b bg-surface">
      <div className="w-full max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            T
          </span>
          Tipovačka
        </Link>

        <nav className="flex items-center gap-2 text-sm">
          <ThemeToggle />
          {user ? (
            <>
              {isAdmin && (
                <Link href="/admin" className="btn btn-outline">
                  Admin
                </Link>
              )}
              <Link
                href="/profil"
                className="hidden sm:inline text-muted hover:text-foreground px-2"
              >
                {displayName}
              </Link>
              <form action="/odhlaseni" method="post">
                <button type="submit" className="btn btn-outline">
                  Odhlásit
                </button>
              </form>
            </>
          ) : (
            <Link href="/prihlaseni" className="btn btn-primary">
              Přihlásit se
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
