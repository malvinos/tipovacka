/**
 * Výpočet bodů za tipy. Centrální místo, kam se přidávají nové typy tipů.
 *
 * Každý "market" (tipovací otázka) má:
 *  - type           – druh tipu (EXACT_SCORE, OUTCOME_1X2, FIRST_SCORER, …)
 *  - points_config  – kolik bodů za co (JSON)
 *  - correct_answer – správná odpověď (JSON, doplní admin / odvodí se z výsledku)
 * Tip uživatele (prediction) má `value` (JSON).
 */

export type MarketType = "EXACT_SCORE" | "OUTCOME_1X2" | "FIRST_SCORER";

export function outcomeFromScore(home: number, away: number): "1" | "X" | "2" {
  if (home > away) return "1";
  if (home < away) return "2";
  return "X";
}

/**
 * Správná odpověď, kterou lze automaticky odvodit z výsledku zápasu.
 * Vrací null pro typy, které musí admin vyplnit ručně (např. první střelec).
 */
export function correctAnswerFromResult(
  type: string,
  home: number,
  away: number,
): Record<string, unknown> | null {
  switch (type) {
    case "EXACT_SCORE":
      return { home, away };
    case "OUTCOME_1X2":
      return { outcome: outcomeFromScore(home, away) };
    default:
      return null;
  }
}

type AnyRecord = Record<string, unknown>;

/**
 * Spočítá body za jeden tip vůči správné odpovědi.
 */
export function scorePrediction(
  type: string,
  value: AnyRecord | null,
  correct: AnyRecord | null,
  config: AnyRecord,
): number {
  if (!value || !correct) return 0;

  switch (type) {
    case "EXACT_SCORE": {
      const exactPts = num(config.exact, 3);
      const outcomePts = num(config.outcome, 1);
      const vh = num(value.home, NaN);
      const va = num(value.away, NaN);
      const ch = num(correct.home, NaN);
      const ca = num(correct.away, NaN);
      if ([vh, va, ch, ca].some(Number.isNaN)) return 0;
      if (vh === ch && va === ca) return exactPts;
      if (outcomeFromScore(vh, va) === outcomeFromScore(ch, ca))
        return outcomePts;
      return 0;
    }
    case "OUTCOME_1X2": {
      const pts = num(config.correct, 1);
      return value.outcome === correct.outcome ? pts : 0;
    }
    case "FIRST_SCORER": {
      const pts = num(config.correct, 1);
      const v = str(value.player);
      const c = str(correct.player);
      return v && c && v.trim().toLowerCase() === c.trim().toLowerCase()
        ? pts
        : 0;
    }
    default:
      return 0;
  }
}

function num(v: unknown, fallback: number): number {
  const n = typeof v === "string" ? Number(v) : (v as number);
  return typeof n === "number" && !Number.isNaN(n) ? n : fallback;
}

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}
