"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import type { ProfilePlayer } from "@/lib/playerdb";
import { teamColors, teamAbbr } from "@/lib/teams";
import { avg3 } from "@/lib/format";

const FILTERS: { key: "all" | "bat" | "pit"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "bat", label: "Hitters" },
  { key: "pit", label: "Pitchers" },
];

function line(p: ProfilePlayer): string {
  return p.kind === "bat"
    ? `${p.hr} HR · ${avg3(p.ops)} OPS · ${p.firstYear}–${p.lastYear}`
    : `${p.w} W · ${p.so} K · ${p.eraAvg.toFixed(2)} ERA · ${p.firstYear}–${p.lastYear}`;
}

/** A ranked leaderboard of the highest-rated players you can draft — the legends
 *  a perfect 162-0 roster is built from. */
export default function TopPlayersLeaderboard({
  players, limit = 25, filterable = true,
}: { players: ProfilePlayer[]; limit?: number; filterable?: boolean }) {
  const [f, setF] = useState<"all" | "bat" | "pit">("all");
  const ranked = useMemo(
    () => players
      .filter((p) => f === "all" || p.kind === f)
      .sort((a, b) => b.rating - a.rating || b.fame - a.fame)
      .slice(0, limit),
    [players, f, limit]
  );

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {filterable && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {FILTERS.map((opt) => (
            <button key={opt.key} onClick={() => setF(opt.key)} className="chip"
              style={{ cursor: "pointer", borderColor: f === opt.key ? "var(--accent)" : "var(--border)", color: f === opt.key ? "var(--text)" : "var(--muted)" }}>
              {opt.label}
            </button>
          ))}
        </div>
      )}
      <div className="card" style={{ padding: ".4rem .3rem" }}>
        <ol style={{ margin: 0, padding: 0, listStyle: "none", display: "grid" }}>
          {ranked.map((p, i) => {
            const [c1] = teamColors(p.team);
            const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : null;
            return (
              <li key={p.id} style={{ borderBottom: i < ranked.length - 1 ? "1px solid var(--border)" : "none" }}>
                <Link href={`/players/${p.id}/${p.slug}`}
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: ".55rem .7rem" }}>
                  <span style={{ width: 26, textAlign: "center", fontFamily: "var(--font-mono)", fontSize: ".82rem", color: i < 3 ? "var(--gold)" : "var(--muted)" }}>
                    {medal ?? i + 1}
                  </span>
                  <span style={{ width: 9, height: 9, borderRadius: 2, background: c1, flexShrink: 0 }} />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: "block", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {p.name} <span style={{ color: "var(--muted)", fontWeight: 400, fontSize: ".8rem" }}>{teamAbbr(p.team)} · {p.posName}</span>
                    </span>
                    <span style={{ fontSize: ".72rem", color: "var(--muted)", fontFamily: "var(--font-mono)" }}>{line(p)}</span>
                  </span>
                  <span style={{ fontFamily: "var(--font-cond)", fontSize: "1.4rem", color: p.rating >= 90 ? "var(--gold)" : "var(--text)" }}>{p.rating}</span>
                </Link>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
