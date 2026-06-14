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
          Every player-season is scored on a 60–99 scale. Hitters are rated primarily on{" "}
          <strong>OPS</strong> (on-base plus slugging), nudged up by power and speed volume.
          Pitchers blend <strong>ERA</strong>, <strong>WHIP</strong> and strikeout rate. A player&apos;s
          eligible positions come from where they actually played: outfielders are interchangeable
          across the grass, any hitter can DH, and pitchers are split into starters, relievers and
          closers by their real workload.
        </p>
      </section>

      <section style={{ display: "grid", gap: 10 }}>
        <h2 style={{ margin: 0 }}>The simulator</h2>
        <p style={{ color: "var(--muted)", lineHeight: 1.7 }}>
          When you draft a roster, its average rating sets a per-game win probability, and we play out
          all 162 games. The curve is capped so even the best roster you can assemble tops out around a
          122–40 record — and a perfect 162–0 stays the essentially-impossible miracle it is in real
          life. The <em>Cellar Dwellers</em> mode is the mirror image: chase a winless 0–162.
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
