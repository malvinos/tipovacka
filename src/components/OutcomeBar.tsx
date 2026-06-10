/**
 * Souhrnná statistika tipů u zápasu: poměr výhra domácích (1) / remíza (X) /
 * výhra hostů (2) jako barevný pruh s procenty.
 */
export function OutcomeBar({
  home,
  draw,
  away,
}: {
  home: number;
  draw: number;
  away: number;
}) {
  const total = home + draw + away;
  if (total === 0) return null;
  const pct = (n: number) => Math.round((n / total) * 100);
  const h = pct(home);
  const d = pct(draw);
  const a = pct(away);

  const C_HOME = "#2563eb"; // modrá
  const C_DRAW = "#94a3b8"; // šedá
  const C_AWAY = "#f97316"; // oranžová

  return (
    <div className="mt-4 pt-3 border-t">
      <div className="flex items-center justify-between text-xs text-muted mb-1.5">
        <span>Jak tipují ostatní</span>
        <span>{total} tipů</span>
      </div>
      <div className="flex h-2.5 rounded-full overflow-hidden bg-border">
        <div style={{ width: `${h}%`, background: C_HOME }} />
        <div style={{ width: `${d}%`, background: C_DRAW }} />
        <div style={{ width: `${a}%`, background: C_AWAY }} />
      </div>
      <div className="flex justify-between text-xs mt-1.5 font-medium">
        <span style={{ color: C_HOME }}>1 · {h}%</span>
        <span style={{ color: C_DRAW }}>X · {d}%</span>
        <span style={{ color: C_AWAY }}>2 · {a}%</span>
      </div>
    </div>
  );
}
