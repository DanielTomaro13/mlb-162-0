/**
 * MLB 162-0 data pipeline.
 * ---------------------------------------------------------------------------
 * Reads the official, public MLB Stats API (statsapi.mlb.com, no auth) and
 * aggregates real season data into a static dataset the web app consumes at
 * build time. The same JSON the MLB-StatsAPI Python library wraps — we read it
 * directly.
 *
 *   - season hitting + pitching splits  -> the player pool & mini-game players
 *   - regular-season standings          -> per-season ladders (W / L / RS / RA)
 *   - the current season's schedule     -> fixtures / results + the live
 *                                          "still perfect?" 162-0 chase
 *
 * Player ratings are modelled from real rate stats: OPS for hitters, a blend of
 * ERA / WHIP / K-rate for pitchers, mapped onto a 60–99 scale.
 *
 * Outputs -> web/public/data/:
 *   meta.json        seasons, latest season, teams, teamsBySeason
 *   pool.json        every player-season card (drives the /play draft)
 *   games.json       career-aggregated unique players + team strengths (mini-games)
 *   results.json     standings + schedule grouped by season (fixtures/ladder)
 *   strengths.json   per-season team strength distribution (the simulator)
 *
 * Env knobs (all optional):
 *   MAX_SEASONS=11   number of completed seasons for the player pool (newest first)
 *   POOL_MIN_PA=150  min plate appearances to include a hitter-season
 *   POOL_MIN_IP=30   min innings to include a pitcher-season
 *   CONCURRENCY=8    in-flight season fetches
 */
import { writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const API = process.env.API_BASE || "https://statsapi.mlb.com/api/v1";
const MAX_SEASONS = Number(process.env.MAX_SEASONS || 11);
const POOL_MIN_PA = Number(process.env.POOL_MIN_PA || 150);
const POOL_MIN_IP = Number(process.env.POOL_MIN_IP || 30);
const CONCURRENCY = Number(process.env.CONCURRENCY || 8);

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "..", "web", "public", "data");

/* The season we treat as "now". MLB seasons run Mar–Oct, so the live ladder &
 * fixtures track the current calendar year; the player pool uses the completed
 * seasons before it. */
const NOW_SEASON = new Date().getUTCFullYear();
const LATEST_COMPLETE = new Date().getUTCMonth() >= 10 ? NOW_SEASON : NOW_SEASON - 1;

/* ---- fetch helpers -------------------------------------------------------- */
async function api(path) {
  const url = `${API}${path}`;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const r = await fetch(url, { headers: { Accept: "application/json" } });
      if (!r.ok) throw new Error(`${r.status} ${url}`);
      return await r.json();
    } catch (e) {
      if (attempt === 2) throw e;
      await new Promise((res) => setTimeout(res, 400 * (attempt + 1)));
    }
  }
}
const arr = (x) => (Array.isArray(x) ? x : x == null ? [] : [x]);
const num = (x) => (Number.isFinite(Number(x)) ? Number(x) : 0);
/** innings pitched come as "65.2" = 65 + 2/3; turn into a true decimal. */
function ip(str) {
  const [whole, frac] = String(str ?? "0").split(".");
  return num(whole) + (frac === "1" ? 1 / 3 : frac === "2" ? 2 / 3 : 0);
}
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      try { out[idx] = await fn(items[idx], idx); }
      catch (e) { console.log(`  ! ${e.message}`); out[idx] = null; }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

/* ---- position handling ---------------------------------------------------- */
const OF = new Set(["LF", "CF", "RF", "OF"]);
const POS_LABEL = {
  C: "Catcher", "1B": "First Base", "2B": "Second Base", "3B": "Third Base",
  SS: "Shortstop", LF: "Left Field", CF: "Center Field", RF: "Right Field",
  DH: "Designated Hitter", SP: "Starting Pitcher", RP: "Relief Pitcher", CL: "Closer",
};
/** Where a hitter can slot. OF players are interchangeable in the outfield, and
 *  any hitter can DH. */
function hitterElig(pos) {
  const e = new Set([pos]);
  if (OF.has(pos)) { e.add("LF"); e.add("CF"); e.add("RF"); }
  if (pos === "OF") { e.delete("OF"); }
  e.add("DH");
  return [...e];
}

/* ---- rating models -------------------------------------------------------- */
/** Hitter rating from OPS, nudged by power/speed volume. 60–99. */
function rateHitter(st) {
  const ops = num(st.ops);
  const t = clamp((ops - 0.600) / (1.050 - 0.600), 0, 1);
  let r = 60 + t * 37;
  r += Math.min(3, num(st.homeRuns) / 18) + Math.min(2, num(st.stolenBases) / 25);
  return Math.round(clamp(r, 60, 99));
}
/** Pitcher rating — blend of ERA, WHIP and K/9. 60–99. */
function ratePitcher(st) {
  const era = num(st.era);
  const whip = num(st.whip);
  const k9 = num(st.strikeoutsPer9Inn);
  const tEra = clamp((5.20 - era) / (5.20 - 2.20), 0, 1);
  const tWhip = clamp((1.55 - whip) / (1.55 - 0.92), 0, 1);
  const tK = clamp((k9 - 5.5) / (13.0 - 5.5), 0, 1);
  const r = 60 + (0.5 * tEra + 0.3 * tWhip + 0.2 * tK) * 38;
  return Math.round(clamp(r, 60, 99));
}
/** SP / RP / CL from role volume. */
function pitcherRole(st) {
  const gs = num(st.gamesStarted);
  const g = num(st.gamesPitched) || num(st.gamesPlayed);
  const sv = num(st.saves);
  if (g && gs >= g * 0.5) return "SP";
  if (sv >= 10) return "CL";
  return "RP";
}

/* ---- main ----------------------------------------------------------------- */
async function main() {
  const t0 = Date.now();

  /* completed seasons for the player pool, newest first */
  const poolSeasons = [];
  for (let y = LATEST_COMPLETE; y > LATEST_COMPLETE - MAX_SEASONS; y--) poolSeasons.push(y);
  /* every season we want standings/fixtures for (includes the live one) */
  const allSeasons = [...new Set([NOW_SEASON, ...poolSeasons])].sort((a, b) => b - a);

  console.log(`→ MLB Stats API · pool seasons ${poolSeasons[poolSeasons.length - 1]}–${poolSeasons[0]}, live ${NOW_SEASON}`);

  /* ---- teams (current map: id -> {name, abbr, league, division}) ---------- */
  const teamsResp = await api(`/teams?sportId=1&season=${LATEST_COMPLETE}`);
  const teamById = {};
  for (const t of arr(teamsResp.teams)) {
    teamById[t.id] = {
      id: t.id, name: t.name, abbr: t.abbreviation, short: t.teamName,
      league: t.league?.id, division: t.division?.name,
    };
  }

  /* ---- player pool: hitting + pitching season splits --------------------- */
  const agg = new Map(); // `${pid}-${season}` -> player-season record
  const teamsBySeason = {};

  for (const season of poolSeasons) {
    for (const group of ["hitting", "pitching"]) {
      const data = await api(
        `/stats?stats=season&group=${group}&season=${season}&sportId=1&limit=2000&playerPool=All`
      );
      const splits = arr(data?.stats?.[0]?.splits);
      for (const s of splits) {
        const st = s.stat || {};
        const pid = s.player?.id;
        if (!pid) continue;
        const teamName = s.team?.name || teamById[s.team?.id]?.name;
        const apiPos = (s.position?.abbreviation || "").toUpperCase();

        if (group === "hitting") {
          const pa = num(st.plateAppearances);
          if (pa < POOL_MIN_PA || apiPos === "P") continue;
          let pos = apiPos || "DH";
          if (pos === "OF") pos = "CF";
          const card = {
            id: `mlb-${pid}-${season}`, pid, name: s.player.fullName,
            team: teamName || "MLB", era: String(season), kind: "bat",
            pos, posName: POS_LABEL[pos] || pos, elig: hitterElig(pos),
            rating: rateHitter(st),
            g: num(st.gamesPlayed),
            hr: num(st.homeRuns), rbi: num(st.rbi), runs: num(st.runs),
            hits: num(st.hits), sb: num(st.stolenBases),
            avg: +(num(st.avg)).toFixed(3), obp: +(num(st.obp)).toFixed(3),
            slg: +(num(st.slg)).toFixed(3), ops: +(num(st.ops)).toFixed(3),
          };
          agg.set(card.id, card);
          if (teamName) (teamsBySeason[season] ||= new Set()).add(teamName);
        } else {
          const innings = ip(st.inningsPitched);
          if (innings < POOL_MIN_IP && num(st.saves) < 5 && num(st.gamesPitched) < 25) continue;
          const pos = pitcherRole(st);
          const elig = pos === "CL" ? ["CL", "RP"] : [pos];
          const card = {
            id: `mlb-${pid}-${season}`, pid, name: s.player.fullName,
            team: teamName || "MLB", era: String(season), kind: "pit",
            pos, posName: POS_LABEL[pos] || pos, elig,
            rating: ratePitcher(st),
            g: num(st.gamesPitched) || num(st.gamesPlayed),
            w: num(st.wins), l: num(st.losses), sv: num(st.saves),
            eraAvg: +(num(st.era)).toFixed(2), whip: +(num(st.whip)).toFixed(2),
            so: num(st.strikeOuts), ip: +innings.toFixed(1),
            k9: +(num(st.strikeoutsPer9Inn)).toFixed(1),
          };
          // a pitcher-season can exist in both groups; keep the pitching card
          agg.set(card.id, card);
          if (teamName) (teamsBySeason[season] ||= new Set()).add(teamName);
        }
      }
      console.log(`  ${season} ${group}: pool now ${agg.size}`);
    }
  }

  const pool = [...agg.values()].sort((a, b) => b.rating - a.rating);
  console.log(`✓ pool: ${pool.length} player-season cards`);

  /* ---- career-aggregated unique players for the mini-games --------------- */
  const careers = new Map(); // pid -> aggregate across seasons
  for (const p of pool) {
    let c = careers.get(p.pid);
    if (!c) {
      c = {
        id: p.pid, name: p.name, kind: p.kind, teamCounts: {}, posCounts: {},
        seasons: new Set(), bestRating: 0,
        hr: 0, rbi: 0, runs: 0, hits: 0, sb: 0, opsSum: 0, opsN: 0,
        w: 0, sv: 0, so: 0, ipSum: 0, eraSum: 0, eraN: 0,
      };
      careers.set(p.pid, c);
    }
    c.teamCounts[p.team] = (c.teamCounts[p.team] || 0) + 1;
    c.posCounts[p.pos] = (c.posCounts[p.pos] || 0) + 1;
    c.seasons.add(Number(p.era));
    c.bestRating = Math.max(c.bestRating, p.rating);
    if (p.kind === "bat") {
      c.hr += p.hr; c.rbi += p.rbi; c.runs += p.runs; c.hits += p.hits; c.sb += p.sb;
      c.opsSum += p.ops; c.opsN++;
    } else {
      c.w += p.w; c.sv += p.sv; c.so += p.so; c.ipSum += p.ip;
      c.eraSum += p.eraAvg; c.eraN++;
    }
  }
  const gamePlayers = [];
  for (const c of careers.values()) {
    if (c.seasons.size < 1) continue;
    const team = Object.entries(c.teamCounts).sort((a, b) => b[1] - a[1])[0][0];
    const pos = Object.entries(c.posCounts).sort((a, b) => b[1] - a[1])[0][0];
    const yrs = [...c.seasons].sort((a, b) => a - b);
    const isBat = c.kind === "bat";
    const fame = Math.round(
      c.bestRating + Math.min(20, c.seasons.size * 2) +
      (isBat ? c.hr / 20 + c.sb / 40 : c.so / 200 + c.sv / 20)
    );
    gamePlayers.push({
      id: c.id, name: c.name, team, pos, posName: POS_LABEL[pos] || pos,
      kind: c.kind, firstYear: yrs[0], lastYear: yrs[yrs.length - 1],
      seasons: c.seasons.size, rating: c.bestRating, fame,
      // career counting + rate lines (per the player's kind)
      hr: c.hr, rbi: c.rbi, runs: c.runs, hits: c.hits, sb: c.sb,
      ops: c.opsN ? +(c.opsSum / c.opsN).toFixed(3) : 0,
      w: c.w, sv: c.sv, so: c.so, ip: Math.round(c.ipSum),
      eraAvg: c.eraN ? +(c.eraSum / c.eraN).toFixed(2) : 0,
    });
  }
  gamePlayers.sort((a, b) => b.fame - a.fame);
  console.log(`✓ games: ${gamePlayers.length} unique career players`);

  /* ---- per-season standings (ladder) + strength distribution ------------- */
  const laddersBySeason = {};
  const strengthsBySeason = {};
  const standingsSeasons = await mapLimit(allSeasons, CONCURRENCY, async (season) => {
    const data = await api(
      `/standings?leagueId=103,104&season=${season}&standingsTypes=regularSeason`
    );
    const rows = [];
    for (const rec of arr(data.records)) {
      for (const tr of arr(rec.teamRecords)) {
        const meta = teamById[tr.team?.id] || {};
        const teamName = meta.name || tr.team?.name || `Team ${tr.team?.id}`;
        const w = num(tr.wins), l = num(tr.losses);
        rows.push({
          team: teamName,
          abbr: meta.abbr, league: meta.league, division: meta.division,
          p: w + l, w, l, pf: num(tr.runsScored), pa: num(tr.runsAllowed),
          pct: +(num(tr.winningPercentage)).toFixed(3),
          streak: tr.streak?.streakCode || "",
        });
        (teamsBySeason[season] ||= new Set()).add(teamName);
      }
    }
    if (!rows.length) return null;
    rows.forEach((r) => { r.pts = r.w; r.pd = r.pf - r.pa; }); // wins are the table currency
    rows.sort((a, b) => b.pct - a.pct || b.pd - a.pd);
    laddersBySeason[season] = rows;

    // simulator strengths: blend win% with run differential, scaled to [0,1]
    const diffs = rows.map((r) => r.pf - r.pa);
    const lo = Math.min(...diffs), hi = Math.max(...diffs), span = hi - lo || 1;
    strengthsBySeason[season] = rows
      .map((r) => 0.6 * r.pct + 0.4 * ((r.pf - r.pa - lo) / span))
      .map((x) => +x.toFixed(3))
      .sort((a, b) => a - b);
    return season;
  });
  const seasonsWithLadder = standingsSeasons.filter(Boolean).map(String).sort((a, b) => b - a);

  /* ---- the live season's schedule: results + upcoming -------------------- */
  console.log(`→ schedule ${NOW_SEASON} (live)…`);
  let schedule = { results: [], upcoming: [], perfect: [] };
  try {
    const sch = await api(
      `/schedule?sportId=1&season=${NOW_SEASON}&gameType=R&hydrate=team,linescore`
    );
    const games = [];
    for (const d of arr(sch.dates)) {
      for (const g of arr(d.games)) {
        const h = g.teams?.home, a = g.teams?.away;
        if (!h?.team || !a?.team) continue;
        games.push({
          date: g.officialDate || d.date,
          status: g.status?.abstractGameState || "",
          home: h.team.name, away: a.team.name,
          hs: h.score ?? null, as: a.score ?? null,
          homeWin: h.isWinner ?? null, awayWin: a.isWinner ?? null,
        });
      }
    }
    const done = games.filter((g) => g.status === "Final");
    const next = games.filter((g) => g.status !== "Final");
    schedule.results = done.slice(-180);          // recent finals
    schedule.upcoming = next.slice(0, 60);         // next slate

    // the 162-0 hook: which teams are STILL unbeaten / still winless this season?
    const rec = {};
    for (const g of done) {
      const H = (rec[g.home] ||= { w: 0, l: 0 }), A = (rec[g.away] ||= { w: 0, l: 0 });
      if (g.homeWin) { H.w++; A.l++; } else if (g.awayWin) { A.w++; H.l++; }
    }
    schedule.perfect = Object.entries(rec)
      .map(([team, r]) => ({ team, w: r.w, l: r.l, alive: r.l === 0, winless: r.w === 0 }))
      .sort((a, b) => b.w - a.w);
  } catch (e) {
    console.log(`  ! schedule unavailable: ${e.message}`);
  }

  /* ---- write outputs ----------------------------------------------------- */
  await mkdir(OUT_DIR, { recursive: true });
  const generatedAt = new Date().toISOString();
  const teamsBySeasonObj = {};
  for (const [s, set] of Object.entries(teamsBySeason)) teamsBySeasonObj[s] = [...set].sort();
  const allTeams = [...new Set(Object.values(teamsBySeasonObj).flat())].sort();
  const latestSeason = seasonsWithLadder[0] || String(LATEST_COMPLETE);

  const meta = {
    generatedAt, seasons: seasonsWithLadder, latestSeason,
    liveSeason: String(NOW_SEASON), poolSeasons: poolSeasons.map(String),
    teams: allTeams, teamsBySeason: teamsBySeasonObj,
  };
  const games = { season: String(LATEST_COMPLETE), players: gamePlayers, strengthsBySeason };
  const results = {
    seasons: seasonsWithLadder, liveSeason: String(NOW_SEASON),
    laddersBySeason, schedule,
  };
  const strengths = { bySeason: strengthsBySeason };

  await Promise.all([
    writeFile(join(OUT_DIR, "meta.json"), JSON.stringify(meta)),
    writeFile(join(OUT_DIR, "pool.json"), JSON.stringify(pool)),
    writeFile(join(OUT_DIR, "games.json"), JSON.stringify(games)),
    writeFile(join(OUT_DIR, "results.json"), JSON.stringify(results)),
    writeFile(join(OUT_DIR, "strengths.json"), JSON.stringify(strengths)),
  ]);

  console.log(
    `✓ wrote ${OUT_DIR} — ${pool.length} cards, ${gamePlayers.length} players, ` +
    `${seasonsWithLadder.length} seasons, ${schedule.results.length} results ` +
    `in ${((Date.now() - t0) / 1000).toFixed(1)}s`
  );
}

main().catch((e) => { console.error("✗ pipeline failed:", e); process.exit(1); });
