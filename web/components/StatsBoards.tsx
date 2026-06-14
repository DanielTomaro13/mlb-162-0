"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import type { ProfilePlayer } from "@/lib/playerdb";
import { teamColors } from "@/lib/teams";
import { avg3 } from "@/lib/format";

type Board = { key: keyof ProfilePlayer; label: string; fmt?: (n: number) => string; asc?: boolean };

const BAT_BOARDS: Board[] = [
  { key: "hr", label: "Home Runs" },
  { key: "rbi", label: "Runs Batted In" },
  { key: "hits", label: "Hits" },
  { key: "runs", label: "Runs Scored" },
  { key: "db", label: "Doubles" },
  { key: "bb", label: "Walks" },
  { key: "sb", label: "Stolen Bases" },
  { key: "ops", label: "On-base Plus Slugging", fmt: avg3 },
];
const PIT_BOARDS: Board[] = [
  { key: "w", label: "Wins" },
  { key: "so", label: "Strikeouts" },
  { key: "sv", label: "Saves" },
  { key: "ip", label: "Innings Pitched" },
  { key: "eraAvg", label: "Earned Run Average", fmt: (n) => n.toFixed(2), asc: true },
  { key: "rating", label: "Top Rated" },
];

export default function StatsBoards({ players }: { players: ProfilePlayer[] }) {
  const [kind, setKind] = useState<"bat" | "pit">("bat");
  const [team, setTeam] = useState("All teams");
  const teams = useMemo(() => ["All teams", ...Array.from(new Set(players.map((p) => p.team))).sort()], [players]);
  const pool = useMemo(
    () => players.filter((p) => p.kind === kind && (team === "All teams" || p.team === team)),
    [players, kind, team]
  );
  const boards = kind === "bat" ? BAT_BOARDS : PIT_BOARDS;

  return (
    <div style={{ display: "grid", gap: "1.25rem" }}>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
        {(["bat", "pit"] as const).map((k) => (
          <button key={k} onClick={() => setKind(k)} className="chip"
            style={{ cursor: "pointer", borderColor: kind === k ? "var(--accent)" : "var(--border)", color: kind === k ? "var(--text)" : "var(--muted)" }}>
            {k === "bat" ? "Hitters" : "Pitchers"}
          </button>
        ))}
        <select value={team} onChange={(e) => setTeam(e.target.value)}
          style={{ marginLeft: "auto", padding: ".4rem .6rem", borderRadius: 999, border: "1px solid var(--border)", background: "var(--panel-2)", color: "var(--text)", fontSize: 16 }}>
          {teams.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <div className="grid-cards" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))" }}>
        {boards.map((b) => {
          const top = [...pool]
            .filter((p) => Number(p[b.key]) > 0)
            .sort((x, y) => b.asc ? (x[b.key] as number) - (y[b.key] as number) : (y[b.key] as number) - (x[b.key] as number))
            .slice(0, 10);
          return (
            <div key={String(b.key)} className="card" style={{ padding: "1rem" }}>
              <h2 style={{ margin: "0 0 8px", fontSize: "1rem" }}>{b.label}</h2>
              <ol style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 4 }}>
                {top.map((p, i) => {
                  const [c1] = teamColors(p.team);
                  const v = p[b.key] as number;
                  return (
                    <li key={p.id} style={{ display: "flex", gap: 8, alignItems: "center", fontSize: ".86rem" }}>
                      <span style={{ width: 16, color: "var(--muted)", fontFamily: "var(--font-mono)", fontSize: ".75rem" }}>{i + 1}</span>
                      <span style={{ width: 7, height: 7, borderRadius: 2, background: c1, flexShrink: 0 }} />
                      <Link href={`/players/${p.id}/${p.slug}`} style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</Link>
                      <span style={{ fontFamily: "var(--font-cond)", color: "var(--gold)" }}>{b.fmt ? b.fmt(v) : v}</span>
                    </li>
                  );
                })}
              </ol>
            </div>
          );
        })}
      </div>
      <p style={{ fontSize: ".75rem", color: "var(--muted)" }}>
        Career totals across the seasons in the pool ({players.length ? "" : ""}MLB data). ERA &amp; OPS are season averages.
      </p>
    </div>
  );
}
