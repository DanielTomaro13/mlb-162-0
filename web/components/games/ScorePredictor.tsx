"use client";

/**
 * Score Predictor — predict the final score (runs) of 10 real MLB games.
 *
 * Exact final score = 5 pts, correct winner (or tie) = 2 pts, else 0.
 * Best of 50. Scores are tracked locally and submitted to the leaderboard.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { loadResults, type GameResult } from "@/lib/data";
import { recordScore, getScore } from "@/lib/progress";
import { submitScore } from "@/lib/leaderboard";
import { teamColors } from "@/lib/teams";
import { settle, fanfare } from "@/lib/sound";

const GAME = "score-predictor";
const GAMES = 10;
const MAX_SCORE = GAMES * 5;
/** Stepper bounds — MLB run totals are typically 0–15; give headroom. */
const MIN_RUNS = 0;
const MAX_RUNS = 20;
const DEFAULT_RUNS = 4;

/** A real, completed game with non-null run totals. */
interface FinalGame {
  date: string;
  home: string;
  away: string;
  hs: number;
  as: number;
}

interface Prediction extends FinalGame {
  /** Predicted home runs. */
  ph: number;
  /** Predicted away runs. */
  pa: number;
  locked: boolean;
  /** Points earned once locked (null while unlocked). */
  points: number | null;
}

/** Fisher–Yates shuffle returning the first `n` items, seeded by a number. */
function pickRandom<T>(arr: readonly T[], n: number, seed: number): T[] {
  const a = [...arr];
  let s = seed >>> 0 || 1;
  const rand = () => {
    // xorshift32 — deterministic per seed, good enough for shuffling.
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 1_000_000) / 1_000_000;
  };
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, Math.min(n, a.length));
}

function outcome(h: number, a: number): "home" | "away" | "tie" {
  if (h > a) return "home";
  if (a > h) return "away";
  return "tie";
}

/** Score a single prediction against the real result. */
function scoreGame(g: Prediction): number {
  if (g.ph === g.hs && g.pa === g.as) return 5;
  if (outcome(g.ph, g.pa) === outcome(g.hs, g.as)) return 2;
  return 0;
}

/** A completed game has a Final status and both run totals present. */
function isFinal(r: GameResult): r is GameResult & { hs: number; as: number } {
  return r.status === "Final" && r.hs !== null && r.as !== null;
}

function Dot({ team }: { team: string }) {
  const [primary, secondary] = teamColors(team);
  return (
    <span
      aria-hidden
      style={{
        display: "inline-block",
        width: 14,
        height: 14,
        borderRadius: "50%",
        background: primary,
        border: `2px solid ${secondary}`,
        flex: "0 0 auto",
      }}
    />
  );
}

function Stepper({
  value,
  onChange,
  disabled,
  label,
}: {
  value: number;
  onChange: (v: number) => void;
  disabled: boolean;
  label: string;
}) {
  const btn: React.CSSProperties = {
    minWidth: 40,
    minHeight: 40,
    fontSize: 20,
    fontWeight: 700,
    lineHeight: 1,
    borderRadius: 8,
    border: "1px solid var(--border)",
    background: "var(--panel-2)",
    color: "var(--text)",
    cursor: disabled ? "default" : "pointer",
    opacity: disabled ? 0.5 : 1,
  };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <button
        type="button"
        aria-label={`Decrease ${label}`}
        style={btn}
        disabled={disabled || value <= MIN_RUNS}
        onClick={() => onChange(Math.max(MIN_RUNS, value - 1))}
      >
        −
      </button>
      <span
        aria-label={`${label} prediction`}
        style={{
          minWidth: 40,
          textAlign: "center",
          fontSize: 24,
          fontWeight: 800,
          fontVariantNumeric: "tabular-nums",
          color: "var(--text)",
        }}
      >
        {value}
      </span>
      <button
        type="button"
        aria-label={`Increase ${label}`}
        style={btn}
        disabled={disabled || value >= MAX_RUNS}
        onClick={() => onChange(Math.min(MAX_RUNS, value + 1))}
      >
        +
      </button>
    </div>
  );
}

export default function ScorePredictor() {
  const [season, setSeason] = useState<string>("");
  const [pool, setPool] = useState<FinalGame[]>([]);
  const [games, setGames] = useState<Prediction[]>([]);
  const [seed, setSeed] = useState<number>(() => Date.now());
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [best, setBest] = useState<number>(0);
  const [submitted, setSubmitted] = useState(false);

  // Fetch real results once.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await loadResults();
        if (!alive) return;
        const finals: FinalGame[] = data.schedule.results
          .filter(isFinal)
          .map((r) => ({
            date: r.date,
            home: r.home,
            away: r.away,
            hs: r.hs,
            as: r.as,
          }));
        setSeason(data.liveSeason || data.seasons[0] || "");
        setPool(finals);
        setStatus(finals.length ? "ready" : "error");
      } catch {
        if (alive) setStatus("error");
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    setBest(getScore(GAME).best);
  }, []);

  // (Re)build the 10 predictions whenever the pool or seed changes.
  useEffect(() => {
    if (!pool.length) return;
    const chosen = pickRandom(pool, GAMES, seed);
    setGames(
      chosen.map((g) => ({
        ...g,
        ph: DEFAULT_RUNS,
        pa: DEFAULT_RUNS,
        locked: false,
        points: null,
      }))
    );
    setSubmitted(false);
  }, [pool, seed]);

  const lockedCount = games.filter((g) => g.locked).length;
  const allLocked = games.length > 0 && lockedCount === games.length;
  const total = useMemo(
    () => games.reduce((sum, g) => sum + (g.points ?? 0), 0),
    [games]
  );

  const setPred = useCallback(
    (idx: number, key: "ph" | "pa", v: number) => {
      setGames((prev) =>
        prev.map((g, i) => (i === idx && !g.locked ? { ...g, [key]: v } : g))
      );
    },
    []
  );

  const lockOne = useCallback((idx: number) => {
    setGames((prev) =>
      prev.map((g, i) => {
        if (i !== idx || g.locked) return g;
        const points = scoreGame(g);
        if (points === 5) fanfare();
        else if (points === 2) settle();
        return { ...g, locked: true, points };
      })
    );
  }, []);

  const revealAll = useCallback(() => {
    setGames((prev) =>
      prev.map((g) =>
        g.locked ? g : { ...g, locked: true, points: scoreGame(g) }
      )
    );
    settle();
  }, []);

  // When every game is locked, record + submit the total once.
  useEffect(() => {
    if (!allLocked || submitted) return;
    setSubmitted(true);
    recordScore(GAME, total, true);
    void submitScore(GAME, total, true);
    setBest(getScore(GAME).best);
  }, [allLocked, submitted, total]);

  const playAgain = useCallback(() => setSeed(Date.now()), []);

  if (status === "loading") {
    return (
      <div className="card" style={{ padding: 24, color: "var(--muted)" }}>
        Loading games…
      </div>
    );
  }
  if (status === "error") {
    return (
      <div className="card" style={{ padding: 24, color: "var(--danger)" }}>
        Couldn’t load game results. Please try again later.
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Header / running total */}
      <header
        className="card"
        style={{
          padding: 16,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
          position: "sticky",
          top: 8,
          zIndex: 5,
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: 20, color: "var(--text)" }}>
            Score Predictor
          </h2>
          <p style={{ margin: "4px 0 0", color: "var(--muted)", fontSize: 13 }}>
            {season ? `${season} season · ` : ""}exact = 5 · winner = 2
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span className="chip">{lockedCount}/{games.length} locked</span>
          <span className="chip">Best {best}</span>
          <span
            className="chip"
            style={{
              background: "var(--accent)",
              color: "#10100f",
              fontWeight: 800,
              borderColor: "transparent",
            }}
          >
            {total} pts
          </span>
        </div>
      </header>

      {/* Reveal all */}
      {!allLocked && (
        <button
          type="button"
          className="btn"
          onClick={revealAll}
          disabled={lockedCount === games.length}
          style={{ alignSelf: "flex-start" }}
        >
          Reveal all remaining
        </button>
      )}

      {/* Games */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {games.map((g, i) => {
          const pts = g.points;
          const ptsColor =
            pts === 5 ? "var(--gold)" : pts === 2 ? "var(--accent-2)" : "var(--danger)";
          return (
            <div
              key={`${g.date}-${g.home}-${g.away}-${i}`}
              className="card"
              style={{
                padding: 16,
                display: "flex",
                flexDirection: "column",
                gap: 14,
                borderColor: g.locked ? ptsColor : "var(--border)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                }}
              >
                <span style={{ fontSize: 12, color: "var(--muted)" }}>
                  {g.date}
                </span>
                {g.locked && (
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 800,
                      color: ptsColor,
                      whiteSpace: "nowrap",
                    }}
                  >
                    +{pts} pts
                  </span>
                )}
              </div>

              {/* Teams + steppers */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr auto",
                  gap: 12,
                  alignItems: "center",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                  <Dot team={g.away} />
                  <span
                    style={{
                      color: "var(--text)",
                      fontWeight: 600,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {g.away}
                  </span>
                </div>
                <Stepper
                  value={g.pa}
                  disabled={g.locked}
                  label={`${g.away} away runs`}
                  onChange={(v) => setPred(i, "pa", v)}
                />

                <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                  <Dot team={g.home} />
                  <span
                    style={{
                      color: "var(--text)",
                      fontWeight: 600,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {g.home}
                  </span>
                </div>
                <Stepper
                  value={g.ph}
                  disabled={g.locked}
                  label={`${g.home} home runs`}
                  onChange={(v) => setPred(i, "ph", v)}
                />
              </div>

              {/* Action / result */}
              {g.locked ? (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                    flexWrap: "wrap",
                    paddingTop: 4,
                    borderTop: "1px solid var(--border)",
                  }}
                >
                  <span style={{ color: "var(--muted)", fontSize: 13 }}>
                    You: {g.pa}–{g.ph}
                  </span>
                  <span style={{ color: "var(--text)", fontSize: 15, fontWeight: 700 }}>
                    Final: {g.as}–{g.hs}
                  </span>
                </div>
              ) : (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => lockOne(i)}
                  style={{ minHeight: 40 }}
                >
                  Lock in
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Summary */}
      {allLocked && (
        <div
          className="card"
          style={{
            padding: 24,
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            gap: 12,
            background: "var(--panel-2)",
            borderColor: "var(--accent)",
          }}
        >
          <h3 style={{ margin: 0, color: "var(--text)", fontSize: 18 }}>
            Ballgame over!
          </h3>
          <div
            style={{
              fontSize: 44,
              fontWeight: 900,
              color: "var(--accent)",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {total}
            <span style={{ fontSize: 22, color: "var(--muted)" }}> / {MAX_SCORE}</span>
          </div>
          <p style={{ margin: 0, color: "var(--muted)", fontSize: 14 }}>
            {total > best ? "New personal best!" : `Personal best: ${best}`}
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={playAgain}
            style={{ alignSelf: "center", minHeight: 44, paddingInline: 28 }}
          >
            Play again
          </button>
        </div>
      )}
    </div>
  );
}
