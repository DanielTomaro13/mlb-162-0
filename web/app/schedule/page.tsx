import { pageMeta } from "@/lib/seo";
import { serverMeta } from "@/lib/serverdata";
import ScheduleView from "@/components/ScheduleView";

export function generateMetadata() {
  const m = serverMeta();
  return pageMeta({
    title: `MLB Schedule & Scores — ${m.liveSeason}`,
    description: `The ${m.liveSeason} MLB schedule and recent final scores, filterable by team. Updated daily from the official MLB Stats API.`,
    path: "/schedule",
    keywords: ["MLB schedule", "MLB scores", "baseball results", "MLB games today"],
  });
}

export default function SchedulePage() {
  const m = serverMeta();
  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <header>
        <h1 style={{ fontSize: "2rem", margin: 0, textTransform: "uppercase" }}>Schedule &amp; Scores</h1>
        <p style={{ color: "var(--muted)", marginTop: 6 }}>The {m.liveSeason} slate and recent final scores, updated daily.</p>
      </header>
      <ScheduleView />
    </div>
  );
}
