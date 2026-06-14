import Link from "next/link";
import { pageMeta } from "@/lib/seo";
import { GAMES } from "@/lib/gamelist";
import JsonLd from "@/components/JsonLd";
import { SITE } from "@/lib/seo";

export const metadata = pageMeta({
  title: "MLB Mini-Games — Diamond, Higher or Lower, Guess the Player & more",
  description: "A vault of free baseball mini-games built on real MLB stats: Diamond (the baseball Wordle), the Immaculate Grid, Higher or Lower, Guess the Player, Career Path, Beat the Clock and Score Predictor. Plus the all-time Perfect Season roster builder.",
  path: "/games",
  keywords: ["MLB games", "baseball games", "baseball Wordle", "MLB quiz", "MLB trivia"],
});

const ld = {
  "@context": "https://schema.org",
  "@type": "ItemList",
  itemListElement: GAMES.map((g, i) => ({
    "@type": "ListItem", position: i + 1, name: g.title, url: `${SITE.url}/games/${g.slug}`,
  })),
};

export default function GamesHub() {
  return (
    <div style={{ display: "grid", gap: "1.5rem" }}>
      <JsonLd data={ld} />
      <header>
        <h1 style={{ fontSize: "2.2rem", margin: 0, textTransform: "uppercase" }}>The games</h1>
        <p style={{ color: "var(--muted)", maxWidth: 620, marginTop: 6 }}>
          Free baseball mini-games, all built on real MLB Stats API data. Daily puzzles,
          endless streaks and the roster-builder simulator.
        </p>
      </header>

      {/* The flagship draft-and-simulate game (Perfect Season) lives at /play. */}
      <Link href="/play" className="card" style={{ padding: "1.25rem", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", border: "1.5px solid var(--accent)", background: "linear-gradient(135deg, rgba(228,50,43,0.12), rgba(55,194,129,0.08))" }}>
        <span style={{ fontSize: "2.2rem", lineHeight: 1 }} aria-hidden>⚾</span>
        <span style={{ display: "grid", gap: 4, flex: 1, minWidth: 220 }}>
          <strong style={{ fontFamily: "var(--font-cond)", fontSize: "1.4rem", textTransform: "uppercase" }}>Perfect Season — the roster builder</strong>
          <span style={{ fontSize: ".88rem", color: "var(--muted)" }}>Spin a franchise &amp; era, draft your all-time team onto the diamond, and simulate a full 162-game season. Six modes plus a shared Daily Challenge.</span>
        </span>
        <span className="chip" style={{ color: "var(--accent-2)", whiteSpace: "nowrap" }}>Play now →</span>
      </Link>

      <div className="grid-cards">
        {GAMES.map((g) => (
          <Link key={g.slug} href={`/games/${g.slug}`} className="card" style={{ padding: "1.1rem", display: "grid", gap: 6 }}>
            <span style={{ fontSize: "1.8rem" }}>{g.emoji}</span>
            <strong style={{ fontFamily: "var(--font-cond)", fontSize: "1.2rem", textTransform: "uppercase" }}>{g.title}</strong>
            <span style={{ fontSize: ".85rem", color: "var(--muted)" }}>{g.blurb}</span>
            <span className="chip" style={{ width: "fit-content", fontSize: ".64rem" }}>{g.tag}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
