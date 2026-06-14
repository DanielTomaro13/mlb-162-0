import Link from "next/link";
import { pageMeta, SITE } from "@/lib/seo";

export const metadata = pageMeta({
  title: "Privacy Policy",
  description: "How MLB 162-0 handles data, cookies and advertising — including Google AdSense, third-party vendors and your opt-out and privacy rights.",
  path: "/privacy",
  keywords: ["privacy policy", "MLB 162-0 privacy", "cookies", "AdSense privacy"],
});

const UPDATED = "June 15, 2026";

export default function PrivacyPage() {
  return (
    <article style={{ display: "grid", gap: "1.25rem", maxWidth: 760, lineHeight: 1.7 }}>
      <header>
        <h1 style={{ fontSize: "2rem", margin: 0, textTransform: "uppercase" }}>Privacy Policy</h1>
        <p style={{ color: "var(--muted)", marginTop: 6 }}>Last updated {UPDATED}</p>
      </header>

      <p style={{ color: "var(--muted)" }}>
        This Privacy Policy explains how <strong style={{ color: "var(--text)" }}>{SITE.name}</strong>{" "}
        (&quot;we&quot;, &quot;us&quot;, the &quot;Site&quot;, <a href={SITE.url} style={{ color: "var(--accent)" }}>{SITE.domain}</a>)
        handles information when you visit. {SITE.name} is a free, independent baseball stats and
        games website. We aim to collect as little as possible.
      </p>

      <Section title="Who we are">
        <p>
          {SITE.name} is an independent project operated by Daniel Tomaro. It is not affiliated with
          or endorsed by Major League Baseball, the MLB Players Association, or any club. You can
          reach us any time at{" "}
          <a href="mailto:danieltomaro3@gmail.com" style={{ color: "var(--accent)" }}>danieltomaro3@gmail.com</a>{" "}
          (see our <Link href="/contact" style={{ color: "var(--accent)" }}>Contact page</Link>).
        </p>
      </Section>

      <Section title="Information we collect">
        <p>
          <strong>We do not ask you to create an account and we do not collect names, emails or
          payment details.</strong> The Site is statically hosted and has no user database.
        </p>
        <ul style={{ paddingLeft: "1.1rem", display: "grid", gap: 6 }}>
          <li><strong>On-device storage.</strong> Game progress, streaks, high scores and your chosen
            display name are stored in your browser&apos;s <em>localStorage</em> on your own device.
            This never leaves your browser unless you choose to submit a score to a leaderboard, and
            you can clear it any time by clearing your browser data.</li>
          <li><strong>Leaderboards (optional).</strong> If you submit a score, only the display name
            you typed and the score are sent to our leaderboard service. Don&apos;t enter a real name
            if you&apos;d prefer to stay anonymous — &quot;Anonymous&quot; is the default.</li>
          <li><strong>Server logs.</strong> Like all websites, our host and content-delivery network
            process standard request data (such as IP address and user-agent) to deliver pages and
            guard against abuse. We do not use this to identify you.</li>
        </ul>
      </Section>

      <Section title="Cookies and advertising">
        <p>
          We display ads through <strong>Google AdSense</strong>. To do this, Google and its
          partners use cookies and similar technologies:
        </p>
        <ul style={{ paddingLeft: "1.1rem", display: "grid", gap: 6 }}>
          <li>Third-party vendors, including Google, use cookies to serve ads based on your prior
            visits to this and other websites.</li>
          <li>Google&apos;s use of advertising cookies enables it and its partners to serve ads to you
            based on your visits to this Site and/or other sites on the Internet.</li>
          <li>You may opt out of personalised advertising by visiting{" "}
            <a href="https://www.google.com/settings/ads" target="_blank" rel="noopener" style={{ color: "var(--accent)" }}>Google Ads Settings</a>.
            You can also opt out of some third-party vendors&apos; use of cookies for personalised
            advertising at{" "}
            <a href="https://www.aboutads.info/choices/" target="_blank" rel="noopener" style={{ color: "var(--accent)" }}>aboutads.info/choices</a>{" "}
            or <a href="https://www.youronlinechoices.eu/" target="_blank" rel="noopener" style={{ color: "var(--accent)" }}>youronlinechoices.eu</a>.</li>
        </ul>
        <p>
          For more on how Google uses information from sites that use its services, see{" "}
          <a href="https://policies.google.com/technologies/partner-sites" target="_blank" rel="noopener" style={{ color: "var(--accent)" }}>
            google.com/policies/technologies/partner-sites
          </a>.
        </p>
      </Section>

      <Section title="Analytics">
        <p>
          We use <strong>Cloudflare Web Analytics</strong>, a privacy-first analytics tool that does
          not use cookies, does not fingerprint individuals, and does not track you across other
          sites. It gives us only aggregate, anonymous traffic information.
        </p>
      </Section>

      <Section title="Consent for EEA, UK and Swiss visitors">
        <p>
          Where required (for example under the GDPR), Google&apos;s consent mechanisms request your
          permission before personalised ads or non-essential cookies are used. You can change or
          withdraw your choice at any time through the consent controls or your browser settings.
        </p>
      </Section>

      <Section title="Your California privacy rights">
        <p>
          If you are a California resident, the CCPA/CPRA gives you rights over personal information.
          We do not sell personal information. To exercise any right, contact us at the email above.
        </p>
      </Section>

      <Section title="Children">
        <p>
          The Site is intended for a general audience and is not directed to children under 13. We do
          not knowingly collect personal information from children. If you believe a child has
          provided us information, contact us and we will remove it.
        </p>
      </Section>

      <Section title="Third-party links">
        <p>
          Pages may link to external sites (such as official MLB resources or our sister sites). We
          are not responsible for the privacy practices or content of those sites; review their
          policies separately.
        </p>
      </Section>

      <Section title="Changes to this policy">
        <p>
          We may update this policy from time to time. Material changes will be reflected by the
          &quot;Last updated&quot; date at the top of this page.
        </p>
      </Section>

      <Section title="Contact">
        <p>
          Questions about this policy? Email{" "}
          <a href="mailto:danieltomaro3@gmail.com" style={{ color: "var(--accent)" }}>danieltomaro3@gmail.com</a>{" "}
          or use our <Link href="/contact" style={{ color: "var(--accent)" }}>Contact page</Link>.
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
