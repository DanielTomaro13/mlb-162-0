"use client";

import { useEffect, useMemo, useState } from "react";
import { Shell, FilterBar, S } from "@/components/ui";
import { loadPredictions, pct, odds, type Predictions, type GameProjection, type Market } from "@/lib/modeldb";

const sub = { color: "var(--muted)", fontSize: 11, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: ".04em", margin: "14px 0 6px" };

function MiniTable({ head, rows }: { head: string[]; rows: (string | number)[][] }) {
  return (
    <div style={S.tableWrap}>
      <table style={S.table}>
        <thead><tr>{head.map((h, i) => <th key={i} style={i === 0 ? S.thL : S.th}>{h}</th>)}</tr></thead>
        <tbody>{rows.map((r, i) => (
          <tr key={i}>{r.map((c, j) => <td key={j} style={j === 0 ? S.tdL : S.td}>{c}</td>)}</tr>
        ))}</tbody>
      </table>
    </div>
  );
}

function GameBook({ g }: { g: GameProjection }) {
  const m = (k: string): Market | undefined => g.markets.find((x) => x.key === k);
  const total = m("total"), teamTotal = m("team_total"), f5t = m("f5_total"), f5ml = m("f5_ml"), cs = m("cs");
  const props = [...g.props.away, ...g.props.home];

  return (
    <div style={{ padding: "4px 16px 16px" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: "0 28px" }}>
        <div>
          <div style={sub}>Moneyline · Run line</div>
          <MiniTable head={["Team", "Win", "Fair", "RL ±1.5"]} rows={[
            [g.away, pct(g.win_away), odds(g.fair_away), rlCell(g, "away")],
            [g.home, pct(g.win_home), odds(g.fair_home), rlCell(g, "home")],
          ]} />
          {total?.lines && (<><div style={sub}>Total runs</div>
            <MiniTable head={["Line", "Over", "Under", "O fair"]} rows={total.lines.map((l) => [l.line, pct(l.over), pct(l.under), odds(l.over_fair)])} /></>)}
        </div>
        <div>
          {f5ml?.selections && (<><div style={sub}>First 5 innings</div>
            <MiniTable head={["F5", "Prob", "Fair"]} rows={[
              ...f5ml.selections.map((s) => [s.label === "tie" ? "Tie" : s.label === "home" ? g.homeAbbr : g.awayAbbr, pct(s.prob), odds(s.fair)]),
              ...(f5t?.lines || []).map((l) => [`Over ${l.line}`, pct(l.over), odds(l.over_fair)]),
            ]} /></>)}
          {teamTotal?.lines && (<><div style={sub}>Team totals</div>
            <MiniTable head={["Side", "Line", "Over", "Fair"]} rows={teamTotal.lines.map((l) => [l.side === "home" ? g.homeAbbr : g.awayAbbr, l.line, pct(l.over), odds(l.over_fair)])} /></>)}
          {cs?.cells && (<><div style={sub}>Likeliest final scores</div>
            <MiniTable head={["Score", "Prob", "Fair"]} rows={cs.cells.slice(0, 5).map((c) => [`${g.homeAbbr} ${c.home}–${c.away} ${g.awayAbbr}`, pct(c.prob), odds(c.fair)])} /></>)}
        </div>
      </div>

      <div style={sub}>Player props — projections (line nearest the projection)</div>
      <div style={S.tableWrap}>
        <table style={S.table}>
          <thead><tr><th style={S.thL}>Player</th><th style={S.thL}>Pos</th><th style={S.thL}>Market</th><th style={S.th}>Proj</th><th style={S.th}>Main line</th><th style={S.th}>Over</th></tr></thead>
          <tbody>
            {props.flatMap((pl) => pl.props.map((p) => {
              const main = p.lines.find((l) => l.line >= p.mu) || p.lines[Math.floor(p.lines.length / 2)] || p.lines[0];
              return (
                <tr key={pl.player + p.stat}>
                  <td style={S.tdL}><b>{pl.player}</b></td>
                  <td style={{ ...S.tdL, color: "var(--muted)" }}>{pl.role}</td>
                  <td style={S.tdL}>{p.stat}</td>
                  <td style={S.td}>{p.mu.toFixed(2)}</td>
                  <td style={S.td}>{main?.line ?? "—"}</td>
                  <td style={S.td}>{main ? pct(main.over) : "—"}</td>
                </tr>
              );
            }))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function rlCell(g: GameProjection, side: "home" | "away") {
  const rl = g.markets.find((x) => x.key === "rl");
  const s = rl?.selections?.find((x) => x.label.startsWith(side));
  return s ? `${pct(s.prob)} · ${odds(s.fair)}` : "—";
}

export default function PredictionsPage() {
  const [data, setData] = useState<Predictions | null>(null);
  const [date, setDate] = useState("all");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<Set<string>>(new Set());

  useEffect(() => { loadPredictions().then(setData); }, []);
  const dates = useMemo(() => Array.from(new Set((data?.games || []).map((g) => g.date))).sort(), [data]);
  const games = useMemo(() => (data?.games || [])
    .filter((g) => date === "all" || g.date === date)
    .filter((g) => !q || `${g.home} ${g.away} ${g.homeAbbr} ${g.awayAbbr} ${g.homePitcher} ${g.awayPitcher}`.toLowerCase().includes(q.toLowerCase())),
    [data, date, q]);

  const toggle = (k: string) => setOpen((s) => { const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n; });

  return (
    <Shell title="The Model · Predictions" blurb="The complete model market book for every game — moneyline, run line, totals, first-5, team totals, correct score and player props. Tap a game to expand.">
      {!data && <p style={S.mut}>Loading…</p>}
      {data && (
        <>
          <FilterBar count={`${games.length} games`}>
            <select style={S.field} value={date} onChange={(e) => setDate(e.target.value)}>
              <option value="all">All dates</option>{dates.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
            <input style={{ ...S.field, minWidth: 180 }} type="search" placeholder="Search team or pitcher…" value={q} onChange={(e) => setQ(e.target.value)} />
            <button style={{ ...S.field, cursor: "pointer" }} onClick={() => setOpen(open.size ? new Set() : new Set(games.map((g) => String(g.gamePk) + g.date)))}>
              {open.size ? "Collapse all" : "Expand all"}
            </button>
          </FilterBar>

          {games.map((g) => {
            const key = String(g.gamePk) + g.date;
            const isOpen = open.has(key);
            return (
              <div key={key} style={S.card}>
                <div style={{ ...S.cardHead, cursor: "pointer" }} onClick={() => toggle(key)}>
                  <strong>{g.away} @ {g.home} <span style={{ color: "var(--muted)", fontWeight: 400, fontSize: 12.5 }}>· {g.date}</span></strong>
                  <span style={{ color: "var(--muted)", fontSize: 12.5 }}>
                    {g.awayAbbr} {pct(g.win_away)} · {g.homeAbbr} {pct(g.win_home)} · O/U {g.total_mean} {isOpen ? "▲" : "▼"}
                  </span>
                </div>
                {isOpen && <GameBook g={g} />}
              </div>
            );
          })}
        </>
      )}
    </Shell>
  );
}
