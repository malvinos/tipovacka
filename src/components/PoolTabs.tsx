"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function PoolTabs({
  poolId,
  specialEnabled = false,
}: {
  poolId: string;
  specialEnabled?: boolean;
}) {
  const pathname = usePathname();
  const base = `/tipovacky/${poolId}`;

  const tabs = [
    { href: base, label: "Zápasy" },
    { href: `${base}/tipy`, label: "Tipy ostatních" },
    ...(specialEnabled
      ? [{ href: `${base}/umisteni`, label: "Speciální tipy" }]
      : []),
    { href: `${base}/zebricek`, label: "Žebříček" },
  ];

  return (
    <nav className="inline-flex flex-wrap gap-1 p-1 rounded-xl border bg-background mb-8">
      {tabs.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              active
                ? "bg-surface text-foreground shadow-sm"
                : "text-muted hover:text-foreground"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
