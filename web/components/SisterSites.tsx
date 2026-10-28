/**
 * Cross-site strip linking the sister projects (the "0 Series"). The same bar
 * lives at the top of every sibling site so they all point at one another.
 * MarketMover sits at the end as a cross-promo, with its mark.
 */
const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const SITES = [
  { key: "afl", label: "AFL 23-0", href: "https://afl23-0.com" },
  { key: "nrl", label: "NRL 24-0", href: "https://nrl24-0.com" },
  { key: "mlb", label: "MLB 162-0", href: "https://mlb162-0.com" },
  { key: "nba", label: "NBA 82-0", href: "https://nba82-0.com" },
  { key: "nbl", label: "NBL 33-0", href: "https://nbl33-0.com" },
  { key: "f1", label: "F1 Slam", href: "https://f1slam.com" },
  { key: "football", label: "Football Invincibles", href: "https://footballinvincibles.com" },
  { key: "tennis", label: "Tennis Slam", href: "https://grandtennisslam.com" },
];

const MARKETMOVER = {
  label: "MarketMover",
  href: "https://www.marketmover.net?utm_source=mlb162-0&utm_medium=sister_bar&utm_campaign=crosspromo",
  logo: `${BASE}/marketmover-mark.png`,
};

type SiteKey = "afl" | "nrl" | "mlb" | "nba" | "f1" | "football";

export default function SisterSites({ active }: { active: SiteKey }) {
  return (
    <div className="sister-bar" role="navigation" aria-label="Sister sites">
      <span style={{ color: "var(--muted)", marginRight: 2, fontWeight: 700, fontSize: ".7rem" }}>
        THE 0 SERIES ·
      </span>
      {SITES.map((s) =>
        s.key === active ? (
          <span key={s.key} className="sister-link" data-active="true" aria-current="page">{s.label}</span>
        ) : (
          <a key={s.key} className="sister-link" href={s.href}>{s.label}</a>
        )
      )}
      <span className="sister-sep" aria-hidden="true" />
      <a className="sister-link sister-mm" href={MARKETMOVER.href}>
        <img src={MARKETMOVER.logo} alt="" width={14} height={14} />
        {MARKETMOVER.label}
      </a>
    </div>
  );
}
