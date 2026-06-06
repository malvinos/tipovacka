import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PoolTabs } from "@/components/PoolTabs";

export const dynamic = "force-dynamic";

export default async function PoolLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: pool } = await supabase
    .from("pools")
    .select("id, name, description, is_public")
    .eq("id", id)
    .single();

  if (!pool) notFound();

  // Je přihlášený uživatel admin? (pro rychlou úpravu ozubeným kolečkem)
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let isAdmin = false;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();
    isAdmin = !!profile?.is_admin;
  }

  return (
    <div>
      <Link href="/" className="text-sm text-muted hover:text-foreground">
        ← Zpět na tipovačky
      </Link>

      <div className="flex items-start justify-between gap-3 mt-3 mb-2">
        <h1 className="text-3xl font-bold">{pool.name}</h1>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`badge ${pool.is_public ? "" : "badge-warning"}`}>
            {pool.is_public ? "Veřejná" : "🔒 Soukromá"}
          </span>
          {isAdmin && (
            <Link
              href={`/admin/tipovacky/${pool.id}`}
              className="btn btn-outline px-2.5"
              title="Upravit tipovačku"
              aria-label="Upravit tipovačku"
            >
              <GearIcon />
            </Link>
          )}
        </div>
      </div>
      {pool.description && (
        <p className="text-muted mb-6">{pool.description}</p>
      )}

      <PoolTabs poolId={pool.id} />

      {children}
    </div>
  );
}

function GearIcon() {
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
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}
