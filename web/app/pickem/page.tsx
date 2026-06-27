"use client";

import { useEffect, useMemo, useState } from "react";
import { Shell, FilterBar, S } from "@/components/ui";
import { loadPredictions, loadPickem, poissonOver, pct, type Predictions, type Pickem } from "@/lib/modeldb";

const norm = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^a-z\s]/g, "").replace(/\s+/g, " ").trim();

interface Row {
  game: string; date: string; player: string; role: string; stat: string;
  mu: number; line: number; posted: boolean; pOver: number; lean: "over" | "under"; conf: number;
}

export default function PickemPage() {
  const [pred, setPred] = useState<Predictions | null>(null);
  const [pk, setPk] = useState<Pickem | null>(null);
  const [stat, setStat] = useState("all");
  const [game, setGame] = useState("all");
  const [q, setQ] = useState("");
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    loadPredictions().then(setPred);
    loadPickem().then(setPk);
  }, []);

  const haveDabble = (pk?.lines?.length || 0) > 0;
  const posted = useMemo(() => {
    const m = new Map<string, number>();
    for (const l of pk?.lines || []) m.set(`${norm(l.player)}|${l.stat}`, l.line);
    return m;
  }, [pk]);

  const rows = useMemo<Row[]>(() => {
    if (!pred) return [];
    // One row per player+stat (a matchup recurs across dates — keep the next game only).
    const seen = new Set<string>();
    const out: Row[] = [];
    for (const g of [...pred.games].sort((a, b) => a.date.localeCompare(b.date))) {
      const label = `${g.awayAbbr} @ ${g.homeAbbr}`;
      for (const side of [g.props.home, g.props.away]) {
        for (const pl of side) {
          for (const p of pl.props) {
            const key = `${norm(pl.player)}|${p.stat}`;
            if (seen.has(key)) continue;
            seen.add(key);
            const pLine = posted.get(key);
            const hasPosted = pLine != null;
            const line = hasPosted ? pLine! : Math.floor(p.mu) + 0.5;
            const pOver = poissonOver(p.mu, line);
            out.push({
              game: label, date: g.date, player: pl.player, role: pl.role, stat: p.stat,
              mu: p.mu, line, posted: hasPosted, pOver,
              lean: pOver >= 0.5 ? "over" : "under", conf: Math.abs(pOver - 0.5) * 2,
            });
          }
        }
      }
    }
    return out
      .filter((r) => (haveDabble && !showAll ? r.posted : true))
      .filter((r) => stat === "all" || r.stat === stat)
      .filter((r) => game === "all" || r.game === game)
      .filter((r) => !q || r.player.toLowerCase().includes(q.toLowerCase()))
      .sort((a, b) => b.conf - a.conf);
  }, [pred, posted, haveDabble, showAll, stat, game, q]);

  const stats = useMemo<string[]>(() => {
    if (!pred) return [];
    const s = new Set<string>();
    for (const g of pred.games) for (const side of [g.props.home, g.props.away]) for (const pl of side) for (const p of pl.props) s.add(p.stat);
    return Array.from(s);
  }, [pred]);
  const games = useMemo(() => pred ? Array.from(new Set(pred.games.map((g) => `${g.awayAbbr} @ ${g.homeAbbr}`))) : [], [pred]);

  return (
    <Shell
      title="The Model · Pick'em"
      blurb={haveDabble
        ? "Dabble Pick'em player props with the model's over/under lean and confidence. Showing the lines Dabble has posted."
        : "Player-prop projections for Dabble Pick'em — the model's over/under lean and confidence. Dabble's posted lines load from a local run; until then these are the model's own projected lines."}
    >
      {!pred && <p style={S.mut}>Loading…</p>}
      {pred && (
        <>
          <FilterBar count={`${rows.length} props`}>
            <select style={S.field} value={stat} onChange={(e) => setStat(e.target.value)}>
              <option value="all">All stats</option>
              {stats.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <select style={S.field} value={game} onChange={(e) => setGame(e.target.value)}>
              <option value="all">All games</option>
              {games.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
            <input style={{ ...S.field, minWidth: 160 }} type="search" placeholder="Search player…" value={q} onChange={(e) => setQ(e.target.value)} />
            {haveDabble && (
              <label style={{ display: "inline-flex", gap: 6, alignItems: "center", color: "var(--muted)", fontSize: 13 }}>
                <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} /> include non-Dabble players
              </label>
            )}
          </FilterBar>

          <div style={{ ...S.card, margin: 0 }}>
            <div style={S.tableWrap}>
              <table style={S.table}>
                <thead>
                  <tr>
                    <th style={S.thL}>Player</th><th style={S.thL}>Game</th><th style={S.thL}>Stat</th>
                    <th style={S.th}>Proj</th><th style={S.th}>Line</th><th style={S.thL}>Lean</th><th style={S.th}>Confidence</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 300).map((r, i) => (
                    <tr key={i}>
                      <td style={S.tdL}><b>{r.player}</b> <span style={{ color: "var(--muted)", fontSize: 11 }}>{r.role}</span></td>
                      <td style={{ ...S.tdL, color: "var(--muted)" }}>{r.game}</td>
                      <td style={S.tdL}>{r.stat}</td>
                      <td style={S.td}>{r.mu.toFixed(2)}</td>
                      <td style={S.td}>{r.line}{r.posted ? <span style={{ marginLeft: 5, fontSize: 10, color: "var(--accent)", fontWeight: 700 }}>DABBLE</span> : ""}</td>
                      <td style={{ ...S.tdL, fontWeight: 700, color: r.lean === "over" ? "var(--accent-2)" : "var(--gold)" }}>
                        {r.lean === "over" ? "Over" : "Under"} {pct(r.lean === "over" ? r.pOver : 1 - r.pOver)}
                      </td>
                      <td style={S.td}>{pct(r.conf)}</td>
                    </tr>
                  ))}
                  {rows.length === 0 && <tr><td colSpan={7} style={{ padding: 20, textAlign: "center", color: "var(--muted)" }}>No props match these filters.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
          <p style={{ ...S.mut, fontSize: 12, marginTop: 12 }}>Proj is the model's expected count; the lean compares the model's P(over) to the line. For research only — not betting advice.</p>
        </>
      )}
    </Shell>
  );
}
