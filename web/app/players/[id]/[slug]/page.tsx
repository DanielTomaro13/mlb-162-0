import { notFound } from "next/navigation";
import Link from "next/link";
import { pageMeta, breadcrumbJsonLd, SITE } from "@/lib/seo";
import { notablePlayers, playerById } from "@/lib/playerdb";
import { teamColors } from "@/lib/teams";
import { avg3 } from "@/lib/format";
import JsonLd from "@/components/JsonLd";

export const dynamicParams = false;

export function generateStaticParams() {
  return notablePlayers().map((p) => ({ id: String(p.id), slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string; slug: string }> }) {
  const { id } = await params;
  const p = playerById(id);
  if (!p) return {};
  const line = p.kind === "bat"
    ? `${p.hr} HR, ${p.rbi} RBI, ${avg3(p.ops)} OPS`
    : `${p.w} wins, ${p.so} K, ${p.eraAvg.toFixed(2)} ERA`;
  return pageMeta({
    title: `${p.name} — MLB profile, stats & rating`,
    description: `${p.name}: ${p.posName} for ${p.team}. ${line} across ${p.firstYear}–${p.lastYear}. All-time MLB 162-0 rating ${p.rating}.`,
    path: `/players/${p.id}/${p.slug}`,
    keywords: [p.name, "MLB", p.team, p.posName, "stats", "rating"],
  });
}

export default async function PlayerPage({ params }: { params: Promise<{ id: string; slug: string }> }) {
  const { id } = await params;
  const p = playerById(id);
  if (!p) notFound();
  const [c1, c2] = teamColors(p.team);
  const isBat = p.kind === "bat";

  const personLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: p.name,
    jobTitle: `${p.posName} (baseball)`,
    affiliation: { "@type": "SportsTeam", name: p.team },
    url: `${SITE.url}/players/${p.id}/${p.slug}`,
  };
  const stat = (label: string, value: string | number) => (
    <div style={{ padding: ".7rem .9rem", background: "var(--panel-2)", borderRadius: 10, textAlign: "center" }}>
      <div style={{ fontFamily: "var(--font-cond)", fontSize: "1.5rem" }}>{value}</div>
      <div style={{ fontSize: ".66rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".05em" }}>{label}</div>
    </div>
  );

  return (
    <div style={{ display: "grid", gap: "1.25rem" }}>
      <JsonLd data={personLd} />
      <JsonLd data={breadcrumbJsonLd([{ name: "Players", path: "/players" }, { name: p.name, path: `/players/${p.id}/${p.slug}` }])} />
      <nav style={{ fontSize: ".82rem" }}><Link href="/players" style={{ color: "var(--accent)" }}>← All players</Link></nav>
      <header className="card" style={{ padding: "1.25rem", borderTop: `3px solid ${c1}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: "2rem" }}>{p.name}</h1>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 6, color: "var(--muted)" }}>
              <span style={{ width: 12, height: 12, borderRadius: 3, background: c1, border: `1px solid ${c2}` }} />
              {p.team} · {p.posName}
            </div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontFamily: "var(--font-cond)", fontSize: "3rem", lineHeight: 1, color: p.rating >= 90 ? "var(--gold)" : "var(--text)" }}>{p.rating}</div>
            <div style={{ fontSize: ".66rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".06em" }}>162-0 rating</div>
          </div>
        </div>
      </header>
      <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fill,minmax(110px,1fr))" }}>
        {isBat ? (
          <>
            {stat("Home Runs", p.hr)}
            {stat("RBI", p.rbi)}
            {stat("Hits", p.hits)}
            {stat("Runs", p.runs)}
            {stat("Stolen Bases", p.sb)}
            {stat("Doubles", p.db)}
            {stat("Walks", p.bb)}
            {stat("Strikeouts", p.soBat)}
            {stat("OPS", avg3(p.ops))}
          </>
        ) : (
          <>
            {stat("Wins", p.w)}
            {stat("Losses", p.l)}
            {stat("Strikeouts", p.so)}
            {stat("Saves", p.sv)}
            {stat("Innings", p.ip)}
            {stat("Walks", p.bbPit)}
            {stat("ERA", p.eraAvg.toFixed(2))}
            {stat("Seasons", p.seasons)}
          </>
        )}
        {stat("Era", `${p.firstYear}–${p.lastYear}`)}
      </div>
      <p style={{ color: "var(--muted)", fontSize: ".88rem", lineHeight: 1.6 }}>
        {p.name} is rated <strong style={{ color: "var(--text)" }}>{p.rating}</strong> in MLB 162-0 — a number built from real
        MLB Stats API season data between {p.firstYear} and {p.lastYear}. {" "}
        <Link href="/play" style={{ color: "var(--accent)" }}>Draft {p.name.split(" ")[0]} into your perfect roster →</Link>
      </p>
    </div>
  );
}
