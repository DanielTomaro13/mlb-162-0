import Link from "next/link";
import { pageMeta, breadcrumbJsonLd } from "@/lib/seo";
import { allPlayers } from "@/lib/playerdb";
import JsonLd from "@/components/JsonLd";
import TopPlayersLeaderboard from "@/components/TopPlayersLeaderboard";

export const metadata = pageMeta({
  title: "The 162-0 Leaderboard — the best MLB players of all time",
  description: "The top-rated players across MLB history — the legends a perfect 162-0 roster is built from. Plus how close any team has come to a flawless season.",
  path: "/perfect",
  keywords: [
    "best MLB players of all time", "MLB player rankings", "162-0", "MLB perfect season",
    "top rated MLB players", "all-time MLB leaderboard",
  ],
});

const FAQ = [
  {
    q: "Has an MLB team ever gone 162-0?",
    a: "No. No team has ever come close to a perfect 162-0 season. The best regular-season records in modern history are the 2001 Seattle Mariners (116-46) and the 1906 Chicago Cubs (116-36). Both still lost dozens of games.",
  },
  {
    q: "Who are the highest-rated players?",
    a: "Our 60–99 rating reflects how a player actually performed — hitters for overall production, pitchers for run prevention and missing bats — with a sample-size adjustment. The leaderboard above ranks the very best across every season since 1901.",
  },
  {
    q: "What is the best record in MLB regular-season history?",
    a: "By wins, the 2001 Mariners and 1906 Cubs share the record at 116. By winning percentage, the 1906 Cubs (.763) lead the modern era. A 162-0 season would be a 1.000 winning percentage — something no team has ever approached.",
  },
  {
    q: "Why is a 162-0 season essentially impossible?",
    a: "Even an all-time-great team wins around 60-65% of its games. Stringing together 162 straight wins against major-league opposition over six months is astronomically unlikely — which is exactly what makes chasing it here fun.",
  },
];

export default function PerfectPage() {
  const players = allPlayers();
  // only the top slice is serialised into the client leaderboard (filter + top 50)
  const top = [...players].sort((a, b) => b.rating - a.rating || b.fame - a.fame).slice(0, 160);

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };

  return (
    <div style={{ display: "grid", gap: "1.75rem" }}>
      <JsonLd data={faqLd} />
      <JsonLd data={breadcrumbJsonLd([{ name: "162-0 Leaderboard", path: "/perfect" }])} />

      <header style={{ display: "grid", gap: 10 }}>
        <span className="chip" style={{ width: "fit-content", color: "var(--gold)" }}>{players.length.toLocaleString()} players rated · since 1901</span>
        <h1 style={{ fontSize: "clamp(2rem,6vw,3rem)", margin: 0, textTransform: "uppercase", lineHeight: 1 }}>
          The <span style={{ color: "var(--accent)" }}>162–0</span> leaderboard
        </h1>
        <p style={{ color: "var(--muted)", maxWidth: 680, fontSize: "1.05rem" }}>
          The highest-rated players in MLB history — the legends a flawless 162–0 roster is built from.
          Think you can assemble a better nine? <Link href="/play" style={{ color: "var(--accent)" }}>Draft your team →</Link>
        </p>
      </header>

      <section>
        <h2 style={{ marginBottom: 10 }}>Top-rated players, all time</h2>
        <TopPlayersLeaderboard players={top} limit={50} />
      </section>

      <section className="card" style={{ padding: "1.25rem", display: "grid", gap: 8 }}>
        <h2 style={{ margin: 0, fontSize: "1.2rem" }}>Build the perfect roster</h2>
        <p style={{ color: "var(--muted)", margin: 0, fontSize: ".92rem" }}>
          Draft these legends onto the diamond and simulate a full 162-game season. A flawless 162–0
          is reserved for only the very best rosters — see if yours makes the Hall of Fame.
        </p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link href="/play" className="btn btn-primary">⚾ Draft your team</Link>
          <Link href="/leaderboard" className="btn">Hall of Fame</Link>
          <Link href="/standings" className="btn">Live standings</Link>
        </div>
      </section>

      <section style={{ display: "grid", gap: 12 }}>
        <h2 style={{ margin: 0 }}>The closest any team has come to 162–0</h2>
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
    </div>
  );
}
