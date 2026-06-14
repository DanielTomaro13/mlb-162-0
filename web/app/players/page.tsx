import { pageMeta } from "@/lib/seo";
import { allPlayers } from "@/lib/playerdb";
import PlayersBrowser from "@/components/PlayersBrowser";

export const metadata = pageMeta({
  title: "MLB Players — search every player",
  description: "Search and filter every MLB player in the dataset by name, team and role. Career stats and an all-time rating for each hitter and pitcher.",
  path: "/players",
  keywords: ["MLB players", "MLB player ratings", "MLB player stats", "baseball players"],
});

export default function PlayersPage() {
  // Only the COUNT is read server-side (a number) — the full list loads
  // client-side from the cached games.json, not serialized into this page.
  const count = allPlayers().length;
  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <header>
        <h1 style={{ fontSize: "2rem", margin: 0, textTransform: "uppercase" }}>Players</h1>
        <p style={{ color: "var(--muted)", marginTop: 6 }}>{count.toLocaleString()} players, ranked and rated from real MLB season stats.</p>
      </header>
      <PlayersBrowser />
    </div>
  );
}
