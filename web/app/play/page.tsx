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
  return (
    <>
      {/* Server-rendered heading + intro so the page has a crawlable H1 and copy
          even before the client game hydrates. */}
      <header style={{ marginBottom: "1.25rem" }}>
        <h1 style={{ fontSize: "2rem", margin: 0, textTransform: "uppercase" }}>Perfect Season</h1>
        <p style={{ color: "var(--muted)", marginTop: 6, maxWidth: 640 }}>
          Spin for an MLB franchise and era, draft a legend into every spot in the lineup and
          rotation, and chase a flawless 162–0 season. Six modes — Starting Nine, The Roster,
          Active 18, Salary Cap, The Gauntlet and Cellar Dwellers — with a full-season simulator where
          a flawless 162–0 is reserved for only the very best rosters you can build.
        </p>
      </header>
      <PerfectSeasonGame />
    </>
  );
}
