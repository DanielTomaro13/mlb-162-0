/** Client loaders for the static datasets in /public/data. */
import type { Meta, PoolPlayer } from "@/lib/types";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export interface LadderRow {
  team: string; abbr?: string; league?: number; division?: string;
  p: number; w: number; l: number; pf: number; pa: number;
  pct: number; pts: number; pd: number; streak?: string;
}
export interface GameResult {
  date: string; status: string; home: string; away: string;
  hs: number | null; as: number | null;
  homeWin: boolean | null; awayWin: boolean | null;
}
export interface PerfectRow { team: string; w: number; l: number; alive: boolean; winless: boolean; }
export interface Schedule {
  results: GameResult[];
  upcoming: GameResult[];
  perfect: PerfectRow[];
}
export interface Results {
  seasons: string[];
  liveSeason: string;
  laddersBySeason: Record<string, LadderRow[]>;
  schedule: Schedule;
}

const cache = new Map<string, unknown>();
async function loadJson<T>(file: string): Promise<T> {
  if (cache.has(file)) return cache.get(file) as T;
  const res = await fetch(`${BASE}/data/${file}`, { cache: "force-cache" });
  const data = (await res.json()) as T;
  cache.set(file, data);
  return data;
}

export const loadMeta = () => loadJson<Meta>("meta.json");
export const loadPool = () => loadJson<PoolPlayer[]>("pool.json");
export const loadResults = () => loadJson<Results>("results.json");
export const loadStrengths = () => loadJson<{ bySeason: Record<string, number[]> }>("strengths.json");
