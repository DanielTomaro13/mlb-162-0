"use client";

import { useEffect, useState } from "react";
import { Shell, S } from "@/components/ui";
import { loadRatings, type Ratings } from "@/lib/modeldb";

export default function RatingsPage() {
  const [data, setData] = useState<Ratings | null>(null);
  useEffect(() => { loadRatings().then(setData); }, []);

  return (
    <Shell title="The Model · Ratings" blurb="Chronological team Elo — home-field adjusted, margin-of-victory weighted, and regressed between seasons. Higher is stronger.">
      {!data && <p style={S.mut}>Loading…</p>}
      {data && !data.teams?.length && <p style={S.mut}>Ratings not available.</p>}
      {data && data.teams?.length > 0 && (
        <div style={{ ...S.card, margin: 0 }}>
          <div style={S.tableWrap}>
            <table style={S.table}>
              <thead>
                <tr><th style={S.th}>#</th><th style={S.thL}>Team</th><th style={S.thL}>Division</th><th style={S.th}>Elo</th><th style={S.th}>Games</th></tr>
              </thead>
              <tbody>
                {data.teams.map((t) => (
                  <tr key={t.teamId}>
                    <td style={{ ...S.td, color: "var(--muted)" }}>{t.rank}</td>
                    <td style={S.tdL}><b>{t.name}</b> <span style={{ fontSize: 11, padding: "1px 7px", borderRadius: 999, background: "var(--panel-2)", border: "1px solid var(--border)", color: "var(--muted)" }}>{t.abbr}</span></td>
                    <td style={{ ...S.tdL, color: "var(--muted)", fontSize: 12 }}>{t.division}</td>
                    <td style={{ ...S.td, fontWeight: 700 }}>{t.elo}</td>
                    <td style={{ ...S.td, color: "var(--muted)" }}>{t.played}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Shell>
  );
}
