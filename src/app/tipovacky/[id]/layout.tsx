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
    .select(
      "id, name, description, is_public, image_url, status, event_start, event_end, placement_enabled, extras",
    )
    .eq("id", id)
    .single();

  if (!pool) notFound();

  // Meta do hlavičky: počet členů + termín
  const { data: countRow } = await supabase
    .from("pool_member_counts")
    .select("members")
    .eq("pool_id", id)
    .maybeSingle();
  const members = countRow?.members ?? 0;

  let dateLabel: string | null = null;
  if (pool.event_start) {
    const fmt = (s: string) => {
      const [y, m, d] = s.split("-");
      return `${Number(d)}. ${Number(m)}. ${y}`;
    };
    dateLabel =
      pool.event_end && pool.event_end !== pool.event_start
        ? `${fmt(pool.event_start)} – ${fmt(pool.event_end)}`
        : fmt(pool.event_start);
  } else {
    const { data: mr } = await supabase
      .from("matches")
      .select("starts_at")
      .eq("pool_id", id)
      .order("starts_at", { ascending: true });
    if (mr && mr.length > 0) {
      const fmt = (s: string) =>
        new Date(s).toLocaleDateString("cs-CZ", {
          day: "numeric",
          month: "numeric",
          year: "numeric",
          timeZone: "Europe/Prague",
        });
      const first = fmt(mr[0].starts_at);
      const last = fmt(mr[mr.length - 1].starts_at);
      dateLabel = first === last ? first : `${first} – ${last}`;
    }
  }

  const membersLabel =
    members === 1
      ? "1 člen"
      : members >= 2 && members <= 4
        ? `${members} členové`
        : `${members} členů`;

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

  const extras = (pool.extras ?? {}) as Record<string, { enabled?: boolean }>;
  const specialEnabled =
    pool.placement_enabled ||
    !!extras.scorer?.enabled ||
    !!extras.assists?.enabled;

  return (
    <div>
      <Link href="/" className="text-sm text-muted hover:text-foreground">
        ← Zpět na tipovačky
      </Link>

      {/* Přehledná hlavička s náhledem */}
      <div className="card p-5 mt-3 mb-6 flex items-center gap-4">
        {pool.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={pool.image_url}
            alt=""
            className="h-16 w-16 rounded-xl object-cover shrink-0"
          />
        ) : (
          <div
            className="h-16 w-16 rounded-xl flex items-center justify-center text-2xl font-bold text-white shrink-0"
            style={{
              background: pool.is_public
                ? "linear-gradient(135deg, var(--primary), #8b5cf6)"
                : "linear-gradient(135deg, var(--warning), #b45309)",
            }}
          >
            {pool.name.slice(0, 1).toUpperCase()}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold">{pool.name}</h1>
            <span className={`badge ${pool.is_public ? "" : "badge-warning"}`}>
              {pool.is_public ? "Veřejná" : "🔒 Soukromá"}
            </span>
            {pool.status === "finished" && (
              <span className="badge badge-info">Ukončená</span>
            )}
          </div>
          {pool.description && (
            <p className="text-sm text-muted mt-1 line-clamp-2">
              {pool.description}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted mt-2">
            {dateLabel && (
              <span className="flex items-center gap-1.5">
                <CalendarIcon />
                {dateLabel}
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <UsersIcon />
              {membersLabel}
            </span>
          </div>
        </div>

        {isAdmin && (
          <Link
            href={`/admin/tipovacky/${pool.id}`}
            className="btn btn-ghost px-2.5 shrink-0"
            title="Upravit tipovačku"
            aria-label="Upravit tipovačku"
          >
            <GearIcon />
          </Link>
        )}
      </div>

      <PoolTabs poolId={pool.id} specialEnabled={specialEnabled} />

      {children}
    </div>
  );
}

function CalendarIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
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
