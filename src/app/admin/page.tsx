import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminHomePage() {
  const supabase = await createClient();

  const { data: pools } = await supabase
    .from("pools")
    .select("id, name, is_public, status")
    .order("created_at", { ascending: false });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold">Tipovačky</h2>
        <Link href="/admin/tipovacky/nova" className="btn btn-primary">
          + Nová tipovačka
        </Link>
      </div>

      <div className="card divide-y">
        {(!pools || pools.length === 0) && (
          <div className="p-6 text-sm text-muted">
            Zatím žádné tipovačky. Vytvoř první.
          </div>
        )}
        {pools?.map((pool) => (
          <Link
            key={pool.id}
            href={`/admin/tipovacky/${pool.id}`}
            className="flex items-center justify-between gap-3 px-5 py-4 hover:bg-background transition-colors"
          >
            <span className="font-medium">{pool.name}</span>
            <span className="flex items-center gap-2">
              <span className="badge">
                {pool.is_public ? "Veřejná" : "Soukromá"}
              </span>
              <span className="badge">
                {pool.status === "active" ? "Aktivní" : "Ukončená"}
              </span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
