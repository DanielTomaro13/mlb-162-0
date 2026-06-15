import { pageMeta } from "@/lib/seo";
import GameDetail from "@/components/GameDetail";

export const metadata = pageMeta({
  title: "Game — box score & lineups",
  description: "Live MLB box score, line score and lineups.",
  path: "/game",
});

export default function GamePage() {
  return <GameDetail />;
}
