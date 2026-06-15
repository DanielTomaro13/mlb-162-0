"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { teamColors, teamAbbr } from "@/lib/teams";
import { slugify, avg3 } from "@/lib/format";
import { loadGamesData, NOTABLE_LIMIT } from "@/lib/games-data";

/* ------------------------------------------------------------------ *
 * MLB Stats API response shapes (public, CORS-open). Only the fields
 * we actually read are typed; everything else is left optional.
 * ------------------------------------------------------------------ */
interface ApiBatting {
  atBats?: number; runs?: number; hits?: number; rbi?: number;
  baseOnBalls?: number; strikeOuts?: number; avg?: string;
  doubles?: number; triples?: number; homeRuns?: number;
}
interface ApiPitching {
  inningsPitched?: string; hits?: number; runs?: number; earnedRuns?: number;
  baseOnBalls?: number; strikeOuts?: number; homeRuns?: number; era?: string;
}
interface ApiPlayer {
  person: { id: number; fullName: string };
  position?: { abbreviation?: string };
  battingOrder?: string;
  stats?: { batting?: ApiBatting; pitching?: ApiPitching };
}
interface ApiTeamSide {
  team: { id: number; name: string };
  players: Record<string, ApiPlayer>;
  batters: number[];
  pitchers: number[];
  battingOrder: number[];
}
interface BoxScore {
  teams: { home: ApiTeamSide; away: ApiTeamSide };
}
interface LineInningSide { runs?: number; hits?: number; errors?: number }
interface LineInning { num: number; home?: LineInningSide; away?: LineInningSide }
interface LineTeamTotals { runs?: number; hits?: number; errors?: number }
interface LineScore {
  innings?: LineInning[];
  teams?: { home?: LineTeamTotals; away?: LineTeamTotals };
  currentInning?: number;
  inningState?: string;
  isTopInning?: boolean;
}
interface ApiPlayResult {
  type?: string; event?: string; description?: string;
  awayScore?: number; homeScore?: number; rbi?: number;
}
interface ApiPlayAbout {
  halfInning?: string; inning?: number; isScoringPlay?: boolean;
  hasOut?: boolean; captivatingIndex?: number;
}
interface ApiPlayMatchup {
  batter?: { id?: number; fullName?: string };
  pitcher?: { id?: number; fullName?: string };
}
interface ApiPlay {
  result?: ApiPlayResult;
  about?: ApiPlayAbout;
  matchup?: ApiPlayMatchup;
  atBatIndex?: number;
}
interface PlayByPlay {
  allPlays?: ApiPlay[];
  scoringPlays?: number[];
}

/* ----------------------------- helpers ---------------------------- */
function num(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) return Number(v);
  return null;
}
function str(v: unknown): string {
  return v == null ? "" : String(v);
}
function isBoxScore(d: unknown): d is BoxScore {
  if (typeof d !== "object" || d === null) return false;
  const t = (d as { teams?: unknown }).teams;
  return typeof t === "object" && t !== null
    && "home" in (t as object) && "away" in (t as object);
}
function isLineScore(d: unknown): d is LineScore {
  return typeof d === "object" && d !== null;
}
function isPlayByPlay(d: unknown): d is PlayByPlay {
  return typeof d === "object" && d !== null && Array.isArray((d as { allPlays?: unknown }).allPlays);
}

/** Players in the starting lineup order, falling back to batters list. */
function battingRows(side: ApiTeamSide): ApiPlayer[] {
  const order = side.battingOrder?.length ? side.battingOrder : side.batters ?? [];
  return order
    .map((id) => side.players[`ID${id}`])
    .filter((p): p is ApiPlayer => !!p && !!p.stats?.batting);
}
function pitchingRows(side: ApiTeamSide): ApiPlayer[] {
  return (side.pitchers ?? [])
    .map((id) => side.players[`ID${id}`])
    .filter((p): p is ApiPlayer => !!p && !!p.stats?.pitching);
}

const SWATCH = (team: string) => {
  const [c1] = teamColors(team);
  return <span style={{ width: 11, height: 11, borderRadius: 2, background: c1, flexShrink: 0, display: "inline-block" }} />;
};

export default function GameDetail() {
  const [pk, setPk] = useState<string | null>(null);
  const [box, setBox] = useState<BoxScore | null>(null);
  const [line, setLine] = useState<LineScore | null>(null);
  const [pbp, setPbp] = useState<PlayByPlay | null>(null);
  const [notable, setNotable] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Read the game id from the query string client-side only (static export safe).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const id = new URLSearchParams(window.location.search).get("pk");
    if (!id) {
      setError("No game selected.");
      setLoading(false);
      return;
    }
    setPk(id);
  }, []);

  // The notable set = the first NOTABLE_LIMIT players (games.json is fame-sorted),
  // i.e. exactly the players that have a static profile page to link to.
  useEffect(() => {
    let cancelled = false;
    loadGamesData()
      .then((d) => {
        if (cancelled) return;
        setNotable(new Set(d.players.slice(0, NOTABLE_LIMIT).map((p) => p.id)));
      })
      .catch(() => { /* links just fall back to plain text */ });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!pk) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([
      fetch(`https://statsapi.mlb.com/api/v1/game/${pk}/boxscore`).then((r) => {
        if (!r.ok) throw new Error(`boxscore ${r.status}`);
        return r.json() as Promise<unknown>;
      }),
      fetch(`https://statsapi.mlb.com/api/v1/game/${pk}/linescore`).then((r) => {
        if (!r.ok) throw new Error(`linescore ${r.status}`);
        return r.json() as Promise<unknown>;
      }),
      // Play-by-play is optional — tolerate any failure so the page still renders.
      fetch(`https://statsapi.mlb.com/api/v1/game/${pk}/playByPlay`)
        .then((r) => (r.ok ? (r.json() as Promise<unknown>) : null))
        .catch(() => null),
    ])
      .then(([b, l, p]) => {
        if (cancelled) return;
        if (!isBoxScore(b)) throw new Error("Unexpected box score response.");
        setBox(b);
        setLine(isLineScore(l) ? l : null);
        setPbp(isPlayByPlay(p) ? p : null);
        setLoading(false);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Failed to load this game.");
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [pk]);

  if (error) {
    return (
      <div className="card" style={{ padding: "1.5rem", display: "grid", gap: 12 }}>
        <h1 style={{ margin: 0, fontSize: "1.4rem" }}>Box score unavailable</h1>
        <p style={{ color: "var(--muted)", margin: 0 }}>{error}</p>
        <p style={{ margin: 0 }}>
          <Link href="/schedule" className="chip" style={{ borderColor: "var(--accent)", color: "var(--text)", textDecoration: "none" }}>
            ← Back to schedule
          </Link>
        </p>
      </div>
    );
  }

  if (loading || !box) {
    return <p style={{ color: "var(--muted)" }}>Loading box score…</p>;
  }

  const away = box.teams.away;
  const home = box.teams.home;
  const awayRuns = num(line?.teams?.away?.runs);
  const homeRuns = num(line?.teams?.home?.runs);

  const status = (() => {
    if (!line) return "";
    const state = str(line.inningState);
    const inn = num(line.currentInning);
    if (state && inn) return `${state} ${inn}`;
    return "";
  })();

  return (
    <div style={{ display: "grid", gap: "1.25rem" }}>
      <nav style={{ fontSize: ".82rem" }}>
        <Link href="/schedule" style={{ color: "var(--accent)" }}>← Schedule</Link>
      </nav>

      {/* Header: Away @ Home with score */}
      <header className="card" style={{ padding: "1.25rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 18, flexWrap: "wrap" }}>
          <TeamHead team={away.team} score={awayRuns} align="right" />
          <span style={{ fontFamily: "var(--font-cond)", fontSize: "1.6rem", color: "var(--muted)" }}>@</span>
          <TeamHead team={home.team} score={homeRuns} align="left" />
        </div>
        {status && (
          <div style={{ textAlign: "center", marginTop: 8, fontSize: ".72rem", color: "var(--accent-2)", textTransform: "uppercase", letterSpacing: ".06em" }}>
            {status}
          </div>
        )}
      </header>

      {/* Line score */}
      {line?.innings && line.innings.length > 0 && (
        <LineScoreTable line={line} away={away} home={home} />
      )}

      {/* Per-team batting + pitching — or a graceful note for games with no box
          score yet (postponed/suspended/not-yet-played). */}
      {(away.batters?.length || home.batters?.length) ? (
        <>
          <TeamBox side={away} notable={notable} />
          <TeamBox side={home} notable={notable} />
        </>
      ) : (
        <p style={{ color: "var(--muted)" }}>
          No box score is available for this game yet.{" "}
          <Link href="/schedule" style={{ color: "var(--accent)" }}>Back to the schedule →</Link>
        </p>
      )}

      {/* Play-by-play — defaults to scoring plays; toggle for every plate appearance. */}
      <PlayByPlaySection pbp={pbp} notable={notable} />
    </div>
  );
}

/** True when this play scored a run (in the scoringPlays index or flagged by the API). */
function isScoringPlay(p: ApiPlay, scoring: Set<number>): boolean {
  const idx = num(p.atBatIndex);
  if (idx != null && scoring.has(idx)) return true;
  return p.about?.isScoringPlay === true;
}

/** "T7" / "B3" inning badge from halfInning + inning. */
function inningBadge(about: ApiPlayAbout | undefined): string {
  const inn = num(about?.inning);
  if (inn == null) return "";
  const half = str(about?.halfInning).toLowerCase();
  const prefix = half === "bottom" ? "B" : "T";
  return `${prefix}${inn}`;
}

function PlayByPlaySection({ pbp, notable }: { pbp: PlayByPlay | null; notable: Set<number> }) {
  const [showAll, setShowAll] = useState(false);

  const allPlays = pbp?.allPlays ?? [];
  const scoring = new Set<number>((pbp?.scoringPlays ?? []).filter((n): n is number => typeof n === "number"));

  // Only keep plays with a usable description.
  const usable = allPlays.filter((p) => str(p.result?.description).trim() !== "");
  if (usable.length === 0) return null;

  const scoringPlays = usable.filter((p) => isScoringPlay(p, scoring));
  const rows = showAll ? usable : scoringPlays;
  // Most-recent first.
  const ordered = [...rows].reverse();

  return (
    <section style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <h2 style={{ margin: 0, fontSize: "1.1rem", borderLeft: "3px solid var(--accent)", paddingLeft: 10 }}>
          Play-by-play
        </h2>
        <div style={{ display: "flex", gap: 6 }}>
          <PbpToggle label="Scoring plays" active={!showAll} onClick={() => setShowAll(false)} />
          <PbpToggle label="All plays" active={showAll} onClick={() => setShowAll(true)} />
        </div>
      </div>

      <div className="card" style={{ padding: ".5rem .25rem" }}>
        {ordered.length === 0 ? (
          <p style={{ color: "var(--muted)", margin: 0, padding: ".5rem .75rem" }}>
            No scoring plays in this game.
          </p>
        ) : (
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid" }}>
            {ordered.map((p, i) => (
              <PlayRow
                key={num(p.atBatIndex) ?? i}
                play={p}
                scored={isScoringPlay(p, scoring)}
                notable={notable}
              />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function PbpToggle({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="chip"
      style={{
        cursor: "pointer",
        fontSize: ".72rem",
        borderColor: active ? "var(--accent)" : "var(--border)",
        background: active ? "var(--accent)" : "transparent",
        color: active ? "#fff" : "var(--muted)",
      }}
    >
      {label}
    </button>
  );
}

function PlayRow({ play, scored, notable }: { play: ApiPlay; scored: boolean; notable: Set<number> }) {
  const badge = inningBadge(play.about);
  const desc = str(play.result?.description);
  const away = num(play.result?.awayScore);
  const home = num(play.result?.homeScore);
  const batterId = num(play.matchup?.batter?.id);
  const batterName = str(play.matchup?.batter?.fullName);
  const linkBatter = batterId != null && notable.has(batterId) && batterName !== "";

  return (
    <li
      style={{
        display: "flex",
        gap: 10,
        alignItems: "baseline",
        padding: ".5rem .75rem",
        borderTop: "1px solid var(--border)",
      }}
    >
      {badge && (
        <span
          style={{
            flexShrink: 0,
            fontFamily: "var(--font-cond)",
            fontSize: ".7rem",
            minWidth: 26,
            textAlign: "center",
            padding: "1px 4px",
            borderRadius: 4,
            border: "1px solid var(--border)",
            color: "var(--muted)",
          }}
        >
          {badge}
        </span>
      )}
      <div style={{ display: "grid", gap: 2, flex: 1, minWidth: 0 }}>
        <span style={{ fontSize: ".88rem", lineHeight: 1.35 }}>
          {desc}
          {linkBatter && (
            <>
              {" "}
              <Link href={`/players/${batterId}/${slugify(batterName)}`} style={{ color: "var(--accent)", fontSize: ".78rem" }}>
                {batterName} →
              </Link>
            </>
          )}
        </span>
      </div>
      {scored && away != null && home != null && (
        <span
          style={{
            flexShrink: 0,
            fontFamily: "var(--font-cond)",
            fontSize: ".95rem",
            fontWeight: 700,
            color: "var(--accent-2)",
          }}
        >
          {away}–{home}
        </span>
      )}
    </li>
  );
}

function TeamHead({ team, score, align }: { team: { name: string }; score: number | null; align: "left" | "right" }) {
  const slug = teamAbbr(team.name).toLowerCase();
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, flexDirection: align === "right" ? "row-reverse" : "row" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexDirection: align === "right" ? "row-reverse" : "row" }}>
        {SWATCH(team.name)}
        <Link href={`/teams/${slug}`} style={{ fontSize: "1.05rem", fontWeight: 600, color: "var(--text)" }}>
          {team.name}
        </Link>
      </div>
      <span style={{ fontFamily: "var(--font-cond)", fontSize: "2.2rem", lineHeight: 1 }}>
        {score != null ? score : "—"}
      </span>
    </div>
  );
}

function LineScoreTable({ line, away, home }: { line: LineScore; away: ApiTeamSide; home: ApiTeamSide }) {
  const innings = line.innings ?? [];
  const nums = innings.map((i) => i.num);
  const maxInn = Math.max(9, ...(nums.length ? nums : [9]));
  const cols: number[] = [];
  for (let i = 1; i <= maxInn; i++) cols.push(i);
  const byNum = new Map<number, LineInning>();
  for (const i of innings) byNum.set(i.num, i);

  const cell = (v: number | null) => (v != null ? v : "");
  const totals = line.teams;

  return (
    <div className="card scroll-x" style={{ padding: ".5rem .7rem" }}>
      <table className="stat">
        <thead>
          <tr>
            <th style={{ textAlign: "left" }}>&nbsp;</th>
            {cols.map((c) => <th key={c}>{c}</th>)}
            <th style={{ borderLeft: "1px solid var(--border)" }}>R</th>
            <th>H</th>
            <th>E</th>
          </tr>
        </thead>
        <tbody>
          {([
            { side: away, totals: totals?.away, pick: (i: LineInning) => i.away },
            { side: home, totals: totals?.home, pick: (i: LineInning) => i.home },
          ] as const).map((row, ri) => (
            <tr key={ri}>
              <td style={{ display: "flex", gap: 8, alignItems: "center", whiteSpace: "nowrap" }}>
                {SWATCH(row.side.team.name)}
                <span style={{ fontWeight: 600 }}>{teamAbbr(row.side.team.name)}</span>
              </td>
              {cols.map((c) => {
                const inn = byNum.get(c);
                const sv = inn ? row.pick(inn) : undefined;
                return <td key={c}>{cell(num(sv?.runs))}</td>;
              })}
              <td style={{ borderLeft: "1px solid var(--border)", fontWeight: 700 }}>{cell(num(row.totals?.runs))}</td>
              <td>{cell(num(row.totals?.hits))}</td>
              <td>{cell(num(row.totals?.errors))}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PlayerName({ p, notable }: { p: ApiPlayer; notable: Set<number> }) {
  const id = p.person.id;
  const name = p.person.fullName;
  if (notable.has(id)) {
    return (
      <Link href={`/players/${id}/${slugify(name)}`} style={{ color: "var(--text)" }}>
        {name}
      </Link>
    );
  }
  return <span>{name}</span>;
}

function TeamBox({ side, notable }: { side: ApiTeamSide; notable: Set<number> }) {
  const bats = battingRows(side);
  const pits = pitchingRows(side);
  const [c1] = teamColors(side.team.name);

  return (
    <section style={{ display: "grid", gap: 12 }}>
      <h2 style={{ margin: 0, fontSize: "1.1rem", display: "flex", alignItems: "center", gap: 8, borderLeft: `3px solid ${c1}`, paddingLeft: 10 }}>
        {side.team.name}
      </h2>

      {bats.length > 0 && (
        <div className="card scroll-x" style={{ padding: ".5rem .7rem" }}>
          <table className="stat">
            <thead>
              <tr>
                <th style={{ textAlign: "left" }}>Batting</th>
                <th>AB</th><th>R</th><th>H</th><th>RBI</th><th>BB</th><th>K</th><th>AVG</th>
              </tr>
            </thead>
            <tbody>
              {bats.map((p) => {
                const b = p.stats?.batting ?? {};
                const avgNum = num(b.avg);
                return (
                  <tr key={p.person.id}>
                    <td style={{ whiteSpace: "nowrap" }}>
                      <PlayerName p={p} notable={notable} />
                      <span style={{ color: "var(--muted)", fontSize: ".72rem", marginLeft: 6 }}>
                        {str(p.position?.abbreviation)}
                      </span>
                    </td>
                    <td>{num(b.atBats) ?? 0}</td>
                    <td>{num(b.runs) ?? 0}</td>
                    <td style={{ fontWeight: 600 }}>{num(b.hits) ?? 0}</td>
                    <td>{num(b.rbi) ?? 0}</td>
                    <td>{num(b.baseOnBalls) ?? 0}</td>
                    <td>{num(b.strikeOuts) ?? 0}</td>
                    <td style={{ fontFamily: "var(--font-mono)", fontSize: ".78rem" }}>
                      {avgNum != null ? avg3(avgNum) : str(b.avg) || "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {pits.length > 0 && (
        <div className="card scroll-x" style={{ padding: ".5rem .7rem" }}>
          <table className="stat">
            <thead>
              <tr>
                <th style={{ textAlign: "left" }}>Pitching</th>
                <th>IP</th><th>H</th><th>R</th><th>ER</th><th>BB</th><th>K</th><th>ERA</th>
              </tr>
            </thead>
            <tbody>
              {pits.map((p) => {
                const pi = p.stats?.pitching ?? {};
                return (
                  <tr key={p.person.id}>
                    <td style={{ whiteSpace: "nowrap" }}>
                      <PlayerName p={p} notable={notable} />
                    </td>
                    <td>{str(pi.inningsPitched) || "0.0"}</td>
                    <td>{num(pi.hits) ?? 0}</td>
                    <td>{num(pi.runs) ?? 0}</td>
                    <td>{num(pi.earnedRuns) ?? 0}</td>
                    <td>{num(pi.baseOnBalls) ?? 0}</td>
                    <td>{num(pi.strikeOuts) ?? 0}</td>
                    <td style={{ fontFamily: "var(--font-mono)", fontSize: ".78rem" }}>{str(pi.era) || "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
