"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { loadResults, type Results, type LadderRow } from "@/lib/data";
import { teamColors } from "@/lib/teams";
import { avg3 } from "@/lib/format";

const DIV_ORDER = [
  "American League East", "American League Central", "American League West",
  "National League East", "National League Central", "National League West",
];

export default function StandingsView() {
  const [data, setData] = useState<Results | null>(null);
  const [season, setSeason] = useState<string>("");
  useEffect(() => { loadResults().then((r) => { setData(r); setSeason(r.seasons[0]); }); }, []);
  if (!data) return <p style={{ color: "var(--muted)" }}>Loading standings…</p>;
  const rows = data.laddersBySeason[season] ?? [];
  const isLive = season === data.liveSeason;

  const byDiv = new Map<string, LadderRow[]>();
  for (const r of rows) {
    const d = r.division || "MLB";
    if (!byDiv.has(d)) byDiv.set(d, []);
    byDiv.get(d)!.push(r);
  }
  const divs = [...byDiv.keys()].sort(
    (a, b) => (DIV_ORDER.indexOf(a) + 1 || 99) - (DIV_ORDER.indexOf(b) + 1 || 99)
  );

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <label style={{ fontSize: ".82rem", color: "var(--muted)" }}>Season</label>
        <select value={season} onChange={(e) => setSeason(e.target.value)}
          style={{ padding: ".4rem .6rem", borderRadius: 8, border: "1px solid var(--border)", background: "var(--panel)", color: "var(--text)" }}>
          {data.seasons.map((s) => <option key={s} value={s}>{s}{s === data.liveSeason ? " (live)" : ""}</option>)}
        </select>
        {isLive && <span className="chip" style={{ color: "var(--accent-2)" }}>● Live — updates daily</span>}
      </div>

      <div className="grid-cards" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(340px,1fr))" }}>
        {divs.map((div) => {
          const list = [...byDiv.get(div)!].sort((a, b) => b.pct - a.pct || b.pd - a.pd);
          const top = list[0];
          return (
            <div key={div} className="card scroll-x" style={{ padding: ".5rem .7rem" }}>
              <div style={{ fontSize: ".74rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".06em", padding: "4px 4px 8px" }}>{div}</div>
              <table className="stat">
                <thead><tr><th>Team</th><th>W</th><th>L</th><th>PCT</th><th>GB</th><th>RS</th><th>RA</th><th>STRK</th></tr></thead>
                <tbody>
                  {list.map((t, i) => {
                    const [c1] = teamColors(t.team);
                    const gb = i === 0 ? "—" : (((top.w - t.w) + (t.l - top.l)) / 2).toFixed(1);
                    return (
                      <tr key={t.team} style={i === 0 ? { background: "rgba(55,194,129,0.06)" } : undefined}>
                        <td style={{ display: "flex", gap: 8, alignItems: "center", whiteSpace: "nowrap" }}>
                          <span style={{ width: 9, height: 9, borderRadius: 2, background: c1, flexShrink: 0 }} />
                          <span title={t.team} style={{ fontWeight: i === 0 ? 700 : 400 }}>{t.abbr || t.team}</span>
                        </td>
                        <td style={{ fontWeight: 700 }}>{t.w}</td><td>{t.l}</td>
                        <td>{avg3(t.pct)}</td>
                        <td style={{ color: "var(--muted)" }}>{gb}</td>
                        <td>{t.pf}</td><td>{t.pa}</td>
                        <td style={{ fontFamily: "var(--font-mono)", fontSize: ".78rem", color: t.streak?.startsWith("W") ? "var(--accent-2)" : t.streak?.startsWith("L") ? "var(--danger)" : "var(--muted)" }}>{t.streak || "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>
      <p style={{ fontSize: ".75rem", color: "var(--muted)" }}>
        Division leaders shaded. PCT = winning percentage, GB = games back, RS/RA = runs scored/allowed.
        Official figures from the MLB Stats API. {" "}
        <Link href="/schedule" style={{ color: "var(--accent)" }}>See the schedule →</Link>
      </p>
    </div>
  );
}
