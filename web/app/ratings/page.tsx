"use client";

import { useEffect, useState } from "react";
import ModelNav from "@/components/ModelNav";
import { loadRatings, type Ratings } from "@/lib/modeldb";

const wrap = { maxWidth: 1080, margin: "0 auto", padding: "0 16px" } as const;

export default function RatingsPage() {
  const [data, setData] = useState<Ratings | null>(null);
  useEffect(() => { loadRatings().then(setData); }, []);

  return (
    <main style={{ ...wrap, paddingTop: 24, paddingBottom: 48 }}>
      <h1 style={{ fontFamily: "var(--font-cond)", fontSize: 30, margin: "0 0 4px" }}>The Model · Ratings</h1>
      <p style={{ color: "var(--muted)", margin: "0 0 16px" }}>
        Chronological team Elo — home-field adjusted, margin-of-victory weighted, regressed between seasons.
      </p>
      <ModelNav />

      {!data && <p style={{ color: "var(--muted)" }}>Loading…</p>}
      {data && (
        <div style={{ border: "1px solid var(--border)", borderRadius: 14, background: "var(--panel)", overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
            <thead>
              <tr style={{ color: "var(--muted)", fontSize: 11.5, textTransform: "uppercase", letterSpacing: ".03em" }}>
                <th style={{ textAlign: "right", padding: "9px 12px" }}>#</th>
                <th style={{ textAlign: "left", padding: "9px 12px" }}>Team</th>
                <th style={{ textAlign: "left", padding: "9px 12px" }}>Division</th>
                <th style={{ textAlign: "right", padding: "9px 12px" }}>Elo</th>
                <th style={{ textAlign: "right", padding: "9px 12px" }}>Games</th>
              </tr>
            </thead>
            <tbody>
              {data.teams.map((t) => (
                <tr key={t.teamId} style={{ borderTop: "1px solid var(--border)" }}>
                  <td style={{ padding: "9px 12px", textAlign: "right", color: "var(--muted)" }}>{t.rank}</td>
                  <td style={{ padding: "9px 12px" }}>
                    <b>{t.name}</b>{" "}
                    <span style={{ fontSize: 11, padding: "1px 7px", borderRadius: 999, background: "var(--panel-2)", border: "1px solid var(--border)", color: "var(--muted)" }}>{t.abbr}</span>
                  </td>
                  <td style={{ padding: "9px 12px", color: "var(--muted)", fontSize: 12 }}>{t.division}</td>
                  <td style={{ padding: "9px 12px", textAlign: "right", fontWeight: 700 }}>{t.elo}</td>
                  <td style={{ padding: "9px 12px", textAlign: "right", color: "var(--muted)" }}>{t.played}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
