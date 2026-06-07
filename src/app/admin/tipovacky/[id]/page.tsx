import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  createMatch,
  deleteAllMatches,
  deleteMatch,
  deletePool,
  evaluatePlacement,
  importMatches,
  saveResult,
  updatePool,
} from "@/app/admin/actions";
import { ConfirmButton } from "@/components/ConfirmButton";
import { ImportArea } from "@/components/ImportArea";
import { PrivacyFields } from "@/components/PrivacyFields";
import { DeletePoolForm } from "@/components/DeletePoolForm";
import { RulesField } from "@/components/RulesField";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, string> = {
  scheduled: "Naplánováno",
  locked: "Uzamčeno",
  finished: "Dohráno",
};

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("cs-CZ", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Prague",
  });
}

export default async function ManagePoolPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: pool } = await supabase
    .from("pools")
    .select(
      "id, name, description, rules, is_public, status, image_url, event_start, event_end, placement_enabled, placement_points, placement_correct, extras, default_markets",
    )
    .eq("id", id)
    .single();

  if (!pool) notFound();

  // Přístupový kód je skrytý sloupec – admin ho čte přes funkci.
  const { data: joinCode } = await supabase.rpc("get_join_code", {
    p_pool: id,
  });

  const { data: matches } = await supabase
    .from("matches")
    .select(
      "id, home_team, away_team, stage, starts_at, status, home_score, away_score",
    )
    .eq("pool_id", id)
    .order("starts_at", { ascending: true });

  // Týmy pro výběr správného pořadí (unikátní z zápasů).
  const teams = [
    ...new Set(
      (matches ?? []).flatMap((m) => [m.home_team, m.away_team]),
    ),
  ].sort((a, b) => a.localeCompare(b, "cs"));
  const placementPoints = (pool.placement_points ?? {}) as Record<
    string,
    number
  >;
  const placementCorrect = (pool.placement_correct ?? {}) as Record<
    string,
    string
  >;
  const extras = (pool.extras ?? {}) as Record<
    string,
    { enabled?: boolean; points?: number; correct?: string }
  >;
  const EXTRA_DEFS = [
    { kind: "scorer", label: "Nejlepší střelec turnaje" },
    { kind: "assists", label: "Nejvíc asistencí" },
  ];

  // Aktuální bodování zápasů (z šablony otázek)
  const dm = Array.isArray(pool.default_markets) ? pool.default_markets : [];
  const exactMarket = dm.find(
    (m: { type?: string }) => m.type === "EXACT_SCORE",
  ) as { points_config?: { exact?: number; outcome?: number } } | undefined;
  const pc = exactMarket?.points_config as
    | { exact?: number; outcome?: number; goals?: number }
    | undefined;
  const pointsExact = pc?.exact ?? 15;
  const pointsOutcome = pc?.outcome ?? 7;
  const pointsGoals = pc?.goals ?? 3;

  return (
    <div className="flex flex-col gap-10">
      <div>
        <Link href="/admin" className="text-sm text-muted hover:text-foreground">
          ← Zpět na přehled
        </Link>
        <div className="flex items-center justify-between gap-3 mt-3">
          <h2 className="text-xl font-semibold">{pool.name}</h2>
          <Link
            href={`/tipovacky/${pool.id}`}
            className="btn btn-outline"
            target="_blank"
          >
            Zobrazit veřejně ↗
          </Link>
        </div>
      </div>

      {/* Úprava tipovačky */}
      <section>
        <h3 className="font-semibold mb-4">Nastavení tipovačky</h3>
        <form action={updatePool} className="card p-6 flex flex-col gap-4">
          <input type="hidden" name="id" value={pool.id} />

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Název</span>
            <input
              name="name"
              required
              className="input"
              defaultValue={pool.name}
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Popis</span>
            <textarea
              name="description"
              rows={2}
              className="input"
              defaultValue={pool.description ?? ""}
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">
              Obrázek (URL) <span className="text-muted">(nepovinné)</span>
            </span>
            <input
              name="image_url"
              type="url"
              className="input"
              defaultValue={pool.image_url ?? ""}
              placeholder="https://…/obrazek.jpg"
            />
            {pool.image_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={pool.image_url}
                alt=""
                className="mt-2 h-40 w-full object-contain rounded-lg border bg-background"
              />
            )}
          </label>

          <RulesField initial={pool.rules ?? ""} />

          <div className="grid sm:grid-cols-3 gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">Stav</span>
              <select
                name="status"
                className="input"
                defaultValue={pool.status}
              >
                <option value="active">Aktivní</option>
                <option value="finished">Ukončená</option>
              </select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">Termín od</span>
              <input
                name="event_start"
                type="date"
                className="input"
                defaultValue={pool.event_start ?? ""}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">Termín do</span>
              <input
                name="event_end"
                type="date"
                className="input"
                defaultValue={pool.event_end ?? ""}
              />
            </label>
          </div>

          <PrivacyFields
            defaultPrivate={!pool.is_public}
            defaultCode={joinCode ?? ""}
          />

          {/* Tip na umístění */}
          <div className="rounded-lg border p-4 flex flex-col gap-3">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                name="placement_enabled"
                defaultChecked={pool.placement_enabled}
              />
              <span className="text-sm font-medium">
                Povolit tip na umístění (konečné pořadí)
              </span>
            </label>
            <p className="text-xs text-muted">
              Hráči tipnou 1.–3. místo turnaje. Body a správné pořadí nastavíš
              níže; po skončení turnaje klikni na „Vyhodnotit umístění".
            </p>
            {[1, 2, 3].map((pos) => (
              <div key={pos} className="grid grid-cols-[5rem_1fr_6rem] gap-2 items-end">
                <span className="text-sm pb-2">{pos}. místo</span>
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-muted">Správný tým</span>
                  <select
                    name={`placement_correct_${pos}`}
                    className="input"
                    defaultValue={placementCorrect[String(pos)] ?? ""}
                  >
                    <option value="">— nezadáno —</option>
                    {teams.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-muted">Body</span>
                  <input
                    name={`placement_points_${pos}`}
                    type="number"
                    min={0}
                    className="input"
                    defaultValue={placementPoints[String(pos)] ?? 15}
                  />
                </label>
              </div>
            ))}
          </div>

          {/* Bonusové tipy: střelec / asistence */}
          <div className="rounded-lg border p-4 flex flex-col gap-4">
            <p className="text-sm font-medium">Bonusové tipy</p>
            {EXTRA_DEFS.map((def) => {
              const cfg = extras[def.kind] ?? {};
              return (
                <div key={def.kind} className="flex flex-col gap-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      name={`${def.kind}_enabled`}
                      defaultChecked={cfg.enabled ?? false}
                    />
                    <span className="text-sm">{def.label}</span>
                  </label>
                  <div className="grid grid-cols-[1fr_6rem] gap-2">
                    <input
                      name={`${def.kind}_correct`}
                      className="input"
                      placeholder="Správná odpověď (po skončení)"
                      defaultValue={cfg.correct ?? ""}
                    />
                    <input
                      name={`${def.kind}_points`}
                      type="number"
                      min={0}
                      className="input"
                      placeholder="Body"
                      defaultValue={cfg.points ?? 15}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bodování zápasů */}
          <div className="rounded-lg border p-4 flex flex-col gap-3">
            <p className="text-sm font-medium">Bodování zápasů</p>
            <div className="grid sm:grid-cols-3 gap-4">
              <label className="flex flex-col gap-1.5">
                <span className="text-sm">Přesný výsledek</span>
                <input
                  name="points_exact"
                  type="number"
                  min={0}
                  className="input"
                  defaultValue={pointsExact}
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-sm">Správný vítěz / remíza</span>
                <input
                  name="points_outcome"
                  type="number"
                  min={0}
                  className="input"
                  defaultValue={pointsOutcome}
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-sm">Počet branek (součet)</span>
                <input
                  name="points_goals"
                  type="number"
                  min={0}
                  className="input"
                  defaultValue={pointsGoals}
                />
              </label>
            </div>
            <p className="text-muted text-xs">
              Počítá se nejvýhodnější varianta (přesný výsledek &gt; vítěz &gt;
              počet branek). Platí pro nové i už založené zápasy; u dohraných
              přepočítej body znovu uložením výsledku.
            </p>
          </div>

          <div className="flex justify-end">
            <button type="submit" className="btn btn-primary">
              Uložit změny
            </button>
          </div>
        </form>

      </section>

      {/* Vyhodnocení speciálních tipů */}
      {(pool.placement_enabled ||
        extras.scorer?.enabled ||
        extras.assists?.enabled) && (
        <section>
          <h3 className="font-semibold mb-4">Vyhodnocení speciálních tipů</h3>
          <div className="card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-sm text-muted">
              Spusť až po skončení turnaje, když máš vyplněné správné pořadí a
              hráče. Přepočítá body za speciální tipy do žebříčku.
            </p>
            <form action={evaluatePlacement}>
              <input type="hidden" name="pool_id" value={pool.id} />
              <ConfirmButton
                confirmText="Vyhodnotit speciální tipy a přepočítat body? Spouštěj až po vyplnění správných odpovědí."
                className="btn btn-outline shrink-0"
              >
                Vyhodnotit speciální tipy
              </ConfirmButton>
            </form>
          </div>
        </section>
      )}

      {/* Přidání zápasu */}
      <section>
        <h3 className="font-semibold mb-4">Přidat zápas</h3>
        <form action={createMatch} className="card p-6 flex flex-col gap-4">
          <input type="hidden" name="pool_id" value={pool.id} />
          <div className="grid sm:grid-cols-2 gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">Domácí</span>
              <input name="home_team" required className="input" />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">Hosté</span>
              <input name="away_team" required className="input" />
            </label>
            <label className="flex flex-col gap-1.5 sm:col-span-2">
              <span className="text-sm font-medium">
                Fáze / skupina{" "}
                <span className="text-muted">(nepovinné, např. Skupina A)</span>
              </span>
              <input
                name="stage"
                className="input"
                placeholder="Skupina A · Osmifinále · Finále…"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">Začátek zápasu</span>
              <input
                name="starts_at"
                type="datetime-local"
                required
                className="input"
              />
              <span className="text-xs text-muted">
                Tipování se uzavře v čase výkopu.
              </span>
            </label>
          </div>
          <div className="flex justify-end">
            <button type="submit" className="btn btn-primary">
              Přidat zápas
            </button>
          </div>
        </form>
      </section>

      {/* Hromadný import zápasů */}
      <section>
        <h3 className="font-semibold mb-4">Hromadný import zápasů</h3>
        <form action={importMatches} className="card p-6 flex flex-col gap-4">
          <input type="hidden" name="pool_id" value={pool.id} />
          <p className="text-sm text-muted">
            Nahraj <strong>CSV soubor</strong>, nebo vlož řádky ručně. Formát:{" "}
            <code className="text-xs">datum;čas;domácí;hosté;skupina</code>. Čas
            zadávej v pražském čase, skupina je nepovinná, hlavička se ignoruje.
          </p>

          <ImportArea />

          <div className="flex justify-end">
            <button type="submit" className="btn btn-primary">
              Importovat zápasy
            </button>
          </div>
        </form>
      </section>

      {/* Seznam zápasů + výsledky */}
      <section>
        <div className="flex items-center justify-between gap-3 mb-4">
          <h3 className="font-semibold">Zápasy ({matches?.length ?? 0})</h3>
          {matches && matches.length > 0 && (
            <form action={deleteAllMatches}>
              <input type="hidden" name="pool_id" value={pool.id} />
              <ConfirmButton
                confirmText={`Opravdu smazat všech ${matches.length} zápasů včetně tipů? Tuto akci nelze vrátit.`}
                className="btn btn-danger-ghost"
              >
                Smazat všechny
              </ConfirmButton>
            </form>
          )}
        </div>
        <div className="flex flex-col gap-3">
          {(!matches || matches.length === 0) && (
            <div className="card p-6 text-sm text-muted">
              Zatím žádné zápasy.
            </div>
          )}
          {matches?.map((m) => (
            <div key={m.id} className="card p-5">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="font-medium">
                  {m.home_team} vs {m.away_team}
                </div>
                <span className="badge">
                  {STATUS_LABELS[m.status] ?? m.status}
                </span>
              </div>
              <div className="text-xs text-muted mb-4 flex flex-wrap gap-x-3">
                {m.stage && <span className="font-medium">{m.stage}</span>}
                <span>Začátek: {formatDate(m.starts_at)}</span>
              </div>

              <div className="flex flex-wrap items-end gap-3">
                <form
                  action={saveResult}
                  className="flex items-end gap-2"
                >
                  <input type="hidden" name="match_id" value={m.id} />
                  <input type="hidden" name="pool_id" value={pool.id} />
                  <label className="flex flex-col gap-1">
                    <span className="text-xs text-muted">Domácí</span>
                    <input
                      name="home_score"
                      type="number"
                      min={0}
                      required
                      defaultValue={m.home_score ?? ""}
                      className="input w-20"
                    />
                  </label>
                  <span className="pb-2">:</span>
                  <label className="flex flex-col gap-1">
                    <span className="text-xs text-muted">Hosté</span>
                    <input
                      name="away_score"
                      type="number"
                      min={0}
                      required
                      defaultValue={m.away_score ?? ""}
                      className="input w-20"
                    />
                  </label>
                  <button type="submit" className="btn btn-primary">
                    Uložit výsledek
                  </button>
                </form>

                <form action={deleteMatch}>
                  <input type="hidden" name="match_id" value={m.id} />
                  <input type="hidden" name="pool_id" value={pool.id} />
                  <ConfirmButton
                    confirmText={`Smazat zápas ${m.home_team} vs ${m.away_team}?`}
                    className="btn btn-danger-ghost"
                  >
                    Smazat
                  </ConfirmButton>
                </form>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Nebezpečná zóna */}
      <section>
        <h3 className="font-semibold mb-4 text-red-600">Smazat tipovačku</h3>
        <div className="rounded-lg border border-red-300 p-5 flex flex-col gap-3">
          <p className="text-sm text-muted">
            Nevratně smaže tipovačku včetně všech zápasů, tipů a členů.
          </p>
          <DeletePoolForm
            poolId={pool.id}
            poolName={pool.name}
            action={deletePool}
          />
        </div>
      </section>
    </div>
  );
}
