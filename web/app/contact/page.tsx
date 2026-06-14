import Link from "next/link";
import { pageMeta, breadcrumbJsonLd, SITE } from "@/lib/seo";
import JsonLd from "@/components/JsonLd";

export const metadata = pageMeta({
  title: "Contact",
  description: "Get in touch with MLB 162-0 — feedback, corrections, data questions, advertising and partnership enquiries.",
  path: "/contact",
  keywords: ["contact MLB 162-0", "MLB 162-0 feedback", "contact"],
});

const EMAIL = "danieltomaro3@gmail.com";

export default function ContactPage() {
  const ld = {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    name: `Contact — ${SITE.name}`,
    url: `${SITE.url}/contact`,
    mainEntity: {
      "@type": "Organization",
      name: SITE.name,
      email: EMAIL,
      url: SITE.url,
    },
  };
  return (
    <div style={{ display: "grid", gap: "1.25rem", maxWidth: 680 }}>
      <JsonLd data={ld} />
      <JsonLd data={breadcrumbJsonLd([{ name: "Contact", path: "/contact" }])} />
      <header>
        <h1 style={{ fontSize: "2rem", margin: 0, textTransform: "uppercase" }}>Contact</h1>
        <p style={{ color: "var(--muted)", marginTop: 6 }}>
          {SITE.name} is an independent, one-person project. The best way to reach us is by email —
          we read everything.
        </p>
      </header>

      <div className="card" style={{ padding: "1.5rem", display: "grid", gap: 8, textAlign: "center" }}>
        <span style={{ fontSize: "1.6rem" }}>✉️</span>
        <a href={`mailto:${EMAIL}`} className="btn btn-primary" style={{ width: "fit-content", margin: "0 auto" }}>
          {EMAIL}
        </a>
        <span style={{ fontSize: ".82rem", color: "var(--muted)" }}>We usually reply within a few days.</span>
      </div>

      <section style={{ display: "grid", gap: 8 }}>
        <h2 style={{ fontSize: "1.2rem", margin: 0 }}>What to get in touch about</h2>
        <ul style={{ color: "var(--muted)", paddingLeft: "1.1rem", display: "grid", gap: 6, lineHeight: 1.6 }}>
          <li><strong>Corrections &amp; data questions</strong> — spotted a wrong stat, rating or result? Let us know and we&apos;ll check it against the source.</li>
          <li><strong>Feedback &amp; feature ideas</strong> — a game you&apos;d love, a stat we&apos;re missing, or a bug you hit.</li>
          <li><strong>Advertising &amp; partnerships</strong> — sponsorship or cross-promotion enquiries.</li>
          <li><strong>Privacy requests</strong> — anything covered by our{" "}
            <Link href="/privacy" style={{ color: "var(--accent)" }}>Privacy Policy</Link>.</li>
        </ul>
      </section>

      <p style={{ color: "var(--muted)", fontSize: ".88rem" }}>
        Want to know how the ratings and the 162-0 chase work first? See the{" "}
        <Link href="/about" style={{ color: "var(--accent)" }}>About &amp; method</Link> page.
      </p>
    </div>
  );
}
