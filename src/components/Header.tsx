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

        <nav className="flex items-center gap-1 text-sm">
          <ThemeToggle />
          {user ? (
            <>
              {isAdmin && (
                <Link href="/admin" className="btn btn-ghost">
                  Admin
                </Link>
              )}
              <Link
                href="/profil"
                className="btn btn-ghost hidden sm:inline-flex font-medium"
              >
                {displayName}
              </Link>
              <form action="/odhlaseni" method="post">
                <button
                  type="submit"
                  className="btn btn-ghost text-muted"
                  title="Odhlásit se"
                  aria-label="Odhlásit se"
                >
                  <LogoutIcon />
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

function LogoutIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5M21 12H9" />
    </svg>
  );
}
