import { pageMeta, SITE } from "@/lib/seo";
import { serverResults } from "@/lib/serverdata";
import { teamAbbr } from "@/lib/teams";
import JsonLd from "@/components/JsonLd";
import TeamsHub, { type TeamCard } from "@/components/TeamsHub";

export const metadata = pageMeta({
  title: "MLB Teams — all 30 franchises, records & rosters",
  description:
    "Every MLB franchise in one place: live records, division standings, all-time stat leaders and the legends who define each team. Browse all 30 clubs across the American and National League.",
  path: "/teams",
  keywords: [
    "MLB teams",
    "MLB franchises",
    "all 30 MLB teams",
    "MLB rosters",
    "baseball teams",
    "MLB team records",
  ],
});

function divShort(division: string | undefined): string {
  if (!division) return "";
  const last = division.trim().split(/\s+/).pop() ?? "";
  return last;
}

/** Build the 30 franchise cards from the live-season ladder rows. */
function teamCards(): TeamCard[] {
  const r = serverResults();
  const rows = r.laddersBySeason[r.liveSeason] ?? [];
  return rows
    .map((row): TeamCard => ({
      abbr: teamAbbr(row.team).toLowerCase(),
      fullName: row.team,
      league: row.league ?? 0,
      division: row.division ?? "",
      divShort: divShort(row.division),
      w: row.w,
      l: row.l,
      pct: row.pct,
    }))
    .sort((a, b) => a.fullName.localeCompare(b.fullName));
}

export default function TeamsPage() {
  const teams = teamCards();

  const itemListLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "MLB Teams",
    numberOfItems: teams.length,
    itemListElement: teams.map((t, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: t.fullName,
      url: `${SITE.url}/teams/${t.abbr}`,
    })),
  };

  return (
    <div style={{ display: "grid", gap: "1.25rem" }}>
      <JsonLd data={itemListLd} />
      <header>
        <h1 style={{ fontSize: "2rem", margin: 0, textTransform: "uppercase" }}>MLB Teams</h1>
        <p style={{ color: "var(--muted)", marginTop: 6, maxWidth: 640, lineHeight: 1.6 }}>
          All {teams.length} MLB franchises, grouped by league and division. Tap a club for its live
          record, division rank, all-time stat leaders and the legends you can draft into a perfect
          162-0 roster.
        </p>
      </header>
      <TeamsHub teams={teams} />
    </div>
  );
}
