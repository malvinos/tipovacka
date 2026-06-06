import { createClient } from "@/lib/supabase/server";
import { HomeTabs, type CardPool, type Group } from "@/components/HomeTabs";

export const dynamic = "force-dynamic";

type Pool = {
  id: string;
  name: string;
  description: string | null;
  is_public: boolean;
  status: string;
  image_url: string | null;
  event_start: string | null;
  event_end: string | null;
};

function formatDateOnly(s: string): string {
  const [y, m, d] = s.split("-");
  return `${Number(d)}. ${Number(m)}. ${y}`;
}

function formatTs(ts: number): string {
  return new Date(ts).toLocaleDateString("cs-CZ", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
    timeZone: "Europe/Prague",
  });
}

export default async function HomePage() {
  const supabase = await createClient();

  const { data: pools, error } = await supabase
    .from("pools")
    .select(
      "id, name, description, is_public, status, image_url, event_start, event_end",
    )
    .order("created_at", { ascending: false });

  const list = (pools as Pool[] | null) ?? [];

  // Počty členů (i u soukromých) z veřejného pohledu.
  const { data: counts } = await supabase
    .from("pool_member_counts")
    .select("pool_id, members");
  const memberCount = new Map<string, number>(
    (counts ?? []).map((c) => [c.pool_id, c.members]),
  );

  // Termíny zápasů + které tipovačky už začaly.
  const startedPools = new Set<string>();
  const ranges = new Map<string, { min: number; max: number }>();
  if (list.length > 0) {
    const { data: matchRows } = await supabase
      .from("matches")
      .select("pool_id, starts_at")
      .in(
        "pool_id",
        list.map((p) => p.id),
      );
    const now = Date.now();
    for (const m of matchRows ?? []) {
      if (!m.starts_at) continue;
      const t = new Date(m.starts_at).getTime();
      if (t <= now) startedPools.add(m.pool_id);
      const cur = ranges.get(m.pool_id);
      if (!cur) ranges.set(m.pool_id, { min: t, max: t });
      else
        ranges.set(m.pool_id, {
          min: Math.min(cur.min, t),
          max: Math.max(cur.max, t),
        });
    }
  }

  // Termín: přednostně ruční (event_start/end), jinak odvozený ze zápasů.
  function dateFor(pool: Pool): string | null {
    if (pool.event_start) {
      const start = formatDateOnly(pool.event_start);
      const end =
        pool.event_end && pool.event_end !== pool.event_start
          ? formatDateOnly(pool.event_end)
          : null;
      return end ? `${start} – ${end}` : start;
    }
    const r = ranges.get(pool.id);
    if (r) return r.min === r.max ? formatTs(r.min) : `${formatTs(r.min)} – ${formatTs(r.max)}`;
    return null;
  }

  function toCard(pool: Pool): CardPool {
    return {
      id: pool.id,
      name: pool.name,
      description: pool.description,
      is_public: pool.is_public,
      image_url: pool.image_url,
      members: memberCount.get(pool.id) ?? 0,
      date: dateFor(pool),
    };
  }

  const ongoing: CardPool[] = [];
  const upcoming: CardPool[] = [];
  const finished: CardPool[] = [];
  for (const pool of list) {
    if (pool.status === "finished") finished.push(toCard(pool));
    else if (startedPools.has(pool.id)) ongoing.push(toCard(pool));
    else upcoming.push(toCard(pool));
  }

  const groups: Group[] = [
    { key: "ongoing", title: "Probíhající", pools: ongoing },
    { key: "upcoming", title: "Nadcházející", pools: upcoming },
    { key: "finished", title: "Ukončené", pools: finished },
  ];

  return (
    <div>
      <section className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Tipovačky</h1>
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

      {!error && list.length === 0 ? (
        <div className="card p-10 text-center text-muted">
          Zatím tu nejsou žádné tipovačky.
        </div>
      ) : (
        <HomeTabs groups={groups} />
      )}
    </div>
  );
}
