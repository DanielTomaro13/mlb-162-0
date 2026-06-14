import Link from "next/link";
import type { LiveLeaders as LL, LeaderEntry } from "@/lib/data";
import { teamColors, teamAbbr } from "@/lib/teams";
import { avg3 } from "@/lib/format";

/** Format a leader value by stat key. */
function fmt(key: string, v: number): string {
  if (key === "avg" || key === "ops") return avg3(v);
  if (key === "era" || key === "whip") return v.toFixed(2);
  if (key === "inningsPitched") return v.toFixed(1);
  return String(v);
}

const BOARDS: { key: string; label: string; group: "hitting" | "pitching" }[] = [
  { key: "homeRuns", label: "Home Runs", group: "hitting" },
  { key: "rbi", label: "RBI", group: "hitting" },
  { key: "avg", label: "Batting Avg", group: "hitting" },
  { key: "ops", label: "OPS", group: "hitting" },
  { key: "wins", label: "Wins", group: "pitching" },
  { key: "era", label: "ERA", group: "pitching" },
  { key: "strikeOuts", label: "Strikeouts", group: "pitching" },
  { key: "saves", label: "Saves", group: "pitching" },
];

function Board({ label, list, statKey }: { label: string; list: LeaderEntry[]; statKey: string }) {
  if (!list?.length) return null;
  return (
    <div className="card" style={{ padding: "0.9rem 1rem" }}>
      <h3 style={{ margin: "0 0 8px", fontSize: ".95rem" }}>{label}</h3>
      <ol style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 4 }}>
        {list.slice(0, 5).map((p, i) => {
          const [c1] = teamColors(p.team);
          return (
            <li key={p.id} style={{ display: "flex", gap: 8, alignItems: "center", fontSize: ".84rem" }}>
              <span style={{ width: 14, color: "var(--muted)", fontFamily: "var(--font-mono)", fontSize: ".72rem" }}>{i + 1}</span>
              <span style={{ width: 7, height: 7, borderRadius: 2, background: c1, flexShrink: 0 }} />
              <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {p.name} <span style={{ color: "var(--muted)", fontSize: ".74rem" }}>{teamAbbr(p.team)}</span>
              </span>
              <span style={{ fontFamily: "var(--font-cond)", color: "var(--gold)" }}>{fmt(statKey, p.v)}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export default function LiveLeaders({ data }: { data?: LL }) {
  if (!data) return null;
  return (
    <section>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
        <h2 style={{ margin: 0 }}>{data.season} stat leaders</h2>
        <Link href="/stats" style={{ fontSize: ".85rem", color: "var(--accent)" }}>All-time leaders →</Link>
      </div>
      <div className="grid-cards" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))" }}>
        {BOARDS.map((b) => (
          <Board key={b.key} label={b.label} statKey={b.key} list={data[b.group]?.[b.key] ?? []} />
        ))}
      </div>
    </section>
  );
}
