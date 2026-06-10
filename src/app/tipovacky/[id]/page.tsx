import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { joinByCode, joinPool, leavePool } from "@/app/tipovacky/actions";
import { TeamBadge } from "@/components/TeamBadge";
import { PredictionForm } from "@/components/PredictionForm";
import { ConfirmButton } from "@/components/ConfirmButton";
import { Countdown } from "@/components/Countdown";
import { RulesView } from "@/components/RulesView";
import { OutcomeBar } from "@/components/OutcomeBar";

export const dynamic = "force-dynamic";

function statusInfo(status: string, open: boolean) {
  if (status === "finished")
    return { card: "is-finished", badge: "badge-info", label: "Dohráno" };
  if (!open)
    return { card: "is-locked", badge: "badge-warning", label: "Uzamčeno" };
  return { card: "is-open", badge: "badge-success", label: "Otevřeno" };
}

const OUTCOME_LABELS: Record<string, string> = {
  "1": "Výhra domácích",
  X: "Remíza",
  "2": "Výhra hostů",
};

type Market = {
  id: string;
  type: string;
  label: string | null;
};

type Match = {
  id: string;
  home_team: string;
  away_team: string;
  stage: string | null;
  starts_at: string;
  predict_deadline: string | null;
  status: string;
  home_score: number | null;
  away_score: number | null;
  markets: Market[];
};

type PredictionMap = Map<
  string,
  { value: Record<string, unknown>; points_awarded: number | null }
>;

type StageGroupEntry =
  | { kind: "day"; key: string; label: string }
  | { kind: "match"; match: Match };

export default async function PoolMatchesPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ join_error?: string; filter?: string }>;
}) {
  const { id } = await params;
  const { join_error, filter } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: pool } = await supabase
    .from("pools")
    .select("id, is_public, status, rules")
    .eq("id", id)
    .single();

  if (!pool) return null;
  const finished = pool.status === "finished";

  // Členství
  let isMember = false;
  if (user) {
    const { data: membership } = await supabase
      .from("pool_members")
      .select("id")
      .eq("pool_id", id)
      .eq("user_id", user.id)
      .maybeSingle();
    isMember = !!membership;
  }

  const { data: matches } = await supabase
    .from("matches")
    .select(
      "id, home_team, away_team, stage, starts_at, predict_deadline, status, home_score, away_score, markets ( id, type, label )",
    )
    .eq("pool_id", id)
    .order("starts_at", { ascending: true });

  // Souhrnná statistika tipů (1/X/2) podle zápasu
  type OutcomeStat = {
    total: number;
    home_wins: number;
    draws: number;
    away_wins: number;
  };
  const statsByMatch = new Map<string, OutcomeStat>();
  const matchIds = (matches ?? []).map((m) => m.id);
  if (matchIds.length > 0) {
    const { data: stats } = await supabase
      .from("match_outcome_stats")
      .select("match_id, total, home_wins, draws, away_wins")
      .in("match_id", matchIds);
    for (const s of stats ?? [])
      statsByMatch.set(s.match_id, {
        total: s.total,
        home_wins: s.home_wins,
        draws: s.draws,
        away_wins: s.away_wins,
      });
  }

  // Tipy přihlášeného uživatele (mapováno podle market_id)
  const predictionByMarket = new Map<
    string,
    { value: Record<string, unknown>; points_awarded: number | null }
  >();
  if (user) {
    const { data: preds } = await supabase
      .from("predictions")
      .select("market_id, value, points_awarded")
      .eq("user_id", user.id);
    for (const p of preds ?? []) {
      predictionByMarket.set(p.market_id, {
        value: p.value,
        points_awarded: p.points_awarded,
      });
    }
  }

  return (
    <div>
      {/* Výzva k připojení / přihlášení */}
      {!user && (
        <div className="card p-5 mb-8 flex items-center justify-between gap-3">
          <span className="text-sm text-muted">Pro tipování se přihlas.</span>
          <Link href="/prihlaseni" className="btn btn-primary">
            Přihlásit se
          </Link>
        </div>
      )}

      {/* Ukončená tipovačka – jen k nahlédnutí */}
      {finished && !isMember && (
        <div className="card p-5 mb-8 text-sm text-muted">
          Tipovačka je ukončená. Můžeš si prohlédnout výsledky a žebříček,
          připojit se ale už nelze.
        </div>
      )}

      {!finished && user && !isMember && pool.is_public && (
        <div className="card p-5 mb-8 flex items-center justify-between gap-3">
          <p className="font-medium">Připoj se a začni tipovat</p>
          <form action={joinPool}>
            <input type="hidden" name="pool_id" value={pool.id} />
            <button type="submit" className="btn btn-primary">
              Připojit se
            </button>
          </form>
        </div>
      )}

      {!finished && user && !isMember && !pool.is_public && (
        <div className="rules-box p-5 mb-8" style={{ borderLeftColor: "var(--warning)" }}>
          <p className="font-medium mb-1 flex items-center gap-2">
            Soukromá tipovačka
          </p>
          <p className="text-sm text-muted mb-3">
            Zápasy a tipování se odemknou po zadání přístupového kódu.
          </p>
          <form
            action={joinByCode}
            className="flex flex-col sm:flex-row gap-3 sm:items-end"
          >
            <input type="hidden" name="pool_id" value={pool.id} />
            <label className="flex flex-col gap-1.5 flex-1">
              <span className="text-sm text-muted">Přístupový kód</span>
              <input name="join_code" required className="input" />
            </label>
            <button type="submit" className="btn btn-primary">
              Odemknout
            </button>
          </form>
          {join_error && (
            <p className="text-sm text-red-600 mt-3">{join_error}</p>
          )}
        </div>
      )}

      {/* Člen – možnost odejít */}
      {isMember && (
        <div className="flex justify-end mb-6">
          <form action={leavePool}>
            <input type="hidden" name="pool_id" value={pool.id} />
            <ConfirmButton
              confirmText="Opravdu chceš odejít z tipovačky? Tvé tipy zůstanou uložené, ale přestaneš být členem."
              className="btn btn-danger-ghost text-sm"
            >
              Odejít z tipovačky
            </ConfirmButton>
          </form>
        </div>
      )}

      {pool.rules?.trim() && (
        <details className="card p-5 mb-6" open>
          <summary className="font-semibold cursor-pointer flex items-center gap-2">
            <RulesIcon />
            Pravidla tipování
          </summary>
          <div className="mt-3">
            <RulesView text={pool.rules} />
          </div>
        </details>
      )}

      {(!matches || matches.length === 0) && (
        <div className="card p-6 text-sm text-muted">
          Zatím tu nejsou žádné zápasy.
        </div>
      )}

      {(() => {
        const all = (matches as Match[] | null) ?? [];
        if (all.length === 0) return null;

        const finishedCount = all.filter(
          (m) => m.status === "finished",
        ).length;
        const activeCount = all.length - finishedCount;
        const mode =
          filter === "dohrane"
            ? "dohrane"
            : filter === "vse"
              ? "vse"
              : "aktualni";
        const visible =
          mode === "dohrane"
            ? all.filter((m) => m.status === "finished")
            : mode === "vse"
              ? all
              : all.filter((m) => m.status !== "finished");

        const base = `/tipovacky/${pool.id}`;
        const filters = [
          { key: "aktualni", label: "Aktuální", count: activeCount, href: base },
          {
            key: "dohrane",
            label: "Dohrané",
            count: finishedCount,
            href: `${base}?filter=dohrane`,
          },
          {
            key: "vse",
            label: "Vše",
            count: all.length,
            href: `${base}?filter=vse`,
          },
        ];

        return (
          <>
            {finishedCount > 0 && (
              <div className="inline-flex flex-wrap gap-1 p-1 rounded-xl border bg-background mb-5">
                {filters.map((f) => (
                  <Link
                    key={f.key}
                    href={f.href}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      mode === f.key
                        ? "bg-surface text-foreground shadow-sm"
                        : "text-muted hover:text-foreground"
                    }`}
                  >
                    {f.label}{" "}
                    <span className="opacity-60">{f.count}</span>
                  </Link>
                ))}
              </div>
            )}

            <div className="flex flex-col gap-4">
              {visible.length === 0 ? (
                <div className="card p-6 text-sm text-muted">
                  V této kategorii nejsou žádné zápasy.
                </div>
              ) : (
                withDaySeparators(visible).map((entry, i) =>
                  entry.kind === "day" ? (
                    <div
                      key={`day-${entry.key}`}
                      className="flex items-center gap-3 text-xs font-semibold text-muted first:mt-0 mt-3"
                    >
                      <span className="h-px flex-1 bg-border" />
                      {entry.label}
                      <span className="h-px flex-1 bg-border" />
                    </div>
                  ) : (
                    <MatchCard
                      key={entry.match.id}
                      m={entry.match}
                      isMember={isMember}
                      poolId={pool.id}
                      predictionByMarket={predictionByMarket}
                      stat={statsByMatch.get(entry.match.id)}
                      animIndex={i}
                    />
                  ),
                )
              )}
            </div>
          </>
        );
      })()}
    </div>
  );
}

/** Vloží mezi chronologicky seřazené zápasy oddělovače dnů. */
function withDaySeparators(matches: Match[]): StageGroupEntry[] {
  const out: StageGroupEntry[] = [];
  let lastDay = "";
  for (const m of matches) {
    const dk = dayKey(m.starts_at);
    if (dk !== lastDay) {
      out.push({ kind: "day", key: dk, label: formatDay(m.starts_at) });
      lastDay = dk;
    }
    out.push({ kind: "match", match: m });
  }
  return out;
}

function dayKey(value: string) {
  // Klíč dne podle pražského času (en-CA → "2026-06-11").
  return new Date(value).toLocaleDateString("en-CA", {
    timeZone: "Europe/Prague",
  });
}

function formatDay(value: string) {
  return new Date(value).toLocaleDateString("cs-CZ", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Europe/Prague",
  });
}

function formatTime(value: string | null) {
  if (!value) return "";
  return new Date(value).toLocaleTimeString("cs-CZ", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Prague",
  });
}

/** Karta jednoho zápasu. */
function MatchCard({
  m,
  isMember,
  poolId,
  predictionByMarket,
  stat,
  animIndex,
}: {
  m: Match;
  isMember: boolean;
  poolId: string;
  predictionByMarket: PredictionMap;
  stat?: { total: number; home_wins: number; draws: number; away_wins: number };
  animIndex: number;
}) {
  const deadlinePassed = m.predict_deadline
    ? new Date(m.predict_deadline).getTime() < Date.now()
    : false;
  const open = m.status === "scheduled" && !deadlinePassed;
  const st = statusInfo(m.status, open);
  const finished = m.status === "finished";

  return (
    <div
      className={`card match-card ${st.card} p-5 fade-in`}
      style={{ animationDelay: `${Math.min(animIndex, 8) * 45}ms` }}
    >
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className={`badge badge-dot ${st.badge}`}>{st.label}</span>
        {m.stage && <span className="badge badge-info">{m.stage}</span>}
      </div>

      {/* Skóre ve dvou sloupcích: tým vlevo, skóre vpravo */}
      <div className="flex flex-col gap-2 mb-4">
        <ScoreRow
          name={m.home_team}
          score={m.home_score}
          finished={finished}
          winner={
            finished &&
            m.home_score != null &&
            m.away_score != null &&
            m.home_score > m.away_score
          }
        />
        <ScoreRow
          name={m.away_team}
          score={m.away_score}
          finished={finished}
          winner={
            finished &&
            m.home_score != null &&
            m.away_score != null &&
            m.away_score > m.home_score
          }
        />
      </div>

      {/* Čas startu + živý odpočet do uzávěrky */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className="badge">
          <CalendarIcon />
          {formatTime(m.starts_at)}
        </span>
        {open && (
          <Countdown target={m.starts_at} label="Začíná za" />
        )}
      </div>

      {isMember ? (
        <div className="flex flex-col gap-3">
          {m.markets?.map((market) => (
            <MarketRow
              key={market.id}
              market={market}
              open={open}
              pred={predictionByMarket.get(market.id)}
            />
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted">
          Připoj se k tipovačce, abys mohl tipovat.
        </p>
      )}

      {stat && stat.total > 0 && (
        <OutcomeBar
          home={stat.home_wins}
          draw={stat.draws}
          away={stat.away_wins}
        />
      )}
    </div>
  );
}

/** Jedna tipovací otázka u zápasu – formulář (auto-uložení) nebo zamčený výsledek. */
function MarketRow({
  market,
  open,
  pred,
}: {
  market: Market;
  open: boolean;
  pred?: { value: Record<string, unknown>; points_awarded: number | null };
}) {
  const label = market.label ?? "Tip";

  if (!open) {
    return (
      <div className="rounded-lg border p-3 text-sm flex items-center justify-between gap-3">
        <div>
          <div className="text-muted text-xs mb-0.5">{label}</div>
          <div>
            {pred ? describeValue(market.type, pred.value) : "Netipoval jsi"}
          </div>
        </div>
        {pred?.points_awarded != null && (
          <span className="badge">{pred.points_awarded} b.</span>
        )}
      </div>
    );
  }

  return (
    <PredictionForm
      marketId={market.id}
      type={market.type}
      label={label}
      initial={pred?.value}
    />
  );
}

/** Jeden řádek výsledkové tabulky: tým vlevo, skóre vpravo. */
function ScoreRow({
  name,
  score,
  finished,
  winner,
}: {
  name: string;
  score: number | null;
  finished: boolean;
  winner: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 min-w-0">
        <TeamBadge name={name} size={28} />
        <span className={`truncate ${winner ? "font-bold" : "font-medium"}`}>
          {name}
        </span>
      </div>
      <span className="w-8 text-center text-xl font-bold tabular-nums shrink-0">
        {finished ? (
          (score ?? "-")
        ) : (
          <span className="text-muted text-base font-normal">–</span>
        )}
      </span>
    </div>
  );
}

function RulesIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--primary)"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6M9 13h6M9 17h6" />
    </svg>
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

function describeValue(type: string, value: Record<string, unknown>) {
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
