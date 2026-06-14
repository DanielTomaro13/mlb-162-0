"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { teamColors, leagueShort } from "@/lib/teams";

export interface TeamCard {
  abbr: string;       // lowercased route slug
  fullName: string;
  league: number;     // 103 AL / 104 NL
  division: string;   // e.g. "American League East"
  divShort: string;   // e.g. "East"
  w: number;
  l: number;
  pct: number;
}

const LEAGUES: { id: number; label: string }[] = [
  { id: 103, label: "American League" },
  { id: 104, label: "National League" },
];

const DIV_ORDER = ["East", "Central", "West"];

function pct3(n: number): string {
  return n.toFixed(3).replace(/^0/, "");
}

export default function TeamsHub({ teams }: { teams: TeamCard[] }) {
  const [q, setQ] = useState("");
  const [league, setLeague] = useState<"All" | 103 | 104>("All");

  const shown = useMemo(() => {
    const query = q.trim().toLowerCase();
    return teams.filter(
      (t) =>
        (league === "All" || t.league === league) &&
        (!query ||
          t.fullName.toLowerCase().includes(query) ||
          t.abbr.includes(query) ||
          t.division.toLowerCase().includes(query)),
    );
  }, [teams, q, league]);

  const grouped = useMemo(() => {
    return LEAGUES.map((lg) => ({
      ...lg,
      divisions: DIV_ORDER.map((d) => ({
        name: d,
        teams: shown
          .filter((t) => t.league === lg.id && t.divShort === d)
          .sort((a, b) => b.pct - a.pct),
      })).filter((d) => d.teams.length > 0),
    })).filter((lg) => lg.divisions.length > 0);
  }, [shown]);

  const filters: { key: "All" | 103 | 104; label: string }[] = [
    { key: "All", label: "All" },
    { key: 103, label: "American League" },
    { key: 104, label: "National League" },
  ];

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search teams, divisions…"
          style={{
            flex: "1 1 220px",
            padding: ".7rem .9rem",
            borderRadius: 10,
            border: "1px solid var(--border)",
            background: "var(--panel)",
            color: "var(--text)",
          }}
        />
        {filters.map((f) => (
          <button
            key={String(f.key)}
            onClick={() => setLeague(f.key)}
            className="chip"
            style={{
              cursor: "pointer",
              borderColor: league === f.key ? "var(--accent)" : "var(--border)",
              color: league === f.key ? "var(--text)" : "var(--muted)",
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {grouped.map((lg) => (
        <section key={lg.id} style={{ display: "grid", gap: 12 }}>
          <h2
            style={{
              margin: 0,
              fontSize: "1.1rem",
              textTransform: "uppercase",
              letterSpacing: ".04em",
              color: "var(--muted)",
            }}
          >
            {lg.label}
          </h2>
          {lg.divisions.map((div) => (
            <div key={div.name} style={{ display: "grid", gap: 8 }}>
              <div
                style={{
                  fontFamily: "var(--font-cond)",
                  fontSize: ".82rem",
                  textTransform: "uppercase",
                  letterSpacing: ".06em",
                  color: "var(--gold)",
                }}
              >
                {leagueShort(lg.id)} {div.name}
              </div>
              <div className="grid-cards">
                {div.teams.map((t) => {
                  const [c1, c2] = teamColors(t.fullName);
                  return (
                    <Link
                      key={t.abbr}
                      href={`/teams/${t.abbr}`}
                      className="card"
                      style={{ padding: "1rem", display: "grid", gap: 6 }}
                    >
                      <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span
                          style={{
                            width: 30,
                            height: 30,
                            borderRadius: 7,
                            background: c1,
                            border: `2px solid ${c2}`,
                            flex: "0 0 auto",
                          }}
                        />
                        <span style={{ display: "grid", gap: 1, minWidth: 0 }}>
                          <strong style={{ fontFamily: "var(--font-cond)", fontSize: "1rem" }}>
                            {t.abbr.toUpperCase()}
                          </strong>
                          <span
                            style={{
                              fontSize: ".78rem",
                              color: "var(--muted)",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {t.fullName}
                          </span>
                        </span>
                      </span>
                      <span
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "baseline",
                          fontFamily: "var(--font-mono)",
                          fontSize: ".74rem",
                          color: "var(--muted)",
                        }}
                      >
                        <span>
                          {t.w}-{t.l}
                        </span>
                        <span style={{ color: "var(--text)" }}>{pct3(t.pct)}</span>
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </section>
      ))}

      {grouped.length === 0 && <p style={{ color: "var(--muted)" }}>No teams match.</p>}
    </div>
  );
}
