"use client";
import { useEffect, useState } from "react";
import { loadResults, type PerfectRow } from "@/lib/data";
import { teamColors, teamAbbr } from "@/lib/teams";

/**
 * The signature 162-0 panel: who, in the live season, is still chasing a
 * flawless year? Early on, teams cling to a 0-loss record; by summer the dream
 * is dead for everyone and we show who came closest (and who's stuck in the
 * cellar chasing the inverse — 0-162).
 */
export default function PerfectChase() {
  const [rows, setRows] = useState<PerfectRow[] | null>(null);
  const [season, setSeason] = useState("");
  useEffect(() => {
    loadResults().then((r) => { setRows(r.schedule.perfect); setSeason(r.liveSeason); });
  }, []);

  if (!rows) return null;
  const alive = rows.filter((r) => r.alive && r.w > 0);
  const winless = rows.filter((r) => r.winless && r.l > 0);
  const top = [...rows].sort((a, b) => b.w - a.w || a.l - b.l).slice(0, 6);

  return (
    <section className="card" style={{ padding: "1.25rem", display: "grid", gap: 14, borderColor: alive.length ? "var(--accent-2)" : "var(--border)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
        <h2 style={{ margin: 0, fontSize: "1.25rem", textTransform: "uppercase" }}>
          The {season} chase for <span style={{ color: "var(--accent)" }}>162–0</span>
        </h2>
        <span className="chip" style={{ color: alive.length ? "var(--accent-2)" : "var(--muted)" }}>
          {alive.length ? `${alive.length} still perfect` : "Nobody perfect — yet"}
        </span>
      </div>

      <p style={{ color: "var(--muted)", margin: 0, fontSize: ".92rem", maxWidth: 640 }}>
        {alive.length
          ? `${alive.length} ${alive.length === 1 ? "team is" : "teams are"} still unbeaten this season. The perfect season is alive.`
          : "No team has ever gone 162–0 — and this year is no exception. Every club has tasted defeat. Here's who's closest to the impossible."}
      </p>

      <div className="scroll-x">
        <table className="stat">
          <thead><tr><th>#</th><th>Team</th><th>W</th><th>L</th><th>From perfect</th></tr></thead>
          <tbody>
            {top.map((t, i) => {
              const [c1] = teamColors(t.team);
              return (
                <tr key={t.team}>
                  <td style={{ color: "var(--muted)", fontFamily: "var(--font-mono)" }}>{i + 1}</td>
                  <td style={{ display: "flex", gap: 8, alignItems: "center", whiteSpace: "nowrap" }}>
                    <span style={{ width: 9, height: 9, borderRadius: 2, background: c1 }} />
                    {teamAbbr(t.team)} · {t.team}
                    {t.alive && t.w > 0 && <span className="chip" style={{ fontSize: ".6rem", color: "var(--accent-2)", marginLeft: 4 }}>ALIVE</span>}
                  </td>
                  <td style={{ fontWeight: 700, color: "var(--accent-2)" }}>{t.w}</td>
                  <td style={{ color: "var(--danger)" }}>{t.l}</td>
                  <td style={{ color: "var(--muted)" }}>{t.l === 0 ? "still perfect" : `${t.l} ${t.l === 1 ? "loss" : "losses"} in`}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {winless.length > 0 && (
        <p style={{ fontSize: ".78rem", color: "var(--muted)", margin: 0 }}>
          🥶 Still chasing the <em>other</em> perfect season (0–162):{" "}
          {winless.map((w) => `${teamAbbr(w.team)} (0–${w.l})`).join(", ")}.
        </p>
      )}
      <a href="/perfect" className="btn" style={{ width: "fit-content" }}>Full 162-0 tracker →</a>
    </section>
  );
}
