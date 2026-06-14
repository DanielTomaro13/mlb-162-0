import GameShell from "@/components/games/GameShell";
import InvinciblesGame from "@/components/games/InvinciblesGame";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  title: "Invincibles — draft a roster and simulate a season",
  description: "Spin franchises and seasons, draft a lineup and rotation, and simulate a full 162-game MLB season thousands of times. Can you go 162-0?",
  path: "/games/invincibles",
  keywords: ["MLB roster builder", "MLB season simulator", "invincibles baseball", "162-0 game"],
});

export default function Page() {
  return (
    <GameShell
      slug="invincibles"
      title="Invincibles"
      emoji="🏆"
      intro="Draft a roster from across MLB history, then simulate a full 162-game season thousands of times. See your win distribution, your odds of going 162–0 and how you stack up against real pennant winners."
      howTo={[
        "Spin for a random franchise and season, then draft a player into each spot.",
        "Fill the lineup and rotation to complete your roster.",
        "Hit simulate to run thousands of 162-game seasons.",
        "Only a near-perfect roster has a ~5% shot at 162–0 — post it to the Hall of Fame.",
      ]}
    >
      <InvinciblesGame />
    </GameShell>
  );
}
