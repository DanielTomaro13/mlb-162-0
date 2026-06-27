"use client";

import { useEffect, useMemo, useState } from "react";
import ModelNav from "@/components/ModelNav";
import { loadOdds, odds, pct, BOOK_LABEL, type Odds, type OddsSelection } from "@/lib/modeldb";

const wrap = { maxWidth: 1080, margin: "0 auto", padding: "0 16px" } as const;
const sel = { background: "var(--bg-soft)", color: "var(--text)", border: "1px solid var(--border)", borderRadius: 8, padding: "6px 10px", fontSize: 13.5 } as const;

const MARKETS = [["all", "All markets"], ["ml", "Moneyline"], ["rl", "Run line"], ["total", "Totals"], ["f5_total", "First 5"], ["team_total", "Team totals"]] as const;

type Row = OddsSelection & { mkt: string; home: string; away: string; homeAbbr: string; awayAbbr: string };

export default function ValuePage() {
  const [data, setData] = useState<Odds | null>(null);
  const [book, setBook] = useState("all");
  const [market, setMarket] = useState("all");
  const [posOnly, setPosOnly] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => { loadOdds().then(setData); }, []);

  const rows = useMemo<Row[]>(() => {
    const all: Row[] = (data?.games || []).flatMap((g) =>
      g.markets.flatMap((m) => m.selections.map((s) => ({ ...s, mkt: m.key, home: g.home, away: g.away, homeAbbr: g.homeAbbr, awayAbbr: g.awayAbbr })))
    );
    return all
      .filter((r) => market === "all" || r.mkt === market)
      .filter((r) => book === "all" || r.books[book] != null)
      .filter((r) => !posOnly || r.ev > 0)
      .filter((r) => !q || `${r.homeAbbr} ${r.awayAbbr} ${r.label}`.toLowerCase().includes(q.toLowerCase()))
      .map((r) => {
        if (book === "all") return r;
        const price = r.books[book]; // recompute best vs the chosen book
        return { ...r, best: { book, price }, ev: +(r.model * price - 1).toFixed(4) };
      })
      .sort((a, b) => b.ev - a.ev);
  }, [data, book, market, posOnly, q]);

  return (
    <main style={{ ...wrap, paddingTop: 24, paddingBottom: 48 }}>
      <h1 style={{ fontFamily: "var(--font-cond)", fontSize: 30, margin: "0 0 4px" }}>The Model · Value</h1>
      <p style={{ color: "var(--muted)", margin: "0 0 16px" }}>
        Where the model price beats the best bookmaker price — sorted by expected value.
        {data && ` Updated ${data.generated}.`}
      </p>
      <ModelNav />

      {!data && <p style={{ color: "var(--muted)" }}>Loading…</p>}
      {data && !data.games?.length && (
        <p style={{ color: "var(--muted)" }}>No bookmaker odds loaded yet — the odds feed refreshes from a local run.</p>
      )}

      {data && data.games?.length > 0 && (
        <>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", margin: "0 0 14px", padding: "11px 14px", border: "1px solid var(--border)", borderRadius: 12, background: "var(--panel)" }}>
            <select style={sel} value={book} onChange={(e) => setBook(e.target.value)}>
              <option value="all">All books</option>
              {(data.books || []).map((b) => <option key={b} value={b}>{BOOK_LABEL[b] || b}</option>)}
            </select>
            <select style={sel} value={market} onChange={(e) => setMarket(e.target.value)}>
              {MARKETS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
            <input style={{ ...sel, minWidth: 160 }} type="search" placeholder="Search team or pick…" value={q} onChange={(e) => setQ(e.target.value)} />
            <label style={{ display: "inline-flex", gap: 6, alignItems: "center", color: "var(--muted)", fontSize: 13 }}>
              <input type="checkbox" checked={posOnly} onChange={(e) => setPosOnly(e.target.checked)} /> +EV only
            </label>
            <span style={{ marginLeft: "auto", color: "var(--muted)", fontSize: 12.5 }}>{rows.length} selections</span>
          </div>

          <div style={{ border: "1px solid var(--border)", borderRadius: 14, background: "var(--panel)", overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
              <thead>
                <tr style={{ color: "var(--muted)", fontSize: 11.5, textTransform: "uppercase", letterSpacing: ".03em" }}>
                  <th style={{ textAlign: "left", padding: "9px 12px" }}>Game</th>
                  <th style={{ textAlign: "left", padding: "9px 12px" }}>Selection</th>
                  <th style={{ textAlign: "right", padding: "9px 12px" }}>Model</th>
                  <th style={{ textAlign: "right", padding: "9px 12px" }}>Fair</th>
                  <th style={{ textAlign: "right", padding: "9px 12px" }}>Best</th>
                  <th style={{ textAlign: "right", padding: "9px 12px" }}>Book</th>
                  <th style={{ textAlign: "right", padding: "9px 12px" }}>EV</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} style={{ borderTop: "1px solid var(--border)" }}>
                    <td style={{ padding: "9px 12px", color: "var(--muted)" }}>{r.awayAbbr} @ {r.homeAbbr}</td>
                    <td style={{ padding: "9px 12px" }}>{r.label}</td>
                    <td style={{ padding: "9px 12px", textAlign: "right" }}>{pct(r.model)}</td>
                    <td style={{ padding: "9px 12px", textAlign: "right" }}>{odds(r.fair)}</td>
                    <td style={{ padding: "9px 12px", textAlign: "right", color: "var(--gold)", fontWeight: 600 }}>{odds(r.best?.price)}</td>
                    <td style={{ padding: "9px 12px", textAlign: "right", color: "var(--muted)" }}>{BOOK_LABEL[r.best?.book] || r.best?.book || "—"}</td>
                    <td style={{ padding: "9px 12px", textAlign: "right", color: r.ev > 0 ? "var(--accent-2)" : "var(--muted)", fontWeight: 600 }}>
                      {(r.ev > 0 ? "+" : "") + (r.ev * 100).toFixed(1) + "%"}
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && <tr><td colSpan={7} style={{ padding: 20, textAlign: "center", color: "var(--muted)" }}>No selections match these filters.</td></tr>}
              </tbody>
            </table>
          </div>
          <p style={{ color: "var(--muted)", fontSize: 12, marginTop: 12 }}>For research and entertainment only — not betting advice.</p>
        </>
      )}
    </main>
  );
}
