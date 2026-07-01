/** Client-side types + loaders for the MLB-Modelling feed (the statistical model
 *  that prices each game). Data files live in /public/data/model-*.json and are
 *  refreshed from the MLB-Modelling pipeline (see scripts/sync-model.mjs). */

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const V = process.env.NEXT_PUBLIC_DATA_VERSION || "dev";

export interface Selection { label: string; prob: number; fair: number | null }
export interface TotalLine {
  line: number; over: number; under: number; over_fair: number | null; under_fair: number | null;
  side?: "home" | "away";  // present on team-total lines
}
export interface ScoreCell { home: number; away: number; prob: number; fair: number | null }
export interface Market {
  key: string; label: string;
  selections?: Selection[];
  lines?: TotalLine[];
  cells?: ScoreCell[];
}
export interface PropLine { line: number; over: number; over_fair: number | null }
export interface PlayerProp { stat: string; mu: number; lines: PropLine[] }
export interface PlayerProps { player: string; role: string; props: PlayerProp[] }
export interface GameProjection {
  gamePk: string | number; date: string; status: string;
  home: string; away: string; homeAbbr: string; awayAbbr: string;
  homePitcher: string; awayPitcher: string; park: number;
  elo_win_home: number | null;
  mu_home: number; mu_away: number; total_mean: number;
  win_home: number; win_away: number; fair_home: number | null; fair_away: number | null;
  markets: Market[];
  props: { home: PlayerProps[]; away: PlayerProps[] };
}
export interface Predictions { generated: string; season: number; count: number; games: GameProjection[] }

export interface OddsSelection {
  id: string; label: string; model: number; fair: number | null;
  books: Record<string, number>; best: { book: string; price: number }; ev: number; edge: number;
}
export interface OddsMarket { key: string; label: string; selections: OddsSelection[] }
export interface OddsGame {
  home: string; away: string; date: string; homeAbbr: string; awayAbbr: string; markets: OddsMarket[];
}
export interface Odds { generated: string; books: string[]; count: number; games: OddsGame[] }

export interface PickemLine { event: string; player: string; stat: string; line: number; sides?: ("over" | "under")[] }
export interface Pickem { generated: string; lines: PickemLine[] }

export const BOOK_LABEL: Record<string, string> = {
  sportsbet: "Sportsbet", ladbrokes: "Ladbrokes", pointsbet: "PointsBet", tab: "TAB", dabble: "Dabble",
};

/** P(count > line) for a Poisson(mu) — prices a Pick'em line off the model's projection. */
export function poissonOver(mu: number, line: number): number {
  if (mu <= 0) return 0;
  const k = Math.floor(line) + 1;
  let term = Math.exp(-mu), cdf = term; // P(0)
  for (let i = 1; i < k; i++) { term *= mu / i; cdf += term; }
  return Math.max(0, 1 - cdf);
}

export interface RatingRow { teamId: number; name: string; abbr: string; division: string; elo: number; played: number; rank: number }
export interface Ratings { teams: RatingRow[] }

export interface Backtest {
  holdout_start_season?: number; n?: number; log_loss?: number; brier?: number;
  accuracy?: number; home_win_rate?: number; baseline_log_loss?: number; beats_baseline?: boolean;
}
export interface ModelMeta {
  generated: string; season: number; n_teams: number; n_pitchers: number; n_batters: number; backtest: Backtest;
}

async function load<T>(name: string): Promise<T | null> {
  try {
    const r = await fetch(`${BASE}/data/${name}.json?v=${V}`);
    return r.ok ? ((await r.json()) as T) : null;
  } catch {
    return null;
  }
}

export const loadPredictions = () => load<Predictions>("model-predictions");
export const loadOdds = () => load<Odds>("model-odds");
export const loadRatings = () => load<Ratings>("model-ratings");
export const loadModelMeta = () => load<ModelMeta>("model-meta");
export const loadPickem = () => load<Pickem>("model-pickem-lines");

export const pct = (p: number | null | undefined) => (p == null ? "—" : `${Math.round(p * 100)}%`);
export const odds = (v: number | null | undefined) => (v && v > 0 ? v.toFixed(2) : "—");
