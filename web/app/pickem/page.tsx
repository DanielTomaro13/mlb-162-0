"use client";

import { useEffect, useMemo, useState } from "react";
import ModelNav from "@/components/ModelNav";
import { loadPredictions, loadPickem, poissonOver, pct, type Predictions, type Pickem } from "@/lib/modeldb";

const wrap = { maxWidth: 1080, margin: "0 auto", padding: "0 16px" } as const;
const sel = { background: "var(--bg-soft)", color: "var(--text)", border: "1px solid var(--border)", borderRadius: 8, padding: "6px 10px", fontSize: 13.5 } as const;

const norm = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^a-z\s]/g, "").replace(/\s+/g, " ").trim();

interface Row {
  game: string; player: string; role: string; stat: string;
  mu: number; line: number; posted: boolean; pOver: number; lean: "over" | "under"; conf: number;
}

export default function PickemPage() {
  const [pred, setPred] = useState<Predictions | null>(null);
  const [pk, setPk] = useState<Pickem | null>(null);
  const [stat, setStat] = useState("all");
  const [game, setGame] = useState("all");
  const [q, setQ] = useState("");
  const [dabbleOnly, setDabbleOnly] = useState(false);

  useEffect(() => {
    loadPredictions().then(setPred);
    loadPickem().then(setPk);
  }, []);

  // Dabble posted lines indexed by normalised player|stat.
  const posted = useMemo(() => {
    const m = new Map<string, number>();
    for (const l of pk?.lines || []) m.set(`${norm(l.player)}|${l.stat}`, l.line);
    return m;
  }, [pk]);

  const rows = useMemo<Row[]>(() => {
    if (!pred) return [];
    const out: Row[] = [];
    for (const g of pred.games) {
      const label = `${g.awayAbbr} @ ${g.homeAbbr}`;
      for (const side of [g.props.home, g.props.away]) {
        for (const pl of side) {
          for (const p of pl.props) {
            const postedLine = posted.get(`${norm(pl.player)}|${p.stat}`);
            const hasPosted = postedLine != null;
            const line = hasPosted ? postedLine! : Math.max(0.5, Math.round(p.mu - 0.5) + 0.5);
            const pOver = poissonOver(p.mu, line);
            out.push({
              game: label, player: pl.player, role: pl.role, stat: p.stat,
              mu: p.mu, line, posted: hasPosted, pOver,
              lean: pOver >= 0.5 ? "over" : "under",
              conf: Math.abs(pOver - 0.5) * 2,
            });
          }
        }
      }
    }
    return out
      .filter((r) => stat === "all" || r.stat === stat)
      .filter((r) => game === "all" || r.game === game)
      .filter((r) => !dabbleOnly || r.posted)
      .filter((r) => !q || r.player.toLowerCase().includes(q.toLowerCase()))
      .sort((a, b) => b.conf - a.conf);
  }, [pred, posted, stat, game, q, dabbleOnly]);

  const stats = useMemo<string[]>(() => {
    if (!pred) return [];
    const s = new Set<string>();
    for (const g of pred.games) for (const side of [g.props.home, g.props.away]) for (const pl of side) for (const p of pl.props) s.add(p.stat);
    return Array.from(s);
  }, [pred]);
  const games = useMemo(() => pred ? pred.games.map((g) => `${g.awayAbbr} @ ${g.homeAbbr}`) : [], [pred]);
  const haveDabble = (pk?.lines?.length || 0) > 0;

  return (
    <main style={{ ...wrap, paddingTop: 24, paddingBottom: 48 }}>
      <h1 style={{ fontFamily: "var(--font-cond)", fontSize: 30, margin: "0 0 4px" }}>The Model · Pick&apos;em</h1>
      <p style={{ color: "var(--muted)", margin: "0 0 16px" }}>
        Player-prop projections for Dabble Pick&apos;em — the model&apos;s over/under lean and confidence on each line.
        {haveDabble ? " Lines posted by Dabble are matched automatically." : " Dabble lines load from a local run; until then these are the model’s own projected lines."}
      </p>
      <ModelNav />

      {!pred && <p style={{ color: "var(--muted)" }}>Loading…</p>}
      {pred && (
        <>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", margin: "0 0 14px", padding: "11px 14px", border: "1px solid var(--border)", borderRadius: 12, background: "var(--panel)" }}>
            <select style={sel} value={stat} onChange={(e) => setStat(e.target.value)}>
              <option value="all">All stats</option>
              {stats.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <select style={sel} value={game} onChange={(e) => setGame(e.target.value)}>
              <option value="all">All games</option>
              {games.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
            <input style={{ ...sel, minWidth: 160 }} type="search" placeholder="Search player…" value={q} onChange={(e) => setQ(e.target.value)} />
            <label style={{ display: "inline-flex", gap: 6, alignItems: "center", color: "var(--muted)", fontSize: 13 }}>
              <input type="checkbox" checked={dabbleOnly} disabled={!haveDabble} onChange={(e) => setDabbleOnly(e.target.checked)} /> Dabble lines only
            </label>
            <span style={{ marginLeft: "auto", color: "var(--muted)", fontSize: 12.5 }}>{rows.length} props</span>
          </div>

          <div style={{ border: "1px solid var(--border)", borderRadius: 14, background: "var(--panel)", overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
              <thead>
                <tr style={{ color: "var(--muted)", fontSize: 11.5, textTransform: "uppercase", letterSpacing: ".03em" }}>
                  <th style={{ textAlign: "left", padding: "9px 12px" }}>Player</th>
                  <th style={{ textAlign: "left", padding: "9px 12px" }}>Game</th>
                  <th style={{ textAlign: "left", padding: "9px 12px" }}>Stat</th>
                  <th style={{ textAlign: "right", padding: "9px 12px" }}>Proj</th>
                  <th style={{ textAlign: "right", padding: "9px 12px" }}>Line</th>
                  <th style={{ textAlign: "left", padding: "9px 12px" }}>Lean</th>
                  <th style={{ textAlign: "right", padding: "9px 12px" }}>Confidence</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 200).map((r, i) => (
                  <tr key={i} style={{ borderTop: "1px solid var(--border)" }}>
                    <td style={{ padding: "9px 12px" }}><b>{r.player}</b> <span style={{ color: "var(--muted)", fontSize: 11 }}>{r.role}</span></td>
                    <td style={{ padding: "9px 12px", color: "var(--muted)" }}>{r.game}</td>
                    <td style={{ padding: "9px 12px" }}>{r.stat}</td>
                    <td style={{ padding: "9px 12px", textAlign: "right" }}>{r.mu.toFixed(2)}</td>
                    <td style={{ padding: "9px 12px", textAlign: "right" }}>
                      {r.line}{r.posted ? <span style={{ marginLeft: 5, fontSize: 10, color: "var(--accent)", fontWeight: 700 }}>DABBLE</span> : ""}
                    </td>
                    <td style={{ padding: "9px 12px" }}>
                      <span style={{ fontWeight: 700, color: r.lean === "over" ? "var(--accent-2)" : "var(--gold)" }}>
                        {r.lean === "over" ? "Over" : "Under"} {pct(r.lean === "over" ? r.pOver : 1 - r.pOver)}
                      </span>
                    </td>
                    <td style={{ padding: "9px 12px", textAlign: "right", color: "var(--muted)" }}>{pct(r.conf)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ color: "var(--muted)", fontSize: 12, marginTop: 12 }}>
            Proj is the model&apos;s expected count; the lean compares the model&apos;s P(over) to the line. For research only — not betting advice.
          </p>
        </>
      )}
    </main>
  );
}
