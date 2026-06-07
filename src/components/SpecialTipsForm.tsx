"use client";

import { useRef, useState } from "react";
import { savePlacementTeam, saveExtraAnswer } from "@/app/tipovacky/actions";

type Status = "idle" | "saving" | "saved" | "error";

export type Position = {
  n: number;
  label: string;
  medal: string;
  points?: number;
};
export type Extra = {
  kind: string;
  label: string;
  icon: string;
  points?: number;
};

export function SpecialTipsForm({
  poolId,
  placementOn,
  positions,
  teams,
  extras,
  initialPicks,
  initialExtras,
}: {
  poolId: string;
  placementOn: boolean;
  positions: Position[];
  teams: string[];
  extras: Extra[];
  initialPicks: Record<number, string>;
  initialExtras: Record<string, string>;
}) {
  return (
    <div className="card p-5 flex flex-col gap-6">
      {placementOn && (
        <div className="flex flex-col gap-3">
          <h3 className="font-semibold">Konečné pořadí</h3>
          {positions.map((p) => (
            <PlacementSelect
              key={p.n}
              poolId={poolId}
              position={p}
              teams={teams}
              initial={initialPicks[p.n] ?? ""}
            />
          ))}
        </div>
      )}

      {extras.length > 0 && (
        <div className="flex flex-col gap-3">
          <h3 className="font-semibold">Bonusové tipy</h3>
          {extras.map((e) => (
            <ExtraInput
              key={e.kind}
              poolId={poolId}
              extra={e}
              initial={initialExtras[e.kind] ?? ""}
            />
          ))}
        </div>
      )}

      <p className="text-xs text-muted">
        Tipy se ukládají automaticky. Měnit je můžeš do začátku turnaje.
      </p>
    </div>
  );
}

function PlacementSelect({
  poolId,
  position,
  teams,
  initial,
}: {
  poolId: string;
  position: Position;
  teams: string[];
  initial: string;
}) {
  const [value, setValue] = useState(initial);
  const [status, setStatus] = useState<Status>(initial ? "saved" : "idle");

  async function onChange(team: string) {
    setValue(team);
    setStatus("saving");
    const res = await savePlacementTeam({ poolId, position: position.n, team });
    setStatus(res.ok ? "saved" : "error");
  }

  return (
    <label className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3">
      <span className="text-sm sm:w-44 shrink-0">
        {position.medal} {position.label}{" "}
        {position.points ? (
          <span className="text-xs text-muted font-normal">
            ({position.points} b.)
          </span>
        ) : null}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input"
      >
        <option value="">— vyber tým —</option>
        {teams.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>
      <StatusBadge status={status} />
    </label>
  );
}

function ExtraInput({
  poolId,
  extra,
  initial,
}: {
  poolId: string;
  extra: Extra;
  initial: string;
}) {
  const [value, setValue] = useState(initial);
  const [status, setStatus] = useState<Status>(initial ? "saved" : "idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function save(answer: string) {
    setStatus("saving");
    const res = await saveExtraAnswer({ poolId, kind: extra.kind, answer });
    setStatus(res.ok ? "saved" : "error");
  }

  function onChange(answer: string) {
    setValue(answer);
    setStatus("idle");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => save(answer), 700);
  }

  function onBlur() {
    if (timer.current) clearTimeout(timer.current);
    save(value);
  }

  return (
    <label className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3">
      <span className="text-sm sm:w-48 shrink-0">
        {extra.icon} {extra.label}{" "}
        {extra.points ? (
          <span className="text-xs text-muted font-normal">
            ({extra.points} b.)
          </span>
        ) : null}
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder="Jméno hráče"
        className="input"
      />
      <StatusBadge status={status} />
    </label>
  );
}

function StatusBadge({ status }: { status: Status }) {
  if (status === "saving")
    return <span className="text-xs text-muted shrink-0">Ukládám…</span>;
  if (status === "saved")
    return (
      <span className="text-xs text-green-600 font-medium shrink-0">
        Uloženo ✓
      </span>
    );
  if (status === "error")
    return (
      <span className="text-xs text-red-600 font-medium shrink-0">Chyba</span>
    );
  return <span className="w-14 shrink-0" />;
}
