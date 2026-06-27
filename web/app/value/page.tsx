"use client";

import { useEffect, useMemo, useState } from "react";
import ModelNav from "@/components/ModelNav";
import { loadOdds, odds, pct, type Odds, type OddsSelection } from "@/lib/modeldb";

const wrap = { maxWidth: 1080, margin: "0 auto", padding: "0 16px" } as const;

type Row = OddsSelection & { home: string; away: string; homeAbbr: string; awayAbbr: string };

export default function ValuePage() {
  const [data, setData] = useState<Odds | null>(null);
  const [posOnly, setPosOnly] = useState(true);

  useEffect(() => { loadOdds().then(setData); }, []);

  const rows = useMemo<Row[]>(() => {
    const all: Row[] = (data?.games || []).flatMap((g) =>
      g.selections.map((s) => ({ ...s, home: g.home, away: g.away, homeAbbr: g.homeAbbr, awayAbbr: g.awayAbbr }))
    );
    all.sort((a, b) => b.ev - a.ev);
    return posOnly ? all.filter((r) => r.ev > 0) : all;
  }, [data, posOnly]);

  return (
    <main style={{ ...wrap, paddingTop: 24, paddingBottom: 48 }}>
      <h1 style={{ fontFamily: "var(--font-cond)", fontSize: 30, margin: "0 0 4px" }}>The Model · Value</h1>
      <p style={{ color: "var(--muted)", margin: "0 0 16px" }}>
        Where the model price beats the best bookmaker price — sorted by expected value.
        {data && ` Books: ${(data.books || []).join(", ") || "—"} · updated ${data.generated}.`}
      </p>
      <ModelNav />

      {!data && <p style={{ color: "var(--muted)" }}>Loading…</p>}
      {data && !data.games?.length && (
        <p style={{ color: "var(--muted)" }}>No bookmaker odds loaded yet — the odds feed refreshes from a local run.</p>
      )}

      {data && data.games?.length > 0 && (
        <>
          <label style={{ display: "inline-flex", gap: 8, alignItems: "center", color: "var(--muted)", fontSize: 13, marginBottom: 10 }}>
            <input type="checkbox" checked={posOnly} onChange={(e) => setPosOnly(e.target.checked)} />
            positive EV only
          </label>
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
                    <td style={{ padding: "9px 12px", textAlign: "right", color: "var(--muted)" }}>{r.best?.book || "—"}</td>
                    <td style={{ padding: "9px 12px", textAlign: "right", color: r.ev > 0 ? "var(--accent-2)" : "var(--muted)", fontWeight: 600 }}>
                      {(r.ev > 0 ? "+" : "") + (r.ev * 100).toFixed(1) + "%"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ color: "var(--muted)", fontSize: 12, marginTop: 12 }}>For research and entertainment only — not betting advice.</p>
        </>
      )}
    </main>
  );
}
