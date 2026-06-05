"use client";

import { useState } from "react";

/**
 * Vstup pro hromadný import: výběr CSV souboru (přečte se v prohlížeči a vloží
 * do textového pole) nebo ruční vložení textu. Do formuláře jde jen textové
 * pole `rows` – server tak nedostává soubor (multipart), jen text.
 */
export function ImportArea() {
  const [text, setText] = useState("");

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setText(await file.text());
    }
  }

  return (
    <>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Nahrát soubor (.csv)</span>
        <input
          type="file"
          accept=".csv,.txt,text/csv,text/plain"
          onChange={handleFile}
          className="text-sm"
        />
      </label>

      <div className="flex items-center gap-3 text-xs text-muted">
        <div className="h-px flex-1 bg-border" />
        nebo vlož ručně
        <div className="h-px flex-1 bg-border" />
      </div>

      <textarea
        name="rows"
        rows={10}
        required
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="input font-mono text-xs"
        placeholder={
          "datum;čas;domácí;hosté;skupina\n2026-06-11;21:00;Mexiko;Jihoafrická republika;Skupina A\n2026-06-12;04:00;Jižní Korea;Česko;Skupina A"
        }
      />
    </>
  );
}
