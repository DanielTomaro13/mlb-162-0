import Link from "next/link";
import { SITE } from "@/lib/seo";

export default function SiteFooter() {
  return (
    <footer
      style={{
        borderTop: "1px solid var(--border)",
        marginTop: "4rem",
        padding: "2rem 0",
        paddingBottom: "calc(2rem + env(safe-area-inset-bottom))",
        color: "var(--muted)",
      }}
    >
      <div className="container-x" style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
        <div style={{ maxWidth: 320 }}>
          <strong style={{ color: "var(--text)" }}>{SITE.name}</strong>
          <p style={{ fontSize: ".85rem", marginTop: 6 }}>{SITE.tagline}</p>
          <p style={{ fontSize: ".78rem", marginTop: 10 }}>
            Part of the 0 Series ·{" "}
            <a href="https://afl23-0.com" style={{ color: "var(--accent)" }}>AFL 23-0</a> ·{" "}
            <a href="https://nrl24-0.com" style={{ color: "var(--accent)" }}>NRL 24-0</a> ·{" "}
            <a href="https://footballinvincibles.com" style={{ color: "var(--accent)" }}>Football Invincibles</a>
          </p>
          <a
            href="https://ko-fi.com/danieltomaro"
            target="_blank"
            rel="noopener"
            className="btn"
            style={{ marginTop: 12, width: "fit-content", borderColor: "#ff5e5b", color: "var(--text)" }}
          >
            ☕ Support on Ko-fi
          </a>
        </div>
        <div style={{ display: "flex", gap: "2.5rem", marginLeft: "auto", flexWrap: "wrap" }}>
          <nav style={{ display: "grid", gap: 6, fontSize: ".85rem" }}>
            <strong style={{ color: "var(--text)" }}>Play</strong>
            <Link href="/play">Perfect Season</Link>
            <Link href="/games">Mini-games</Link>
            <Link href="/perfect">162-0 Tracker</Link>
            <Link href="/leaderboard">Hall of Fame</Link>
          </nav>
          <nav style={{ display: "grid", gap: 6, fontSize: ".85rem" }}>
            <strong style={{ color: "var(--text)" }}>Stats</strong>
            <Link href="/standings">Standings</Link>
            <Link href="/teams">Teams</Link>
            <Link href="/players">Players</Link>
            <Link href="/schedule">Schedule</Link>
            <Link href="/stats">Leaders</Link>
          </nav>
          <nav style={{ display: "grid", gap: 6, fontSize: ".85rem" }}>
            <strong style={{ color: "var(--text)" }}>Site</strong>
            <Link href="/about">How it works</Link>
            <Link href="/contact">Contact</Link>
            <Link href="/privacy">Privacy Policy</Link>
            <Link href="/terms">Terms of Use</Link>
          </nav>
        </div>
      </div>
      <div className="container-x" style={{ marginTop: "1.5rem", fontSize: ".78rem", opacity: 0.7 }}>
        © {new Date().getFullYear()} {SITE.name}. Unofficial. Not affiliated with Major League
        Baseball, the MLBPA or any club. Player ratings derived from real MLB Stats API season
        data for entertainment use.
      </div>
    </footer>
  );
}
