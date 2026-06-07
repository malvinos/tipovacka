import { createClient } from "@/lib/supabase/server";
import { TeamBadge } from "@/components/TeamBadge";
import { SpecialTipsForm } from "@/components/SpecialTipsForm";

export const dynamic = "force-dynamic";

const POS = [
  { n: 1, label: "1. místo", medal: "🥇" },
  { n: 2, label: "2. místo", medal: "🥈" },
  { n: 3, label: "3. místo", medal: "🥉" },
];

const EXTRA_DEFS = [
  { kind: "scorer", label: "Nejlepší střelec", icon: "⚽" },
  { kind: "assists", label: "Nejvíc asistencí", icon: "🅰️" },
] as const;

export default async function PoolPlacementPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: pool } = await supabase
    .from("pools")
    .select("id, placement_enabled, placement_points, placement_correct, extras")
    .eq("id", id)
    .single();

  const placementPoints = (pool?.placement_points ?? {}) as Record<
    string,
    number
  >;

  const extras = (pool?.extras ?? {}) as Record<
    string,
    { enabled?: boolean; correct?: string }
  >;
  const placementOn = !!pool?.placement_enabled;
  const enabledExtras = EXTRA_DEFS.filter((d) => extras[d.kind]?.enabled);

  if (!placementOn && enabledExtras.length === 0) {
    return (
      <div className="card p-10 text-center text-muted">
        Speciální tipy nejsou pro tuto tipovačku zapnuté.
      </div>
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let isMember = false;
  if (user) {
    const { data: m } = await supabase
      .from("pool_members")
      .select("id")
      .eq("pool_id", id)
      .eq("user_id", user.id)
      .maybeSingle();
    isMember = !!m;
  }

  const { data: matchRows } = await supabase
    .from("matches")
    .select("home_team, away_team, starts_at")
    .eq("pool_id", id);
  const teams = [
    ...new Set((matchRows ?? []).flatMap((m) => [m.home_team, m.away_team])),
  ].sort((a, b) => a.localeCompare(b, "cs"));
  const locked = (matchRows ?? []).some(
    (m) => new Date(m.starts_at).getTime() <= Date.now(),
  );

  // Vlastní tipy
  const myPick: Record<number, string> = {};
  const myExtra: Record<string, string> = {};
  if (user) {
    const { data: mine } = await supabase
      .from("placement_predictions")
      .select("position, team")
      .eq("pool_id", id)
      .eq("user_id", user.id);
    for (const r of mine ?? []) myPick[r.position] = r.team;

    const { data: mineE } = await supabase
      .from("extra_predictions")
      .select("kind, answer")
      .eq("pool_id", id)
      .eq("user_id", user.id);
    for (const r of mineE ?? []) myExtra[r.kind] = r.answer;
  }

  const correct = (pool?.placement_correct ?? {}) as Record<string, string>;

  return (
    <div className="flex flex-col gap-8">
      {!user ? (
        <div className="card p-5 text-sm text-muted">
          Pro speciální tipy se přihlas.
        </div>
      ) : !isMember ? (
        <div className="card p-5 text-sm text-muted">
          Připoj se k tipovačce, abys mohl tipovat.
        </div>
      ) : locked ? (
        <div className="card p-5">
          <h3 className="font-semibold mb-3">Tvůj tip</h3>
          <div className="flex flex-col gap-2">
            {placementOn &&
              POS.map((p) => (
                <ValueRow
                  key={p.n}
                  label={`${p.medal} ${p.label}`}
                  value={myPick[p.n]}
                  team
                />
              ))}
            {enabledExtras.map((d) => (
              <ValueRow
                key={d.kind}
                label={`${d.icon} ${d.label}`}
                value={myExtra[d.kind]}
              />
            ))}
          </div>
          <p className="text-xs text-muted mt-3">
            Tipy jsou uzamčené (turnaj začal).
          </p>
        </div>
      ) : (
        <SpecialTipsForm
          poolId={id}
          placementOn={placementOn}
          positions={POS.map((p) => ({
            ...p,
            points: placementPoints[String(p.n)],
          }))}
          teams={teams}
          extras={enabledExtras.map((d) => ({
            kind: d.kind,
            label: d.label,
            icon: d.icon,
            points: (extras[d.kind] as { points?: number })?.points,
          }))}
          initialPicks={myPick}
          initialExtras={myExtra}
        />
      )}

      {/* Správné odpovědi po vyhodnocení */}
      {(Object.keys(correct).length > 0 ||
        enabledExtras.some((d) => extras[d.kind]?.correct)) && (
        <section>
          <h3 className="font-semibold mb-3">Výsledek</h3>
          <div className="card p-5 flex flex-col gap-2">
            {placementOn &&
              POS.map((p) =>
                correct[String(p.n)] ? (
                  <ValueRow
                    key={p.n}
                    label={`${p.medal} ${p.label}`}
                    value={correct[String(p.n)]}
                    team
                  />
                ) : null,
              )}
            {enabledExtras.map((d) =>
              extras[d.kind]?.correct ? (
                <ValueRow
                  key={d.kind}
                  label={`${d.icon} ${d.label}`}
                  value={extras[d.kind]?.correct}
                />
              ) : null,
            )}
          </div>
        </section>
      )}

      {/* Tipy ostatních po začátku turnaje */}
      {locked && (
        <OthersSpecial
          poolId={id}
          placementOn={placementOn}
          enabledExtras={enabledExtras.map((d) => d.kind)}
        />
      )}
    </div>
  );
}

function ValueRow({
  label,
  value,
  team = false,
}: {
  label: string;
  value?: string;
  team?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="w-40 text-muted">{label}</span>
      {value ? (
        <span className="flex items-center gap-2 font-medium">
          {team && <TeamBadge name={value} size={22} />}
          {value}
        </span>
      ) : (
        <span className="text-muted">—</span>
      )}
    </div>
  );
}

async function OthersSpecial({
  poolId,
  placementOn,
  enabledExtras,
}: {
  poolId: string;
  placementOn: boolean;
  enabledExtras: string[];
}) {
  const supabase = await createClient();

  const { data: pRows } = await supabase
    .from("placement_predictions")
    .select("user_id, position, team, points_awarded, profiles ( display_name )")
    .eq("pool_id", poolId);
  const { data: eRows } = await supabase
    .from("extra_predictions")
    .select("user_id, kind, answer, points_awarded, profiles ( display_name )")
    .eq("pool_id", poolId);

  type Entry = {
    name: string;
    picks: Record<number, string>;
    extra: Record<string, string>;
    points: number;
  };
  const byUser = new Map<string, Entry>();
  const ensure = (uid: string, name: string) => {
    const e = byUser.get(uid) ?? { name, picks: {}, extra: {}, points: 0 };
    byUser.set(uid, e);
    return e;
  };

  for (const r of (pRows ?? []) as unknown as {
    user_id: string;
    position: number;
    team: string;
    points_awarded: number | null;
    profiles: { display_name: string | null } | null;
  }[]) {
    const e = ensure(r.user_id, r.profiles?.display_name ?? "Hráč");
    e.picks[r.position] = r.team;
    e.points += r.points_awarded ?? 0;
  }
  for (const r of (eRows ?? []) as unknown as {
    user_id: string;
    kind: string;
    answer: string;
    points_awarded: number | null;
    profiles: { display_name: string | null } | null;
  }[]) {
    const e = ensure(r.user_id, r.profiles?.display_name ?? "Hráč");
    e.extra[r.kind] = r.answer;
    e.points += r.points_awarded ?? 0;
  }

  const players = [...byUser.values()].sort((a, b) => b.points - a.points);
  if (players.length === 0) {
    return (
      <section>
        <h3 className="font-semibold mb-3">Tipy ostatních</h3>
        <div className="card p-5 text-sm text-muted">Zatím nikdo netipoval.</div>
      </section>
    );
  }

  const extraLabel: Record<string, string> = {
    scorer: "⚽ Střelec",
    assists: "🅰️ Asistence",
  };

  return (
    <section>
      <h3 className="font-semibold mb-3">Tipy ostatních</h3>
      <div className="flex flex-col gap-3">
        {players.map((p, i) => (
          <div key={i} className="card p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium">{p.name}</span>
              <span className="badge">{p.points} b.</span>
            </div>
            <div className="flex flex-col gap-1 text-sm">
              {placementOn &&
                POS.map((pos) => (
                  <div key={pos.n} className="flex items-center gap-2">
                    <span className="w-28 text-muted">
                      {pos.medal} {pos.label}
                    </span>
                    <span>{p.picks[pos.n] ?? "—"}</span>
                  </div>
                ))}
              {enabledExtras.map((k) => (
                <div key={k} className="flex items-center gap-2">
                  <span className="w-28 text-muted">{extraLabel[k] ?? k}</span>
                  <span>{p.extra[k] ?? "—"}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
