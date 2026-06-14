import { pageMeta } from "@/lib/seo";
import PerfectSeasonGame from "@/components/PerfectSeasonGame";

export const metadata = pageMeta({
  title: "Play Perfect Season — draft an all-time MLB roster",
  description:
    "Spin for an MLB franchise and era, draft a legend into every spot in the lineup and rotation, and chase a flawless 162-0 season. Six modes: Starting Nine, The Roster, Active 18, Salary Cap, The Gauntlet and Cellar Dwellers.",
  path: "/play",
  keywords: ["MLB draft game", "perfect season", "MLB roster builder", "162-0 game"],
});

export default function PlayPage() {
  return <PerfectSeasonGame />;
}
