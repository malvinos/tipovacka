"use client";

import { useState } from "react";
import Link from "next/link";

export type CardPool = {
  id: string;
  name: string;
  description: string | null;
  is_public: boolean;
  image_url: string | null;
  members: number;
  date: string | null;
};

export type Group = { key: string; title: string; pools: CardPool[] };

function membersLabel(n: number): string {
  if (n === 1) return "1 člen";
  if (n >= 2 && n <= 4) return `${n} členové`;
  return `${n} členů`;
}

export function HomeTabs({ groups }: { groups: Group[] }) {
  const firstNonEmpty = groups.findIndex((g) => g.pools.length > 0);
  const [active, setActive] = useState(firstNonEmpty === -1 ? 0 : firstNonEmpty);
  const current = groups[active];

  return (
    <div>
      {/* Přepínač kategorií – segment na střed */}
      <div className="flex justify-center mb-8">
        <div className="inline-flex flex-wrap justify-center gap-1 p-1 rounded-full border bg-surface max-w-full">
          {groups.map((g, i) => (
            <button
              key={g.key}
              type="button"
              onClick={() => setActive(i)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                i === active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted hover:text-foreground"
              }`}
            >
              {g.title}
              <span
                className={`ml-1.5 ${i === active ? "opacity-80" : "opacity-60"}`}
              >
                {g.pools.length}
              </span>
            </button>
          ))}
        </div>
      </div>

      {current.pools.length === 0 ? (
        <div className="card p-10 text-center text-muted">
          V této kategorii zatím nic není.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {current.pools.map((pool, i) => (
            <PoolCard key={pool.id} pool={pool} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}

function PoolCard({ pool, index }: { pool: CardPool; index: number }) {
  return (
    <Link
      href={`/tipovacky/${pool.id}`}
      className={`card p-4 flex items-center gap-4 transition-all fade-in hover:-translate-y-0.5 ${
        pool.is_public ? "hover:border-primary" : "private-card"
      }`}
      style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
    >
      {/* Malý náhled / iniciála */}
      {pool.image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={pool.image_url}
          alt=""
          className="h-14 w-14 rounded-xl object-cover shrink-0"
        />
      ) : (
        <div
          className="h-14 w-14 rounded-xl flex items-center justify-center text-xl font-bold text-white shrink-0"
          style={{
            background: pool.is_public
              ? "linear-gradient(135deg, var(--primary), #8b5cf6)"
              : "linear-gradient(135deg, var(--warning), #b45309)",
          }}
        >
          {pool.name.slice(0, 1).toUpperCase()}
        </div>
      )}

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-semibold truncate">{pool.name}</h2>
          {pool.is_public ? (
            <span className="badge shrink-0">Veřejná</span>
          ) : (
            <span className="badge badge-warning shrink-0">
              <LockIcon /> Soukromá
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 text-xs text-muted mt-1.5">
          {pool.date && (
            <span className="flex items-center gap-1.5">
              <CalendarIcon />
              {pool.date}
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <UsersIcon />
            {membersLabel(pool.members)}
          </span>
        </div>
      </div>
    </Link>
  );
}

function LockIcon() {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function CalendarIcon() {
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
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

function UsersIcon() {
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
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
