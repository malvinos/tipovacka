import { createClient } from "@/lib/supabase/server";
import { TeamBadge } from "@/components/TeamBadge";

export const dynamic = "force-dynamic";

const OUTCOME_LABELS: Record<string, string> = {
  "1": "Výhra domácích",
  X: "Remíza",
  "2": "Výhra hostů",
};

function describePrediction(type: string, value: Record<string, unknown>) {
  switch (type) {
    case "EXACT_SCORE":
      return `${value.home ?? "-"} : ${value.away ?? "-"}`;
    case "OUTCOME_1X2":
      return OUTCOME_LABELS[String(value.outcome)] ?? "—";
    case "FIRST_SCORER":
      return String(value.player ?? "—");
    default:
      return "—";
  }
}

function formatDay(value: string) {
  return new Date(value).toLocaleString("cs-CZ", {
    day: "numeric",
    month: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Prague",
  });
}

type Prediction = {
  user_id: string;
  value: Record<string, unknown>;
  points_awarded: number | null;
  profiles: { display_name: string | null } | null;
};

type Market = {
  id: string;
  type: string;
  label: string | null;
  predictions: Prediction[];
};

type Match = {
  id: string;
  home_team: string;
  away_team: string;
  starts_at: string;
  predict_deadline: string | null;
  status: string;
  home_score: number | null;
  away_score: number | null;
  markets: Market[];
};

export default async function PoolTipsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: matches } = await supabase
    .from("matches")
    .select(
      "id, home_team, away_team, starts_at, predict_deadline, status, home_score, away_score, markets ( id, type, label, predictions ( user_id, value, points_awarded, profiles ( display_name ) ) )",
    )
    .eq("pool_id", id)
    .order("starts_at", { ascending: true });

  const list = (matches as Match[] | null) ?? [];

  if (list.length === 0) {
    return (
      <div className="card p-10 text-center text-muted">
        Zatím tu nejsou žádné zápasy.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {list.map((m) => {
        const deadlinePassed = m.predict_deadline
          ? new Date(m.predict_deadline).getTime() < Date.now()
          : false;
        const started = new Date(m.starts_at).getTime() <= Date.now();
        const revealed = m.status !== "scheduled" || started || deadlinePassed;
        const finished = m.status === "finished";

        return (
          <div key={m.id} className="card p-5">
            <div className="flex items-center gap-3 mb-3">
              <TeamBadge name={m.home_team} size={24} />
              <span className="font-medium">{m.home_team}</span>
              <span className="text-muted font-bold tabular-nums">
                {finished
                  ? `${m.home_score ?? "-"} : ${m.away_score ?? "-"}`
                  : "vs"}
              </span>
              <span className="font-medium">{m.away_team}</span>
              <TeamBadge name={m.away_team} size={24} />
              <span className="text-xs text-muted ml-auto">
                {formatDay(m.starts_at)}
              </span>
            </div>

            {!revealed ? (
              <p className="text-sm text-muted">
                Tipy ostatních se zobrazí po začátku zápasu.
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                {m.markets?.map((market) => {
                  const preds = [...(market.predictions ?? [])].sort(
                    (a, b) => (b.points_awarded ?? 0) - (a.points_awarded ?? 0),
                  );
                  return (
                    <div key={market.id}>
                      {market.label && (
                        <div className="text-xs text-muted mb-1">
                          {market.label}
                        </div>
                      )}
                      {preds.length === 0 ? (
                        <p className="text-sm text-muted">Nikdo netipoval.</p>
                      ) : (
                        <div className="flex flex-col divide-y">
                          {preds.map((p) => (
                            <div
                              key={p.user_id}
                              className="flex items-center justify-between gap-3 py-1.5 text-sm"
                            >
                              <span className="font-medium">
                                {p.profiles?.display_name ?? "Hráč"}
                              </span>
                              <span className="flex items-center gap-3">
                                <span>
                                  {describePrediction(market.type, p.value)}
                                </span>
                                {p.points_awarded != null && (
                                  <span className="badge">
                                    {p.points_awarded} b.
                                  </span>
                                )}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
