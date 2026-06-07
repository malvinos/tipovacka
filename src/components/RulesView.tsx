import React from "react";

/**
 * Vykreslí pravidla z jednoduchého formátu:
 *  - `# nadpis`              → nadpis
 *  - `**tučně**`             → tučně
 *  - `- ` / `• ` řádek       → odrážka
 *  - blok `:::info … :::`    → barevný rámeček (info / success / warn / box)
 */
export function RulesView({ text }: { text: string }) {
  const blocks = parseBlocks(text);
  return (
    <div className="flex flex-col gap-3">
      {blocks.map((b, i) =>
        b.type === "text" ? (
          <Content key={i} lines={b.lines} />
        ) : (
          <div key={i} className={`rounded-lg p-4 border-l-4 ${calloutClass(b.type)}`}>
            <Content lines={b.lines} />
          </div>
        ),
      )}
    </div>
  );
}

type Block = { type: "text" | "info" | "success" | "warn" | "box"; lines: string[] };

function parseBlocks(text: string): Block[] {
  const out: Block[] = [];
  let current: Block = { type: "text", lines: [] };
  const push = () => {
    if (current.lines.length > 0) out.push(current);
  };
  for (const raw of (text ?? "").split(/\r?\n/)) {
    const line = raw;
    const open = line.match(/^:::(info|success|warn|box)\s*$/);
    if (open) {
      push();
      current = { type: open[1] as Block["type"], lines: [] };
      continue;
    }
    if (/^:::\s*$/.test(line)) {
      push();
      current = { type: "text", lines: [] };
      continue;
    }
    current.lines.push(line);
  }
  push();
  return out;
}

function calloutClass(type: Block["type"]): string {
  switch (type) {
    case "warn":
      return "callout-warn";
    case "success":
      return "callout-success";
    case "info":
      return "callout-info";
    default:
      return "callout-box";
  }
}

/** Vykreslí obsah bloku (nadpisy, odrážky, odstavce, tučné). */
function Content({ lines }: { lines: string[] }) {
  const nodes: React.ReactNode[] = [];
  let bullets: string[] = [];
  let key = 0;

  const flushBullets = () => {
    if (bullets.length === 0) return;
    nodes.push(
      <ul key={`u${key++}`} className="list-disc pl-5 flex flex-col gap-0.5">
        {bullets.map((b, i) => (
          <li key={i}>{inline(b)}</li>
        ))}
      </ul>,
    );
    bullets = [];
  };

  for (const line of lines) {
    const t = line.trim();
    if (t === "") {
      flushBullets();
      continue;
    }
    if (t.startsWith("# ")) {
      flushBullets();
      nodes.push(
        <h3 key={`h${key++}`} className="font-bold text-base">
          {inline(t.slice(2))}
        </h3>,
      );
    } else if (t.startsWith("- ") || t.startsWith("• ")) {
      bullets.push(t.slice(2));
    } else {
      flushBullets();
      nodes.push(
        <p key={`p${key++}`} className="text-sm">
          {inline(t)}
        </p>,
      );
    }
  }
  flushBullets();
  return <div className="flex flex-col gap-1.5">{nodes}</div>;
}

/** Zpracuje `**tučně**` na <strong>. */
function inline(text: string): React.ReactNode[] {
  return text.split(/\*\*(.+?)\*\*/g).map((part, i) =>
    i % 2 === 1 ? (
      <strong key={i} className="font-semibold text-foreground">
        {part}
      </strong>
    ) : (
      <React.Fragment key={i}>{part}</React.Fragment>
    ),
  );
}
