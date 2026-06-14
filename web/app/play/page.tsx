import Link from "next/link";
import { pageMeta } from "@/lib/seo";
import PerfectSeasonGame from "@/components/PerfectSeasonGame";
import DailyLeaderboard from "@/components/DailyLeaderboard";
import HomeLeaderboard from "@/components/HomeLeaderboard";

export const metadata = pageMeta({
  title: "Play Perfect Season — draft an all-time MLB roster",
  description:
    "Spin for an MLB franchise and era, draft a legend into every spot in the lineup and rotation, and chase a flawless 162-0 season. Six modes: Starting Nine, The Roster, Active 18, Salary Cap, The Gauntlet and Cellar Dwellers.",
  path: "/play",
  keywords: ["MLB draft game", "perfect season", "MLB roster builder", "162-0 game"],
});

export default function PlayPage() {
  return (
    <>
      {/* Server-rendered heading + intro so the page has a crawlable H1 and copy
          even before the client game hydrates. */}
      <header style={{ marginBottom: "1.25rem" }}>
        <h1 style={{ fontSize: "2rem", margin: 0, textTransform: "uppercase" }}>Perfect Season</h1>
        <p style={{ color: "var(--muted)", marginTop: 6, maxWidth: 640 }}>
          Spin for an MLB franchise and era, draft a legend into every spot in the lineup and
          rotation, and chase a flawless 162–0 season. Six modes — Starting Nine, The Roster,
          Active 18, Salary Cap, The Gauntlet and Cellar Dwellers — with a full-season simulator where
          a flawless 162–0 is reserved for only the very best rosters you can build.
        </p>
      </header>
      <PerfectSeasonGame />

      {/* The shared 162-0 boards: today's Daily Challenge results + the all-time
          Hall of Fame. Your saved runs post here. */}
      <section style={{ marginTop: "2.5rem", display: "grid", gap: "1rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8 }}>
          <h2 style={{ margin: 0, fontSize: "1.4rem", textTransform: "uppercase" }}>The 162-0 boards</h2>
          <Link href="/leaderboard" style={{ fontSize: ".85rem", color: "var(--accent)" }}>Full Hall of Fame →</Link>
        </div>
        <p style={{ color: "var(--muted)", margin: 0, fontSize: ".9rem" }}>
          Save a run to post your record. The <strong>Daily Challenge</strong> board resets every day
          with a fresh shared draw; the <strong>Hall of Fame</strong> keeps the all-time best.
        </p>
        <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "1fr 1fr" }} className="play-boards">
          <style>{`@media (max-width: 640px){ .play-boards { grid-template-columns: 1fr !important; } }`}</style>
          <DailyLeaderboard />
          <HomeLeaderboard />
        </div>
      </section>
    </>
  );
}
