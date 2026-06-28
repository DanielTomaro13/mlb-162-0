"use client";

import { useEffect, useMemo, useState } from "react";
import { Shell, FilterBar, S, Th, useSort } from "@/components/ui";
import { loadPickem, loadPredictions, poissonOver, pct, odds, type Pickem, type Predictions } from "@/lib/modeldb";

const norm = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^a-z\s]/g, "").replace(/\s+/g, " ").trim();
const RARE = new Set(["Stolen base", "Home run", "Doubles", "Triples"]);

interface Row {
  player: string; event: string; stat: string; line: number;
  proj: number | null; pick: "over" | "under" | null; conf: number | null; fair: number | null; main: boolean;
}

export default function PickemPage() {
  const [pk, setPk] = useState<Pickem | null>(null);
  const [pred, setPred] = useState<Predictions | null>(null);
  const [stat, setStat] = useState("all");
  const [event, setEvent] = useState("all");
  const [modelOnly, setModelOnly] = useState(true);
  const [showAlt, setShowAlt] = useState(false);
  const [q, setQ] = useState("");
  const { sort, toggle, sorted } = useSort("conf");

  useEffect(() => { loadPickem().then(setPk); loadPredictions().then(setPred); }, []);

  const muIndex = useMemo(() => {
    const m = new Map<string, Map<string, number>>();
    for (const g of pred?.games || []) {
      for (const side of [g.props.home, g.props.away]) {
        for (const pl of side) {
          const inner = new Map<string, number>();
          for (const p of pl.props) inner.set(p.stat, p.mu);
          m.set(norm(pl.player), inner);
        }
      }
    }
    return m;
  }, [pred]);

  const all = useMemo<Row[]>(() => {
    const rows: Row[] = (pk?.lines || []).map((l) => {
      const mu = muIndex.get(norm(l.player))?.get(l.stat);
      let pick: "over" | "under" | null = null, conf: number | null = null, fair: number | null = null;
      if (mu != null) {
        const pOver = poissonOver(mu, l.line);
        pick = pOver >= 0.5 ? "over" : "under";
        conf = Math.max(pOver, 1 - pOver);
        fair = conf > 0 ? +(1 / conf).toFixed(2) : null;
      }
      return { player: l.player, event: l.event, stat: l.stat, line: l.line, proj: mu ?? null, pick, conf, fair, main: false };
    });
    // The "main" line per player+stat is the one nearest the projection (the competitive
    // Pick'em line); the rest are alt lines that yield trivial picks.
    const best = new Map<string, Row>();
    for (const r of rows) {
      const key = `${norm(r.player)}|${r.stat}|${r.event}`;
      const cur = best.get(key);
      const ref = r.proj ?? cur?.proj ?? r.line;
      if (!cur || Math.abs(r.line - ref) < Math.abs(cur.line - ref)) best.set(key, r);
    }
    for (const r of best.values()) r.main = true;
    return rows;
  }, [pk, muIndex]);

  const rows = useMemo(() => {
    const filtered = all
      .filter((r) => stat === "all" || r.stat === stat)
      .filter((r) => event === "all" || r.event === event)
      .filter((r) => !modelOnly || r.pick != null)
      .filter((r) => showAlt || r.main)   // main line per player+stat unless alt lines requested
      // Drop no-information picks: degenerate certainties, and rare-event stats (SB/HR/
      // doubles/triples) for players who essentially never do them (a foregone "Less").
      .filter((r) => r.conf == null || r.conf < 0.995)
      .filter((r) => r.proj == null || !RARE.has(r.stat) || r.proj >= 0.3)
      .filter((r) => !q || r.player.toLowerCase().includes(q.toLowerCase()));
    return sorted(filtered, {
      player: (r) => r.player, event: (r) => r.event, stat: (r) => r.stat, line: (r) => r.line,
      proj: (r) => r.proj ?? -1, pick: (r) => r.pick ?? "", conf: (r) => r.conf ?? -1, fair: (r) => r.fair ?? 99,
    });
  }, [all, stat, event, modelOnly, showAlt, q, sort]);

  const stats = useMemo(() => Array.from(new Set(all.map((r) => r.stat))).sort(), [all]);
  const events = useMemo(() => Array.from(new Set(all.map((r) => r.event))).sort(), [all]);

  return (
    <Shell
      title="The Model · Pick'em"
      blurb={<>Every line on Dabble&apos;s Pick&apos;em board with the model&apos;s projection, recommended side, confidence and fair price. Pick&apos;em is a multiplier game, so there&apos;s no bookmaker price — just the model&apos;s read. {pk?.generated ? `Updated ${pk.generated}.` : ""}</>}
    >
      {!pk && <p style={S.mut}>Loading…</p>}
      {pk && all.length === 0 && <p style={S.mut}>No Dabble Pick&apos;em lines loaded yet — they refresh from the local odds run.</p>}
      {pk && all.length > 0 && (
        <>
          <FilterBar count={`${rows.length} lines`}>
            <select style={S.field} value={stat} onChange={(e) => setStat(e.target.value)}>
              <option value="all">All stats</option>{stats.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <select style={S.field} value={event} onChange={(e) => setEvent(e.target.value)}>
              <option value="all">All games</option>{events.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
            <input style={{ ...S.field, minWidth: 150 }} type="search" placeholder="Search player…" value={q} onChange={(e) => setQ(e.target.value)} />
            <label style={{ display: "inline-flex", gap: 6, alignItems: "center", color: "var(--muted)", fontSize: 13 }}>
              <input type="checkbox" checked={modelOnly} onChange={(e) => setModelOnly(e.target.checked)} /> model lines only
            </label>
            <label style={{ display: "inline-flex", gap: 6, alignItems: "center", color: "var(--muted)", fontSize: 13 }}>
              <input type="checkbox" checked={showAlt} onChange={(e) => setShowAlt(e.target.checked)} /> alt lines
            </label>
          </FilterBar>

          <div style={{ ...S.card, margin: 0 }}>
            <div style={S.tableWrap}>
              <table style={S.table}>
                <thead>
                  <tr>
                    <Th label="Player" sortKey="player" sort={sort} toggle={toggle} align="left" />
                    <Th label="Game" sortKey="event" sort={sort} toggle={toggle} align="left" />
                    <Th label="Stat" sortKey="stat" sort={sort} toggle={toggle} align="left" />
                    <Th label="Line" sortKey="line" sort={sort} toggle={toggle} />
                    <Th label="Model proj" sortKey="proj" sort={sort} toggle={toggle} />
                    <Th label="Pick" sortKey="pick" sort={sort} toggle={toggle} align="left" />
                    <Th label="Confidence" sortKey="conf" sort={sort} toggle={toggle} />
                    <Th label="Fair price" sortKey="fair" sort={sort} toggle={toggle} />
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 400).map((r, i) => (
                    <tr key={i}>
                      <td style={S.tdL}><b>{r.player}</b></td>
                      <td style={{ ...S.tdL, color: "var(--muted)" }}>{r.event}</td>
                      <td style={S.tdL}>{r.stat}</td>
                      <td style={S.td}>{r.line}</td>
                      <td style={{ ...S.td, color: "var(--text)" }}>{r.proj == null ? "—" : r.proj.toFixed(2)}</td>
                      <td style={{ ...S.tdL, fontWeight: 700, color: r.pick === "over" ? "var(--accent-2)" : r.pick === "under" ? "var(--gold)" : "var(--muted)" }}>
                        {r.pick ? (r.pick === "over" ? "More" : "Less") : "—"}
                      </td>
                      <td style={S.td}>{r.conf == null ? "—" : pct(r.conf)}</td>
                      <td style={{ ...S.td, color: "var(--gold)" }}>{r.fair == null ? "—" : odds(r.fair)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          {rows.length > 400 && <p style={{ ...S.mut, fontSize: 12, marginTop: 10 }}>Showing the top 400 by confidence — filter to narrow down.</p>}
          <p style={{ ...S.mut, fontSize: 12, marginTop: 12 }}>
            Model proj is the model&apos;s projected value; Pick is the side it favours (More/Less);
            Fair price is the model&apos;s implied decimal odds. For research only — not betting advice.
          </p>
        </>
      )}
    </Shell>
  );
}
