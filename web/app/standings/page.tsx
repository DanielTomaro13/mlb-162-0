import { pageMeta } from "@/lib/seo";
import { serverMeta } from "@/lib/serverdata";
import StandingsView from "@/components/StandingsView";

export function generateMetadata() {
  const m = serverMeta();
  return pageMeta({
    title: `MLB Standings — ${m.liveSeason} divisions`,
    description: `Live ${m.liveSeason} MLB standings by division, plus every season back to ${m.seasons[m.seasons.length - 1]}. Wins, losses, winning percentage, games back and run differential from the official MLB Stats API.`,
    path: "/standings",
    keywords: ["MLB standings", "MLB division standings", "AL East", "NL West", "baseball standings"],
  });
}

export default function StandingsPage() {
  const m = serverMeta();
  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <header>
        <h1 style={{ fontSize: "2rem", margin: 0, textTransform: "uppercase" }}>MLB Standings</h1>
        <p style={{ color: "var(--muted)", marginTop: 6 }}>
          Division standings for every season {m.seasons[m.seasons.length - 1]}–{m.liveSeason}, straight from the MLB Stats API.
        </p>
      </header>
      <StandingsView />
    </div>
  );
}
