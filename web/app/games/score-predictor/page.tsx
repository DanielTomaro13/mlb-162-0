import GameShell from "@/components/games/GameShell";
import ScorePredictor from "@/components/games/ScorePredictor";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  title: "Score Predictor — call real MLB results",
  description: "Predict the final score of ten real MLB games. Nail the exact result for big points, get the winner right for a few.",
  path: "/games/score-predictor",
  keywords: ["MLB score predictor", "MLB predictions", "predict MLB results"],
});

export default function Page() {
  return (
    <GameShell
      slug="score-predictor"
      title="Score Predictor"
      emoji="🔮"
      intro="Ten real MLB games, hidden results. Set your predicted final score for each, lock it in and see how sharp your baseball brain is."
      howTo={[
        "Use the steppers to set a predicted score for the home and away team.",
        "Lock in your prediction to reveal the real result.",
        "Exact final score scores 5 points; the right winner scores 2.",
        "Add up your score across all ten games.",
      ]}
    >
      <ScorePredictor />
    </GameShell>
  );
}
