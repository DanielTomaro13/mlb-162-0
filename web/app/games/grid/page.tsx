import GameShell from "@/components/games/GameShell";
import GridGame from "@/components/games/GridGame";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  title: "Grid — the daily MLB Immaculate Grid",
  description:
    "Fill a 3×3 baseball grid: name a player who fits both the row and the column. A new grid of teams and milestone seasons every day, the same for everyone.",
  path: "/games/grid",
  keywords: [
    "MLB Immaculate Grid",
    "baseball grid game",
    "daily MLB game",
    "MLB trivia grid",
    "baseball player grid",
  ],
});

export default function Page() {
  return (
    <GameShell
      slug="grid"
      title="Grid"
      emoji="⬜"
      intro="Fill the 3×3 grid by naming a player who matches both the row and the column — a franchise, a milestone season, or a bit of both. One new grid a day, the same for everyone. Can you go nine-for-nine?"
      howTo={[
        "Each square sits where a row category crosses a column category — a team or a single-season milestone (like a 40+ HR or sub-3.00 ERA season).",
        "Tap a square, then name a player who satisfies BOTH of its categories. Two teams means they played for both franchises.",
        "You get one guess per square, and each player can be used only once across the whole grid — choose carefully.",
        "Score is how many of the nine you fill. Nail all nine for an immaculate grid, then come back tomorrow to keep your streak alive.",
      ]}
    >
      <GridGame />
    </GameShell>
  );
}
