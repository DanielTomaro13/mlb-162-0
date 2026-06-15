/**
 * Build-time player database (server only). Reads the generated games.json
 * from disk so we can statically pre-render a profile page per notable player
 * and list them in the sitemap.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { type GamePlayer, NOTABLE_LIMIT } from "@/lib/games-data";
import { slugify } from "@/lib/format";

export interface ProfilePlayer extends GamePlayer {
  slug: string;
}

let _all: ProfilePlayer[] | null = null;

export function allPlayers(): ProfilePlayer[] {
  if (_all) return _all;
  const file = join(process.cwd(), "public", "data", "games.json");
  const data = JSON.parse(readFileSync(file, "utf8")) as { players: GamePlayer[] };
  _all = data.players.map((p) => ({ ...p, slug: slugify(p.name) }));
  return _all;
}

/** Players notable enough to deserve a statically-generated profile page.
 *  games.json is sorted by fame, so this is the top NOTABLE_LIMIT players — the
 *  same set the box score checks before linking a player's name. */
export function notablePlayers(): ProfilePlayer[] {
  return allPlayers().filter((p) => p.fame >= 60).slice(0, NOTABLE_LIMIT);
}

export function playerById(id: string): ProfilePlayer | null {
  return allPlayers().find((p) => String(p.id) === String(id)) ?? null;
}

/** The set of player ids that actually have a static profile page — used to
 *  decide whether a player's name should be a link or plain text (so we never
 *  link to a page that wasn't generated). */
let _notableIds: Set<number> | null = null;
export function notableIdSet(): Set<number> {
  if (!_notableIds) _notableIds = new Set(notablePlayers().map((p) => p.id));
  return _notableIds;
}
