import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Pool = {
  id: string;
  name: string;
  description: string | null;
  is_public: boolean;
  status: string;
};

export default async function HomePage() {
  const supabase = await createClient();

  const { data: pools, error } = await supabase
    .from("pools")
    .select("id, name, description, is_public, status")
    .eq("status", "active")
    .order("created_at", { ascending: false });

  return (
    <div>
      <section className="mb-10">
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
        {pools?.map((pool: Pool, i) => (
          <Link
            key={pool.id}
            href={`/tipovacky/${pool.id}`}
            className="card p-6 hover:border-primary hover:-translate-y-0.5 transition-all fade-in"
            style={{ animationDelay: `${Math.min(i, 8) * 45}ms` }}
          >
            <div className="flex items-start justify-between gap-3 mb-2">
              <h2 className="font-semibold text-lg">{pool.name}</h2>
              <span className="badge">
                {pool.is_public ? "Veřejná" : "Soukromá"}
              </span>
            </div>
            {pool.description && (
              <p className="text-sm text-muted line-clamp-3">
                {pool.description}
              </p>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
