/**
 * Shared types + loaders for the mini-games dataset (public/data/games.json),
 * produced by pipeline/build-data.mjs from the real MLB Stats API.
 *
 * Each entry is a career-aggregated player across the seasons in the pool, with
 * a `kind` flag selecting which stat line is meaningful (hitter vs pitcher).
 */
export interface GamePlayer {
  id: number;
  name: string;
  team: string;
  pos: string;       // C 1B 2B 3B SS LF CF RF DH | SP RP CL
  posName: string;
  kind: "bat" | "pit";
  firstYear: number;
  lastYear: number;
  seasons: number;
  rating: number;
  fame: number;
  // hitters (career totals + rate)
  hr: number;
  rbi: number;
  runs: number;
  hits: number;
  sb: number;
  db: number;        // doubles
  tp: number;        // triples
  bb: number;        // walks drawn
  soBat: number;     // strikeouts (as a batter)
  ops: number;
  // pitchers (career totals + rate)
  w: number;
  l: number;
  sv: number;
  so: number;
  ip: number;
  bbPit: number;     // walks issued
  eraAvg: number;
}

export interface GamesData {
  season: string;
  players: GamePlayer[];
  strengthsBySeason: Record<string, number[]>;
}

let _cache: GamesData | null = null;
export async function loadGamesData(): Promise<GamesData> {
  if (_cache) return _cache;
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/data/games.json`, {
    cache: "force-cache",
  });
  _cache = await res.json();
  return _cache!;
}

/** Deterministic daily seed so "today's" puzzles are the same for everyone. */
export function dailySeed(salt = ""): number {
  const d = new Date();
  const key = `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}-${salt}`;
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export const dayNumber = () =>
  Math.floor((Date.now() - Date.UTC(2026, 0, 1)) / 86400000) + 1;

/** Mulberry32 seeded PRNG. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pickN<T>(arr: T[], n: number, rand: () => number): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}
