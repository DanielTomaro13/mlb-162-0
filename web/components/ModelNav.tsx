"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/model", label: "Games" },
  { href: "/value", label: "Value" },
  { href: "/pickem", label: "Pick'em" },
  { href: "/ratings", label: "Ratings" },
  { href: "/backtest", label: "Backtest" },
];

export default function ModelNav() {
  const path = usePathname() || "";
  return (
    <div
      style={{
        display: "flex", gap: 6, flexWrap: "wrap", margin: "0 0 18px",
        padding: "8px 10px", border: "1px solid var(--border)", borderRadius: 12, background: "var(--panel)",
      }}
    >
      <span style={{ alignSelf: "center", color: "var(--muted)", fontSize: 12, fontWeight: 700, marginRight: 4 }}>
        THE MODEL ·
      </span>
      {TABS.map((t) => {
        const on = path === t.href || path.startsWith(t.href + "/");
        return (
          <Link
            key={t.href}
            href={t.href}
            style={{
              padding: "6px 12px", borderRadius: 8, fontSize: 14, fontWeight: 600,
              color: on ? "#1a0606" : "var(--muted)",
              background: on ? "var(--accent)" : "var(--panel-2)",
              border: "1px solid var(--border)",
            }}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
