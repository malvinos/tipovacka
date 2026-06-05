import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  createMatch,
  deleteAllMatches,
  deleteMatch,
  importMatches,
  saveResult,
  updatePool,
} from "@/app/admin/actions";
import { ConfirmButton } from "@/components/ConfirmButton";
import { ImportArea } from "@/components/ImportArea";

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
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    imported?: string;
    skipped?: string;
    import_error?: string;
  }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const supabase = await createClient();

  const { data: pool } = await supabase
    .from("pools")
    .select(
      "id, name, description, rules, is_public, status, image_url, default_markets",
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

      {/* Hlášky o importu */}
      {sp.imported && (
        <div className="card p-4 text-sm badge-success border">
          Naimportováno {sp.imported} zápasů
          {sp.skipped && Number(sp.skipped) > 0
            ? ` (přeskočeno ${sp.skipped} neplatných řádků)`
            : ""}
          .
        </div>
      )}
      {sp.import_error && (
        <div className="card p-4 text-sm badge-warning border">
          Import se nezdařil: {sp.import_error}
        </div>
      )}

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
                className="mt-2 h-28 w-full object-cover rounded-lg border"
              />
            )}
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Pravidla tipování</span>
            <textarea
              name="rules"
              rows={4}
              className="input"
              defaultValue={pool.rules ?? ""}
            />
          </label>

          <div className="grid sm:grid-cols-2 gap-4">
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
              <span className="text-sm font-medium">
                Přístupový kód (soukromá)
              </span>
              <input
                name="join_code"
                className="input"
                defaultValue={joinCode ?? ""}
              />
            </label>
          </div>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              name="is_public"
              defaultChecked={pool.is_public}
            />
            <span className="text-sm">Veřejná (vidí ji každý)</span>
          </label>

          <details className="text-sm">
            <summary className="cursor-pointer text-muted">
              Pokročilé: šablona tipovacích otázek (JSON)
            </summary>
            <textarea
              name="default_markets"
              rows={5}
              className="input mt-2 font-mono text-xs"
              defaultValue={JSON.stringify(
                pool.default_markets ?? [],
                null,
                2,
              )}
            />
            <p className="text-muted mt-1 text-xs">
              Určuje, jaké otázky se vytvoří u každého nového zápasu. Výchozí:
              přesný výsledek (3 body) / správný vítěz (1 bod).
            </p>
          </details>

          <div className="flex justify-end">
            <button type="submit" className="btn btn-primary">
              Uložit změny
            </button>
          </div>
        </form>
      </section>

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
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">
                Uzávěrka tipů <span className="text-muted">(nepovinné)</span>
              </span>
              <input
                name="predict_deadline"
                type="datetime-local"
                className="input"
              />
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
                  >
                    Smazat
                  </ConfirmButton>
                </form>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
