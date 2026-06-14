import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";
import SisterSites from "@/components/SisterSites";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import JsonLd from "@/components/JsonLd";
import AdUnit from "@/components/AdUnit";
import { AD_CLIENT, AD_SLOTS } from "@/lib/ads";
import { SITE } from "@/lib/seo";

// Cloudflare Web Analytics beacon token (override via env if it ever rotates).
const CF_BEACON = process.env.NEXT_PUBLIC_CF_BEACON || "101d1d9b889a4cba9278715eafa65982";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover", // draw into the notch / dynamic island
  themeColor: "#0a0f1d",
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: "MLB 162-0 — Build the perfect all-time MLB roster",
    template: "%s — MLB 162-0",
  },
  description: SITE.description,
  applicationName: SITE.name,
  keywords: [
    "MLB", "MLB game", "baseball game", "MLB team builder", "all-time MLB roster",
    "162-0", "perfect season", "MLB fantasy", "baseball trivia", "baseball quiz",
    "MLB legends", "World Series", "MLB standings", "MLB stats", "baseball Wordle",
  ],
  authors: [{ name: "Daniel Tomaro" }],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: SITE.url,
    siteName: SITE.name,
    title: "MLB 162-0 — Build the perfect all-time MLB roster",
    description: SITE.description,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "MLB 162-0 — Build the perfect all-time MLB roster",
    description: SITE.description,
    site: SITE.twitter,
  },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large" } },
  appleWebApp: {
    capable: true,
    title: "MLB 162-0",
    statusBarStyle: "black-translucent",
  },
  manifest: "/manifest.webmanifest",
  // AdSense site verification — emits <meta name="google-adsense-account"> into
  // the static <head>, which the AdSense crawler checks for.
  other: { "google-adsense-account": AD_CLIENT },
};

const orgLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SITE.name,
  url: SITE.url,
  description: SITE.description,
  inLanguage: "en-US",
  potentialAction: {
    "@type": "SearchAction",
    target: `${SITE.url}/players?q={search_term_string}`,
    "query-input": "required name=search_term_string",
  },
};
const appLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: SITE.name,
  url: SITE.url,
  applicationCategory: "GameApplication",
  operatingSystem: "Web",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  inLanguage: "en-US",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-US">
      <body>
        {/* Resource hints — warm up the ad + analytics origins so the first ad
            and beacon resolve faster (better LCP/ad fill, no layout impact). */}
        <link rel="preconnect" href="https://pagead2.googlesyndication.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://googleads.g.doubleclick.net" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://pagead2.googlesyndication.com" />
        <link rel="dns-prefetch" href="https://tpc.googlesyndication.com" />
        <SisterSites active="mlb" />
        <SiteHeader />
        <main className="container-x" style={{ paddingTop: "1.5rem", minHeight: "60vh" }}>
          {children}
        </main>
        <div className="container-x">
          <AdUnit slot={AD_SLOTS.inline} />
        </div>
        <SiteFooter />
        <JsonLd data={orgLd} />
        <JsonLd data={appLd} />
        {/* Google AdSense loader — a raw <script> so React 19 hoists it into the
            static <head> exactly as AdSense's snippet/crawler expects (the
            afterInteractive variant was injected post-hydration and missed by the
            verification crawler). Enables Auto Ads + the manual units above. */}
        <script
          async
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${AD_CLIENT}`}
          crossOrigin="anonymous"
        />
        {/* Cloudflare Web Analytics — privacy-friendly, no cookies. Only emitted
            once a real beacon token is provided via NEXT_PUBLIC_CF_BEACON, so we
            never ship a placeholder token that fires bogus requests. */}
        {CF_BEACON && (
          <Script
            defer
            src="https://static.cloudflareinsights.com/beacon.min.js"
            strategy="afterInteractive"
            data-cf-beacon={`{"token": "${CF_BEACON}"}`}
          />
        )}
      </body>
    </html>
  );
}
