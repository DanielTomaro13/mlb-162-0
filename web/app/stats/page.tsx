import { pageMeta } from "@/lib/seo";
import { allPlayers } from "@/lib/playerdb";
import StatsBoards from "@/components/StatsBoards";

export const metadata = pageMeta({
  title: "MLB Stat Leaders — home runs, RBIs, strikeouts & more",
  description: "Career stat leaders across the dataset: home runs, RBIs, hits, stolen bases, OPS, wins, strikeouts, saves and ERA — for hitters and pitchers. Built from real MLB Stats API season data.",
  path: "/stats",
  keywords: ["MLB stats", "MLB home run leaders", "MLB strikeout leaders", "MLB stat leaders"],
});

export default function StatsPage() {
  const players = allPlayers();
  return (
    <div style={{ display: "grid", gap: "1.5rem" }}>
      <header>
        <h1 style={{ fontSize: "2rem", margin: 0, textTransform: "uppercase" }}>Stat Leaders</h1>
        <p style={{ color: "var(--muted)", marginTop: 6 }}>Career leaders across the dataset, from real MLB season data. Switch between hitters and pitchers.</p>
      </header>
      <StatsBoards players={players} />
    </div>
  );
}
