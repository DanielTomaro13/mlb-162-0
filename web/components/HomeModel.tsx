"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { loadPredictions, loadOdds, loadModelMeta, pct, odds, BOOK_LABEL, type Predictions, type Odds, type ModelMeta } from "@/lib/modeldb";

export default function HomeModel() {
  const [preds, setPreds] = useState<Predictions | null>(null);
  const [oddsData, setOdds] = useState<Odds | null>(null);
  const [meta, setMeta] = useState<ModelMeta | null>(null);

  useEffect(() => {
    loadPredictions().then(setPreds);
    loadOdds().then(setOdds);
    loadModelMeta().then(setMeta);
  }, []);

  if (!preds) return null; // model feed not built yet — hide the section entirely

  const firstDate = preds.games[0]?.date;
  const todays = preds.games.filter((g) => g.date === firstDate).slice(0, 6);
  const picks = (oddsData?.games || [])
    .flatMap((g) => g.markets.flatMap((m) => m.selections.map((s) => ({ ...s, g }))))
    .filter((s) => s.ev > 0 && s.ev < 0.4)
    .sort((a, b) => b.ev - a.ev)
    .slice(0, 5);
  const bt = meta?.backtest;

  return (
    <section style={{ display: "grid", gap: "1rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <h2 style={{ margin: 0, textTransform: "uppercase" }}>⚾ The Model</h2>
        <Link href="/model" style={{ fontSize: ".85rem", color: "var(--accent)" }}>All games →</Link>
      </div>
      <p style={{ color: "var(--muted)", margin: "-4px 0 0", maxWidth: 640, fontSize: ".95rem" }}>
        Our own fair prices for every MLB game — moneyline, run line, totals and player props —
        from a model built on live MLB Stats data, compared against the bookmakers.
        {bt?.n ? ` Backtested at ${pct(bt.accuracy)} accuracy over ${bt.n.toLocaleString()} games.` : ""}
      </p>

      <div className="home-split" style={{ display: "grid", gap: "1rem", gridTemplateColumns: "minmax(0,1.3fr) minmax(0,1fr)" }}>
        <style>{`@media (max-width: 760px){ .home-split { grid-template-columns: 1fr !important; } }`}</style>

        {/* today's games */}
        <div className="card" style={{ padding: "1.1rem", display: "grid", gap: 8, alignContent: "start" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <strong style={{ fontFamily: "var(--font-cond)", textTransform: "uppercase" }}>Today&apos;s model lines</strong>
            <span style={{ fontSize: ".72rem", color: "var(--muted)" }}>{firstDate}</span>
          </div>
          {todays.map((g) => {
            const fav = g.win_home >= g.win_away;
            return (
              <Link key={String(g.gamePk) + g.date} href="/model" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, fontSize: ".88rem", padding: "5px 0", borderTop: "1px solid var(--border)" }}>
                <span style={{ color: "var(--text)" }}>{g.awayAbbr} @ {g.homeAbbr}</span>
                <span style={{ color: "var(--muted)" }}>
                  <b style={{ color: "var(--accent-2)" }}>{fav ? g.homeAbbr : g.awayAbbr} {pct(Math.max(g.win_home, g.win_away))}</b>
                  {" · "}O/U {g.total_mean.toFixed(1)}
                </span>
              </Link>
            );
          })}
          <Link href="/predictions" className="btn" style={{ marginTop: 6, fontSize: ".8rem" }}>Full market book →</Link>
        </div>

        {/* top value */}
        <div className="card" style={{ padding: "1.1rem", display: "grid", gap: 8, alignContent: "start", borderColor: picks.length ? "var(--accent-2)" : "var(--border)" }}>
          <strong style={{ fontFamily: "var(--font-cond)", textTransform: "uppercase" }}>Top value vs the books</strong>
          {picks.length === 0 && <span style={{ fontSize: ".82rem", color: "var(--muted)" }}>Odds refresh from a local run — check back soon.</span>}
          {picks.map((s, i) => (
            <Link key={i} href="/value" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, fontSize: ".85rem", padding: "5px 0", borderTop: "1px solid var(--border)" }}>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.label}</span>
              <span style={{ whiteSpace: "nowrap" }}>
                <span style={{ color: "var(--gold)" }}>{odds(s.best?.price)}</span>{" "}
                <b style={{ color: "var(--accent-2)" }}>+{(s.ev * 100).toFixed(0)}%</b>
              </span>
            </Link>
          ))}
          {picks.length > 0 && <Link href="/value" className="btn" style={{ marginTop: 6, fontSize: ".8rem" }}>All value plays →</Link>}
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Link href="/model" className="btn">Games</Link>
        <Link href="/value" className="btn">Value</Link>
        <Link href="/compare" className="btn">Compare odds</Link>
        <Link href="/pickem" className="btn">Pick&apos;em</Link>
        <Link href="/ratings" className="btn">Power ratings</Link>
      </div>
    </section>
  );
}
