import Link from "next/link";
import { serverMeta, serverResults } from "@/lib/serverdata";
import LiveLeaders from "@/components/LiveLeaders";
import LiveStandingsPreview from "@/components/LiveStandingsPreview";
import HomeLeaderboard from "@/components/HomeLeaderboard";
import DailyLeaderboard from "@/components/DailyLeaderboard";
import HomeModel from "@/components/HomeModel";
import { GAMES } from "@/lib/gamelist";

export default function Home() {
  const meta = serverMeta();
  const results = serverResults();
  const liveRows = results.laddersBySeason[meta.liveSeason] ?? [];

  return (
    <div style={{ display: "grid", gap: "2.5rem" }}>
      {/* hero */}
      <section style={{ display: "grid", gap: "1rem" }}>
        <span className="chip" style={{ width: "fit-content", color: "var(--gold)" }}>All-time MLB draft · live MLB data</span>
        <h1 style={{ fontSize: "clamp(2.4rem, 7vw, 4rem)", margin: 0, lineHeight: 0.95, textTransform: "uppercase" }}>
          Build the perfect<br /><span style={{ color: "var(--accent)" }}>162–0</span> MLB season
        </h1>
        <p style={{ color: "var(--muted)", maxWidth: 620, fontSize: "1.05rem" }}>
          Spin for a franchise and era, draft a legend into every spot in the lineup and rotation,
          and chase the season no team has ever had. Then take on a vault of baseball mini-games.
        </p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link href="/play?daily=1" className="btn btn-primary">⚾ Daily Challenge</Link>
          <Link href="/play" className="btn">🎲 Spin &amp; Build</Link>
          <Link href="/games" className="btn">Mini-games</Link>
          <Link href="/leaderboard" className="btn">Hall of Fame</Link>
        </div>
      </section>

      {/* games grid */}
      <section>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
          <h2 style={{ margin: 0 }}>The games</h2>
          <Link href="/games" style={{ fontSize: ".85rem", color: "var(--accent)" }}>All games →</Link>
        </div>
        <div className="grid-cards">
          {GAMES.map((g) => (
            <Link key={g.slug} href={`/games/${g.slug}`} className="card" style={{ padding: "1rem", display: "grid", gap: 4 }}>
              <span style={{ fontSize: "1.6rem" }}>{g.emoji}</span>
              <strong style={{ fontFamily: "var(--font-cond)", fontSize: "1.1rem", textTransform: "uppercase" }}>{g.title}</strong>
              <span style={{ fontSize: ".8rem", color: "var(--muted)" }}>{g.blurb}</span>
              <span className="chip" style={{ width: "fit-content", fontSize: ".64rem", marginTop: 4 }}>{g.tag}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* the model — fair prices & value */}
      <HomeModel />

      {/* daily challenge + leaderboards */}
      <section style={{ display: "grid", gap: "1rem", gridTemplateColumns: "minmax(0,1.4fr) minmax(0,1fr)" }} className="home-split">
        <style>{`@media (max-width: 760px){ .home-split { grid-template-columns: 1fr !important; } }`}</style>
        <div className="card" style={{ padding: "1.4rem", display: "grid", gap: 12, alignContent: "start", borderColor: "var(--accent)" }}>
          <span className="chip" style={{ width: "fit-content", color: "var(--gold)" }}>New every day · same draw for everyone</span>
          <h2 style={{ margin: 0, fontSize: "1.5rem", textTransform: "uppercase" }}>The Daily Challenge</h2>
          <p style={{ color: "var(--muted)", margin: 0, fontSize: ".95rem" }}>
            Everyone gets the <strong>same franchise and era</strong> today. Draft the best Starting Nine
            you can, simulate your 162 games, and see where your record lands on today&apos;s board.
            A new draw drops at midnight UTC.
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link href="/play?daily=1" className="btn btn-primary">⚾ Play today&apos;s challenge</Link>
            <Link href="/leaderboard" className="btn">Hall of Fame</Link>
          </div>
        </div>
        <div style={{ display: "grid", gap: "1rem" }}>
          <DailyLeaderboard />
          <HomeLeaderboard />
        </div>
      </section>

      {/* current-season player stat leaders */}
      <LiveLeaders data={results.liveLeaders} />


      {/* live standings — the real thing, clearly labelled, moved to the foot */}
      <LiveStandingsPreview rows={liveRows} season={meta.liveSeason} />
    </div>
  );
}
