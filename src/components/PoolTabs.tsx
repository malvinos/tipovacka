"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function PoolTabs({ poolId }: { poolId: string }) {
  const pathname = usePathname();
  const base = `/tipovacky/${poolId}`;

  const tabs = [
    { href: base, label: "Zápasy" },
    { href: `${base}/zebricek`, label: "Žebříček" },
  ];

  return (
    <nav className="flex gap-1 border-b mb-8">
      {tabs.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              active
                ? "border-primary text-foreground"
                : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
