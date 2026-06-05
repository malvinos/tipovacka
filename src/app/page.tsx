import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Pool = {
  id: string;
  name: string;
  description: string | null;
  is_public: boolean;
  status: string;
  image_url: string | null;
};

function membersLabel(n: number): string {
  if (n === 1) return "1 člen";
  if (n >= 2 && n <= 4) return `${n} členové`;
  return `${n} členů`;
}

export default async function HomePage() {
  const supabase = await createClient();

  const { data: pools, error } = await supabase
    .from("pools")
    .select("id, name, description, is_public, status, image_url")
    .eq("status", "active")
    .order("created_at", { ascending: false });

  // Počty členů (i u soukromých) z veřejného pohledu.
  const { data: counts } = await supabase
    .from("pool_member_counts")
    .select("pool_id, members");
  const memberCount = new Map<string, number>(
    (counts ?? []).map((c) => [c.pool_id, c.members]),
  );

  return (
    <div>
      <section className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Aktivní tipovačky</h1>
        <p className="text-muted">
          Vyber si tipovačku, tipuj výsledky zápasů a vyšplhej v žebříčku.
        </p>
      </section>

      {error && (
        <div className="card p-6 text-sm text-muted">
          Tipovačky se zatím nepodařilo načíst. Zkontroluj, že je v Supabase
          spuštěná databázová migrace.
        </div>
      )}

      {!error && (!pools || pools.length === 0) && (
        <div className="card p-10 text-center text-muted">
          Zatím tu nejsou žádné aktivní tipovačky.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {(pools as Pool[] | null)?.map((pool, i) => {
          const members = memberCount.get(pool.id) ?? 0;
          return (
            <Link
              key={pool.id}
              href={`/tipovacky/${pool.id}`}
              className={`card overflow-hidden hover:-translate-y-0.5 transition-all fade-in ${
                pool.is_public ? "hover:border-primary" : "private-card"
              }`}
              style={{ animationDelay: `${Math.min(i, 8) * 45}ms` }}
            >
              {/* Obrázek nebo barevný placeholder */}
              <div className="relative">
                {pool.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={pool.image_url}
                    alt=""
                    className="h-36 w-full object-cover"
                  />
                ) : (
                  <div
                    className="h-36 w-full flex items-center justify-center text-3xl font-bold text-white"
                    style={{
                      background: pool.is_public
                        ? "linear-gradient(135deg, var(--primary), #8b5cf6)"
                        : "linear-gradient(135deg, var(--warning), #b45309)",
                    }}
                  >
                    {pool.name.slice(0, 1).toUpperCase()}
                  </div>
                )}
                {!pool.is_public && (
                  <span className="absolute top-3 right-3 badge badge-warning bg-surface">
                    <LockIcon /> Soukromá
                  </span>
                )}
              </div>

              <div className="p-5">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h2 className="font-semibold text-lg">{pool.name}</h2>
                  {pool.is_public && <span className="badge shrink-0">Veřejná</span>}
                </div>
                {pool.description && (
                  <p className="text-sm text-muted line-clamp-2 mb-3">
                    {pool.description}
                  </p>
                )}
                <div className="flex items-center gap-1.5 text-sm text-muted">
                  <UsersIcon />
                  {membersLabel(members)}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function LockIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg
      width="15"
      height="15"
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
