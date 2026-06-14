import GameShell from "@/components/games/GameShell";
import Diamond from "@/components/games/Diamond";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  title: "Diamond — the daily MLB player Wordle",
  description: "Guess the mystery MLB player in eight tries. A new player every day, the same for everyone. Clues on team, position, era and career stats.",
  path: "/games/diamond",
  keywords: ["Diamond", "MLB Wordle", "baseball Wordle", "MLB player guessing game", "daily MLB game"],
});

export default function Page() {
  return (
    <GameShell
      slug="diamond"
      title="Diamond"
      emoji="🟩"
      intro="Guess today's mystery MLB player in eight tries. Each guess reveals how close you are on team, position, era and career stats. One new player a day — the same for everyone."
      howTo={[
        "Type any MLB player's name and submit a guess.",
        "A green cell means an exact match; amber means close (era ±2 years, stat within range) with ▲/▼ pointing you toward the answer.",
        "Use the clues to narrow it down within eight guesses.",
        "Come back tomorrow for a new player and keep your streak alive.",
      ]}
    >
      <Diamond />
    </GameShell>
  );
}
