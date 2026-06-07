"use client";

import { useEffect, useState } from "react";

/**
 * Živý odpočet do zadaného času. Tiká po sekundě; po vypršení se nezobrazí nic
 * (vrací null). Vykreslí se jako štítek s ikonou hodin.
 */
export function Countdown({
  target,
  label = "za",
}: {
  target: string;
  label?: string;
}) {
  // null do připojení v prohlížeči → žádný nesoulad serveru a klienta.
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  if (now === null) return null;

  const diff = new Date(target).getTime() - now;
  if (diff <= 0) return null;

  const s = Math.floor(diff / 1000) % 60;
  const m = Math.floor(diff / 60000) % 60;
  const h = Math.floor(diff / 3600000) % 24;
  const d = Math.floor(diff / 86400000);
  const pad = (n: number) => String(n).padStart(2, "0");

  const text =
    d >= 1
      ? `${d} d ${h} h`
      : h >= 1
        ? `${h}:${pad(m)}:${pad(s)}`
        : `${m}:${pad(s)}`;

  return (
    <span className="badge badge-warning tabular-nums">
      <ClockIcon />
      {label} {text}
    </span>
  );
}

function ClockIcon() {
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
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}
