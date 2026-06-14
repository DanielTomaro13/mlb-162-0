import GameShell from "@/components/games/GameShell";
import CareerPath from "@/components/games/CareerPath";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  title: "Career Path — name the MLB player quiz",
  description: "Read the profile — team, position, era and career stats — then pick the right MLB player from four options. Endless rounds, running score.",
  path: "/games/career-path",
  keywords: ["MLB quiz", "name the MLB player", "baseball trivia"],
});

export default function Page() {
  return (
    <GameShell
      slug="career-path"
      title="Career Path"
      emoji="🧭"
      intro="A profile appears — team, position, era and a career stat line. Pick the right MLB player from four options. How long can you keep your run going?"
      howTo={[
        "Read the profile card carefully.",
        "Choose the player you think it describes from the four names.",
        "A correct pick keeps your streak going; a miss ends the round.",
        "Play as many rounds as you like — chase a high score.",
      ]}
    >
      <CareerPath />
    </GameShell>
  );
}
