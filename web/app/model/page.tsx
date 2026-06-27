"use client";

import { useEffect, useMemo, useState } from "react";
import ModelNav from "@/components/ModelNav";
import { loadPredictions, loadModelMeta, pct, odds, type Predictions, type ModelMeta, type GameProjection } from "@/lib/modeldb";

const wrap = { maxWidth: 1080, margin: "0 auto", padding: "0 16px" } as const;
const card = { border: "1px solid var(--border)", borderRadius: 14, background: "var(--panel)", margin: "14px 0", overflow: "hidden" } as const;

function totalAt(g: GameProjection, line = 8.5) {
  const m = g.markets.find((x) => x.key === "total");
  return m?.lines?.find((l) => l.line === line) || m?.lines?.[Math.floor((m?.lines?.length || 1) / 2)];
}
function rl(g: GameProjection, side: "home" | "away") {
  const m = g.markets.find((x) => x.key === "rl");
  const s = m?.selections?.find((x) => x.label.startsWith(side));
  return s ? `${pct(s.prob)} · ${odds(s.fair)}` : "—";
}

const fld = { background: "var(--bg-soft)", color: "var(--text)", border: "1px solid var(--border)", borderRadius: 8, padding: "6px 10px", fontSize: 13.5 } as const;

export default function ModelGamesPage() {
  const [data, setData] = useState<Predictions | null>(null);
  const [meta, setMeta] = useState<ModelMeta | null>(null);
  const [err, setErr] = useState(false);
  const [date, setDate] = useState("all");
  const [q, setQ] = useState("");

  useEffect(() => {
    loadPredictions().then((d) => (d ? setData(d) : setErr(true)));
    loadModelMeta().then(setMeta);
  }, []);

  const dates = useMemo(() => Array.from(new Set((data?.games || []).map((g) => g.date))).sort(), [data]);
  const byDate = useMemo(() => {
    const m: Record<string, GameProjection[]> = {};
    (data?.games || [])
      .filter((g) => date === "all" || g.date === date)
      .filter((g) => !q || `${g.home} ${g.away} ${g.homeAbbr} ${g.awayAbbr} ${g.homePitcher} ${g.awayPitcher}`.toLowerCase().includes(q.toLowerCase()))
      .forEach((g) => (m[g.date] ||= []).push(g));
    return m;
  }, [data, date, q]);

  return (
    <main style={{ ...wrap, paddingTop: 24, paddingBottom: 48 }}>
      <h1 style={{ fontFamily: "var(--font-cond)", fontSize: 30, margin: "0 0 4px" }}>The Model · Games</h1>
      <p style={{ color: "var(--muted)", margin: "0 0 16px" }}>
        Every upcoming game priced from the public MLB Stats API — win probability, fair odds, run line and projected total.
        {meta && ` Season ${meta.season} · updated ${meta.generated}.`}
      </p>
      <ModelNav />

      {data && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", margin: "0 0 14px", padding: "11px 14px", border: "1px solid var(--border)", borderRadius: 12, background: "var(--panel)" }}>
          <select style={fld} value={date} onChange={(e) => setDate(e.target.value)}>
            <option value="all">All dates</option>
            {dates.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <input style={{ ...fld, minWidth: 180 }} type="search" placeholder="Search team or pitcher…" value={q} onChange={(e) => setQ(e.target.value)} />
          <span style={{ marginLeft: "auto", color: "var(--muted)", fontSize: 12.5 }}>{Object.values(byDate).reduce((n, a) => n + a.length, 0)} games</span>
        </div>
      )}

      {err && <p style={{ color: "var(--muted)" }}>Model feed unavailable.</p>}
      {!data && !err && <p style={{ color: "var(--muted)" }}>Loading…</p>}

      {Object.keys(byDate).sort().map((date) => (
        <section key={date}>
          <h2 style={{ fontSize: 18, margin: "22px 2px 6px" }}>
            {date} <span style={{ color: "var(--muted)", fontWeight: 400, fontSize: 13 }}>· {byDate[date].length} games</span>
          </h2>
          {byDate[date].map((g) => {
            const t = totalAt(g);
            return (
              <div key={String(g.gamePk) + g.date} style={card}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10, padding: "12px 16px", borderBottom: "1px solid var(--border)" }}>
                  <strong>{g.awayAbbr} @ {g.homeAbbr}</strong>
                  <span style={{ color: "var(--muted)", fontSize: 12.5 }}>
                    proj total {g.total_mean}{t ? ` · O${t.line} ${pct(t.over)}` : ""}
                  </span>
                </div>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
                    <thead>
                      <tr style={{ color: "var(--muted)", fontSize: 11.5, textTransform: "uppercase", letterSpacing: ".03em" }}>
                        <th style={{ textAlign: "left", padding: "8px 12px" }}>Team</th>
                        <th style={{ textAlign: "right", padding: "8px 12px" }}>Win</th>
                        <th style={{ textAlign: "right", padding: "8px 12px" }}>Fair</th>
                        <th style={{ textAlign: "right", padding: "8px 12px" }}>RL ±1.5</th>
                      </tr>
                    </thead>
                    <tbody>
                      {([["away", g.away, g.awayPitcher, g.win_away, g.fair_away], ["home", g.home, g.homePitcher, g.win_home, g.fair_home]] as const).map(
                        ([side, name, pit, wp, fair]) => (
                          <tr key={side} style={{ borderTop: "1px solid var(--border)" }}>
                            <td style={{ padding: "9px 12px" }}>
                              <b>{name}</b>
                              <div style={{ color: "var(--muted)", fontSize: 12 }}>P: {pit || "TBD"}</div>
                            </td>
                            <td style={{ padding: "9px 12px", textAlign: "right" }}>{pct(wp as number)}</td>
                            <td style={{ padding: "9px 12px", textAlign: "right" }}>{odds(fair as number)}</td>
                            <td style={{ padding: "9px 12px", textAlign: "right", color: "var(--muted)" }}>{rl(g, side as "home" | "away")}</td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </section>
      ))}
    </main>
  );
}
