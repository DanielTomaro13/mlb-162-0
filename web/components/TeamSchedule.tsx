"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { teamColors, teamAbbr } from "@/lib/teams";

/* ------------------------------------------------------------------ *
 * MLB Stats API schedule response shapes (public, CORS-open). Only
 * the fields we read are typed; everything else is left optional.
 * ------------------------------------------------------------------ */
interface ApiTeamRef {
  id?: number;
  name?: string;
}
interface ApiSide {
  team?: ApiTeamRef;
  score?: number;
  isWinner?: boolean;
}
interface ApiGame {
  gamePk?: number;
  status?: { abstractGameState?: string; detailedState?: string };
  teams?: { home?: ApiSide; away?: ApiSide };
}
interface ApiDate {
  date?: string;
  games?: ApiGame[];
}
interface ApiSchedule {
  dates?: ApiDate[];
}

/* ----------------------------- helpers ---------------------------- */
function num(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) return Number(v);
  return null;
}
function isSchedule(d: unknown): d is ApiSchedule {
  return typeof d === "object" && d !== null;
}

/** One game flattened from this team's perspective. */
interface TeamGame {
  pk: number | null;
  date: string;           // ISO yyyy-mm-dd
  isHome: boolean;
  oppName: string;
  us: number | null;
  them: number | null;
  final: boolean;
  won: boolean | null;    // null until final
  status: string;         // "Preview" / "Scheduled" / etc. for non-final
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function flatten(data: ApiSchedule, teamId: number): TeamGame[] {
  const out: TeamGame[] = [];
  for (const d of data.dates ?? []) {
    const date = typeof d.date === "string" ? d.date : "";
    for (const g of d.games ?? []) {
      const home = g.teams?.home;
      const away = g.teams?.away;
      const homeIsUs = home?.team?.id === teamId;
      const awayIsUs = away?.team?.id === teamId;
      if (!homeIsUs && !awayIsUs) continue;
      const usSide = homeIsUs ? home : away;
      const themSide = homeIsUs ? away : home;
      const state = g.status?.abstractGameState ?? "";
      const final = state === "Final";
      out.push({
        pk: num(g.gamePk),
        date,
        isHome: homeIsUs,
        oppName: themSide?.team?.name ?? "TBD",
        us: num(usSide?.score),
        them: num(themSide?.score),
        final,
        won: final ? usSide?.isWinner === true : null,
        status: g.status?.detailedState || state || "Scheduled",
      });
    }
  }
  // Chronological order.
  out.sort((a, b) => a.date.localeCompare(b.date));
  return out;
}

function monthKey(iso: string): string {
  // iso = yyyy-mm-dd; avoid TZ drift by parsing the month index directly.
  const m = Number(iso.slice(5, 7)) - 1;
  return MONTHS[m] ?? "Season";
}

function fmtDate(iso: string): string {
  return new Date(iso + "T12:00:00Z").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export default function TeamSchedule({
  teamId,
  teamName,
  season,
}: {
  teamId: number;
  teamName: string;
  season: string;
}) {
  const [games, setGames] = useState<TeamGame[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!teamId) {
      setError("No team id available.");
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    const url =
      `https://statsapi.mlb.com/api/v1/schedule?sportId=1&season=${encodeURIComponent(season)}` +
      `&teamId=${teamId}&gameType=R&hydrate=team,linescore`;
    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(`schedule ${r.status}`);
        return r.json() as Promise<unknown>;
      })
      .then((d) => {
        if (cancelled) return;
        if (!isSchedule(d)) throw new Error("Unexpected schedule response.");
        setGames(flatten(d, teamId));
        setLoading(false);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Failed to load the schedule.");
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [teamId, season]);

  if (loading) {
    return <p style={{ color: "var(--muted)" }}>Loading full schedule…</p>;
  }
  if (error) {
    return <p style={{ color: "var(--muted)" }}>Schedule unavailable: {error}</p>;
  }
  if (!games || games.length === 0) {
    return <p style={{ color: "var(--muted)" }}>No games found for this season.</p>;
  }

  const wins = games.filter((g) => g.final && g.won === true).length;
  const losses = games.filter((g) => g.final && g.won === false).length;

  // Group into months, preserving chronological order.
  const monthOrder: string[] = [];
  const byMonth = new Map<string, TeamGame[]>();
  for (const g of games) {
    const key = monthKey(g.date);
    if (!byMonth.has(key)) {
      byMonth.set(key, []);
      monthOrder.push(key);
    }
    byMonth.get(key)!.push(g);
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <span
          className="chip"
          style={{ borderColor: "var(--accent)", color: "var(--text)", fontFamily: "var(--font-cond)", fontSize: "1.05rem" }}
        >
          {wins}–{losses}
        </span>
        <span style={{ fontSize: ".78rem", color: "var(--muted)" }}>
          {teamName} · {season} regular season · {games.length} games
        </span>
      </div>

      {monthOrder.map((month) => (
        <div key={month} style={{ display: "grid", gap: 8 }}>
          <div
            style={{
              fontSize: ".74rem",
              color: "var(--muted)",
              textTransform: "uppercase",
              letterSpacing: ".06em",
            }}
          >
            {month}
          </div>
          <div style={{ display: "grid", gap: 6 }}>
            {byMonth.get(month)!.map((g, i) => (
              <GameRow key={g.pk ?? `${month}-${i}`} g={g} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function GameRow({ g }: { g: TeamGame }) {
  const [c1] = teamColors(g.oppName);
  const oppAbbr = teamAbbr(g.oppName);

  const result = (() => {
    if (g.final && g.won != null) {
      return (
        <span style={{ display: "flex", alignItems: "baseline", gap: 6, whiteSpace: "nowrap" }}>
          <span style={{ color: g.won ? "var(--accent-2)" : "var(--danger)", fontWeight: 700, fontSize: ".82rem" }}>
            {g.won ? "W" : "L"}
          </span>
          <span style={{ fontFamily: "var(--font-cond)", fontSize: "1.05rem" }}>
            {g.us ?? "—"}–{g.them ?? "—"}
          </span>
        </span>
      );
    }
    return (
      <span style={{ display: "flex", alignItems: "baseline", gap: 6, whiteSpace: "nowrap" }}>
        <span style={{ color: "var(--muted)", fontSize: ".72rem", textTransform: "uppercase", letterSpacing: ".04em" }}>
          {g.status}
        </span>
        <span style={{ fontFamily: "var(--font-cond)", fontSize: "1.05rem", color: "var(--muted)" }}>—</span>
      </span>
    );
  })();

  const inner = (
    <>
      <span
        style={{
          width: 44,
          flexShrink: 0,
          fontSize: ".72rem",
          color: "var(--muted)",
          fontFamily: "var(--font-mono)",
        }}
      >
        {fmtDate(g.date)}
      </span>
      <span style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0, flex: 1 }}>
        <span
          style={{ width: 10, height: 10, borderRadius: 2, background: c1, flexShrink: 0, display: "inline-block" }}
        />
        <span style={{ fontSize: ".88rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          <span style={{ color: "var(--muted)" }}>{g.isHome ? "vs" : "@"}</span> {oppAbbr}
        </span>
      </span>
      {result}
    </>
  );

  const baseStyle: React.CSSProperties = {
    padding: ".55rem .75rem",
    display: "flex",
    alignItems: "center",
    gap: 10,
  };

  if (g.pk != null) {
    return (
      <Link href={`/game?pk=${g.pk}`} className="card" style={{ ...baseStyle, textDecoration: "none", color: "inherit" }}>
        {inner}
      </Link>
    );
  }
  return (
    <div className="card" style={baseStyle}>
      {inner}
    </div>
  );
}
