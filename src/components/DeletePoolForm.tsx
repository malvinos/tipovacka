"use client";

import { useState } from "react";

/**
 * Smazání tipovačky s potvrzením přepsáním názvu. Tlačítko je aktivní,
 * až když zadaný text přesně odpovídá názvu tipovačky.
 */
export function DeletePoolForm({
  poolId,
  poolName,
  action,
}: {
  poolId: string;
  poolName: string;
  action: (formData: FormData) => void;
}) {
  const [text, setText] = useState("");
  const ok = text.trim() === poolName;

  return (
    <form
      action={action}
      className="flex flex-col sm:flex-row gap-3 sm:items-end"
    >
      <input type="hidden" name="pool_id" value={poolId} />
      <label className="flex flex-col gap-1 flex-1">
        <span className="text-xs text-muted">
          Pro potvrzení napiš název tipovačky: <b>{poolName}</b>
        </span>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={poolName}
          className="input"
        />
      </label>
      <button
        type="submit"
        disabled={!ok}
        className="btn btn-danger-ghost disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
      >
        Smazat tipovačku
      </button>
    </form>
  );
}
