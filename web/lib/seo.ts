import type { Metadata } from "next";

export const SITE = {
  name: "MLB 162-0",
  domain: "mlb162-0.com",
  url:
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    "https://mlb162-0.com",
  tagline:
    "Build an all-time MLB roster and chase a perfect 162-0 season — plus baseball mini-games, standings and stat leaders.",
  description:
    "Spin for an MLB franchise and era, draft a legend into every spot in the lineup and rotation, and chase a flawless 162-0 season. Plus a vault of baseball mini-games — Diamond Wordle, Higher or Lower, Guess the Player, Career Path, Beat the Clock and Score Predictor — with live standings, schedules, stat leaders and player profiles. Player ratings built from real MLB season data.",
  twitter: "@mlb1620",
};

/** Build page metadata with sensible SEO defaults + Open Graph/Twitter cards. */
export function pageMeta(opts: {
  title: string;
  description?: string;
  path?: string;
  keywords?: string[];
  image?: string;
}): Metadata {
  const url = SITE.url + (opts.path ?? "");
  const description = opts.description ?? SITE.description;
  const title = opts.title;
  return {
    title,
    description,
    keywords: opts.keywords,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: SITE.name,
      type: "website",
      images: opts.image ? [{ url: opts.image }] : undefined,
      locale: "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      site: SITE.twitter,
    },
  };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: SITE.url + it.path,
    })),
  };
}
