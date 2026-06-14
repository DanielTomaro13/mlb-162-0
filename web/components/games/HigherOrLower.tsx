"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  loadGamesData,
  rng,
  pickN,
  type GamePlayer,
} from "@/lib/games-data";
import { recordScore, getScore } from "@/lib/progress";
import { submitScore } from "@/lib/leaderboard";
import { teamColors } from "@/lib/teams";
import { settle, fanfare } from "@/lib/sound";
import Confetti from "@/components/Confetti";

const GAME = "higher-or-lower";

/** Which sub-pool a stat draws from — hitters and pitchers have disjoint lines. */
type Kind = GamePlayer["kind"]; // "bat" | "pit"

/** A stat key valid for the matching `kind` of player. */
type HitterStatKey = "hr" | "rbi" | "hits" | "sb" | "runs";
type PitcherStatKey = "so" | "w" | "sv" | "ip";
type StatKey = HitterStatKey | PitcherStatKey;

interface Stat {
  key: StatKey;
  label: string;
  kind: Kind;
}

const STATS: Stat[] = [
  // Hitter stats — both players kind === "bat".
  { key: "hr", label: "career home runs", kind: "bat" },
  { key: "rbi", label: "career RBIs", kind: "bat" },
  { key: "hits", label: "career hits", kind: "bat" },
  { key: "sb", label: "career stolen bases", kind: "bat" },
  { key: "runs", label: "career runs", kind: "bat" },
  // Pitcher stats — both players kind === "pit".
  { key: "so", label: "career strikeouts", kind: "pit" },
  { key: "w", label: "career wins", kind: "pit" },
  { key: "sv", label: "career saves", kind: "pit" },
  { key: "ip", label: "career innings pitched", kind: "pit" },
];

/** Read a numeric stat off a player. The key is constrained to real fields. */
function statValue(p: GamePlayer, key: StatKey): number {
  return p[key];
}

/** A stat may be a fractional number (innings) — show one decimal when needed. */
function fmtStat(v: number): string {
  return Number.isInteger(v) ? String(v) : v.toFixed(1);
}

type Phase = "loading" | "playing" | "revealing" | "over";
type Choice = "higher" | "lower";

interface Round {
  left: GamePlayer;
  right: GamePlayer;
  stat: Stat;
}

export default function HigherOrLower() {
  // Players split by kind so every round can keep the matchup fair.
  const batPoolRef = useRef<GamePlayer[]>([]);
  const pitPoolRef = useRef<GamePlayer[]>([]);
  const randRef = useRef<() => number>(() => Math.random());

  const [phase, setPhase] = useState<Phase>("loading");
  const [round, setRound] = useState<Round | null>(null);
  const [streak, setStreak] = useState(0);
  const [best, setBest] = useState(0);
  const [celebrate, setCelebrate] = useState(false);
  const [reveal, setReveal] = useState<{ correct: boolean; value: number } | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);

  const poolForKind = useCallback((kind: Kind): GamePlayer[] => {
    return kind === "bat" ? batPoolRef.current : pitPoolRef.current;
  }, []);

  /** Which stats can be used right now, given that we have enough of each kind. */
  const usableStats = useCallback((): Stat[] => {
    return STATS.filter((s) => poolForKind(s.kind).length >= 2);
  }, [poolForKind]);

  /**
   * Pick a stat + two distinct players of the matching kind whose values for
   * that stat differ. When `leftFixed` is given, the new card must share that
   * player's kind (so the carried-over left card stays valid for the stat).
   */
  const makeMatchup = useCallback(
    (leftFixed?: GamePlayer): Round | null => {
      const rand = randRef.current;
      const stats = usableStats();
      if (stats.length === 0) return null;

      // If we're carrying a card over, only stats for its kind are eligible.
      const eligible = leftFixed
        ? stats.filter((s) => s.kind === leftFixed.kind)
        : stats;
      if (eligible.length === 0) return null;

      for (let attempt = 0; attempt < 40; attempt++) {
        const stat = eligible[Math.floor(rand() * eligible.length)];
        const pool = poolForKind(stat.kind);

        if (leftFixed) {
          // Find a challenger that differs on this stat from the fixed left card.
          const candidates = pickN(
            pool.filter(
              (p) =>
                p.id !== leftFixed.id &&
                statValue(p, stat.key) !== statValue(leftFixed, stat.key)
            ),
            1,
            rand
          );
          if (candidates.length === 1) {
            return { left: leftFixed, right: candidates[0], stat };
          }
        } else {
          const two = pickN(pool, 2, rand);
          if (
            two.length === 2 &&
            statValue(two[0], stat.key) !== statValue(two[1], stat.key)
          ) {
            return { left: two[0], right: two[1], stat };
          }
        }
      }
      return null;
    },
    [poolForKind, usableStats]
  );

  const startRun = useCallback(() => {
    randRef.current = rng((Date.now() ^ Math.floor(Math.random() * 0x7fffffff)) >>> 0);
    setStreak(0);
    setReveal(null);
    setCelebrate(false);
    const first = makeMatchup();
    if (!first) {
      setError("Not enough player data to play.");
      setPhase("over");
      return;
    }
    setRound(first);
    setPhase("playing");
  }, [makeMatchup]);

  // Load data once on mount.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await loadGamesData();
        if (!alive) return;
        const famous = data.players.filter((p) => p.fame > 30);
        const pool = famous.length >= 2 ? famous : data.players;
        batPoolRef.current = pool.filter((p) => p.kind === "bat");
        pitPoolRef.current = pool.filter((p) => p.kind === "pit");
        setBest(getScore(GAME).best);
        startRun();
      } catch {
        if (alive) {
          setError("Couldn't load the player data. Try again later.");
          setPhase("over");
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, [startRun]);

  const endRun = useCallback((finalStreak: number) => {
    const isBest = recordScore(GAME, finalStreak, true);
    if (isBest) setBest(finalStreak);
    else setBest(getScore(GAME).best);
    // Fire-and-forget; never block the UI on the network.
    void submitScore(GAME, finalStreak, true).catch(() => {});
    if (isBest && finalStreak > 0) {
      setCelebrate(true);
      fanfare();
    }
  }, []);

  const answer = useCallback(
    (choice: Choice) => {
      if (phase !== "playing" || !round) return;
      const { left, right, stat } = round;
      const rightVal = statValue(right, stat.key);
      const leftVal = statValue(left, stat.key);
      const correct =
        choice === "higher" ? rightVal > leftVal : rightVal < leftVal;

      setReveal({ correct, value: rightVal });
      setPhase("revealing");
      if (correct) settle();

      window.setTimeout(() => {
        if (correct) {
          const nextStreak = streak + 1;
          setStreak(nextStreak);
          // The challenger slides over to become the new "known" left card.
          const next = makeMatchup(right);
          if (!next) {
            // Ran out of fresh matchups — bank it as a win-cap game over.
            endRun(nextStreak);
            setReveal(null);
            setPhase("over");
            return;
          }
          setReveal(null);
          setRound(next);
          setPhase("playing");
        } else {
          endRun(streak);
          setReveal(null);
          setPhase("over");
        }
      }, 1050);
    },
    [phase, round, streak, makeMatchup, endRun]
  );

  return (
    <section style={{ display: "grid", gap: "1rem" }}>
      {celebrate && <Confetti />}
      <Scoreboard streak={streak} best={best} />

      {phase === "loading" && (
        <div className="card" style={cardPad}>
          <p style={{ color: "var(--muted)", margin: 0 }}>Loading players…</p>
        </div>
      )}

      {phase === "over" && (
        <GameOver
          streak={streak}
          best={best}
          error={error}
          onPlayAgain={() => {
            setError(null);
            startRun();
          }}
        />
      )}

      {(phase === "playing" || phase === "revealing") && round && (
        <>
          <div
            style={{
              textAlign: "center",
              fontWeight: 700,
              color: "var(--muted)",
              fontSize: ".95rem",
              textTransform: "uppercase",
              letterSpacing: ".04em",
            }}
          >
            Who has more{" "}
            <span style={{ color: "var(--gold)" }}>{round.stat.label}</span>?
          </div>

          <div style={grid}>
            {/* LEFT — known card */}
            <PlayerCard
              player={round.left}
              statKey={round.stat.key}
              statLabel={round.stat.label}
              shown
              tone="known"
            />

            {/* RIGHT — challenger */}
            <PlayerCard
              key={round.right.id}
              player={round.right}
              statKey={round.stat.key}
              statLabel={round.stat.label}
              shown={reveal !== null}
              reveal={reveal}
              tone="challenger"
            />
          </div>

          <div style={btnRow}>
            <button
              className="btn btn-primary"
              style={tapBtn}
              disabled={phase !== "playing"}
              onClick={() => answer("higher")}
            >
              ▲ More
            </button>
            <button
              className="btn btn-primary"
              style={tapBtn}
              disabled={phase !== "playing"}
              onClick={() => answer("lower")}
            >
              ▼ Fewer
            </button>
          </div>
        </>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Sub-components                                                       */
/* ------------------------------------------------------------------ */

function Scoreboard({ streak, best }: { streak: number; best: number }) {
  return (
    <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
      <span className="chip">
        Streak <strong style={{ color: "var(--accent)" }}>{streak}</strong>
      </span>
      <span className="chip">
        Best <strong style={{ color: "var(--gold)" }}>{best}</strong>
      </span>
    </div>
  );
}

function PlayerCard({
  player,
  statKey,
  statLabel,
  shown,
  reveal,
  tone,
}: {
  player: GamePlayer;
  statKey: StatKey;
  statLabel: string;
  shown: boolean;
  reveal?: { correct: boolean; value: number } | null;
  tone: "known" | "challenger";
}) {
  const [primary, secondary] = teamColors(player.team);
  const value = statValue(player, statKey);

  let valueColor = "var(--text)";
  if (tone === "challenger" && reveal) {
    valueColor = reveal.correct ? "var(--accent-2)" : "var(--danger)";
  }

  return (
    <div
      className="card"
      style={{
        padding: "1.1rem 1rem",
        display: "grid",
        gap: 10,
        alignContent: "start",
        textAlign: "center",
        borderColor:
          tone === "challenger" ? "var(--accent)" : "var(--border)",
        transition: "border-color .25s ease",
      }}
    >
      <div style={{ display: "grid", gap: 4, justifyItems: "center" }}>
        <h3
          style={{
            margin: 0,
            fontSize: "1.15rem",
            fontWeight: 900,
            lineHeight: 1.15,
          }}
        >
          {player.name}
        </h3>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 7,
            color: "var(--muted)",
            fontSize: ".85rem",
          }}
        >
          <span
            aria-hidden
            style={{
              width: 12,
              height: 12,
              borderRadius: "50%",
              background: primary,
              border: `2px solid ${secondary}`,
              flex: "0 0 auto",
            }}
          />
          {player.team}
        </div>
        <div style={{ color: "var(--muted)", fontSize: ".8rem" }}>
          {player.pos} · {player.firstYear}–{player.lastYear}
        </div>
      </div>

      <div
        style={{
          marginTop: 4,
          padding: "0.75rem 0.5rem",
          background: "var(--panel-2)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          minHeight: 88,
          display: "grid",
          alignContent: "center",
          gap: 2,
        }}
      >
        <div
          style={{
            fontSize: "2.4rem",
            fontWeight: 900,
            lineHeight: 1,
            color: valueColor,
            transition: "color .2s ease",
          }}
        >
          {shown ? fmtStat(value) : "?"}
        </div>
        <div
          style={{
            fontSize: ".72rem",
            textTransform: "uppercase",
            letterSpacing: ".05em",
            color: "var(--muted)",
          }}
        >
          {statLabel}
        </div>
      </div>
    </div>
  );
}

function GameOver({
  streak,
  best,
  error,
  onPlayAgain,
}: {
  streak: number;
  best: number;
  error: string | null;
  onPlayAgain: () => void;
}) {
  return (
    <div
      className="card"
      style={{ ...cardPad, textAlign: "center", display: "grid", gap: 14 }}
    >
      {error ? (
        <p style={{ margin: 0, color: "var(--danger)", fontWeight: 700 }}>
          {error}
        </p>
      ) : (
        <>
          <div style={{ fontSize: "1.4rem", fontWeight: 900 }}>
            Game over — streak{" "}
            <span style={{ color: "var(--accent)" }}>{streak}</span>
          </div>
          <div style={{ color: "var(--muted)" }}>
            Best <strong style={{ color: "var(--gold)" }}>{best}</strong>
          </div>
        </>
      )}
      <div style={{ display: "flex", justifyContent: "center" }}>
        <button className="btn btn-primary" style={tapBtn} onClick={onPlayAgain}>
          Play again
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Inline style helpers                                                 */
/* ------------------------------------------------------------------ */

const cardPad: React.CSSProperties = { padding: "1.5rem" };

const grid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 240px), 1fr))",
  gap: "1rem",
  alignItems: "stretch",
};

const btnRow: React.CSSProperties = {
  display: "flex",
  gap: "1rem",
  justifyContent: "center",
  flexWrap: "wrap",
};

const tapBtn: React.CSSProperties = {
  minHeight: 48,
  minWidth: 140,
  fontSize: "1.05rem",
  fontWeight: 800,
};
