import Link from "next/link";
import { pageMeta, SITE } from "@/lib/seo";

export const metadata = pageMeta({
  title: "About & method — how MLB 162-0 works",
  description: "How MLB 162-0 builds player ratings from real MLB Stats API season data, what the 162-0 chase means, and how each game works.",
  path: "/about",
  keywords: ["MLB 162-0 about", "player rating method", "MLB Stats API"],
});

export default function AboutPage() {
  return (
    <div style={{ display: "grid", gap: "1.5rem", maxWidth: 760 }}>
      <header>
        <h1 style={{ fontSize: "2rem", margin: 0, textTransform: "uppercase" }}>About &amp; method</h1>
        <p style={{ color: "var(--muted)", marginTop: 6 }}>
          {SITE.name} is the baseball entry in the <strong>0 Series</strong> — a set of sister sites
          chasing the impossible perfect season across sports.
        </p>
      </header>

      <section style={{ display: "grid", gap: 10 }}>
        <h2 style={{ margin: 0 }}>Why 162–0?</h2>
        <p style={{ color: "var(--muted)", lineHeight: 1.7 }}>
          A Major League season is 162 games. No team has ever won them all — the 1906 Cubs (116–36)
          and 2001 Mariners (116–46) are the closest anyone has come. A flawless 162–0 is the holy
          grail that can never happen, which is exactly why it&apos;s fun to chase. Each spring we track
          which clubs are <em>still</em> unbeaten and how long the dream survives.
        </p>
      </section>

      <section style={{ display: "grid", gap: 10 }}>
        <h2 style={{ margin: 0 }}>The data</h2>
        <p style={{ color: "var(--muted)", lineHeight: 1.7 }}>
          Everything is built from the official, public{" "}
          <a href="https://statsapi.mlb.com" style={{ color: "var(--accent)" }}>MLB Stats API</a> —
          the same feeds the league&apos;s own apps read. Standings, schedules and scores come straight
          from it, refreshed daily. The player pool aggregates real season hitting and pitching
          stat lines across recent seasons.
        </p>
      </section>

      <section style={{ display: "grid", gap: 10 }}>
        <h2 style={{ margin: 0 }}>The ratings</h2>
        <p style={{ color: "var(--muted)", lineHeight: 1.7 }}>
          Every player is given an overall rating that reflects how they actually performed —
          hitters for their bat, pitchers for keeping runs off the board. Each player can be drafted
          at the positions they really played, with outfielders interchangeable across the grass, any
          hitter able to slot in at DH, and pitchers split into starters, relievers and closers by
          their real roles. Think of the numbers as a fun, opinionated ranking — not official stats.
        </p>
      </section>

      <section style={{ display: "grid", gap: 10 }}>
        <h2 style={{ margin: 0 }}>The simulator</h2>
        <p style={{ color: "var(--muted)", lineHeight: 1.7 }}>
          Draft a roster and we play out a full 162-game season for it. The stronger your side, the
          more it wins — but a flawless 162–0 is deliberately brutal to reach, just like the real
          thing, so it stays a badge of honour for only the very best rosters. The{" "}
          <em>Cellar Dwellers</em> mode is the mirror image: chase a winless 0–162.
        </p>
      </section>

      <p style={{ fontSize: ".82rem", color: "var(--muted)" }}>
        Explore the rest of the 0 Series:{" "}
        <a href="https://afl23-0.com" style={{ color: "var(--accent)" }}>AFL 23-0</a>,{" "}
        <a href="https://nrl24-0.com" style={{ color: "var(--accent)" }}>NRL 24-0</a> and{" "}
        <a href="https://footballinvincibles.com" style={{ color: "var(--accent)" }}>Football Invincibles</a>.
        {" "}<Link href="/play" style={{ color: "var(--accent)" }}>Or build your roster →</Link>
      </p>
    </div>
  );
}
