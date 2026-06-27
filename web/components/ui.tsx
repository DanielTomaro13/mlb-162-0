"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import ModelNav from "@/components/ModelNav";

/* ---- click-to-sort helper ---- */
export type SortState = { key: string; dir: 1 | -1 };
export function useSort(initialKey: string, initialDir: 1 | -1 = -1) {
  const [sort, setSort] = useState<SortState>({ key: initialKey, dir: initialDir });
  const toggle = (key: string) => setSort((s) => (s.key === key ? { key, dir: (s.dir * -1) as 1 | -1 } : { key, dir: -1 }));
  function sorted<T>(rows: T[], accessors: Record<string, (r: T) => string | number | null | undefined>): T[] {
    const acc = accessors[sort.key];
    if (!acc) return rows;
    return [...rows].sort((a, b) => {
      const va = acc(a), vb = acc(b);
      if (va == null) return 1;
      if (vb == null) return -1;
      if (typeof va === "number" && typeof vb === "number") return (va - vb) * sort.dir;
      return String(va).localeCompare(String(vb)) * sort.dir;
    });
  }
  return { sort, toggle, sorted };
}

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

/** A sortable <th>. `sortKey` ties it to a useSort accessor; click toggles direction. */
export function Th({ label, sortKey, sort, toggle, align = "right" }:
  { label: string; sortKey: string; sort: SortState; toggle: (k: string) => void; align?: "left" | "right" }) {
  const on = sort.key === sortKey;
  return (
    <th
      onClick={() => toggle(sortKey)}
      style={{ ...(align === "left" ? S.thL : S.th), cursor: "pointer", userSelect: "none", color: on ? "var(--text)" : "var(--muted)" }}
      title="Sort"
    >
      {label}{on ? (sort.dir < 0 ? " ▾" : " ▴") : ""}
    </th>
  );
}

export function Shell({ title, blurb, children }: { title: string; blurb: ReactNode; children: ReactNode }) {
  return (
    <main style={S.page}>
      {/* baseball-stitch accent under the title */}
      <h1 style={S.h1}><span aria-hidden style={{ marginRight: 8 }}>⚾</span>{title}</h1>
      <div style={{ height: 3, width: 132, margin: "2px 0 10px", borderRadius: 3,
        backgroundImage: "repeating-linear-gradient(90deg, var(--accent) 0 9px, transparent 9px 15px)" }} aria-hidden />
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
