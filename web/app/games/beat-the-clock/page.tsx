import GameShell from "@/components/games/GameShell";
import BeatTheClock from "@/components/games/BeatTheClock";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  title: "Beat the Clock — name the MLB home run leaders",
  description: "Sixty seconds to name 30 of the season's top home run hitters. Type fast and beat your best.",
  path: "/games/beat-the-clock",
  keywords: ["MLB home run leaders", "MLB timed game", "name the MLB players"],
});

export default function Page() {
  return (
    <GameShell
      slug="beat-the-clock"
      title="Beat the Clock"
      emoji="⏱️"
      intro="The clock starts the moment you do. Name as many of the season's top 30 home run hitters as you can in 60 seconds."
      howTo={[
        "Press start and begin typing player surnames or full names.",
        "A correct, not-yet-named slugger locks in instantly.",
        "Keep going until the 60 seconds run out.",
        "When time's up, see who you missed and beat your best score.",
      ]}
    >
      <BeatTheClock />
    </GameShell>
  );
}
