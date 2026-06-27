"use client";

import { useEffect, useMemo, useState } from "react";
import { Shell, FilterBar, S } from "@/components/ui";
import { loadPredictions, loadModelMeta, pct, odds, type Predictions, type ModelMeta, type GameProjection, type Market } from "@/lib/modeldb";

function bar(p: number) {
  return (
    <div style={{ position: "relative", height: 7, borderRadius: 5, background: "var(--bg-soft)", overflow: "hidden", minWidth: 70 }}>
      <span style={{ position: "absolute", inset: 0, right: "auto", width: `${(p * 100).toFixed(1)}%`, background: "linear-gradient(90deg,var(--navy,#3b6ef6),var(--accent-2))", borderRadius: 5 }} />
    </div>
  );
}
const get = (g: GameProjection, k: string): Market | undefined => g.markets.find((x) => x.key === k);
function rlCell(g: GameProjection, side: "home" | "away") {
  const s = get(g, "rl")?.selections?.find((x) => x.label.startsWith(side));
  return s ? `${pct(s.prob)} · ${odds(s.fair)}` : "—";
}

function GameCard({ g }: { g: GameProjection }) {
  const total = get(g, "total"), f5ml = get(g, "f5_ml"), f5t = get(g, "f5_total"), tt = get(g, "team_total");
  const nrfi = get(g, "fi")?.selections?.find((s) => s.label.includes("NRFI"));
  const tLines = (total?.lines || []).filter((l) => [7.5, 8.5, 9.5].includes(l.line));
  const ttHome = (tt?.lines || []).find((l) => l.side === "home" && l.line === 4.5);
  const ttAway = (tt?.lines || []).find((l) => l.side === "away" && l.line === 4.5);
  const f5tMain = (f5t?.lines || []).find((l) => l.line === 4.5);
  const f5h = f5ml?.selections?.find((s) => s.label === "home");
  const f5a = f5ml?.selections?.find((s) => s.label === "away");

  return (
    <div style={S.card}>
      <div style={S.cardHead}>
        <strong>{g.awayAbbr} @ {g.homeAbbr}</strong>
        <span style={S.mut}>{g.date} · proj total {g.total_mean}</span>
      </div>
      <div style={S.tableWrap}>
        <table style={S.table}>
          <thead><tr><th style={S.thL}>Team</th><th style={S.th}>Win</th><th style={S.th}>Prob</th><th style={S.th}>Fair</th><th style={S.th}>RL ±1.5</th><th style={S.th}>F5</th></tr></thead>
          <tbody>
            <tr>
              <td style={S.tdL}><b>{g.away}</b><div style={{ color: "var(--muted)", fontSize: 12 }}>P: {g.awayPitcher || "TBD"}</div></td>
              <td style={S.td}>{bar(g.win_away)}</td><td style={S.td}>{pct(g.win_away)}</td><td style={S.td}>{odds(g.fair_away)}</td>
              <td style={{ ...S.td, color: "var(--muted)" }}>{rlCell(g, "away")}</td>
              <td style={{ ...S.td, color: "var(--muted)" }}>{f5a ? pct(f5a.prob) : "—"}</td>
            </tr>
            <tr>
              <td style={S.tdL}><b>{g.home}</b><div style={{ color: "var(--muted)", fontSize: 12 }}>P: {g.homePitcher || "TBD"}</div></td>
              <td style={S.td}>{bar(g.win_home)}</td><td style={S.td}>{pct(g.win_home)}</td><td style={S.td}>{odds(g.fair_home)}</td>
              <td style={{ ...S.td, color: "var(--muted)" }}>{rlCell(g, "home")}</td>
              <td style={{ ...S.td, color: "var(--muted)" }}>{f5h ? pct(f5h.prob) : "—"}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 16, padding: "10px 16px", borderTop: "1px solid var(--border)", fontSize: 12.5, color: "var(--muted)" }}>
        {tLines.map((l) => <span key={l.line}>O{l.line} <b style={{ color: "var(--text)" }}>{pct(l.over)}</b> · U {pct(l.under)}</span>)}
        {f5tMain && <span>F5 O{f5tMain.line} <b style={{ color: "var(--text)" }}>{pct(f5tMain.over)}</b></span>}
        {ttHome && <span>{g.homeAbbr} O4.5 <b style={{ color: "var(--text)" }}>{pct(ttHome.over)}</b></span>}
        {ttAway && <span>{g.awayAbbr} O4.5 <b style={{ color: "var(--text)" }}>{pct(ttAway.over)}</b></span>}
        {nrfi && <span title="No run in the 1st inning">NRFI <b style={{ color: "var(--text)" }}>{pct(nrfi.prob)}</b></span>}
      </div>
    </div>
  );
}

export default function ModelGamesPage() {
  const [data, setData] = useState<Predictions | null>(null);
  const [meta, setMeta] = useState<ModelMeta | null>(null);
  const [date, setDate] = useState("all");
  const [q, setQ] = useState("");

  useEffect(() => { loadPredictions().then(setData); loadModelMeta().then(setMeta); }, []);
  const dates = useMemo(() => Array.from(new Set((data?.games || []).map((g) => g.date))).sort(), [data]);
  const byDate = useMemo(() => {
    const m: Record<string, GameProjection[]> = {};
    (data?.games || [])
      .filter((g) => date === "all" || g.date === date)
      .filter((g) => !q || `${g.home} ${g.away} ${g.homeAbbr} ${g.awayAbbr} ${g.homePitcher} ${g.awayPitcher}`.toLowerCase().includes(q.toLowerCase()))
      .forEach((g) => (m[g.date] ||= []).push(g));
    return m;
  }, [data, date, q]);
  const n = Object.values(byDate).reduce((a, b) => a + b.length, 0);

  return (
    <Shell title="The Model · Games" blurb={`Every upcoming game with the model's win probability, fair odds, run line, first-5 and totals.${meta ? ` Season ${meta.season} · updated ${meta.generated}.` : ""}`}>
      {!data && <p style={S.mut}>Loading…</p>}
      {data && (
        <>
          <FilterBar count={`${n} games`}>
            <select style={S.field} value={date} onChange={(e) => setDate(e.target.value)}>
              <option value="all">All dates</option>{dates.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
            <input style={{ ...S.field, minWidth: 180 }} type="search" placeholder="Search team or pitcher…" value={q} onChange={(e) => setQ(e.target.value)} />
          </FilterBar>
          {Object.keys(byDate).sort().map((d) => (
            <section key={d}>
              <h2 style={{ fontSize: 17, margin: "20px 2px 4px" }}>{d} <span style={{ color: "var(--muted)", fontWeight: 400, fontSize: 13 }}>· {byDate[d].length} games</span></h2>
              {byDate[d].map((g) => <GameCard key={String(g.gamePk) + g.date} g={g} />)}
            </section>
          ))}
        </>
      )}
    </Shell>
  );
}
