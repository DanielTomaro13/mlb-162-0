"use client";

import type { CSSProperties, ReactNode } from "react";
import ModelNav from "@/components/ModelNav";

/* Shared visual language for every model page — one place to keep them consistent. */
export const S: Record<string, CSSProperties> = {
  page: { maxWidth: 1100, margin: "0 auto", padding: "24px 16px 56px" },
  h1: { fontFamily: "var(--font-cond)", fontSize: 30, letterSpacing: ".01em", margin: "0 0 4px" },
  blurb: { color: "var(--muted)", margin: "0 0 16px", maxWidth: 760, lineHeight: 1.5 },
  filterBar: {
    display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", margin: "0 0 16px",
    padding: "11px 14px", border: "1px solid var(--border)", borderRadius: 12, background: "var(--panel)",
  },
  field: {
    background: "var(--bg-soft)", color: "var(--text)", border: "1px solid var(--border)",
    borderRadius: 8, padding: "6px 10px", fontSize: 13.5,
  },
  card: { border: "1px solid var(--border)", borderRadius: 14, background: "var(--panel)", margin: "14px 0", overflow: "hidden" },
  cardHead: { display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10, padding: "12px 16px", borderBottom: "1px solid var(--border)" },
  tableWrap: { overflowX: "auto", WebkitOverflowScrolling: "touch" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 13.5 },
  th: { color: "var(--muted)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".03em", padding: "8px 12px", textAlign: "right", whiteSpace: "nowrap" },
  thL: { color: "var(--muted)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".03em", padding: "8px 12px", textAlign: "left", whiteSpace: "nowrap" },
  td: { padding: "9px 12px", textAlign: "right", whiteSpace: "nowrap", borderTop: "1px solid var(--border)" },
  tdL: { padding: "9px 12px", textAlign: "left", borderTop: "1px solid var(--border)" },
  mut: { color: "var(--muted)" },
  count: { marginLeft: "auto", color: "var(--muted)", fontSize: 12.5 },
};

export function pill(text: string, tone: "mut" | "pos" | "accent" = "mut"): CSSProperties & { _t?: string } {
  const colors = { mut: "var(--muted)", pos: "var(--accent-2)", accent: "var(--accent)" };
  return { display: "inline-block", padding: "1px 7px", borderRadius: 999, fontSize: 11, fontWeight: 700,
    background: "var(--panel-2)", border: "1px solid var(--border)", color: colors[tone] } as CSSProperties;
}

export function Shell({ title, blurb, children }: { title: string; blurb: ReactNode; children: ReactNode }) {
  return (
    <main style={S.page}>
      <h1 style={S.h1}>{title}</h1>
      <p style={S.blurb}>{blurb}</p>
      <ModelNav />
      {children}
    </main>
  );
}

export function FilterBar({ children, count }: { children: ReactNode; count?: ReactNode }) {
  return (
    <div style={S.filterBar}>
      {children}
      {count != null && <span style={S.count}>{count}</span>}
    </div>
  );
}

export function evColor(ev: number): string {
  return ev > 0 ? "var(--accent-2)" : "var(--muted)";
}
