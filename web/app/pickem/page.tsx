"use client";

import { useEffect, useMemo, useState } from "react";
import { Shell, FilterBar, S, Th, useSort } from "@/components/ui";
import { loadPickem, loadPredictions, poissonOver, pct, odds, type Pickem, type Predictions } from "@/lib/modeldb";

const norm = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^a-z\s]/g, "").replace(/\s+/g, " ").trim();

interface Row {
  player: string; event: string; stat: string; line: number;
  over: number | null; under: number | null;
  pick: "over" | "under" | null; conf: number | null; edge: number | null;
}

export default function PickemPage() {
  const [pk, setPk] = useState<Pickem | null>(null);
  const [pred, setPred] = useState<Predictions | null>(null);
  const [stat, setStat] = useState("all");
  const [event, setEvent] = useState("all");
  const [modelOnly, setModelOnly] = useState(false);
  const [q, setQ] = useState("");
  const { sort, toggle, sorted } = useSort("edge");

  useEffect(() => { loadPickem().then(setPk); loadPredictions().then(setPred); }, []);

  // model projection (mu) per player+stat
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
    return (pk?.lines || []).map((l) => {
      const mu = muIndex.get(norm(l.player))?.get(l.stat);
      let pick: "over" | "under" | null = null, conf: number | null = null, edge: number | null = null;
      if (mu != null) {
        const pOver = poissonOver(mu, l.line);
        pick = pOver >= 0.5 ? "over" : "under";
        conf = Math.max(pOver, 1 - pOver);
        const price = pick === "over" ? l.over : l.under;
        edge = price ? conf - 1 / price : null;
      }
      return { player: l.player, event: l.event, stat: l.stat, line: l.line, over: l.over, under: l.under, pick, conf, edge };
    });
  }, [pk, muIndex]);

  const rows = useMemo(() => {
    const filtered = all
      .filter((r) => stat === "all" || r.stat === stat)
      .filter((r) => event === "all" || r.event === event)
      .filter((r) => !modelOnly || r.pick != null)
      .filter((r) => !q || r.player.toLowerCase().includes(q.toLowerCase()));
    return sorted(filtered, {
      player: (r) => r.player, event: (r) => r.event, stat: (r) => r.stat, line: (r) => r.line,
      over: (r) => r.over ?? 0, under: (r) => r.under ?? 0, pick: (r) => r.pick ?? "",
      conf: (r) => r.conf ?? -1, edge: (r) => r.edge ?? -2,
    });
  }, [all, stat, event, modelOnly, q, sort]);

  const stats = useMemo(() => Array.from(new Set(all.map((r) => r.stat))).sort(), [all]);
  const events = useMemo(() => Array.from(new Set(all.map((r) => r.event))).sort(), [all]);

  return (
    <Shell
      title="The Model · Pick'em"
      blurb={<>Every line on Dabble&apos;s Pick&apos;em board, with the model&apos;s recommended side, confidence and edge against Dabble&apos;s price. {pk?.generated ? `Updated ${pk.generated}.` : ""}</>}
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
              <input type="checkbox" checked={modelOnly} onChange={(e) => setModelOnly(e.target.checked)} /> model pick only
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
                    <Th label="Over" sortKey="over" sort={sort} toggle={toggle} />
                    <Th label="Under" sortKey="under" sort={sort} toggle={toggle} />
                    <Th label="Model pick" sortKey="pick" sort={sort} toggle={toggle} align="left" />
                    <Th label="Conf" sortKey="conf" sort={sort} toggle={toggle} />
                    <Th label="Edge" sortKey="edge" sort={sort} toggle={toggle} />
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 400).map((r, i) => (
                    <tr key={i}>
                      <td style={S.tdL}><b>{r.player}</b></td>
                      <td style={{ ...S.tdL, color: "var(--muted)" }}>{r.event}</td>
                      <td style={S.tdL}>{r.stat}</td>
                      <td style={S.td}>{r.line}</td>
                      <td style={{ ...S.td, color: r.pick === "over" ? "var(--accent-2)" : "var(--text)" }}>{odds(r.over)}</td>
                      <td style={{ ...S.td, color: r.pick === "under" ? "var(--gold)" : "var(--text)" }}>{odds(r.under)}</td>
                      <td style={{ ...S.tdL, fontWeight: 700, color: r.pick === "over" ? "var(--accent-2)" : r.pick === "under" ? "var(--gold)" : "var(--muted)" }}>
                        {r.pick ? (r.pick === "over" ? "Over" : "Under") : "—"}
                      </td>
                      <td style={S.td}>{r.conf == null ? "—" : pct(r.conf)}</td>
                      <td style={{ ...S.td, color: (r.edge ?? 0) > 0 ? "var(--accent-2)" : "var(--muted)", fontWeight: 600 }}>
                        {r.edge == null ? "—" : (r.edge > 0 ? "+" : "") + (r.edge * 100).toFixed(1) + "%"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          {rows.length > 400 && <p style={{ ...S.mut, fontSize: 12, marginTop: 10 }}>Showing the top 400 — filter to narrow down.</p>}
          <p style={{ ...S.mut, fontSize: 12, marginTop: 12 }}>
            Over/Under are Dabble&apos;s Pick&apos;em prices; the model pick is the side it favours, with confidence and edge vs that price. For research only — not betting advice.
          </p>
        </>
      )}
    </Shell>
  );
}
