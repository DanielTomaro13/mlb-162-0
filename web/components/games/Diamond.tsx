"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { loadGamesData, dailySeed, rng, dayNumber, type GamePlayer } from "@/lib/games-data";
import { teamAbbr, teamColors } from "@/lib/teams";
import { POS_GROUP, POS_LABEL } from "@/lib/format";
import { recordDaily, todaysResult } from "@/lib/progress";
import DailyStatsPanel from "@/components/games/DailyStats";
import Confetti from "@/components/Confetti";

const GAME = "diamond";
const MAX = 8;

const HEADERS = ["Team", "Type", "Pos", "Debut", "Rating"] as const;

type Verdict = "hit" | "near" | "miss";
type Arrow = "" | "▲" | "▼";

interface Cell {
  label: string;
  verdict: Verdict;
  arrow: Arrow;
}

interface Row {
  player: GamePlayer;
  cells: Cell[];
}

const cellStyle: Record<Verdict, React.CSSProperties> = {
  hit: { background: "var(--accent)", color: "#06121a" },
  near: { background: "var(--gold)", color: "#06121a" },
  miss: { background: "var(--panel-2)", color: "var(--text)" },
};

/** ▲ means the answer is HIGHER than the guess, ▼ lower. */
function numericCell(label: string, guess: number, target: number, tol: number): Cell {
  if (guess === target) return { label, verdict: "hit", arrow: "" };
  const arrow: Arrow = target > guess ? "▲" : "▼";
  const verdict: Verdict = Math.abs(target - guess) <= tol ? "near" : "miss";
  return { label, verdict, arrow };
}

function kindLabel(k: GamePlayer["kind"]): string {
  return k === "bat" ? "Hitter" : "Pitcher";
}

function buildCells(guess: GamePlayer, target: GamePlayer): Cell[] {
  const posVerdict: Verdict =
    guess.pos === target.pos
      ? "hit"
      : POS_GROUP[guess.pos] && POS_GROUP[guess.pos] === POS_GROUP[target.pos]
      ? "near"
      : "miss";

  return [
    {
      label: teamAbbr(guess.team),
      verdict: guess.team === target.team ? "hit" : "miss",
      arrow: "",
    },
    {
      label: kindLabel(guess.kind),
      verdict: guess.kind === target.kind ? "hit" : "miss",
      arrow: "",
    },
    {
      label: guess.pos,
      verdict: posVerdict,
      arrow: "",
    },
    numericCell(String(guess.firstYear), guess.firstYear, target.firstYear, 2),
    numericCell(String(guess.rating), guess.rating, target.rating, 3),
  ];
}

const emojiOf: Record<Verdict, string> = { hit: "🟩", near: "🟨", miss: "⬜" };

export default function Diamond() {
  const [pool, setPool] = useState<GamePlayer[]>([]);
  const [target, setTarget] = useState<GamePlayer | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"loading" | "playing" | "won" | "lost">("loading");
  const [freshWin, setFreshWin] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let alive = true;
    loadGamesData().then((data) => {
      if (!alive) return;
      const byFame = [...data.players].sort((a, b) => b.fame - a.fame);
      const famous = byFame.filter((p) => p.fame > 40);
      const base = (famous.length >= 1 ? famous : byFame).slice(0, 250);
      const t = base[Math.floor(rng(dailySeed("diamond"))() * base.length)];
      setPool(base);
      setTarget(t ?? null);

      const prior = todaysResult(GAME);
      if (prior) {
        // Already played today — show the end state without replay.
        setStatus(prior.won ? "won" : "lost");
        setFreshWin(false);
      } else {
        setStatus("playing");
      }
    });
    return () => {
      alive = false;
    };
  }, []);

  const guessedIds = useMemo(() => new Set(rows.map((r) => r.player.id)), [rows]);

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || status !== "playing") return [];
    return pool
      .filter((p) => !guessedIds.has(p.id) && p.name.toLowerCase().includes(q))
      .slice(0, 6);
  }, [query, pool, guessedIds, status]);

  function submitGuess(p: GamePlayer) {
    if (!target || status !== "playing") return;
    const row: Row = { player: p, cells: buildCells(p, target) };
    const next = [...rows, row];
    setRows(next);
    setQuery("");
    if (p.id === target.id) {
      setStatus("won");
      setFreshWin(true);
      recordDaily(GAME, true, next.length);
    } else if (next.length >= MAX) {
      setStatus("lost");
      recordDaily(GAME, false, 0);
    }
    inputRef.current?.focus();
  }

  const finished = status === "won" || status === "lost";
  const won = status === "won";

  const shareText = useMemo(() => {
    const head = `Diamond #${dayNumber()} ${won ? `${rows.length}/8` : `X/8`}\n`;
    const grid = rows
      .map((r) => r.cells.map((c) => emojiOf[c.verdict]).join(""))
      .join("\n");
    return `${head}${grid}\nmlb162-0.com`;
  }, [won, rows]);

  return (
    <div style={{ display: "grid", gap: 14, maxWidth: 640, margin: "0 auto" }}>
      {status === "loading" && (
        <div className="card" style={{ padding: "1.1rem", color: "var(--muted)" }}>
          Loading today&apos;s player…
        </div>
      )}

      {status !== "loading" && (
        <>
          {/* Legend */}
          <div
            style={{
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
              alignItems: "center",
              fontSize: ".74rem",
              color: "var(--muted)",
            }}
          >
            <LegendSwatch color="var(--accent)" label="exact" />
            <LegendSwatch color="var(--gold)" label="close (same position group, debut ±2, rating ±3)" />
            <span>▲ higher · ▼ lower</span>
          </div>

          {/* Search */}
          {status === "playing" && (
            <div style={{ position: "relative" }}>
              <input
                ref={inputRef}
                value={query}
                autoFocus
                placeholder={`Guess a player (${rows.length}/${MAX})`}
                onChange={(e) => setQuery(e.target.value)}
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  fontSize: 16,
                  padding: "12px 14px",
                  borderRadius: 10,
                  background: "var(--panel)",
                  border: "1px solid var(--border)",
                  color: "var(--text)",
                  outline: "none",
                }}
              />
              {suggestions.length > 0 && (
                <div
                  className="card"
                  style={{
                    position: "absolute",
                    top: "calc(100% + 4px)",
                    left: 0,
                    right: 0,
                    zIndex: 20,
                    padding: 4,
                    display: "grid",
                    gap: 2,
                  }}
                >
                  {suggestions.map((p) => {
                    const [primary] = teamColors(p.team);
                    return (
                      <button
                        key={p.id}
                        onClick={() => submitGuess(p)}
                        style={{
                          textAlign: "left",
                          background: "transparent",
                          border: "none",
                          color: "var(--text)",
                          padding: "10px 12px",
                          borderRadius: 8,
                          cursor: "pointer",
                          fontSize: 15,
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: 10,
                        }}
                      >
                        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span
                            aria-hidden
                            style={{
                              width: 10,
                              height: 10,
                              borderRadius: "50%",
                              background: primary,
                              display: "inline-block",
                              flexShrink: 0,
                            }}
                          />
                          {p.name}
                        </span>
                        <span style={{ color: "var(--muted)", fontSize: ".82rem" }}>
                          {teamAbbr(p.team)} · {p.pos}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Header row */}
          {rows.length > 0 && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1.6fr repeat(5,1fr)",
                gap: 6,
                fontSize: ".66rem",
                color: "var(--muted)",
                textTransform: "uppercase",
                letterSpacing: ".05em",
                padding: "0 2px",
              }}
            >
              <span>Player</span>
              {HEADERS.map((h) => (
                <span key={h} style={{ textAlign: "center" }}>
                  {h}
                </span>
              ))}
            </div>
          )}

          {/* Guess rows */}
          <div style={{ display: "grid", gap: 6 }}>
            {rows.map((r, i) => (
              <div
                key={r.player.id}
                className={i === rows.length - 1 ? "pop" : undefined}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.6fr repeat(5,1fr)",
                  gap: 6,
                }}
              >
                <div
                  style={{
                    background: "var(--panel)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    padding: "8px 10px",
                    fontSize: ".85rem",
                    fontWeight: 600,
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  {r.player.name}
                </div>
                {r.cells.map((c, j) => (
                  <div
                    key={j}
                    style={{
                      ...cellStyle[c.verdict],
                      borderRadius: 8,
                      padding: "8px 4px",
                      textAlign: "center",
                      fontSize: ".82rem",
                      fontWeight: 700,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 3,
                      minHeight: 36,
                      lineHeight: 1.1,
                      overflow: "hidden",
                    }}
                  >
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {c.label}
                    </span>
                    {c.arrow && <span aria-hidden>{c.arrow}</span>}
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Result */}
          {finished && (
            <div
              className="card"
              style={{
                padding: "1rem 1.1rem",
                display: "grid",
                gap: 6,
                borderColor: won ? "var(--accent)" : "var(--danger)",
              }}
            >
              <div
                style={{
                  fontFamily: "var(--font-cond)",
                  fontSize: "1.5rem",
                  color: won ? "var(--accent)" : "var(--danger)",
                }}
              >
                {won ? `Got it in ${rows.length}!` : "Out of guesses"}
              </div>
              {target && (
                <div style={{ fontSize: ".9rem", color: "var(--muted)" }}>
                  The answer was{" "}
                  <strong style={{ color: "var(--text)" }}>{target.name}</strong> ({teamAbbr(target.team)} ·{" "}
                  {POS_LABEL[target.pos] ?? target.pos})
                </div>
              )}
            </div>
          )}

          {freshWin && won && <Confetti />}

          {finished && <DailyStatsPanel game="diamond" shareText={shareText} />}
        </>
      )}
    </div>
  );
}

function LegendSwatch({ color, label }: { color: string; label: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <span
        style={{
          width: 12,
          height: 12,
          borderRadius: 3,
          background: color,
          display: "inline-block",
        }}
      />
      {label}
    </span>
  );
}
