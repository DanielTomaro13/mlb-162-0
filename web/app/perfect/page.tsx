import Link from "next/link";
import { pageMeta, breadcrumbJsonLd, SITE } from "@/lib/seo";
import { serverResults } from "@/lib/serverdata";
import { teamColors, teamAbbr } from "@/lib/teams";
import JsonLd from "@/components/JsonLd";

export function generateMetadata() {
  const r = serverResults();
  return pageMeta({
    title: `Can an MLB team go 162-0? The ${r.liveSeason} perfect-season tracker`,
    description: `No MLB team has ever gone 162-0. Track who's still unbeaten in ${r.liveSeason}, who came closest, and the inverse 0-162 chase — updated daily from the official MLB Stats API.`,
    path: "/perfect",
    keywords: [
      "162-0", "can a team go 162-0", "MLB perfect season", "MLB undefeated",
      "best MLB record ever", "MLB longest winning streak", "162-0 tracker",
    ],
  });
}

const FAQ = [
  {
    q: "Has an MLB team ever gone 162-0?",
    a: "No. No team has ever come close to a perfect 162-0 season. The best regular-season records in modern history are the 2001 Seattle Mariners (116-46) and, going back further, the 1906 Chicago Cubs (116-36). Both still lost dozens of games.",
  },
  {
    q: "What is the best record in MLB regular-season history?",
    a: "By wins, the 2001 Seattle Mariners and 1906 Chicago Cubs share the record at 116. By winning percentage, the 1906 Cubs (.763) lead the modern era. A 162-0 season would mean a 1.000 winning percentage — something no team has ever approached.",
  },
  {
    q: "How long is the longest MLB winning streak?",
    a: "The 1916 New York Giants reeling off 26 straight (with a tie in the middle) is the longest unbeaten run; the 2002 Oakland Athletics' 20-game streak is the longest pure winning streak of the modern era. Even those fall far short of a full 162-game season.",
  },
  {
    q: "Why is a 162-0 season essentially impossible?",
    a: "Even an all-time-great team wins around 60-65% of its games. To go 162-0 you'd need to win every single game against major-league opposition over six months — the probability is astronomically small, which is exactly what makes chasing it on MLB 162-0 fun.",
  },
];

export default function PerfectPage() {
  const r = serverResults();
  const rows = [...r.schedule.perfect].sort((a, b) => b.w - a.w || a.l - b.l);
  const alive = rows.filter((t) => t.alive && t.w > 0);
  const winless = rows.filter((t) => t.winless && t.l > 0);
  const best = rows[0];

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <div style={{ display: "grid", gap: "1.75rem" }}>
      <JsonLd data={faqLd} />
      <JsonLd data={breadcrumbJsonLd([{ name: "162-0 Tracker", path: "/perfect" }])} />

      <header style={{ display: "grid", gap: 10 }}>
        <span className="chip" style={{ width: "fit-content", color: "var(--gold)" }}>Live · {r.liveSeason} · MLB Stats API</span>
        <h1 style={{ fontSize: "clamp(2rem,6vw,3rem)", margin: 0, textTransform: "uppercase", lineHeight: 1 }}>
          Can a team go <span style={{ color: "var(--accent)" }}>162–0</span>?
        </h1>
        <p style={{ color: "var(--muted)", maxWidth: 680, fontSize: "1.05rem" }}>
          No Major League team has ever had a perfect season. This is the live {r.liveSeason} tracker of who&apos;s
          still unbeaten, who came closest, and the gloriously bad inverse — the chase for 0–162.
        </p>
      </header>

      <section className="card" style={{ padding: "1.25rem", borderColor: alive.length ? "var(--accent-2)" : "var(--border)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
          <h2 style={{ margin: 0, fontSize: "1.2rem" }}>Still perfect in {r.liveSeason}</h2>
          <span className="chip" style={{ color: alive.length ? "var(--accent-2)" : "var(--muted)" }}>
            {alive.length ? `${alive.length} unbeaten` : "All eliminated"}
          </span>
        </div>
        <p style={{ color: "var(--muted)", margin: 0, fontSize: ".95rem" }}>
          {alive.length
            ? `${alive.length} ${alive.length === 1 ? "team is" : "teams are"} still without a loss. The dream lives — for now.`
            : `Every team has lost at least once, so a perfect ${r.liveSeason} is already off the table. Here's the full board, closest to perfect first.`}
        </p>
      </section>

      <section>
        <h2 style={{ marginBottom: 10 }}>The full chase — closest to 162–0</h2>
        <div className="card scroll-x" style={{ padding: ".4rem .6rem" }}>
          <table className="stat">
            <thead><tr><th>#</th><th>Team</th><th>W</th><th>L</th><th>PCT</th><th>From perfect</th></tr></thead>
            <tbody>
              {rows.map((t, i) => {
                const [c1] = teamColors(t.team);
                const pct = t.w + t.l ? (t.w / (t.w + t.l)).toFixed(3).replace(/^0/, "") : ".000";
                return (
                  <tr key={t.team} style={t.alive && t.w > 0 ? { background: "rgba(55,194,129,0.06)" } : undefined}>
                    <td style={{ color: "var(--muted)", fontFamily: "var(--font-mono)" }}>{i + 1}</td>
                    <td style={{ display: "flex", gap: 8, alignItems: "center", whiteSpace: "nowrap" }}>
                      <span style={{ width: 9, height: 9, borderRadius: 2, background: c1 }} />
                      <Link href={`/teams/${teamAbbr(t.team).toLowerCase()}`}>{teamAbbr(t.team)} · {t.team}</Link>
                      {t.alive && t.w > 0 && <span className="chip" style={{ fontSize: ".6rem", color: "var(--accent-2)" }}>ALIVE</span>}
                    </td>
                    <td style={{ fontWeight: 700, color: "var(--accent-2)" }}>{t.w}</td>
                    <td style={{ color: "var(--danger)" }}>{t.l}</td>
                    <td>{pct}</td>
                    <td style={{ color: "var(--muted)" }}>{t.l === 0 ? "still perfect" : `${t.l} ${t.l === 1 ? "loss" : "losses"} in`}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {winless.length > 0 && (
        <section className="card" style={{ padding: "1.1rem" }}>
          <h2 style={{ margin: "0 0 6px", fontSize: "1.1rem" }}>🥶 The other perfect season (0–162)</h2>
          <p style={{ color: "var(--muted)", margin: 0, fontSize: ".9rem" }}>
            Still chasing a winless year: {winless.map((w) => `${teamAbbr(w.team)} (0–${w.l})`).join(", ")}.
            Build the worst roster imaginable in <Link href="/play" style={{ color: "var(--accent)" }}>Cellar Dwellers mode →</Link>
          </p>
        </section>
      )}

      <section style={{ display: "grid", gap: 12 }}>
        <h2 style={{ margin: 0 }}>The closest anyone has come</h2>
        <div className="grid-cards" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))" }}>
          {[
            { t: "116–46", s: "2001 Seattle Mariners — tied the modern wins record, then lost the ALCS." },
            { t: "116–36", s: "1906 Chicago Cubs — a .763 clip, still the best winning % of the modern era." },
            { t: "20 straight", s: "2002 Oakland A's — the longest pure winning streak in over a century." },
            { t: "0–21 start", s: "1988 Baltimore Orioles — the inverse nightmare, the worst start ever." },
          ].map((c) => (
            <div key={c.t} className="card" style={{ padding: "1rem" }}>
              <div style={{ fontFamily: "var(--font-cond)", fontSize: "1.6rem", color: "var(--gold)" }}>{c.t}</div>
              <div style={{ fontSize: ".82rem", color: "var(--muted)", marginTop: 4 }}>{c.s}</div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ display: "grid", gap: 12 }}>
        <h2 style={{ margin: 0 }}>162–0 questions</h2>
        <div style={{ display: "grid", gap: 10 }}>
          {FAQ.map((f) => (
            <details key={f.q} className="card" style={{ padding: "1rem" }}>
              <summary style={{ cursor: "pointer", fontWeight: 700 }}>{f.q}</summary>
              <p style={{ color: "var(--muted)", margin: "8px 0 0", lineHeight: 1.6 }}>{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <p style={{ color: "var(--muted)", fontSize: ".9rem" }}>
        Think you can do better than {best ? `${teamAbbr(best.team)}'s ${best.w}–${best.l}` : "the field"}?{" "}
        <Link href="/play" style={{ color: "var(--accent)" }}>Draft an all-time roster and chase 162–0 →</Link>
        {" · "}<Link href="/standings" style={{ color: "var(--accent)" }}>Full standings</Link>
      </p>
    </div>
  );
}
