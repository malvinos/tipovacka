"use client";

import { useRef, useState } from "react";
import { savePredictionValue } from "@/app/tipovacky/actions";

type Status = "idle" | "saving" | "saved" | "error";

export function PredictionForm({
  marketId,
  type,
  label,
  initial,
}: {
  marketId: string;
  type: string;
  label: string;
  initial?: Record<string, unknown>;
}) {
  const [home, setHome] = useState(
    initial?.home != null ? String(initial.home) : "",
  );
  const [away, setAway] = useState(
    initial?.away != null ? String(initial.away) : "",
  );
  const [outcome, setOutcome] = useState(
    typeof initial?.outcome === "string" ? initial.outcome : "",
  );
  const [player, setPlayer] = useState(
    typeof initial?.player === "string" ? initial.player : "",
  );
  const [status, setStatus] = useState<Status>(initial ? "saved" : "idle");
  const [err, setErr] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function buildValue(
    h = home,
    a = away,
    o = outcome,
    p = player,
  ): Record<string, unknown> | null {
    if (type === "EXACT_SCORE") {
      if (h === "" || a === "") return null;
      const nh = Number(h);
      const na = Number(a);
      if (Number.isNaN(nh) || Number.isNaN(na)) return null;
      return { home: nh, away: na };
    }
    if (type === "OUTCOME_1X2") {
      return o ? { outcome: o } : null;
    }
    if (type === "FIRST_SCORER") {
      return p.trim() ? { player: p.trim() } : null;
    }
    return null;
  }

  async function save(value: Record<string, unknown> | null) {
    if (!value) return;
    setStatus("saving");
    setErr(null);
    const res = await savePredictionValue({ marketId, value });
    if (res.ok) {
      setStatus("saved");
    } else {
      setStatus("error");
      setErr(res.error ?? "Nepodařilo se uložit.");
    }
  }

  function scheduleSave(value: Record<string, unknown> | null) {
    if (timer.current) clearTimeout(timer.current);
    if (!value) {
      setStatus("idle");
      return;
    }
    setStatus("idle");
    timer.current = setTimeout(() => save(value), 700);
  }

  function saveNow(value: Record<string, unknown> | null) {
    if (timer.current) clearTimeout(timer.current);
    save(value);
  }

  return (
    <div className="rounded-lg border p-3">
      <div className="text-xs text-muted mb-2 flex items-center justify-between gap-2">
        <span>{label}</span>
        <StatusBadge status={status} err={err} />
      </div>

      {type === "EXACT_SCORE" && (
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            inputMode="numeric"
            value={home}
            onChange={(e) => {
              setHome(e.target.value);
              scheduleSave(buildValue(e.target.value));
            }}
            onBlur={() => saveNow(buildValue())}
            className="input w-16"
          />
          <span className="font-semibold">:</span>
          <input
            type="number"
            min={0}
            inputMode="numeric"
            value={away}
            onChange={(e) => {
              setAway(e.target.value);
              scheduleSave(buildValue(home, e.target.value));
            }}
            onBlur={() => saveNow(buildValue())}
            className="input w-16"
          />
        </div>
      )}

      {type === "OUTCOME_1X2" && (
        <select
          value={outcome}
          onChange={(e) => {
            setOutcome(e.target.value);
            saveNow(buildValue(home, away, e.target.value));
          }}
          className="input w-full sm:w-52"
        >
          <option value="">Vyber…</option>
          <option value="1">Výhra domácích</option>
          <option value="X">Remíza</option>
          <option value="2">Výhra hostů</option>
        </select>
      )}

      {type === "FIRST_SCORER" && (
        <input
          value={player}
          onChange={(e) => {
            setPlayer(e.target.value);
            scheduleSave(buildValue(home, away, outcome, e.target.value));
          }}
          onBlur={() => saveNow(buildValue())}
          placeholder="Jméno hráče"
          className="input w-full sm:w-52"
        />
      )}
    </div>
  );
}

function StatusBadge({ status, err }: { status: Status; err: string | null }) {
  if (status === "saving")
    return <span className="text-muted">Ukládám…</span>;
  if (status === "saved")
    return <span className="text-green-600 font-medium">Uloženo ✓</span>;
  if (status === "error")
    return <span className="text-red-600 font-medium">{err}</span>;
  return null;
}
