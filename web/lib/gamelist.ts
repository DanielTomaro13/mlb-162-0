/** The mini-game catalogue — shared by the home page and the /games hub. */
export interface GameDef {
  slug: string;
  title: string;
  emoji: string;
  blurb: string;
  tag: string;
}

export const GAMES: GameDef[] = [
  { slug: "invincibles", title: "Invincibles", emoji: "🏆", blurb: "Draft a roster and simulate a whole season. Chase 162-0.", tag: "Endless" },
  { slug: "diamond", title: "Diamond", emoji: "🟩", blurb: "Guess the mystery MLB player in 8 tries — the baseball Wordle.", tag: "Daily" },
  { slug: "grid", title: "Grid", emoji: "⬜", blurb: "Fill a 3×3 grid — a player for every team-and-stat square.", tag: "Daily" },
  { slug: "higher-or-lower", title: "Higher or Lower", emoji: "📈", blurb: "More home runs, strikeouts or wins? Keep the streak alive.", tag: "Endless" },
  { slug: "guess-the-player", title: "Guess the Player", emoji: "🕵️", blurb: "Seven clues, one player. Solve it early for more points.", tag: "Daily" },
  { slug: "career-path", title: "Career Path", emoji: "🧭", blurb: "Read the profile, pick the right legend from four.", tag: "Quiz" },
  { slug: "beat-the-clock", title: "Beat the Clock", emoji: "⏱️", blurb: "Name 30 of the season's top sluggers in 60 seconds.", tag: "Timed" },
  { slug: "score-predictor", title: "Score Predictor", emoji: "🔮", blurb: "Predict real MLB results. Nail the line and score big.", tag: "Predict" },
];

export const gameBySlug = (slug: string) => GAMES.find((g) => g.slug === slug);
