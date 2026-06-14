/**
 * Season model — 162 games.
 *
 * A roster's average rating sets a per-game win probability via a logistic
 * curve. The curve + caps are tuned so that the BEST roster you can realistically
 * assemble (~96+ average, a side of 99-rated legends) wins ~98.17% per game —
 * which is exactly a 5% chance of running the table 162–0
 * (0.9817^162 ≈ 0.05). The caps make 5% a HARD ceiling: nothing beats it, and the
 * chance collapses fast below a near-perfect side, so going a flawless 162–0 is a
 * genuine ~1-in-20 reward reserved for a near-perfect draft. The Cellar Dwellers
 * (0–162) chase is the symmetric mirror — the worst side you can build has the
 * same ~5% shot at a winless season.
 */

export interface SimResult {
  wins: number;
  losses: number;
  perfectPct: number;       // % chance of 162–0 — tops out at ~5% for a perfect roster
  spoonPct: number;         // % chance of 0–162
  realPercentile: number;   // 0–100 vs real MLB team-seasons
  distribution: number[];   // index = wins (0..162) -> share 0..1
}

export const GAMES = 162;

// logistic midpoint (avg 82 -> 50% per game, an 81-81 team) and a steep spread;
// caps clamp the per-game win chance to [0.01832, 0.98168] so that 162–0 and
// 0–162 both top out at ~5% (0.98168^162 ≈ 0.05) and only a near-perfect roster
// gets there.
const MID = 82, SPREAD = 3.5, P_MIN = 0.01832, P_MAX = 0.98168;

/** Per-game win probability for a roster average. */
export function winProbFromRating(avg: number): number {
  const p = 1 / (1 + Math.exp(-(avg - MID) / SPREAD));
  return Math.max(P_MIN, Math.min(P_MAX, p));
}

/** Exact chance (%) of a flawless 162–0 for this rating. Astronomically small. */
export function perfectChance(avg: number): number {
  return Math.pow(winProbFromRating(avg), GAMES) * 100;
}

/** Projected win total (expected value) for a roster average. */
export function projectedWins(avg: number): number {
  return Math.round(winProbFromRating(avg) * GAMES);
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** One simulated 162-game season. Seed it from the roster so a given side is
 *  deterministic (no re-roll fishing) — going 162–0 is a genuine miracle. */
export function seasonRecord(avg: number, seed: number): { wins: number; losses: number } {
  const rand = mulberry32(seed >>> 0);
  const p = winProbFromRating(avg);
  let wins = 0;
  for (let i = 0; i < GAMES; i++) if (rand() < p) wins++;
  return { wins, losses: GAMES - wins };
}

export function verdict(wins: number): { t: string; s: string; tone?: string } {
  if (wins >= GAMES) return { t: "PERFECT SEASON", s: "162–0. Immortal. The greatest team that never was.", tone: "perfect" };
  if (wins >= 150) return { t: "ALL-TIME GREAT", s: "You'd obliterate every record in the book — but flawless it is not.", tone: "perfect" };
  if (wins >= 116) return { t: "RECORD-BREAKERS", s: "116 wins ties the all-time mark. A team for the ages, just short of perfect." };
  if (wins >= 100) return { t: "WORLD SERIES FAVORITE", s: "100 wins and home-field all October. The clear favorite." };
  if (wins >= 90) return { t: "DIVISION WINNER", s: "Ninety wins clinches the division. A deep October awaits." };
  if (wins >= 81) return { t: "WILD CARD HUNT", s: "Right on the bubble — fighting for a spot to the final weekend." };
  if (wins >= 65) return { t: "REBUILDING", s: "Flashes of a future, not yet a contender." };
  if (wins >= 1) return { t: "CELLAR DWELLERS", s: "A long, long summer. Time to think about the draft." };
  return { t: "WINLESS", s: "0–162. A perfectly, gloriously terrible roster.", tone: "spoon" };
}

function qualityFromRating(avg: number): number {
  return Math.max(0.02, Math.min(0.98, (avg - 72) / (99 - 72)));
}
function normalise(values: number[]): number[] {
  if (!values.length) return [0.3, 0.5, 0.7];
  const lo = Math.min(...values), hi = Math.max(...values);
  const span = hi - lo || 1;
  return values.map((v) => 0.15 + 0.7 * ((v - lo) / span));
}

/** Headline record (seeded from the roster) plus the season's shape. */
export function simulateSeason(
  avg: number,
  strengthPool: number[],
  seed = 162,
  runs = 4000
): SimResult {
  const p = winProbFromRating(avg);
  const rand = mulberry32((seed >>> 0) ^ 0x9e3779b9);
  const dist = new Array(GAMES + 1).fill(0);
  let perfect = 0, spoon = 0;
  for (let r = 0; r < runs; r++) {
    let wins = 0;
    for (let g = 0; g < GAMES; g++) if (rand() < p) wins++;
    dist[wins]++;
    if (wins === GAMES) perfect++;
    if (wins === 0) spoon++;
  }
  const opp = normalise(strengthPool);
  const me = qualityFromRating(avg);
  const below = opp.filter((o) => o < me).length;
  const rec = seasonRecord(avg, seed);
  return {
    wins: rec.wins,
    losses: rec.losses,
    perfectPct: perfectChance(avg),
    spoonPct: Math.pow(1 - p, GAMES) * 100,
    realPercentile: Math.round((below / opp.length) * 100),
    distribution: dist.map((c) => c / runs),
  };
}
