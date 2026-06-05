/**
 * Ikona týmu – kolečko s iniciálami a barvou odvozenou z názvu.
 * Stejný tým má vždy stejnou barvu (deterministicky z hashe názvu).
 */
export function TeamBadge({
  name,
  size = 32,
}: {
  name: string;
  size?: number;
}) {
  const initials = getInitials(name);
  const hue = hashHue(name);

  return (
    <span
      className="team-badge"
      title={name}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.4,
        background: `linear-gradient(135deg, hsl(${hue} 65% 48%), hsl(${(hue + 35) % 360} 65% 40%))`,
      }}
    >
      {initials}
    </span>
  );
}

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

function hashHue(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) % 360;
  }
  return hash;
}
