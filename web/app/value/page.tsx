"use client";

import { useEffect, useMemo, useState } from "react";
import { Shell, FilterBar, S, Th, useSort } from "@/components/ui";
import { loadOdds, odds, pct, BOOK_LABEL, type Odds, type OddsSelection } from "@/lib/modeldb";

const MARKETS = [["all", "All markets"], ["ml", "Moneyline"], ["rl", "Run line"], ["total", "Totals"], ["f5_ml", "First 5 winner"], ["f5_total", "First 5 total"], ["fi", "1st inning"], ["team_total", "Team totals"]] as const;

type Row = OddsSelection & { mkt: string; home: string; away: string; homeAbbr: string; awayAbbr: string };

export default function ValuePage() {
  const [data, setData] = useState<Odds | null>(null);
  const [book, setBook] = useState("all");
  const [market, setMarket] = useState("all");
  const [posOnly, setPosOnly] = useState(true);
  const [q, setQ] = useState("");
  const { sort, toggle, sorted } = useSort("ev");

  useEffect(() => { loadOdds().then(setData); }, []);

  const filtered = useMemo<Row[]>(() => {
    const all: Row[] = (data?.games || []).flatMap((g) =>
      g.markets.flatMap((m) => m.selections.map((s) => ({ ...s, mkt: m.key, home: g.home, away: g.away, homeAbbr: g.homeAbbr, awayAbbr: g.awayAbbr })))
    );
    return all
      .filter((r) => market === "all" || r.mkt === market)
      .filter((r) => book === "all" || r.books[book] != null)
      .map((r) => (book === "all" ? r : { ...r, best: { book, price: r.books[book] }, ev: +(r.model * r.books[book] - 1).toFixed(4) }))
      .filter((r) => !posOnly || r.ev > 0)
      .filter((r) => !q || `${r.homeAbbr} ${r.awayAbbr} ${r.label}`.toLowerCase().includes(q.toLowerCase()));
  }, [data, book, market, posOnly, q]);
  const rows = sorted(filtered, {
    game: (r) => r.home, selection: (r) => r.label, model: (r) => r.model,
    fair: (r) => r.fair ?? 0, best: (r) => r.best?.price ?? 0, book: (r) => r.best?.book ?? "", ev: (r) => r.ev,
  });

  return (
    <Shell
      title="The Model · Value"
      blurb={<>Where the model price beats the best bookmaker price, sorted by expected value (EV = model probability × best price − 1).{data && ` Updated ${data.generated}.`}</>}
    >
      {!data && <p style={S.mut}>Loading…</p>}
      {data && !data.games?.length && <p style={S.mut}>No bookmaker odds loaded yet — the odds feed refreshes from a local run.</p>}
      {data && data.games?.length > 0 && (
        <>
          <FilterBar count={`${rows.length} selections`}>
            <select style={S.field} value={book} onChange={(e) => setBook(e.target.value)}>
              <option value="all">All books</option>
              {(data.books || []).map((b) => <option key={b} value={b}>{BOOK_LABEL[b] || b}</option>)}
            </select>
            <select style={S.field} value={market} onChange={(e) => setMarket(e.target.value)}>
              {MARKETS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
            <input style={{ ...S.field, minWidth: 160 }} type="search" placeholder="Search team or pick…" value={q} onChange={(e) => setQ(e.target.value)} />
            <label style={{ display: "inline-flex", gap: 6, alignItems: "center", color: "var(--muted)", fontSize: 13 }}>
              <input type="checkbox" checked={posOnly} onChange={(e) => setPosOnly(e.target.checked)} /> +EV only
            </label>
          </FilterBar>

          <div style={{ ...S.card, margin: 0 }}>
            <div style={S.tableWrap}>
              <table style={S.table}>
                <thead>
                  <tr>
                    <Th label="Game" sortKey="game" sort={sort} toggle={toggle} align="left" />
                    <Th label="Selection" sortKey="selection" sort={sort} toggle={toggle} align="left" />
                    <Th label="Model" sortKey="model" sort={sort} toggle={toggle} />
                    <Th label="Fair" sortKey="fair" sort={sort} toggle={toggle} />
                    <Th label="Best" sortKey="best" sort={sort} toggle={toggle} />
                    <Th label="Book" sortKey="book" sort={sort} toggle={toggle} />
                    <Th label="EV" sortKey="ev" sort={sort} toggle={toggle} />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i}>
                      <td style={{ ...S.tdL, color: "var(--muted)" }}>{r.away} @ {r.home}</td>
                      <td style={S.tdL}>{r.label}</td>
                      <td style={S.td}>{pct(r.model)}</td>
                      <td style={S.td}>{odds(r.fair)}</td>
                      <td style={{ ...S.td, color: "var(--gold)", fontWeight: 600 }}>{odds(r.best?.price)}</td>
                      <td style={{ ...S.td, color: "var(--muted)" }}>{BOOK_LABEL[r.best?.book] || r.best?.book || "—"}</td>
                      <td style={{ ...S.td, color: r.ev > 0 ? "var(--accent-2)" : "var(--muted)", fontWeight: 600 }}>{(r.ev > 0 ? "+" : "") + (r.ev * 100).toFixed(1) + "%"}</td>
                    </tr>
                  ))}
                  {rows.length === 0 && <tr><td colSpan={7} style={{ padding: 20, textAlign: "center", color: "var(--muted)" }}>No selections match these filters.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
          <p style={{ ...S.mut, fontSize: 12, marginTop: 12 }}>For research and entertainment only — not betting advice.</p>
        </>
      )}
    </Shell>
  );
}
