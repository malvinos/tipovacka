"use client";

import { useState } from "react";

/**
 * Volba soukromí tipovačky: přepínač „vyžadovat kód".
 * Zapnuto → soukromá (zobrazí se pole na kód). Vypnuto → veřejná.
 * Do formuláře jde checkbox `private` a (když je zapnuto) `join_code`.
 */
export function PrivacyFields({
  defaultPrivate = false,
  defaultCode = "",
}: {
  defaultPrivate?: boolean;
  defaultCode?: string;
}) {
  const [priv, setPriv] = useState(defaultPrivate);

  return (
    <div className="flex flex-col gap-3">
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          name="private"
          defaultChecked={defaultPrivate}
          onChange={(e) => setPriv(e.target.checked)}
        />
        <span className="text-sm">
          Soukromá – pro vstup je potřeba přístupový kód
        </span>
      </label>

      {priv && (
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Přístupový kód</span>
          <input
            name="join_code"
            required
            defaultValue={defaultCode}
            className="input"
            placeholder="Např. TAJNY-KOD-123"
          />
          <span className="text-xs text-muted">
            Tímto kódem se ostatní připojí. Tipovačka bude vidět v seznamu, ale
            obsah se odemkne až po zadání kódu.
          </span>
        </label>
      )}
    </div>
  );
}
