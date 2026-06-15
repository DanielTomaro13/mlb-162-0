"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { loadResults, type Results, type GameResult } from "@/lib/data";
import { teamColors } from "@/lib/teams";

export default function ScheduleView() {
  const [data, setData] = useState<Results | null>(null);
  const [tab, setTab] = useState<"upcoming" | "results">("upcoming");
  const [team, setTeam] = useState("All teams");
  useEffect(() => { loadResults().then(setData); }, []);

  const games = useMemo(() => {
    if (!data) return [];
    const list = tab === "upcoming" ? data.schedule.upcoming : [...data.schedule.results].reverse();
    return team === "All teams" ? list : list.filter((g) => g.home === team || g.away === team);
  }, [data, tab, team]);

  if (!data) return <p style={{ color: "var(--muted)" }}>Loading schedule…</p>;
  const teams = ["All teams", ...Array.from(new Set(
    [...data.schedule.upcoming, ...data.schedule.results].flatMap((g) => [g.home, g.away])
  )).sort()];

  const byDate = new Map<string, GameResult[]>();
  for (const g of games) { if (!byDate.has(g.date)) byDate.set(g.date, []); byDate.get(g.date)!.push(g); }

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 6 }}>
          {(["upcoming", "results"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className="chip"
              style={{ cursor: "pointer", textTransform: "capitalize", borderColor: tab === t ? "var(--accent)" : "var(--border)", color: tab === t ? "var(--text)" : "var(--muted)" }}>
              {t}
            </button>
          ))}
        </div>
        <select value={team} onChange={(e) => setTeam(e.target.value)}
          style={{ marginLeft: "auto", padding: ".4rem .6rem", borderRadius: 999, border: "1px solid var(--border)", background: "var(--panel-2)", color: "var(--text)", fontSize: 16 }}>
          {teams.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {[...byDate.keys()].map((date) => (
        <div key={date}>
          <div style={{ fontSize: ".74rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 6 }}>
            {new Date(date + "T12:00:00Z").toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
          </div>
          <div className="grid-cards">
            {byDate.get(date)!.map((g, i) => <GameCard key={i} g={g} />)}
          </div>
        </div>
      ))}
      {games.length === 0 && <p style={{ color: "var(--muted)" }}>No games to show.</p>}
    </div>
  );
}

function GameCard({ g }: { g: GameResult }) {
  // A "Final" with null scores is an upstream data gap (postponed / no result).
  const played = g.status === "Final" && g.hs != null && g.as != null;
  const label = g.status === "Final" && !played ? "No result" : !played ? g.status : "";
  const inner = (
    <>
      <Row name={g.away} score={g.as} win={g.awayWin} played={played} />
      <Row name={g.home} score={g.hs} win={g.homeWin} played={played} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        {label && <span style={{ fontSize: ".68rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".05em" }}>{label}</span>}
        {g.pk != null && (
          <span style={{ marginLeft: "auto", fontSize: ".68rem", color: "var(--accent)", textTransform: "uppercase", letterSpacing: ".05em" }}>
            Box score →
          </span>
        )}
      </div>
    </>
  );
  if (g.pk != null) {
    return (
      <Link href={`/game?pk=${g.pk}`} className="card" style={{ padding: ".8rem 1rem", display: "grid", gap: 6, textDecoration: "none", color: "inherit" }}>
        {inner}
      </Link>
    );
  }
  return (
    <div className="card" style={{ padding: ".8rem 1rem", display: "grid", gap: 6 }}>
      {inner}
    </div>
  );
}
function Row({ name, score, win, played }: { name: string; score: number | null; win: boolean | null; played: boolean }) {
  const [c1] = teamColors(name);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: win ? 700 : 400, opacity: played && !win ? 0.7 : 1 }}>
      <span style={{ width: 9, height: 9, borderRadius: 2, background: c1, flexShrink: 0 }} />
      <span style={{ flex: 1, fontSize: ".88rem" }}>{name}</span>
      <span style={{ fontFamily: "var(--font-cond)", fontSize: "1.1rem" }}>{played && score != null ? score : "—"}</span>
    </div>
  );
}
