import Link from "next/link";
import { pageMeta, SITE } from "@/lib/seo";

export const metadata = pageMeta({
  title: "Terms of Use",
  description: "The terms governing your use of MLB 162-0 — an independent, unofficial baseball stats and games website for entertainment.",
  path: "/terms",
  keywords: ["terms of use", "MLB 162-0 terms", "terms and conditions"],
});

const UPDATED = "June 15, 2026";

export default function TermsPage() {
  return (
    <article style={{ display: "grid", gap: "1.25rem", maxWidth: 760, lineHeight: 1.7 }}>
      <header>
        <h1 style={{ fontSize: "2rem", margin: 0, textTransform: "uppercase" }}>Terms of Use</h1>
        <p style={{ color: "var(--muted)", marginTop: 6 }}>Last updated {UPDATED}</p>
      </header>

      <p style={{ color: "var(--muted)" }}>
        By accessing <strong style={{ color: "var(--text)" }}>{SITE.name}</strong>{" "}
        (<a href={SITE.url} style={{ color: "var(--accent)" }}>{SITE.domain}</a>) you agree to these
        terms. If you don&apos;t agree, please don&apos;t use the Site.
      </p>

      <Section title="The Site is unofficial">
        <p>
          {SITE.name} is an independent project. It is <strong>not affiliated with, endorsed by, or
          sponsored by</strong> Major League Baseball, the MLB Players Association, or any club,
          player or league body. Team names, logos and player names are the property of their
          respective owners and are used here for identification and editorial purposes only.
        </p>
      </Section>

      <Section title="For entertainment and information only">
        <p>
          All content — ratings, simulations, the 162-0 chase and the games — is provided for
          entertainment and general information. Player ratings are our own model built from public
          season data and are opinions, not official figures. Nothing here is betting, financial or
          professional advice.
        </p>
      </Section>

      <Section title="Data accuracy">
        <p>
          Statistics are derived from real MLB data and refreshed periodically. We strive
          for accuracy but make no warranty that data is complete, current or error-free. Spotted a
          mistake? Tell us via the{" "}
          <Link href="/contact" style={{ color: "var(--accent)" }}>Contact page</Link>.
        </p>
      </Section>

      <Section title="Acceptable use">
        <p>
          You agree not to misuse the Site — including attempting to disrupt it, scrape it at scale,
          submit abuse to leaderboards, or use it for any unlawful purpose. We may remove leaderboard
          entries that are offensive or impersonate others.
        </p>
      </Section>

      <Section title="Intellectual property">
        <p>
          The original design, code, written content and ratings model of {SITE.name} are ours.
          You may link to the Site freely. Please don&apos;t republish substantial portions without
          permission.
        </p>
      </Section>

      <Section title="Third-party links and ads">
        <p>
          The Site contains advertising (via Google AdSense) and links to third-party sites. We do
          not control and are not responsible for third-party content, products or practices. See our{" "}
          <Link href="/privacy" style={{ color: "var(--accent)" }}>Privacy Policy</Link> for how
          advertising data is handled.
        </p>
      </Section>

      <Section title="No warranty; limitation of liability">
        <p>
          The Site is provided &quot;as is&quot; without warranties of any kind. To the fullest
          extent permitted by law, we are not liable for any damages arising from your use of, or
          inability to use, the Site.
        </p>
      </Section>

      <Section title="Changes">
        <p>
          We may update these terms from time to time; the &quot;Last updated&quot; date reflects the
          latest version. Continued use of the Site means you accept the current terms.
        </p>
      </Section>

      <Section title="Contact">
        <p>
          Questions? Email{" "}
          <a href="mailto:danieltomaro3@gmail.com" style={{ color: "var(--accent)" }}>danieltomaro3@gmail.com</a>.
        </p>
      </Section>
    </article>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ display: "grid", gap: 8 }}>
      <h2 style={{ fontSize: "1.2rem", margin: 0 }}>{title}</h2>
      <div style={{ color: "var(--muted)" }}>{children}</div>
    </section>
  );
}
