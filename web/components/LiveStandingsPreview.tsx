import Link from "next/link";
import type { LadderRow } from "@/lib/data";
import { teamColors, teamAbbr, leagueShort } from "@/lib/teams";
import { avg3 } from "@/lib/format";

/**
 * A compact, honest live-standings table for the home page: the real current
 * standings (top teams by winning percentage), not the 162-0 gimmick. The full
 * division-by-division view lives on /standings; the perfect-season angle lives
 * on /perfect.
 */
export default function LiveStandingsPreview({ rows, season }: { rows: LadderRow[]; season: string }) {
  const top = [...rows].sort((a, b) => b.pct - a.pct || b.pd - a.pd).slice(0, 8);
  const leader = top[0];
  return (
    <section>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
        <h2 style={{ margin: 0 }}>{season} live standings</h2>
        <Link href="/standings" style={{ fontSize: ".85rem", color: "var(--accent)" }}>Full standings by division →</Link>
      </div>
      <div className="card scroll-x" style={{ padding: ".4rem .6rem" }}>
        <table className="stat">
          <thead><tr><th>#</th><th>Team</th><th>W</th><th>L</th><th>PCT</th><th>GB</th><th>STRK</th></tr></thead>
          <tbody>
            {top.map((t, i) => {
              const [c1] = teamColors(t.team);
              const gb = !leader || i === 0 ? "—" : (((leader.w - t.w) + (t.l - leader.l)) / 2).toFixed(1);
              return (
                <tr key={t.team}>
                  <td style={{ color: "var(--muted)", fontFamily: "var(--font-mono)" }}>{i + 1}</td>
                  <td style={{ display: "flex", gap: 8, alignItems: "center", whiteSpace: "nowrap" }}>
                    <span style={{ width: 9, height: 9, borderRadius: 2, background: c1 }} />
                    <Link href={`/teams/${teamAbbr(t.team).toLowerCase()}`}>{t.team}</Link>
                    <span className="chip" style={{ fontSize: ".58rem", padding: "1px 6px" }}>{leagueShort(t.league)}</span>
                  </td>
                  <td style={{ fontWeight: 700 }}>{t.w}</td>
                  <td>{t.l}</td>
                  <td>{avg3(t.pct)}</td>
                  <td style={{ color: "var(--muted)" }}>{gb}</td>
                  <td style={{ fontFamily: "var(--font-mono)", fontSize: ".76rem", color: t.streak?.startsWith("W") ? "var(--accent-2)" : t.streak?.startsWith("L") ? "var(--danger)" : "var(--muted)" }}>{t.streak || "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p style={{ fontSize: ".78rem", color: "var(--muted)", marginTop: 8 }}>
        Real {season} standings from the MLB Stats API. Curious who&apos;s closest to a flawless year?{" "}
        <Link href="/perfect" style={{ color: "var(--accent)" }}>See the 162-0 tracker →</Link>
      </p>
    </section>
  );
}
