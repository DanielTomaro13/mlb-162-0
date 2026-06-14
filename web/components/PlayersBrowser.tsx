"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import type { ProfilePlayer } from "@/lib/playerdb";
import { teamColors } from "@/lib/teams";
import { avg3 } from "@/lib/format";

const FILTERS = ["All", "Hitters", "Pitchers"];

function statLine(p: ProfilePlayer): string {
  return p.kind === "bat"
    ? `${p.posName} · ${p.hr} HR · ${avg3(p.ops)} OPS`
    : `${p.posName} · ${p.w} W · ${p.so} K · ${p.eraAvg.toFixed(2)} ERA`;
}

export default function PlayersBrowser({ players }: { players: ProfilePlayer[] }) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("All");
  const [team, setTeam] = useState("All teams");
  const teams = useMemo(() => ["All teams", ...Array.from(new Set(players.map((p) => p.team))).sort()], [players]);
  const shown = useMemo(() => {
    const query = q.trim().toLowerCase();
    return players
      .filter((p) => filter === "All" || (filter === "Hitters" ? p.kind === "bat" : p.kind === "pit"))
      .filter((p) => team === "All teams" || p.team === team)
      .filter((p) => !query || p.name.toLowerCase().includes(query) || p.team.toLowerCase().includes(query))
      .slice(0, 150);
  }, [players, q, filter, team]);

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search players or teams…"
        style={{ width: "100%", padding: ".7rem .9rem", borderRadius: 10, border: "1px solid var(--border)", background: "var(--panel)", color: "var(--text)" }} />
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
        {FILTERS.map((f) => (
          <button key={f} onClick={() => setFilter(f)} className="chip"
            style={{ cursor: "pointer", borderColor: filter === f ? "var(--accent)" : "var(--border)", color: filter === f ? "var(--text)" : "var(--muted)" }}>
            {f}
          </button>
        ))}
        <select value={team} onChange={(e) => setTeam(e.target.value)}
          style={{ marginLeft: "auto", padding: ".4rem .6rem", borderRadius: 999, border: "1px solid var(--border)", background: "var(--panel-2)", color: "var(--text)", fontSize: ".8rem" }}>
          {teams.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <div className="grid-cards">
        {shown.map((p) => {
          const [c1] = teamColors(p.team);
          return (
            <Link key={p.id} href={`/players/${p.id}/${p.slug}`} className="card" style={{ padding: "1rem", display: "grid", gap: 4 }}>
              <span style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <strong style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</strong>
                <span style={{ fontFamily: "var(--font-cond)", fontSize: "1.3rem", color: p.rating >= 90 ? "var(--gold)" : "var(--text)" }}>{p.rating}</span>
              </span>
              <span style={{ display: "flex", gap: 8, alignItems: "center", fontSize: ".8rem", color: "var(--muted)" }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: c1 }} />{p.team}
              </span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: ".7rem", color: "var(--muted)" }}>{statLine(p)}</span>
            </Link>
          );
        })}
      </div>
      {shown.length === 0 && <p style={{ color: "var(--muted)" }}>No players match.</p>}
    </div>
  );
}
