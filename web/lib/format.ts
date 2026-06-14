export function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** The twelve baseball position codes in scorecard order. */
export const POS_CODES = [
  "C", "1B", "2B", "3B", "SS", "LF", "CF", "RF", "DH", "SP", "RP", "CL",
] as const;
export type PosCode = (typeof POS_CODES)[number];

export const POS_LABEL: Record<string, string> = {
  C: "Catcher", "1B": "First Base", "2B": "Second Base", "3B": "Third Base",
  SS: "Shortstop", LF: "Left Field", CF: "Center Field", RF: "Right Field",
  DH: "Designated Hitter", SP: "Starting Pitcher", RP: "Relief Pitcher", CL: "Closer",
};

/** Broad group for filtering. */
export const POS_GROUP: Record<string, string> = {
  C: "Infield", "1B": "Infield", "2B": "Infield", "3B": "Infield", SS: "Infield",
  LF: "Outfield", CF: "Outfield", RF: "Outfield", DH: "Hitter",
  SP: "Pitcher", RP: "Pitcher", CL: "Pitcher",
};

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0]?.toUpperCase() || "")
    .join(".");
}

/** Format a batting-average-style number as ".312" (no leading zero). */
export function avg3(n: number): string {
  if (!Number.isFinite(n)) return ".000";
  return n.toFixed(3).replace(/^0/, "");
}
