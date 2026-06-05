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

  return (
    <div>
      <Link href="/" className="text-sm text-muted hover:text-foreground">
        ← Zpět na tipovačky
      </Link>

      <div className="flex items-start justify-between gap-3 mt-3 mb-2">
        <h1 className="text-3xl font-bold">{pool.name}</h1>
        <span className="badge">{pool.is_public ? "Veřejná" : "Soukromá"}</span>
      </div>
      {pool.description && (
        <p className="text-muted mb-6">{pool.description}</p>
      )}

      <PoolTabs poolId={pool.id} />

      {children}
    </div>
  );
}
