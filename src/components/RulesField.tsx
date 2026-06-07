"use client";

import { useRef, useState } from "react";

/**
 * Pole „Pravidla tipování" s tlačítkem, které pravidla vygeneruje z aktuálního
 * nastavení formuláře (bodování + zapnuté speciální tipy) včetně příkladů a
 * upozornění na speciální tipy.
 */
export function RulesField({
  initial,
  poolName,
}: {
  initial: string;
  poolName: string;
}) {
  const [value, setValue] = useState(initial);
  const ref = useRef<HTMLTextAreaElement>(null);

  function generate() {
    const form = ref.current?.form;
    if (!form) return;
    const val = (name: string, fallback = "") =>
      (form.elements.namedItem(name) as HTMLInputElement | null)?.value ||
      fallback;
    const checked = (name: string) =>
      (form.elements.namedItem(name) as HTMLInputElement | null)?.checked ??
      false;

    const exact = val("points_exact", "15");
    const outcome = val("points_outcome", "7");
    const goals = val("points_goals", "3");

    const lines: string[] = [
      `# 🏆 Pravidla tipování — ${poolName}`,
      "",
      ":::info",
      "**Bodování zápasů** (počítá se nejvýhodnější varianta):",
      `- **Přesný výsledek:** ${exact} b.`,
      `- **Správný vítěz / remíza:** ${outcome} b.`,
      `- **Správný počet branek** (součet gólů obou týmů): ${goals} b.`,
      ":::",
      "",
      "**Příklady:**",
      `- Tip 2:1, výsledek 2:1 → **${exact} b.** (přesný výsledek)`,
      `- Tip 2:1, výsledek 1:0 → **${outcome} b.** (správný vítěz)`,
      `- Tip 2:1, výsledek 0:3 → **${goals} b.** (sedí počet branek, jiný vítěz)`,
      "- Tip 0:3, výsledek 2:1 → **0 b.**",
    ];

    const special: string[] = [];
    if (checked("placement_enabled")) {
      special.push(
        `- 🥇 **Konečné pořadí** — 1./2./3. místo za ${val("placement_points_1", "15")}/${val("placement_points_2", "15")}/${val("placement_points_3", "15")} b.`,
      );
    }
    if (checked("scorer_enabled")) {
      special.push(
        `- ⚽ **Nejlepší střelec turnaje:** ${val("scorer_points", "15")} b.`,
      );
    }
    if (checked("assists_enabled")) {
      special.push(`- 🅰️ **Nejvíc asistencí:** ${val("assists_points", "15")} b.`);
    }

    if (special.length > 0) {
      lines.push("", ":::success", "**Speciální tipy:**", ...special, ":::");
      lines.push(
        "",
        ":::warn",
        '⚠️ **DŮLEŽITÉ:** Nezapomeň vyplnit i **speciální tipy** (záložka „Speciální tipy")! Pořadí i hráče lze tipnout jen **do začátku turnaje**.',
        ":::",
      );
    }

    setValue(lines.join("\n"));
  }

  return (
    <label className="flex flex-col gap-1.5">
      <span className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium">Pravidla tipování</span>
        <button
          type="button"
          onClick={generate}
          className="btn btn-outline text-xs py-1.5 px-3"
        >
          Vygenerovat z nastavení
        </button>
      </span>
      <textarea
        ref={ref}
        name="rules"
        rows={10}
        className="input font-mono text-xs"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <span className="text-xs text-muted">
        Tlačítko přepíše text podle aktuálního bodování a zapnutých speciálních
        tipů. Text můžeš pak ručně doupravit.
      </span>
    </label>
  );
}
