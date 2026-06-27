"use client";

import { useEffect, useMemo, useState } from "react";
import { Shell, FilterBar, S } from "@/components/ui";
import { loadOdds, odds, pct, BOOK_LABEL, type Odds } from "@/lib/modeldb";

const MARKETS = [["all", "All markets"], ["ml", "Moneyline"], ["rl", "Run line"], ["total", "Totals"], ["f5_ml", "First 5 winner"], ["f5_total", "First 5 total"], ["fi", "1st inning"], ["team_total", "Team totals"]] as const;

export default function ComparePage() {
  const [data, setData] = useState<Odds | null>(null);
  const [game, setGame] = useState("all");
  const [market, setMarket] = useState("all");
  const [q, setQ] = useState("");

  useEffect(() => { loadOdds().then(setData); }, []);

  const books = data?.books || [];
  const gameList = useMemo(() => (data?.games || []).map((g) => `${g.awayAbbr} @ ${g.homeAbbr}`), [data]);

  const view = useMemo(() => {
    return (data?.games || [])
      .filter((g) => game === "all" || `${g.awayAbbr} @ ${g.homeAbbr}` === game)
      .map((g) => ({
        ...g,
        markets: g.markets
          .filter((m) => market === "all" || m.key === market)
          .map((m) => ({ ...m, selections: m.selections.filter((s) => !q || s.label.toLowerCase().includes(q.toLowerCase())) }))
          .filter((m) => m.selections.length),
      }))
      .filter((g) => g.markets.length);
  }, [data, game, market, q]);

  return (
    <Shell title="The Model · Compare odds" blurb="The model's fair price against every bookmaker, side by side. The best available price in each row is highlighted; EV is the model edge over that best price.">
      {!data && <p style={S.mut}>Loading…</p>}
      {data && !data.games?.length && <p style={S.mut}>No bookmaker odds loaded yet — the odds feed refreshes from a local run.</p>}
      {data && data.games?.length > 0 && (
        <>
          <FilterBar count={`${books.length} books`}>
            <select style={S.field} value={game} onChange={(e) => setGame(e.target.value)}>
              <option value="all">All games</option>{gameList.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
            <select style={S.field} value={market} onChange={(e) => setMarket(e.target.value)}>
              {MARKETS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
            <input style={{ ...S.field, minWidth: 150 }} type="search" placeholder="Search selection…" value={q} onChange={(e) => setQ(e.target.value)} />
          </FilterBar>

          {view.map((g) => (
            <div key={g.home + g.away + g.date} style={S.card}>
              <div style={S.cardHead}><strong>{g.awayAbbr} @ {g.homeAbbr}</strong><span style={S.mut}>{g.date}</span></div>
              {g.markets.map((m) => (
                <div key={m.key}>
                  <div style={{ padding: "8px 16px 2px", color: "var(--muted)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".04em" }}>{m.label}</div>
                  <div style={S.tableWrap}>
                    <table style={S.table}>
                      <thead>
                        <tr>
                          <th style={S.thL}>Selection</th>
                          <th style={S.th}>Model</th>
                          <th style={S.th}>Fair</th>
                          {books.map((b) => <th key={b} style={S.th}>{BOOK_LABEL[b] || b}</th>)}
                          <th style={S.th}>EV</th>
                        </tr>
                      </thead>
                      <tbody>
                        {m.selections.map((s) => (
                          <tr key={s.id}>
                            <td style={S.tdL}>{s.label}</td>
                            <td style={S.td}>{pct(s.model)}</td>
                            <td style={{ ...S.td, color: "var(--muted)" }}>{odds(s.fair)}</td>
                            {books.map((b) => {
                              const price = s.books[b];
                              const isBest = price != null && s.best?.book === b;
                              return (
                                <td key={b} style={{ ...S.td, color: isBest ? "var(--gold)" : price != null ? "var(--text)" : "var(--muted)", fontWeight: isBest ? 700 : 400 }}>
                                  {price != null ? odds(price) : "·"}
                                </td>
                              );
                            })}
                            <td style={{ ...S.td, color: s.ev > 0 ? "var(--accent-2)" : "var(--muted)", fontWeight: 600 }}>
                              {(s.ev > 0 ? "+" : "") + (s.ev * 100).toFixed(1) + "%"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </>
      )}
    </Shell>
  );
}
