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
const MAX_SEASONS = Number(process.env.MAX_SEASONS || 26);
const POOL_MIN_PA = Number(process.env.POOL_MIN_PA || 50);
const POOL_MIN_IP = Number(process.env.POOL_MIN_IP || 15);
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

/* ---- team abbreviations (matches web/lib/teams.ts, handles renames) ------- */
const ABBR = [
  ["Diamondbacks", "ARI"], ["Braves", "ATL"], ["Orioles", "BAL"], ["Red Sox", "BOS"],
  ["Cubs", "CHC"], ["White Sox", "CWS"], ["Reds", "CIN"], ["Guardians", "CLE"], ["Indians", "CLE"],
  ["Rockies", "COL"], ["Tigers", "DET"], ["Astros", "HOU"], ["Royals", "KC"], ["Angels", "LAA"],
  ["Dodgers", "LAD"], ["Marlins", "MIA"], ["Brewers", "MIL"], ["Twins", "MIN"], ["Mets", "NYM"],
  ["Yankees", "NYY"], ["Athletics", "ATH"], ["Phillies", "PHI"], ["Pirates", "PIT"],
  ["Padres", "SD"], ["Giants", "SF"], ["Mariners", "SEA"], ["Cardinals", "STL"], ["Rays", "TB"],
  ["Rangers", "TEX"], ["Blue Jays", "TOR"], ["Nationals", "WSH"],
];
function abbrOf(team) {
  const hit = ABBR.find(([m]) => team.includes(m));
  return hit ? hit[1] : team.slice(0, 3).toUpperCase();
}

/* ---- rating models -------------------------------------------------------- */
/**
 * Hitter rating, 60–99. Built mostly on overall production (OPS) but reading in
 * on-base skill, power, run production and speed so a complete hitter outscores
 * a one-dimensional one. Lightly scaled by playing time so a tiny sample can't
 * post a 99.
 */
function rateHitter(st) {
  const ops = num(st.ops);
  // a wide ceiling (1.100 OPS ≈ a historic MVP year) keeps 99s genuinely rare.
  const tOps = clamp((ops - 0.600) / (1.100 - 0.600), 0, 1);
  const tObp = clamp((num(st.obp) - 0.290) / (0.440 - 0.290), 0, 1);
  let r = 60 + (0.80 * tOps + 0.20 * tObp) * 38;
  r += Math.min(2.5, num(st.homeRuns) / 18);          // power
  r += Math.min(1.2, num(st.rbi) / 80);               // run production
  r += Math.min(1.0, num(st.stolenBases) / 30);       // speed
  const pa = num(st.plateAppearances);
  if (pa < 250) r -= (250 - pa) / 250 * 7;            // sample-size haircut
  return Math.round(clamp(r, 60, 99));
}
/**
 * Pitcher rating, 60–99. Blends run prevention (ERA), traffic allowed (WHIP) and
 * bat-missing (K/9), with a small bump for high-leverage save/win workload, and
 * the same light sample-size scaling.
 */
function ratePitcher(st) {
  const era = num(st.era);
  const whip = num(st.whip);
  const k9 = num(st.strikeoutsPer9Inn);
  // sub-1.80 ERA / sub-0.90 WHIP ceilings keep a 99 to truly dominant seasons.
  const tEra = clamp((5.20 - era) / (5.20 - 1.80), 0, 1);
  const tWhip = clamp((1.55 - whip) / (1.55 - 0.88), 0, 1);
  const tK = clamp((k9 - 5.5) / (13.5 - 5.5), 0, 1);
  let r = 60 + (0.5 * tEra + 0.3 * tWhip + 0.2 * tK) * 38;
  r += Math.min(1.6, num(st.saves) / 28) + Math.min(1.2, num(st.wins) / 16);
  const ipv = ip(st.inningsPitched);
  if (ipv < 40) r -= (40 - ipv) / 40 * 6;            // sample-size haircut
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
            g: num(st.gamesPlayed), pa,
            hr: num(st.homeRuns), rbi: num(st.rbi), runs: num(st.runs),
            hits: num(st.hits), sb: num(st.stolenBases),
            db: num(st.doubles), tp: num(st.triples), bb: num(st.baseOnBalls),
            so: num(st.strikeOuts), tb: num(st.totalBases),
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
            g: num(st.gamesPitched) || num(st.gamesPlayed), gs: num(st.gamesStarted),
            w: num(st.wins), l: num(st.losses), sv: num(st.saves),
            eraAvg: +(num(st.era)).toFixed(2), whip: +(num(st.whip)).toFixed(2),
            so: num(st.strikeOuts), bb: num(st.baseOnBalls), ip: +innings.toFixed(1),
            k9: +(num(st.strikeoutsPer9Inn)).toFixed(1), hra: num(st.homeRuns),
            sho: num(st.shutouts), cg: num(st.completeGames),
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
        hr: 0, rbi: 0, runs: 0, hits: 0, sb: 0, db: 0, tp: 0, bb: 0, soBat: 0, opsSum: 0, opsN: 0,
        w: 0, l: 0, sv: 0, so: 0, ipSum: 0, bbPit: 0, eraSum: 0, eraN: 0,
      };
      careers.set(p.pid, c);
    }
    c.teamCounts[p.team] = (c.teamCounts[p.team] || 0) + 1;
    c.posCounts[p.pos] = (c.posCounts[p.pos] || 0) + 1;
    c.seasons.add(Number(p.era));
    c.bestRating = Math.max(c.bestRating, p.rating);
    if (p.kind === "bat") {
      c.hr += p.hr; c.rbi += p.rbi; c.runs += p.runs; c.hits += p.hits; c.sb += p.sb;
      c.db += p.db; c.tp += p.tp; c.bb += p.bb; c.soBat += p.so;
      c.opsSum += p.ops; c.opsN++;
    } else {
      c.w += p.w; c.l += p.l; c.sv += p.sv; c.so += p.so; c.ipSum += p.ip; c.bbPit += p.bb;
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
      db: c.db, tp: c.tp, bb: c.bb, soBat: c.soBat,
      ops: c.opsN ? +(c.opsSum / c.opsN).toFixed(3) : 0,
      w: c.w, l: c.l, sv: c.sv, so: c.so, ip: Math.round(c.ipSum), bbPit: c.bbPit,
      eraAvg: c.eraN ? +(c.eraSum / c.eraN).toFixed(2) : 0,
    });
  }
  gamePlayers.sort((a, b) => b.fame - a.fame);
  console.log(`✓ games: ${gamePlayers.length} unique career players`);

  /* ---- grid dataset (the Immaculate-style "Grid" game) ------------------- */
  // Per player: the franchises they appeared for + the single-season statistical
  // milestones they hit. Cells in the game are (team|stat) × (team|stat).
  const gridStats = [
    { key: "hr30", label: "30+ HR season" },
    { key: "hr40", label: "40+ HR season" },
    { key: "rbi100", label: "100+ RBI season" },
    { key: "runs100", label: "100+ Runs season" },
    { key: "hits180", label: "180+ Hit season" },
    { key: "db40", label: "40+ Double season" },
    { key: "sb30", label: "30+ SB season" },
    { key: "avg300", label: ".300+ AVG season" },
    { key: "ops900", label: ".900+ OPS season" },
    { key: "k200", label: "200+ K season" },
    { key: "w15", label: "15+ Win season" },
    { key: "sv30", label: "30+ Save season" },
    { key: "era300", label: "Sub-3.00 ERA season" },
    { key: "ip200", label: "200+ IP season" },
  ];
  const gp = new Map(); // pid -> { teams:Set, flags:Set }
  for (const c of pool) {
    let e = gp.get(c.pid);
    if (!e) { e = { teams: new Set(), flags: new Set() }; gp.set(c.pid, e); }
    e.teams.add(abbrOf(c.team));
    if (c.kind === "bat") {
      if (c.hr >= 30) e.flags.add("hr30");
      if (c.hr >= 40) e.flags.add("hr40");
      if (c.rbi >= 100) e.flags.add("rbi100");
      if (c.runs >= 100) e.flags.add("runs100");
      if (c.hits >= 180) e.flags.add("hits180");
      if (c.db >= 40) e.flags.add("db40");
      if (c.sb >= 30) e.flags.add("sb30");
      if (c.avg >= 0.300 && c.pa >= 300) e.flags.add("avg300");
      if (c.ops >= 0.900 && c.pa >= 300) e.flags.add("ops900");
    } else {
      if (c.so >= 200) e.flags.add("k200");
      if (c.w >= 15) e.flags.add("w15");
      if (c.sv >= 30) e.flags.add("sv30");
      if (c.eraAvg > 0 && c.eraAvg <= 3.0 && c.ip >= 100) e.flags.add("era300");
      if (c.ip >= 200) e.flags.add("ip200");
    }
  }
  const fameById = new Map(gamePlayers.map((p) => [p.id, p]));
  const gridPlayers = [];
  for (const [pid, e] of gp) {
    const meta = fameById.get(pid);
    if (!meta) continue; // only recognizable, career-aggregated players are guessable
    gridPlayers.push({ id: pid, name: meta.name, fame: meta.fame, teams: [...e.teams], flags: [...e.flags] });
  }
  gridPlayers.sort((a, b) => b.fame - a.fame);
  const gridTeams = [...new Set(gridPlayers.flatMap((p) => p.teams))].sort();
  const grid = { teams: gridTeams, stats: gridStats, players: gridPlayers };
  console.log(`✓ grid: ${gridPlayers.length} players across ${gridTeams.length} franchises`);

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

  /* ---- live-season player leaders (front page current-season stats) ------ */
  console.log(`→ ${NOW_SEASON} qualified leaders…`);
  const liveLeaders = { season: String(NOW_SEASON), hitting: {}, pitching: {} };
  const lead = (splits, key, dir, n = 8) =>
    [...splits]
      .filter((s) => num(s.stat?.[key]) !== 0 || key === "era" || key === "whip")
      .sort((a, b) => dir * (num(b.stat[key]) - num(a.stat[key])))
      .slice(0, n)
      .map((s) => ({ id: s.player?.id, name: s.player?.fullName, team: s.team?.name, v: num(s.stat[key]) }));
  try {
    const hit = await api(`/stats?stats=season&group=hitting&season=${NOW_SEASON}&sportId=1&limit=400&playerPool=qualified`);
    const hs = arr(hit?.stats?.[0]?.splits);
    liveLeaders.hitting = {
      homeRuns: lead(hs, "homeRuns", 1), rbi: lead(hs, "rbi", 1), avg: lead(hs, "avg", 1),
      ops: lead(hs, "ops", 1), hits: lead(hs, "hits", 1), stolenBases: lead(hs, "stolenBases", 1),
      runs: lead(hs, "runs", 1), doubles: lead(hs, "doubles", 1),
    };
    const pit = await api(`/stats?stats=season&group=pitching&season=${NOW_SEASON}&sportId=1&limit=400&playerPool=qualified`);
    const ps = arr(pit?.stats?.[0]?.splits);
    liveLeaders.pitching = {
      wins: lead(ps, "wins", 1), strikeOuts: lead(ps, "strikeOuts", 1), saves: lead(ps, "saves", 1),
      era: lead(ps, "era", -1), whip: lead(ps, "whip", -1), inningsPitched: lead(ps, "inningsPitched", 1),
    };
    console.log(`  HR leader: ${liveLeaders.hitting.homeRuns?.[0]?.name} (${liveLeaders.hitting.homeRuns?.[0]?.v})`);
  } catch (e) {
    console.log(`  ! live leaders unavailable: ${e.message}`);
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
    laddersBySeason, schedule, liveLeaders,
  };
  const strengths = { bySeason: strengthsBySeason };

  // The draft (/play) only needs the head + a short display stat line; the extra
  // per-season stats exist solely to feed the career/grid/rating computation
  // above, so they're dropped from the shipped pool to keep it lean.
  const slimPool = pool.map((c) => {
    const head = {
      id: c.id, pid: c.pid, name: c.name, team: c.team, era: c.era,
      kind: c.kind, pos: c.pos, posName: c.posName, elig: c.elig, rating: c.rating, g: c.g,
    };
    return c.kind === "bat"
      ? { ...head, hr: c.hr, rbi: c.rbi, runs: c.runs, hits: c.hits, sb: c.sb,
          avg: c.avg, obp: c.obp, slg: c.slg, ops: c.ops }
      : { ...head, w: c.w, l: c.l, sv: c.sv, eraAvg: c.eraAvg, whip: c.whip,
          so: c.so, ip: c.ip, k9: c.k9 };
  });

  await Promise.all([
    writeFile(join(OUT_DIR, "meta.json"), JSON.stringify(meta)),
    writeFile(join(OUT_DIR, "pool.json"), JSON.stringify(slimPool)),
    writeFile(join(OUT_DIR, "games.json"), JSON.stringify(games)),
    writeFile(join(OUT_DIR, "results.json"), JSON.stringify(results)),
    writeFile(join(OUT_DIR, "strengths.json"), JSON.stringify(strengths)),
    writeFile(join(OUT_DIR, "grid.json"), JSON.stringify(grid)),
  ]);

  console.log(
    `✓ wrote ${OUT_DIR} — ${pool.length} cards, ${gamePlayers.length} players, ` +
    `${seasonsWithLadder.length} seasons, ${schedule.results.length} results ` +
    `in ${((Date.now() - t0) / 1000).toFixed(1)}s`
  );
}

main().catch((e) => { console.error("✗ pipeline failed:", e); process.exit(1); });
