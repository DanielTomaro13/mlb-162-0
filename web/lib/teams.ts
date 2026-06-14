/**
 * MLB franchise colours + abbreviations, keyed by a nickname substring so both
 * the full team name from the stats feed ("New York Yankees") and the short
 * standings name ("Yankees") resolve. Franchise renames (Indians/Guardians,
 * Oakland/Athletics) are matched by nickname.
 */
const TEAM_COLORS: [match: string, primary: string, secondary: string][] = [
  ["Diamondbacks", "#a71930", "#e3d4ad"],
  ["Braves", "#13274f", "#ce1141"],
  ["Orioles", "#df4601", "#000000"],
  ["Red Sox", "#bd3039", "#0c2340"],
  ["Cubs", "#0e3386", "#cc3433"],
  ["White Sox", "#27251f", "#c4ced4"],
  ["Reds", "#c6011f", "#000000"],
  ["Guardians", "#0c2340", "#e31937"],
  ["Indians", "#0c2340", "#e31937"],
  ["Rockies", "#33006f", "#c4ced4"],
  ["Tigers", "#0c2340", "#fa4616"],
  ["Astros", "#002d62", "#eb6e1f"],
  ["Royals", "#004687", "#bd9b60"],
  ["Angels", "#ba0021", "#003263"],
  ["Dodgers", "#005a9c", "#ef3e42"],
  ["Marlins", "#00a3e0", "#ef3340"],
  ["Brewers", "#12284b", "#ffc52f"],
  ["Twins", "#002b5c", "#d31145"],
  ["Mets", "#002d72", "#ff5910"],
  ["Yankees", "#0c2340", "#c4ced3"],
  ["Athletics", "#003831", "#efb21e"],
  ["Phillies", "#e81828", "#002d72"],
  ["Pirates", "#27251f", "#fdb827"],
  ["Padres", "#2f241d", "#ffc425"],
  ["Giants", "#fd5a1e", "#27251f"],
  ["Mariners", "#0c2c56", "#005c5c"],
  ["Cardinals", "#c41e3a", "#0c2340"],
  ["Rays", "#092c5c", "#8fbce6"],
  ["Rangers", "#003278", "#c0111f"],
  ["Blue Jays", "#134a8e", "#1d2d5c"],
  ["Nationals", "#ab0003", "#14225a"],
];

export function teamColors(team: string): [string, string] {
  const hit = TEAM_COLORS.find(([m]) => team.includes(m));
  return hit ? [hit[1], hit[2]] : ["#243150", "#97a6c4"];
}

const ABBR: Record<string, string> = {
  Diamondbacks: "ARI", Braves: "ATL", Orioles: "BAL", "Red Sox": "BOS",
  Cubs: "CHC", "White Sox": "CWS", Reds: "CIN", Guardians: "CLE", Indians: "CLE",
  Rockies: "COL", Tigers: "DET", Astros: "HOU", Royals: "KC", Angels: "LAA",
  Dodgers: "LAD", Marlins: "MIA", Brewers: "MIL", Twins: "MIN", Mets: "NYM",
  Yankees: "NYY", Athletics: "ATH", Phillies: "PHI", Pirates: "PIT",
  Padres: "SD", Giants: "SF", Mariners: "SEA", Cardinals: "STL", Rays: "TB",
  Rangers: "TEX", "Blue Jays": "TOR", Nationals: "WSH",
};

/** A short 2–3 letter abbreviation for a team. */
export function teamAbbr(team: string): string {
  for (const [k, v] of Object.entries(ABBR)) if (team.includes(k)) return v;
  return team.slice(0, 3).toUpperCase();
}

/** League id 103 = American League, 104 = National League. */
export function leagueName(id?: number): string {
  return id === 103 ? "American League" : id === 104 ? "National League" : "MLB";
}
export function leagueShort(id?: number): string {
  return id === 103 ? "AL" : id === 104 ? "NL" : "";
}
