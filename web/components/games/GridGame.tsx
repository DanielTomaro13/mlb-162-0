"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { loadGrid, type GridData, type GridPlayer } from "@/lib/data";
import { dailySeed, rng, dayNumber, pickN } from "@/lib/games-data";
import { recordDaily, todaysResult } from "@/lib/progress";
import { submitScore } from "@/lib/leaderboard";
import DailyStatsPanel from "@/components/games/DailyStats";
import Confetti from "@/components/Confetti";

const GAME = "grid";
const SIZE = 3;
const CELLS = SIZE * SIZE;
const MIN_PER_CELL = 2; // every intersection must be solvable by ≥2 players
const MAX_TRIES = 400; // generation attempts before falling back

/** A category is either a team abbreviation or a single-season stat key. */
interface Category {
  id: string; // team abbr ("NYY") or stat key ("hr30")
  kind: "team" | "stat";
  label: string; // display text (abbr for teams, full label for stats)
}

interface Puzzle {
  rows: Category[]; // length 3 (left side, top→bottom)
  cols: Category[]; // length 3 (top, left→right)
}

/** State of a single grid cell. */
type CellState =
  | { status: "empty" }
  | { status: "correct"; name: string }
  | { status: "missed"; name: string };

/**
 * Build, for every category, the set of player ids that satisfy it. A player
 * satisfies category C iff C ∈ player.teams OR C ∈ player.flags.
 */
function buildIndex(players: GridPlayer[]): Map<string, Set<number>> {
  const idx = new Map<string, Set<number>>();
  const add = (key: string, id: number) => {
    let s = idx.get(key);
    if (!s) {
      s = new Set<number>();
      idx.set(key, s);
    }
    s.add(id);
  };
  for (const p of players) {
    for (const t of p.teams) add(t, p.id);
    for (const f of p.flags) add(f, p.id);
  }
  return idx;
}

/** Players satisfying BOTH categories — i.e. the valid answers for a cell. */
function intersectionIds(
  idx: Map<string, Set<number>>,
  a: string,
  b: string
): Set<number> {
  const sa = idx.get(a);
  const sb = idx.get(b);
  const out = new Set<number>();
  if (!sa || !sb) return out;
  const [small, big] = sa.size <= sb.size ? [sa, sb] : [sb, sa];
  for (const id of small) if (big.has(id)) out.add(id);
  return out;
}

/**
 * Deterministically generate today's puzzle from a seeded PRNG. We draw six
 * categories with a team/stat mix and require every one of the nine
 * intersections to be satisfiable by at least MIN_PER_CELL players, retrying
 * (advancing the same rng) until valid or MAX_TRIES is reached.
 */
function generatePuzzle(data: GridData, rand: () => number): Puzzle {
  const teamCats: Category[] = data.teams.map((t) => ({
    id: t,
    kind: "team",
    label: t,
  }));
  const statCats: Category[] = data.stats.map((s) => ({
    id: s.key,
    kind: "stat",
    label: s.label,
  }));
  const idx = buildIndex(data.players);

  // Only consider categories that actually have players behind them.
  const usableTeams = teamCats.filter((c) => (idx.get(c.id)?.size ?? 0) > 0);
  const usableStats = statCats.filter((c) => (idx.get(c.id)?.size ?? 0) > 0);

  const valid = (rows: Category[], cols: Category[]): boolean => {
    for (const r of rows) {
      for (const c of cols) {
        if (intersectionIds(idx, r.id, c.id).size < MIN_PER_CELL) return false;
      }
    }
    return true;
  };

  let fallback: Puzzle | null = null;

  for (let attempt = 0; attempt < MAX_TRIES; attempt++) {
    // Mix: 3–4 teams and 2–3 stats across the six categories.
    const nTeams = 3 + Math.floor(rand() * 2); // 3 or 4
    const nStats = SIZE * 2 - nTeams; // 3 or 2
    if (usableTeams.length < nTeams || usableStats.length < nStats) continue;

    const teams = pickN(usableTeams, nTeams, rand);
    const stats = pickN(usableStats, nStats, rand);
    const six = pickN([...teams, ...stats], SIZE * 2, rand);
    const rows = six.slice(0, SIZE);
    const cols = six.slice(SIZE, SIZE * 2);

    // Track a best-effort fallback (first generated) in case nothing validates.
    if (!fallback) fallback = { rows, cols };

    if (valid(rows, cols)) return { rows, cols };
  }

  // Should not happen with a healthy dataset, but keep the game playable.
  return fallback ?? { rows: usableTeams.slice(0, 3), cols: usableStats.slice(0, 3) };
}

const norm = (s: string): string =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();

export default function GridGame() {
  const [data, setData] = useState<GridData | null>(null);
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [cells, setCells] = useState<CellState[]>(
    () => Array.from({ length: CELLS }, () => ({ status: "empty" }) as CellState)
  );
  const [active, setActive] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"loading" | "playing" | "done">("loading");
  const [freshWin, setFreshWin] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Build the index once data is available — used for answer validation.
  const index = useMemo(
    () => (data ? buildIndex(data.players) : new Map<string, Set<number>>()),
    [data]
  );
  useEffect(() => {
    let alive = true;
    loadGrid().then((d) => {
      if (!alive) return;
      const rand = rng(dailySeed(GAME));
      const pz = generatePuzzle(d, rand);
      setData(d);
      setPuzzle(pz);

      const prior = todaysResult(GAME);
      if (prior) {
        // Already played today — show end state, no replay.
        setStatus("done");
        setFreshWin(false);
      } else {
        setStatus("playing");
      }
    });
    return () => {
      alive = false;
    };
  }, []);

  // Names already placed (correct or missed) — each player usable once.
  const usedNames = useMemo(() => {
    const s = new Set<string>();
    for (const c of cells) {
      if (c.status === "correct" || c.status === "missed") s.add(norm(c.name));
    }
    return s;
  }, [cells]);

  const correctCount = useMemo(
    () => cells.filter((c) => c.status === "correct").length,
    [cells]
  );

  const suggestions = useMemo(() => {
    const q = norm(query);
    if (!q || active === null || !data || status !== "playing") return [];
    return data.players
      .filter((p) => !usedNames.has(norm(p.name)) && norm(p.name).includes(q))
      .sort((a, b) => b.fame - a.fame)
      .slice(0, 6);
  }, [query, active, data, usedNames, status]);

  function finishIfDone(next: CellState[]) {
    const filled = next.every((c) => c.status !== "empty");
    if (!filled) return;
    const correct = next.filter((c) => c.status === "correct").length;
    setStatus("done");
    setFreshWin(correct === CELLS);
    recordDaily(GAME, correct === CELLS, correct);
    // Higher-is-better board: 0–9 correct.
    void submitScore(GAME, correct, true);
  }

  function pickPlayer(p: GridPlayer) {
    if (active === null || !puzzle || status !== "playing") return;
    const cell = cells[active];
    if (!cell || cell.status !== "empty") return;
    if (usedNames.has(norm(p.name))) return;

    const r = Math.floor(active / SIZE);
    const c = active % SIZE;
    const rowCat = puzzle.rows[r];
    const colCat = puzzle.cols[c];
    if (!rowCat || !colCat) return;

    const ok = intersectionIds(index, rowCat.id, colCat.id).has(p.id);
    const next = [...cells];
    next[active] = ok
      ? { status: "correct", name: p.name }
      : { status: "missed", name: p.name };
    setCells(next);
    setQuery("");
    setActive(null);
    finishIfDone(next);
  }

  const done = status === "done";

  const shareText = useMemo(() => {
    const emojiGrid: string[] = [];
    for (let r = 0; r < SIZE; r++) {
      let line = "";
      for (let c = 0; c < SIZE; c++) {
        const cell = cells[r * SIZE + c];
        line += cell && cell.status === "correct" ? "🟩" : "⬜";
      }
      emojiGrid.push(line);
    }
    return `MLB 162-0 Grid #${dayNumber()} — ${correctCount}/9 ⬛-grid\n${emojiGrid.join(
      "\n"
    )}\nmlb162-0.com`;
  }, [cells, correctCount]);

  if (status === "loading" || !puzzle) {
    return (
      <div className="card" style={{ padding: "1.25rem", color: "var(--muted)" }}>
        Loading today&apos;s grid…
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 14, maxWidth: 560, margin: "0 auto" }}>
      {freshWin && <Confetti />}

      {/* Status bar */}
      <div
        className="card"
        style={{
          padding: "0.85rem 1rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            fontSize: ".7rem",
            textTransform: "uppercase",
            letterSpacing: ".06em",
            color: "var(--muted)",
          }}
        >
          Immaculate Grid · #{dayNumber()}
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
          <span
            style={{
              fontFamily: "var(--font-cond)",
              fontSize: "1.6rem",
              lineHeight: 1,
              color: correctCount === CELLS ? "var(--accent-2)" : "var(--text)",
            }}
          >
            {correctCount}
          </span>
          <span style={{ color: "var(--muted)", fontSize: ".9rem" }}>/ 9</span>
        </div>
      </div>

      {/* The grid: a corner cell + 3 column headers, then 3 rows each led by a
          row header. Uses a 4-column CSS grid so headers and cells align. */}
      <div
        role="grid"
        aria-label="Immaculate Grid"
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(56px, 0.8fr) repeat(3, 1fr)",
          gap: 6,
        }}
      >
        {/* Top-left corner spacer */}
        <div aria-hidden />

        {/* Column headers */}
        {puzzle.cols.map((cat) => (
          <CategoryHeader key={`col-${cat.id}`} cat={cat} />
        ))}

        {/* Rows */}
        {puzzle.rows.map((rowCat, r) => (
          <RowFragment key={`row-${rowCat.id}`}>
            <CategoryHeader cat={rowCat} side />
            {puzzle.cols.map((_colCat, c) => {
              const i = r * SIZE + c;
              const cell = cells[i] ?? ({ status: "empty" } as CellState);
              const isActive = active === i;
              const interactive = !done && cell.status === "empty";
              return (
                <button
                  key={i}
                  type="button"
                  role="gridcell"
                  aria-label={`Cell ${r + 1}-${c + 1}`}
                  disabled={!interactive}
                  onClick={() => {
                    if (!interactive) return;
                    setActive(i);
                    setQuery("");
                    requestAnimationFrame(() => inputRef.current?.focus());
                  }}
                  style={{
                    aspectRatio: "1 / 1",
                    minHeight: 64,
                    borderRadius: 10,
                    border:
                      isActive && cell.status === "empty"
                        ? "2px solid var(--accent)"
                        : "1px solid var(--border)",
                    background:
                      cell.status === "correct"
                        ? "var(--accent-2)"
                        : cell.status === "missed"
                        ? "var(--panel-2)"
                        : "var(--panel)",
                    color:
                      cell.status === "correct"
                        ? "#06121a"
                        : cell.status === "missed"
                        ? "var(--danger)"
                        : "var(--muted)",
                    cursor: interactive ? "pointer" : "default",
                    padding: 6,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    textAlign: "center",
                    fontSize: ".72rem",
                    fontWeight: 700,
                    lineHeight: 1.15,
                    overflow: "hidden",
                    transition: "border-color .12s ease",
                  }}
                >
                  {cell.status === "empty" ? (
                    isActive ? (
                      "…"
                    ) : (
                      <span style={{ fontSize: "1rem", color: "var(--border)" }}>+</span>
                    )
                  ) : (
                    <span
                      style={{
                        display: "-webkit-box",
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {cell.status === "missed" && (
                        <span aria-hidden style={{ display: "block" }}>
                          ✗
                        </span>
                      )}
                      {cell.name}
                    </span>
                  )}
                </button>
              );
            })}
          </RowFragment>
        ))}
      </div>

      {/* Picker for the active cell */}
      {!done && active !== null && (
        <div style={{ position: "relative" }}>
          <input
            ref={inputRef}
            value={query}
            autoComplete="off"
            spellCheck={false}
            placeholder="Name a player for this square…"
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setActive(null);
                setQuery("");
              }
            }}
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
              {suggestions.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => pickPlayer(p)}
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
                  <span>{p.name}</span>
                  <span style={{ color: "var(--muted)", fontSize: ".78rem" }}>
                    {p.teams.join(" · ")}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {!done && active === null && (
        <p style={{ color: "var(--muted)", fontSize: ".82rem", margin: 0, textAlign: "center" }}>
          Tap a square, then name a player who fits both its row and column.
          One guess per square; each player can be used once.
        </p>
      )}

      {/* Result */}
      {done && (
        <div
          className="card"
          style={{
            padding: "1rem 1.1rem",
            display: "grid",
            gap: 4,
            textAlign: "center",
            borderColor: correctCount === CELLS ? "var(--accent-2)" : "var(--border)",
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-cond)",
              fontSize: "1.6rem",
              color: correctCount === CELLS ? "var(--accent-2)" : "var(--accent)",
            }}
          >
            {correctCount === CELLS ? "Immaculate!" : `${correctCount}/9 filled`}
          </div>
          <div style={{ color: "var(--muted)", fontSize: ".9rem" }}>
            {correctCount === CELLS
              ? "A perfect grid. Come back tomorrow for a new one."
              : "That's today's grid — a new one drops at midnight UTC."}
          </div>
        </div>
      )}

      {done && <DailyStatsPanel game={GAME} shareText={shareText} />}
    </div>
  );
}

/** Header chip for a category. Teams render as a bold colored chip; stats as
 *  the milestone label. `side` styles row (left) headers vs column headers. */
function CategoryHeader({ cat, side }: { cat: Category; side?: boolean }) {
  if (cat.kind === "team") {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: side ? "0 4px" : "6px 2px",
        }}
      >
        <span
          className="chip"
          style={{
            fontFamily: "var(--font-cond)",
            fontWeight: 800,
            fontSize: ".82rem",
            letterSpacing: ".03em",
            background: "var(--panel-2)",
            border: "1px solid var(--border)",
            color: "var(--text)",
          }}
        >
          {cat.label}
        </span>
      </div>
    );
  }
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: side ? "0 4px" : "4px 2px",
        fontSize: ".66rem",
        fontWeight: 700,
        lineHeight: 1.15,
        color: "var(--gold)",
        overflowWrap: "anywhere",
      }}
    >
      {cat.label}
    </div>
  );
}

/** Renders a row's children inline as part of the parent CSS grid. */
function RowFragment({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
