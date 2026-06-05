import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function PoolStandingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: standings } = await supabase
    .from("pool_standings")
    .select("user_id, display_name, total_points, scored_predictions")
    .eq("pool_id", id)
    .order("total_points", { ascending: false });

  if (!standings || standings.length === 0) {
    return (
      <div className="card p-10 text-center text-muted">
        Žebříček je zatím prázdný. Body se objeví po vyhodnocení prvních zápasů.
      </div>
    );
  }

  const MEDALS = ["🥇", "🥈", "🥉"];

  return (
    <div className="card overflow-hidden">
      <div className="grid grid-cols-[4.5rem_1fr_auto] gap-3 px-4 py-3 border-b text-xs text-muted font-medium">
        <span>Pořadí</span>
        <span>Hráč</span>
        <span className="text-right">Body</span>
      </div>
      {standings.map((row, i) => (
        <div
          key={row.user_id}
          className="grid grid-cols-[4.5rem_1fr_auto] gap-3 items-center px-4 py-3 border-b last:border-b-0"
        >
          <span className="flex items-center gap-1">
            {i < 3 && (
              <span className="text-xl leading-none">{MEDALS[i]}</span>
            )}
            <span className="rank-box">{i + 1}</span>
          </span>
          <span className="font-medium">{row.display_name ?? "Hráč"}</span>
          <span className="text-right font-semibold">
            {row.total_points} b.
          </span>
        </div>
      ))}
    </div>
  );
}
