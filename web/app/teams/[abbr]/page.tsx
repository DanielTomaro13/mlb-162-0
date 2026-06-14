import { notFound } from "next/navigation";
import Link from "next/link";
import { pageMeta, breadcrumbJsonLd, SITE } from "@/lib/seo";
import { serverResults } from "@/lib/serverdata";
import { allPlayers, type ProfilePlayer } from "@/lib/playerdb";
import { teamColors, teamAbbr, leagueName, leagueShort } from "@/lib/teams";
import { avg3 } from "@/lib/format";
import type { LadderRow } from "@/lib/data";
import JsonLd from "@/components/JsonLd";

export const dynamicParams = false;

/** Resolve every franchise from the live-season ladder, keyed by lowercased abbr. */
function franchises(): { abbr: string; row: LadderRow; rows: LadderRow[] }[] {
  const r = serverResults();
  const rows = r.laddersBySeason[r.liveSeason] ?? [];
  return rows.map((row) => ({
    abbr: teamAbbr(row.team).toLowerCase(),
    row,
    rows,
  }));
}

function findTeam(abbr: string): { row: LadderRow; rows: LadderRow[] } | null {
  const target = abbr.toLowerCase();
  const hit = franchises().find((f) => f.abbr === target);
  return hit ? { row: hit.row, rows: hit.rows } : null;
}

export function generateStaticParams() {
  return franchises().map((f) => ({ abbr: f.abbr }));
}

function pct3(n: number): string {
  return n.toFixed(3).replace(/^0/, "");
}

function divisionRank(row: LadderRow, rows: LadderRow[]): { rank: number; size: number } {
  const inDiv = rows
    .filter((r) => r.division === row.division)
    .sort((a, b) => b.pct - a.pct);
  const size = inDiv.length;
  const rank = inDiv.findIndex((r) => r.team === row.team) + 1;
  return { rank: rank || size, size };
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
}

/** Players whose career franchise maps to this team's abbreviation. */
function teamPlayers(fullName: string): ProfilePlayer[] {
  const abbr = teamAbbr(fullName);
  return allPlayers().filter((p) => teamAbbr(p.team) === abbr);
}

export async function generateMetadata({ params }: { params: Promise<{ abbr: string }> }) {
  const { abbr } = await params;
  const found = findTeam(abbr);
  if (!found) return {};
  const { row, rows } = found;
  const { rank } = divisionRank(row, rows);
  return pageMeta({
    title: `${row.team} — roster, record & stat leaders`,
    description: `${row.team}: ${row.w}-${row.l} (${pct3(row.pct)}), ${ordinal(rank)} in the ${row.division}. Run differential ${row.pd >= 0 ? "+" : ""}${row.pd}. All-time stat leaders, top-rated players and the legends to draft for a perfect 162-0 season.`,
    path: `/teams/${abbr.toLowerCase()}`,
    keywords: [
      row.team,
      teamAbbr(row.team),
      "MLB",
      "roster",
      "record",
      "stat leaders",
      `${leagueShort(row.league)} ${(row.division ?? "").split(/\s+/).pop() ?? ""}`.trim(),
    ],
  });
}

export default async function TeamPage({ params }: { params: Promise<{ abbr: string }> }) {
  const { abbr } = await params;
  const found = findTeam(abbr);
  if (!found) notFound();
  const { row, rows } = found;
  const slug = abbr.toLowerCase();
  const [c1, c2] = teamColors(row.team);
  const { rank, size } = divisionRank(row, rows);
  const divName = (row.division ?? "").split(/\s+/).pop() ?? "";

  const players = teamPlayers(row.team);
  const hitters = players.filter((p) => p.kind === "bat");
  const pitchers = players.filter((p) => p.kind === "pit");
  const top = [...players].sort((a, b) => b.rating - a.rating).slice(0, 12);

  // Hitter leader boards
  const hrLeaders = [...hitters].sort((a, b) => b.hr - a.hr).slice(0, 5);
  const rbiLeaders = [...hitters].sort((a, b) => b.rbi - a.rbi).slice(0, 5);
  const hitsLeaders = [...hitters].sort((a, b) => b.hits - a.hits).slice(0, 5);
  const sbLeaders = [...hitters].sort((a, b) => b.sb - a.sb).slice(0, 5);
  const opsLeaders = [...hitters].sort((a, b) => b.ops - a.ops).slice(0, 5);

  // Pitcher leader boards
  const soLeaders = [...pitchers].sort((a, b) => b.so - a.so).slice(0, 5);
  const winLeaders = [...pitchers].sort((a, b) => b.w - a.w).slice(0, 5);
  const svLeaders = [...pitchers].sort((a, b) => b.sv - a.sv).slice(0, 5);
  const eraLeaders = [...pitchers]
    .filter((p) => p.ip >= 200)
    .sort((a, b) => a.eraAvg - b.eraAvg)
    .slice(0, 5);

  // Franchise snapshot
  const topRated = top[0] ?? null;

  const sportsTeamLd = {
    "@context": "https://schema.org",
    "@type": "SportsTeam",
    name: row.team,
    sport: "Baseball",
    memberOf: { "@type": "SportsOrganization", name: leagueName(row.league) },
    url: `${SITE.url}/teams/${slug}`,
  };

  const stat = (label: string, value: string | number) => (
    <div style={{ padding: ".7rem .9rem", background: "var(--panel-2)", borderRadius: 10, textAlign: "center" }}>
      <div style={{ fontFamily: "var(--font-cond)", fontSize: "1.5rem" }}>{value}</div>
      <div style={{ fontSize: ".66rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".05em" }}>{label}</div>
    </div>
  );

  const playerLine = (p: ProfilePlayer): string =>
    p.kind === "bat"
      ? `${p.hr} HR · ${avg3(p.ops)} OPS`
      : `${p.w} W · ${p.eraAvg.toFixed(2)} ERA`;

  return (
    <div style={{ display: "grid", gap: "1.25rem" }}>
      <JsonLd data={sportsTeamLd} />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Teams", path: "/teams" },
          { name: row.team, path: `/teams/${slug}` },
        ])}
      />
      <nav style={{ fontSize: ".82rem" }}>
        <Link href="/teams" style={{ color: "var(--accent)" }}>← All teams</Link>
      </nav>

      <header className="card" style={{ padding: "1.25rem", borderTop: `3px solid ${c1}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: "2rem" }}>{row.team}</h1>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 6, color: "var(--muted)" }}>
              <span style={{ width: 12, height: 12, borderRadius: 3, background: c1, border: `1px solid ${c2}` }} />
              {leagueName(row.league)} · {leagueShort(row.league)} {divName}
            </div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontFamily: "var(--font-cond)", fontSize: "2.4rem", lineHeight: 1 }}>
              {row.w}-{row.l}
            </div>
            <div style={{ fontSize: ".66rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".06em" }}>
              {pct3(row.pct)} · {ordinal(rank)} of {size}
            </div>
          </div>
        </div>
        <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fill,minmax(110px,1fr))", marginTop: "1.1rem" }}>
          {stat("Wins", row.w)}
          {stat("Losses", row.l)}
          {stat("Win %", pct3(row.pct))}
          {stat("Run Diff", `${row.pd >= 0 ? "+" : ""}${row.pd}`)}
          {stat("Streak", row.streak ?? "—")}
          {stat("Div Rank", `${ordinal(rank)}`)}
        </div>
      </header>

      <section style={{ display: "grid", gap: 12 }}>
        <h2 style={{ margin: 0, fontSize: "1.25rem", textTransform: "uppercase", letterSpacing: ".03em" }}>Top players</h2>
        {top.length === 0 ? (
          <p style={{ color: "var(--muted)" }}>No rated players found for this franchise yet.</p>
        ) : (
          <div className="grid-cards">
            {top.map((p) => (
              <Link key={p.id} href={`/players/${p.id}/${p.slug}`} className="card" style={{ padding: "1rem", display: "grid", gap: 4 }}>
                <span style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <strong style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</strong>
                  <span style={{ fontFamily: "var(--font-cond)", fontSize: "1.3rem", color: p.rating >= 90 ? "var(--gold)" : "var(--text)" }}>{p.rating}</span>
                </span>
                <span style={{ fontSize: ".78rem", color: "var(--muted)" }}>{p.posName}</span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: ".7rem", color: "var(--muted)" }}>{playerLine(p)}</span>
              </Link>
            ))}
          </div>
        )}
      </section>

      {players.length > 0 && (
        <section style={{ display: "grid", gap: 12 }}>
          <h2 style={{ margin: 0, fontSize: "1.25rem", textTransform: "uppercase", letterSpacing: ".03em" }}>Franchise snapshot</h2>
          <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))" }}>
            {stat("Rated Players", players.length)}
            {stat("Hitters", hitters.length)}
            {stat("Pitchers", pitchers.length)}
            {stat("Highest Rated", topRated ? `${topRated.rating}` : "—")}
          </div>
          {topRated && (
            <p style={{ margin: 0, color: "var(--muted)", fontSize: ".85rem" }}>
              Top-rated all-time:{" "}
              <Link href={`/players/${topRated.id}/${topRated.slug}`} style={{ color: "var(--accent)" }}>
                {topRated.name}
              </Link>{" "}
              ({topRated.posName}, {topRated.rating}).
            </p>
          )}
        </section>
      )}

      {hitters.length > 0 && (
        <section style={{ display: "grid", gap: 12 }}>
          <h2 style={{ margin: 0, fontSize: "1.25rem", textTransform: "uppercase", letterSpacing: ".03em" }}>Hitting leaders</h2>
          <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))" }}>
            <Board title="Home runs" rows={hrLeaders} value={(p) => String(p.hr)} unit="HR" />
            <Board title="RBI" rows={rbiLeaders} value={(p) => String(p.rbi)} unit="RBI" />
            <Board title="Hits" rows={hitsLeaders} value={(p) => String(p.hits)} unit="H" />
            <Board title="Stolen bases" rows={sbLeaders} value={(p) => String(p.sb)} unit="SB" />
            <Board title="OPS" rows={opsLeaders} value={(p) => avg3(p.ops)} unit="OPS" />
          </div>
        </section>
      )}

      {pitchers.length > 0 && (
        <section style={{ display: "grid", gap: 12 }}>
          <h2 style={{ margin: 0, fontSize: "1.25rem", textTransform: "uppercase", letterSpacing: ".03em" }}>Pitching leaders</h2>
          <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))" }}>
            <Board title="Wins" rows={winLeaders} value={(p) => String(p.w)} unit="W" />
            <Board title="Strikeouts" rows={soLeaders} value={(p) => String(p.so)} unit="K" />
            <Board title="Saves" rows={svLeaders} value={(p) => String(p.sv)} unit="SV" />
            {eraLeaders.length > 0 && (
              <Board title="ERA (200+ IP)" rows={eraLeaders} value={(p) => p.eraAvg.toFixed(2)} unit="ERA" />
            )}
          </div>
        </section>
      )}

      <section className="card" style={{ padding: "1.25rem" }}>
        <p style={{ color: "var(--muted)", fontSize: ".9rem", lineHeight: 1.7, margin: 0 }}>
          The {row.team} sit {ordinal(rank)} of {size} in the {row.division} at {row.w}-{row.l}
          {" "}({pct3(row.pct)}) with a {row.pd >= 0 ? "+" : ""}{row.pd} run differential. Track the chase on the
          {" "}<Link href="/standings" style={{ color: "var(--accent)" }}>full standings</Link>, see who they play next on the
          {" "}<Link href="/schedule" style={{ color: "var(--accent)" }}>schedule</Link>, then head to the
          {" "}<Link href="/play" style={{ color: "var(--accent)" }}>draft</Link> to build a flawless 162-0 roster.
        </p>
        <p style={{ marginTop: "1rem", marginBottom: 0 }}>
          <Link
            href="/play"
            className="chip"
            style={{ borderColor: "var(--accent)", color: "var(--text)", textDecoration: "none" }}
          >
            Draft a {row.team.split(/\s+/).pop()} legend →
          </Link>
        </p>
      </section>
    </div>
  );
}

function Board({
  title,
  rows,
  value,
  unit,
}: {
  title: string;
  rows: ProfilePlayer[];
  value: (p: ProfilePlayer) => string;
  unit: string;
}) {
  return (
    <div className="card" style={{ padding: "1rem", display: "grid", gap: 8 }}>
      <div style={{ fontFamily: "var(--font-cond)", fontSize: ".82rem", textTransform: "uppercase", letterSpacing: ".06em", color: "var(--gold)" }}>
        {title}
      </div>
      <ol style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 6 }}>
        {rows.map((p, i) => (
          <li key={p.id} style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: ".85rem" }}>
            <span style={{ width: 16, color: "var(--muted)", fontFamily: "var(--font-mono)", fontSize: ".72rem" }}>{i + 1}</span>
            <Link href={`/players/${p.id}/${p.slug}`} style={{ flex: 1, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {p.name}
            </Link>
            <span style={{ fontFamily: "var(--font-cond)", color: "var(--text)" }}>{value(p)}</span>
            <span style={{ color: "var(--muted)", fontSize: ".7rem" }}>{unit}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
