/** Game engine types for the Perfect-Season draft (/play). */

/** A player-season card. Hitters and pitchers share the common head; the rest
 *  of the fields depend on `kind`. */
export interface PoolPlayer {
  id: string;
  pid: number;
  name: string;
  team: string;
  era: string;       // the season (e.g. "2023") — a player's "era"
  kind: "bat" | "pit";
  pos: string;       // C 1B 2B 3B SS LF CF RF DH | SP RP CL (primary)
  posName: string;
  elig: string[];    // every slot the player can fill
  rating: number;
  g: number;
  // hitters
  hr?: number;
  rbi?: number;
  runs?: number;
  hits?: number;
  sb?: number;
  avg?: number;
  obp?: number;
  slg?: number;
  ops?: number;
  // pitchers
  w?: number;
  l?: number;
  sv?: number;
  eraAvg?: number;   // earned run average
  whip?: number;
  so?: number;
  ip?: number;
  k9?: number;
}

export interface Meta {
  generatedAt: string;
  seasons: string[];
  latestSeason: string;
  liveSeason: string;
  poolSeasons: string[];
  teams: string[];
  teamsBySeason: Record<string, string[]>;
}

export type Mode = "quick" | "classic" | "full" | "cap" | "gauntlet" | "spoon";

export interface Slot {
  code: string; // a position code, or "INT" for bench (any player)
  n: number;    // lineup / roster number
}

/** The batting order with a designated hitter — the nine that take the field. */
const STARTING_NINE: Slot[] = [
  { code: "C", n: 1 }, { code: "1B", n: 2 }, { code: "2B", n: 3 },
  { code: "3B", n: 4 }, { code: "SS", n: 5 }, { code: "LF", n: 6 },
  { code: "CF", n: 7 }, { code: "RF", n: 8 }, { code: "DH", n: 9 },
];

/** Lineup + a three-man front of the rotation and a closer. */
const ROSTER_13: Slot[] = [
  ...STARTING_NINE,
  { code: "SP", n: 10 }, { code: "SP", n: 11 }, { code: "SP", n: 12 },
  { code: "CL", n: 13 },
];

/** The full active 18: nine, a five-man rotation, three relievers and a closer. */
const ACTIVE_18: Slot[] = [
  ...STARTING_NINE,
  { code: "SP", n: 10 }, { code: "SP", n: 11 }, { code: "SP", n: 12 },
  { code: "SP", n: 13 }, { code: "SP", n: 14 },
  { code: "RP", n: 15 }, { code: "RP", n: 16 }, { code: "RP", n: 17 },
  { code: "CL", n: 18 },
];

export const SQUADS: Record<Mode, Slot[]> = {
  quick: STARTING_NINE,
  classic: ROSTER_13,
  full: ACTIVE_18,
  cap: ACTIVE_18,
  gauntlet: ROSTER_13,
  spoon: ROSTER_13,
};

export const REROLLS: Record<Mode, { team: number; era: number }> = {
  quick: { team: 1, era: 1 },
  classic: { team: 1, era: 1 },
  full: { team: 2, era: 2 },
  cap: { team: 2, era: 2 },
  gauntlet: { team: 1, era: 1 },
  spoon: { team: 1, era: 1 },
};

export const MODE_INFO: Record<Mode, { name: string; tag: string; desc: string }> = {
  quick: { name: "Starting Nine", tag: "the lineup", desc: "One player for each of the nine spots in the batting order — catcher through the designated hitter. A fast all-time lineup." },
  classic: { name: "The Roster", tag: "the thirteen", desc: "The full lineup plus a three-man front of the rotation and a lights-out closer." },
  full: { name: "Active 18", tag: "deep bullpen", desc: "The complete active roster: nine in the field, a five-man rotation, three relievers and a closer." },
  cap: { name: "Salary Cap", tag: "hard mode", desc: "Build an 18-man active roster under the cap. Superstars cost a fortune — spend like a GM at the deadline." },
  gauntlet: { name: "The Gauntlet", tag: "survival", desc: "Draft a roster, then beat every season's pennant winner head-to-head. Lose once and the run is over." },
  spoon: { name: "Cellar Dwellers", tag: "anti-baseball", desc: "Build the worst roster imaginable and chase a perfect 0–162. Harder than it sounds." },
};

/** Salary cap mode — a player's price ($) modelled off their rating. */
export const SALARY_CAP = 240_000_000;
export function salaryFor(rating: number): number {
  const t = Math.max(0, (rating - 60) / 39); // 0..1
  return Math.round((1_000_000 + Math.pow(t, 2.3) * 39_000_000) / 100_000) * 100_000;
}

/** Does a player fit a slot? INT/bench slots take anyone; otherwise the slot
 *  code must be in the player's eligibility list. */
export function fitsSlot(slot: Slot, player: Pick<PoolPlayer, "elig">): boolean {
  return slot.code === "INT" || player.elig.includes(slot.code);
}
