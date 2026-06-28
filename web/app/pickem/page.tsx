"use client";

import { useEffect, useMemo, useState } from "react";
import { Shell, FilterBar, S, Th, useSort } from "@/components/ui";
import { loadOdds, odds, pct, type Odds, type OddsSelection } from "@/lib/modeldb";

interface Row {
  player: string; game: string; stat: string; line: number;
  lean: "over" | "under"; conf: number; price: number | null; edge: number | null;
}

export default function PickemPage() {
  const [data, setData] = useState<Odds | null>(null);
  const [stat, setStat] = useState("all");
  const [game, setGame] = useState("all");
  const [lean, setLean] = useState("all");
  const [q, setQ] = useState("");
  const { sort, toggle, sorted } = useSort("edge");

  useEffect(() => { loadOdds().then(setData); }, []);

  // Build one row per Dabble player-prop line, with the model's recommended side.
  const all = useMemo<Row[]>(() => {
    const out: Row[] = [];
    for (const g of data?.games || []) {
      const prop = g.markets.find((m) => m.key === "prop");
      if (!prop) continue;
      const label = `${g.away} @ ${g.home}`;
      const groups = new Map<string, { player: string; stat: string; line: number; over?: OddsSelection; under?: OddsSelection }>();
      for (const sel of prop.selections) {
        const p = sel.id.split("|"); // prop | normplayer | stat | over/under | line
        if (p[0] !== "prop") continue;
        const [, np, st, ou, lineStr] = p;
        const key = `${np}|${st}|${lineStr}`;
        let grp = groups.get(key);
        if (!grp) { grp = { player: sel.label.split(/ (?:Over|Under) /)[0], stat: st, line: parseFloat(lineStr) }; groups.set(key, grp); }
        (grp as Record<string, unknown>)[ou] = sel;
      }
      for (const grp of groups.values()) {
        const pOver = grp.over ? grp.over.model : grp.under ? 1 - grp.under.model : null;
        if (pOver == null) continue;
        const ln: "over" | "under" = pOver >= 0.5 ? "over" : "under";
        const leanSel = grp[ln];
        const price = leanSel?.books?.dabble ?? null;       // every prop line is a real Dabble line
        const conf = Math.max(pOver, 1 - pOver);
        out.push({ player: grp.player, game: label, stat: grp.stat, line: grp.line, lean: ln, conf, price, edge: price ? conf - 1 / price : null });
      }
    }
    return out;
  }, [data]);

  const rows = useMemo(() => {
    const filtered = all
      .filter((r) => stat === "all" || r.stat === stat)
      .filter((r) => game === "all" || r.game === game)
      .filter((r) => lean === "all" || r.lean === lean)
      .filter((r) => !q || r.player.toLowerCase().includes(q.toLowerCase()));
    return sorted(filtered, {
      player: (r) => r.player, game: (r) => r.game, stat: (r) => r.stat, line: (r) => r.line,
      lean: (r) => r.lean, conf: (r) => r.conf, price: (r) => r.price ?? 0, edge: (r) => r.edge ?? -1,
    });
  }, [all, stat, game, lean, q, sort]);

  const stats = useMemo(() => Array.from(new Set(all.map((r) => r.stat))).sort(), [all]);
  const games = useMemo(() => Array.from(new Set(all.map((r) => r.game))).sort(), [all]);

  return (
    <Shell
      title="The Model · Pick'em"
      blurb={<>Every player line Dabble is posting, with the model&apos;s recommended side, confidence and edge. {data?.generated ? `Updated ${data.generated}.` : ""}</>}
    >
      {!data && <p style={S.mut}>Loading…</p>}
      {data && all.length === 0 && <p style={S.mut}>No Dabble player props loaded yet — they refresh from the local odds run.</p>}
      {data && all.length > 0 && (
        <>
          <FilterBar count={`${rows.length} lines`}>
            <select style={S.field} value={stat} onChange={(e) => setStat(e.target.value)}>
              <option value="all">All stats</option>{stats.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <select style={S.field} value={game} onChange={(e) => setGame(e.target.value)}>
              <option value="all">All games</option>{games.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
            <select style={S.field} value={lean} onChange={(e) => setLean(e.target.value)}>
              <option value="all">Over &amp; Under</option><option value="over">Over only</option><option value="under">Under only</option>
            </select>
            <input style={{ ...S.field, minWidth: 150 }} type="search" placeholder="Search player…" value={q} onChange={(e) => setQ(e.target.value)} />
          </FilterBar>

          <div style={{ ...S.card, margin: 0 }}>
            <div style={S.tableWrap}>
              <table style={S.table}>
                <thead>
                  <tr>
                    <Th label="Player" sortKey="player" sort={sort} toggle={toggle} align="left" />
                    <Th label="Game" sortKey="game" sort={sort} toggle={toggle} align="left" />
                    <Th label="Stat" sortKey="stat" sort={sort} toggle={toggle} align="left" />
                    <Th label="Line" sortKey="line" sort={sort} toggle={toggle} />
                    <Th label="Pick" sortKey="lean" sort={sort} toggle={toggle} align="left" />
                    <Th label="Confidence" sortKey="conf" sort={sort} toggle={toggle} />
                    <Th label="Dabble" sortKey="price" sort={sort} toggle={toggle} />
                    <Th label="Edge" sortKey="edge" sort={sort} toggle={toggle} />
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 400).map((r, i) => (
                    <tr key={i}>
                      <td style={S.tdL}><b>{r.player}</b></td>
                      <td style={{ ...S.tdL, color: "var(--muted)" }}>{r.game}</td>
                      <td style={S.tdL}>{r.stat}</td>
                      <td style={S.td}>{r.line}</td>
                      <td style={{ ...S.tdL, fontWeight: 700, color: r.lean === "over" ? "var(--accent-2)" : "var(--gold)" }}>{r.lean === "over" ? "Over" : "Under"}</td>
                      <td style={S.td}>{pct(r.conf)}</td>
                      <td style={{ ...S.td, color: "var(--gold)" }}>{odds(r.price)}</td>
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
            Confidence is the model&apos;s probability for the picked side; edge compares it to Dabble&apos;s price. For research only — not betting advice.
          </p>
        </>
      )}
    </Shell>
  );
}
