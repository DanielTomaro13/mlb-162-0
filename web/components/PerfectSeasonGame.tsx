"use client";
/* =========================================================================
   PERFECT SEASON — the all-time MLB draft game.
   Spin for a random team + season, draft a player into their position, fill
   your roster and chase a flawless 162–0. Reads the static, build-time player
   pool and offers baseball modes (Starting Nine, The Roster, Active 18, Salary
   Cap, The Gauntlet, Cellar Dwellers) plus a Monte-Carlo season simulator.
   ========================================================================= */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { loadMeta, loadPool, loadStrengths } from "@/lib/data";
import {
  Mode, MODE_INFO, PoolPlayer, REROLLS, SQUADS, SALARY_CAP, salaryFor,
} from "@/lib/types";
import { seasonRecord, simulateSeason, verdict } from "@/lib/sim";
import { POS_LABEL, POS_CODES, avg3 } from "@/lib/format";
import { teamColors } from "@/lib/teams";
import { submitScore } from "@/lib/leaderboard";
import { getName, setName, todayKey } from "@/lib/progress";
import { tick, settle, fanfare, isMuted, toggleMuted } from "@/lib/sound";
import { dailySeed, rng } from "@/lib/games-data";
import Confetti from "@/components/Confetti";
import ShareButtons from "@/components/ShareButtons";
import AdUnit from "@/components/AdUnit";
import DiamondField from "@/components/DiamondField";
import { AD_SLOTS } from "@/lib/ads";

const rnd = <T,>(a: T[]): T => a[Math.floor(Math.random() * a.length)];
const ORDER: Mode[] = ["quick", "classic", "full", "cap", "gauntlet", "spoon"];

/** A friendly UTC date label for the daily challenge, e.g. "Jun 15, 2026". */
function dailyDateLabel(): string {
  const d = new Date();
  return d.toLocaleDateString("en-US", {
    timeZone: "UTC", month: "short", day: "numeric", year: "numeric",
  });
}

/** A kind-aware one-line stat line for a drafted player. Hitters lead with the
 *  power/average story; pitchers with wins, ERA and strikeouts. Every field is
 *  optional on PoolPlayer, so each branch guards on the player's `kind`. */
function statLine(p: PoolPlayer): string {
  if (p.kind === "pit") {
    return `${p.w ?? 0} W · ${avg3Era(p.eraAvg)} ERA · ${p.so ?? 0} K`;
  }
  return `${p.hr ?? 0} HR · ${avg3(p.ops ?? 0)} OPS`;
}
/** ERA prints as a plain 2-dp number ("2.74"), unlike the leading-zero-stripped
 *  rate stats (OPS/AVG) that go through avg3. */
function avg3Era(n?: number): string {
  return Number.isFinite(n) ? (n as number).toFixed(2) : "0.00";
}

export default function PerfectSeasonGame() {
  const [pool, setPool] = useState<PoolPlayer[] | null>(null);
  const [strengths, setStrengths] = useState<Record<string, number[]>>({});
  const [err, setErr] = useState<string | null>(null);

  const [mode, setMode] = useState<Mode | null>(null);
  const [daily, setDaily] = useState(false); // daily challenge: fixed spin, no re-rolls
  const [squad, setSquad] = useState<(PoolPlayer | null)[]>([]);
  const [reels, setReels] = useState<{ team: string | null; era: string | null }>({ team: null, era: null });
  const [spinning, setSpinning] = useState(false);
  const [rerolls, setRerolls] = useState({ team: 0, era: 0 });
  const [notice, setNotice] = useState<string | null>(null);
  const [pendingPick, setPendingPick] = useState<{ player: PoolPlayer; codes: string[] } | null>(null);
  const [posFilter, setPosFilter] = useState("All");
  const [muted, setMuted] = useState(false);
  const spinningRef = useRef(false);
  const flickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const settleRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoSpin = useRef(false);
  const autoDaily = useRef(false);
  useEffect(() => () => {
    if (flickRef.current) clearInterval(flickRef.current);
    if (settleRef.current) clearTimeout(settleRef.current);
  }, []);

  useEffect(() => {
    Promise.all([loadPool(), loadMeta(), loadStrengths()])
      .then(([p, , s]) => { setPool(p); setStrengths(s.bySeason); })
      .catch(() => setErr("Couldn't load the player pool. Try refreshing."));
    setMuted(isMuted());
    // URL shortcuts. /play?daily=1 → the shared daily challenge (fixed draw);
    // /play?quick=1 → Starting Nine, auto-spun. Daily takes precedence.
    if (typeof window !== "undefined") {
      const q = new URLSearchParams(window.location.search);
      if (q.get("daily")) {
        autoDaily.current = true; // entered once pool is ready (see effect below)
      } else if (q.get("quick")) {
        autoSpin.current = true;
        start("quick");
      }
    }
  }, []);

  // Enter the daily challenge once the pool has loaded (deep-link /play?daily=1).
  useEffect(() => {
    if (autoDaily.current && pool && !mode) {
      autoDaily.current = false;
      startDaily();
    }
  }, [pool, mode]); // eslint-disable-line react-hooks/exhaustive-deps

  const slots = mode ? SQUADS[mode] : [];
  const total = slots.length;
  const picksMade = squad.filter(Boolean).length;
  const firstEmpty = squad.findIndex((s) => !s);
  const done = squad.length > 0 && firstEmpty === -1;
  const maxReroll = mode ? REROLLS[mode] : { team: 0, era: 0 };

  const filled = squad.filter(Boolean) as PoolPlayer[];
  const avg = filled.length ? filled.reduce((a, b) => a + b.rating, 0) / filled.length : 0;
  const salary = filled.reduce((a, b) => a + salaryFor(b.rating), 0);

  const undrafted = useCallback((p: PoolPlayer) => !squad.some((s) => s && s.id === p.id), [squad]);

  const candidates = useMemo(() => {
    if (!pool || !reels.team) return [];
    return pool
      .filter((p) => p.team === reels.team && (!reels.era || p.era === reels.era) && undrafted(p))
      .sort((a, b) => (mode === "spoon" ? a.rating - b.rating : b.rating - a.rating));
  }, [pool, reels, undrafted, mode]);

  const teamsWithPlayers = useCallback(() => {
    if (!pool) return [];
    return Array.from(new Set(pool.filter(undrafted).map((p) => p.team)));
  }, [pool, undrafted]);
  const erasForTeam = useCallback((team: string) => {
    if (!pool) return [];
    return Array.from(new Set(pool.filter((p) => p.team === team && undrafted(p)).map((p) => p.era)));
  }, [pool, undrafted]);
  const teamsForEra = useCallback((era: string | null) => {
    if (!pool || !era) return [];
    return Array.from(new Set(pool.filter((p) => p.era === era && undrafted(p)).map((p) => p.team)));
  }, [pool, undrafted]);

  const animateTo = useCallback((target: { team: string; era: string | null }, lock: { team?: boolean; era?: boolean } = {}) => {
    if (spinningRef.current) return;
    spinningRef.current = true;
    setSpinning(true);
    setPendingPick(null);
    setPosFilter("All");
    const allTeams = teamsWithPlayers();
    const finalize = () => {
      if (flickRef.current) clearInterval(flickRef.current);
      if (settleRef.current) clearTimeout(settleRef.current);
      flickRef.current = null; settleRef.current = null;
      setReels(target);
      setSpinning(false);
      spinningRef.current = false;
      settle();
    };
    let ticks = 0;
    const max = 13 + Math.floor(Math.random() * 7);
    if (flickRef.current) clearInterval(flickRef.current);
    flickRef.current = setInterval(() => {
      ticks++;
      tick();
      const ft = lock.team ? target.team : rnd(allTeams.length ? allTeams : [target.team]);
      let fe: string | null;
      if (lock.era) fe = target.era;
      else { const es = erasForTeam(ft); fe = es.length ? rnd(es) : null; }
      setReels({ team: ft, era: fe });
      if (ticks >= max) finalize();
    }, 70);
    // backstop: always settle within 2.5s even if the interval is throttled
    settleRef.current = setTimeout(finalize, 2500);
  }, [teamsWithPlayers, erasForTeam]);

  function spinFresh() {
    if (daily || !pool || spinningRef.current || done) return;
    const ts = teamsWithPlayers();
    if (!ts.length) return;
    const team = rnd(ts);
    const es = erasForTeam(team);
    animateTo({ team, era: es.length ? rnd(es) : null });
  }
  function rerollTeam() {
    if (daily || !pool || spinningRef.current || done || rerolls.team >= maxReroll.team || !reels.team) return;
    const sameEra = teamsForEra(reels.era).filter((c) => c !== reels.team);
    setRerolls((r) => ({ ...r, team: r.team + 1 }));
    if (sameEra.length) { animateTo({ team: rnd(sameEra), era: reels.era }, { era: true }); return; }
    const ts = teamsWithPlayers().filter((c) => c !== reels.team);
    const pick = ts.length ? ts : teamsWithPlayers();
    const team = rnd(pick);
    const es = erasForTeam(team);
    animateTo({ team, era: es.length ? rnd(es) : null });
  }
  function rerollEra() {
    if (daily || !pool || spinningRef.current || done || rerolls.era >= maxReroll.era || !reels.team) return;
    const es = erasForTeam(reels.team).filter((e) => e !== reels.era);
    if (!es.length) return;
    setRerolls((r) => ({ ...r, era: r.era + 1 }));
    animateTo({ team: reels.team, era: rnd(es) }, { team: true });
  }

  // can this player still be slotted somewhere? (any eligible position or bench)
  const playerPlaceable = useCallback((p: PoolPlayer) => {
    const elig = p.elig?.length ? p.elig : [p.pos];
    return slots.some((s, i) => !squad[i] && (s.code === "INT" || elig.includes(s.code)));
  }, [slots, squad]);

  function placeInSlot(p: PoolPlayer, code: string) {
    const slot = slots.findIndex((s, i) => s.code === code && !squad[i]);
    if (slot === -1) return;
    setSquad((sq) => { const next = sq.slice(); next[slot] = { ...p, pos: code, posName: POS_LABEL[code] || p.posName }; return next; });
    setNotice(null);
    setPendingPick(null);
    setReels({ team: null, era: null });
  }

  function draft(p: PoolPlayer) {
    if (spinningRef.current || done) return;
    if (mode === "cap" && salary + salaryFor(p.rating) > SALARY_CAP) {
      setNotice(`Over the cap — ${p.name} would blow your salary cap. Draft someone cheaper.`);
      return;
    }
    const elig = p.elig?.length ? p.elig : [p.pos];
    // distinct eligible positions that still have an open slot
    const openCodes = elig.filter((c) => slots.some((s, i) => s.code === c && !squad[i]));
    if (openCodes.length >= 2) {
      // genuinely multi-position with a real choice — ask which slot
      setPendingPick({ player: p, codes: openCodes });
      return;
    }
    if (openCodes.length === 1) { placeInSlot(p, openCodes[0]); return; }
    // none of their positions open — drop onto the bench if this mode has one
    if (slots.some((s, i) => s.code === "INT" && !squad[i])) { placeInSlot(p, "INT"); return; }
    setNotice(`${POS_LABEL[p.pos] || "That position"} is full — draft a different player.`);
  }

  function start(m: Mode) {
    setDaily(false);
    setMode(m);
    setSquad(SQUADS[m].map(() => null));
    setReels({ team: null, era: null });
    setRerolls({ team: 0, era: 0 });
    setNotice(null);
    setPendingPick(null);
  }

  /** The fixed daily team + era. Deterministic from rng(dailySeed("play")) so
   *  every visitor that UTC day drafts the SAME pool. We pick from the full set
   *  of (team, era) pairs that carry at least nine players (enough for the
   *  Starting Nine), so the draw always has a draftable lineup. */
  const dailyDraw = useCallback((): { team: string; era: string } | null => {
    if (!pool) return null;
    const counts = new Map<string, number>();
    for (const p of pool) {
      const key = `${p.team}@@${p.era}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    const pairs = Array.from(counts.entries())
      .filter(([, n]) => n >= 9)
      .map(([k]) => k)
      .sort(); // stable, deterministic ordering independent of object insertion
    if (!pairs.length) return null;
    const rand = rng(dailySeed("play"));
    const chosen = pairs[Math.floor(rand() * pairs.length)];
    const [team, era] = chosen.split("@@");
    return { team, era };
  }, [pool]);

  /** Enter the daily challenge: always Starting Nine, fixed spin, no re-rolls. */
  function startDaily() {
    setDaily(true);
    setMode("quick");
    setSquad(SQUADS.quick.map(() => null));
    setRerolls({ team: 0, era: 0 });
    setNotice(null);
    setPendingPick(null);
    setPosFilter("All");
    const draw = dailyDraw();
    setReels(draw ? { team: draw.team, era: draw.era } : { team: null, era: null });
  }
  function reset() {
    if (!mode) return;
    setSquad(SQUADS[mode].map(() => null));
    setRerolls({ team: 0, era: 0 });
    setNotice(null);
    setPendingPick(null);
    if (daily) {
      // re-drafting the daily challenge keeps the same fixed draw
      const draw = dailyDraw();
      setReels(draw ? { team: draw.team, era: draw.era } : { team: null, era: null });
    } else {
      setReels({ team: null, era: null });
    }
  }

  // positions that still have an open slot (for highlighting the filters)
  const openPosCodes = useMemo(() => {
    const set = new Set<string>();
    slots.forEach((s, i) => { if (!squad[i] && s.code !== "INT") set.add(s.code); });
    return set;
  }, [slots, squad]);

  // The on-field codes the diamond cares about (everything but pitchers/bench).
  const FIELD = ["C", "1B", "2B", "3B", "SS", "LF", "CF", "RF", "DH"];
  // The next empty field spot — the diamond highlights it as "active".
  const activeFieldCode = useMemo(() => {
    const idx = slots.findIndex((s, i) => !squad[i] && FIELD.includes(s.code));
    return idx === -1 ? null : slots[idx].code;
  }, [slots, squad]); // eslint-disable-line react-hooks/exhaustive-deps

  // Tapping a diamond spot focuses the candidate list on that position (or, for
  // a filled spot, just selects its filter so you can see who's there).
  function pickDiamondSlot(code: string) {
    if (spinning || done) return;
    setPosFilter((cur) => (cur === code ? "All" : code));
  }

  const shownCandidates = useMemo(() => {
    if (posFilter === "All") return candidates;
    return candidates.filter((p) => (p.elig?.length ? p.elig : [p.pos]).includes(posFilter));
  }, [candidates, posFilter]);

  const noDraftable = !!reels.team && !spinning &&
    (candidates.length === 0 || candidates.every((c) => !playerPlaceable(c)));

  // Auto-spin once when arriving via the Starting Nine shortcut (/play?quick=1).
  useEffect(() => {
    if (autoSpin.current && mode === "quick" && pool && !reels.team && !spinningRef.current && picksMade === 0) {
      autoSpin.current = false;
      spinFresh();
    }
  }, [mode, pool]); // eslint-disable-line react-hooks/exhaustive-deps

  function toggleSound() { setMuted(toggleMuted()); }

  /* ----- render ----- */
  if (err) return <p style={{ color: "var(--danger)" }}>{err}</p>;
  if (!pool) return <p style={{ color: "var(--muted)" }}>Loading the all-time pool…</p>;

  if (!mode) {
    return (
      <div style={{ display: "grid", gap: "1.25rem" }}>
        <header>
          <h1 style={{ fontSize: "2.4rem", margin: 0, textTransform: "uppercase" }}>
            Perfect <span style={{ color: "var(--accent)" }}>Season</span>
          </h1>
          <p style={{ color: "var(--muted)", maxWidth: 640, marginTop: 6 }}>
            Spin for a team and season, draft the player, fill your roster and chase a flawless 162–0.
            Choose your game.
          </p>
        </header>

        {/* Daily Challenge — everyone gets the SAME draw and competes on a
            shared daily leaderboard. */}
        <button onClick={startDaily} className="card"
          style={{ padding: "1.15rem 1.25rem", textAlign: "left", cursor: "pointer", color: "var(--text)",
            display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap",
            border: "1.5px solid var(--accent)", background: "linear-gradient(135deg, rgba(228,50,43,0.14), rgba(55,194,129,0.10))" }}>
          <span style={{ fontSize: "2.2rem", lineHeight: 1 }} aria-hidden>⚾</span>
          <span style={{ display: "grid", gap: 4, flex: 1, minWidth: 200 }}>
            <span style={{ fontSize: ".7rem", letterSpacing: ".14em", textTransform: "uppercase", color: "var(--accent)" }}>
              Daily Challenge · {dailyDateLabel()}
            </span>
            <strong style={{ fontFamily: "var(--font-cond)", fontSize: "1.45rem", textTransform: "uppercase" }}>
              Today&apos;s Starting Nine
            </strong>
            <span style={{ fontSize: ".85rem", color: "var(--muted)", lineHeight: 1.45 }}>
              The same fixed team &amp; season for everyone today — draft the best nine and climb the shared daily leaderboard. No re-rolls.
            </span>
          </span>
          <span className="chip" style={{ color: "var(--accent-2)", whiteSpace: "nowrap" }}>Play today →</span>
        </button>

        <div className="grid-cards">
          {ORDER.map((m) => {
            const info = MODE_INFO[m];
            return (
              <button key={m} className="card" onClick={() => start(m)}
                style={{ padding: "1.1rem", textAlign: "left", cursor: "pointer", color: "var(--text)", display: "grid", gap: 6 }}>
                <span style={{ fontSize: ".7rem", letterSpacing: ".12em", textTransform: "uppercase", color: "var(--gold)" }}>{info.tag}</span>
                <strong style={{ fontFamily: "var(--font-cond)", fontSize: "1.3rem", textTransform: "uppercase" }}>{info.name}</strong>
                <span style={{ fontSize: ".85rem", color: "var(--muted)", lineHeight: 1.45 }}>{info.desc}</span>
                <span style={{ fontSize: ".72rem", color: "var(--muted)" }}>{SQUADS[m].length} picks · {REROLLS[m].team}+{REROLLS[m].era} re-rolls</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "minmax(0,1.1fr) minmax(0,0.9fr)" }} className="ps-grid">
      <style>{`@media (max-width: 800px){ .ps-grid { grid-template-columns: 1fr !important; } }`}</style>

      {/* LEFT: spin + roster */}
      <section className="card" style={{ padding: "1.25rem", minHeight: 420 }}>
        {!done ? (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, gap: 8 }}>
              <span className="chip">{picksMade} / {total} drafted</span>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <button onClick={toggleSound} aria-label={muted ? "Unmute" : "Mute"} title={muted ? "Unmute" : "Mute"}
                  style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: "1rem", lineHeight: 1, padding: 2 }}>
                  {muted ? "🔇" : "🔊"}
                </button>
                <span style={{ fontFamily: "var(--font-cond)", fontSize: "1.2rem", textTransform: "uppercase", color: "var(--gold)" }}>{daily ? "Daily Challenge" : MODE_INFO[mode].name}</span>
              </div>
            </div>

            {daily && (
              <div style={{ marginBottom: 14, padding: "10px 12px", borderRadius: 8,
                border: "1px solid var(--accent)", background: "rgba(228,50,43,0.10)",
                display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <span style={{ fontSize: "1.1rem", lineHeight: 1 }} aria-hidden>⚾</span>
                <span style={{ fontSize: ".82rem", lineHeight: 1.4 }}>
                  <strong>Daily Challenge · {dailyDateLabel()}</strong>
                  <span style={{ color: "var(--muted)" }}> — same draw for everyone today. Draft your best nine; no re-rolls.</span>
                </span>
              </div>
            )}

            <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
              <Reel label="Team" value={reels.team} spinning={spinning} big />
              <Reel label="Season" value={reels.era} spinning={spinning} />
            </div>

            {daily ? null : (!reels.team || spinning) ? (
              <button className="btn btn-primary" style={{ width: "100%" }} onClick={spinFresh} disabled={spinning}>
                {spinning ? "Spinning…" : "Spin"}
              </button>
            ) : (
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn" style={{ flex: 1 }} onClick={rerollTeam} disabled={rerolls.team >= maxReroll.team}>
                  ↻ Team{rerolls.team >= maxReroll.team ? " · used" : ` (${maxReroll.team - rerolls.team})`}
                </button>
                <button className="btn" style={{ flex: 1 }} onClick={rerollEra} disabled={rerolls.era >= maxReroll.era || erasForTeam(reels.team).length <= 1}>
                  ↻ Season{rerolls.era >= maxReroll.era ? " · used" : ` (${maxReroll.era - rerolls.era})`}
                </button>
              </div>
            )}

            {mode === "cap" && (
              <div style={{ marginTop: 12, fontSize: ".82rem", color: salary > SALARY_CAP ? "var(--danger)" : "var(--muted)" }}>
                Salary used <strong style={{ color: "var(--text)" }}>${(salary / 1e6).toFixed(2)}M</strong> / ${(SALARY_CAP / 1e6).toFixed(1)}M cap
              </div>
            )}

            {notice && (
              <div style={{ marginTop: 12, padding: "10px 12px", borderRadius: 8, background: "rgba(255,84,54,0.1)", border: "1px solid rgba(255,84,54,0.4)", fontSize: ".85rem" }}>
                {notice}
              </div>
            )}

            {pendingPick && (
              <div style={{ marginTop: 12, padding: "12px", borderRadius: 8, background: "rgba(232,196,105,0.1)", border: "1px solid var(--gold)" }}>
                <div style={{ fontSize: ".85rem", marginBottom: 8 }}>
                  <strong>{pendingPick.player.name}</strong> can play a few spots — where do they slot?
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {pendingPick.codes.map((c) => (
                    <button key={c} className="btn" style={{ minHeight: 38 }} onClick={() => placeInSlot(pendingPick.player, c)}>
                      {POS_LABEL[c] || c}
                    </button>
                  ))}
                  <button className="btn" style={{ minHeight: 38, color: "var(--muted)" }} onClick={() => setPendingPick(null)}>Cancel</button>
                </div>
              </div>
            )}

            {reels.team && !spinning && (
              <div style={{ marginTop: 16, borderTop: "1px dashed var(--border)", paddingTop: 14 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
                  <strong>{reels.team}</strong>
                  {reels.era && <span style={{ color: "var(--gold)" }}>· {reels.era}</span>}
                  <span className="chip" style={{ marginLeft: "auto" }}>{shownCandidates.length} of {candidates.length}</span>
                </div>

                {/* filter the spun roster by position — open slots are highlighted */}
                <div className="scroll-x" style={{ display: "flex", gap: 5, marginBottom: 10, paddingBottom: 2 }}>
                  {["All", ...POS_CODES].map((code) => {
                    const open = code === "All" || openPosCodes.has(code);
                    const active = posFilter === code;
                    return (
                      <button key={code} onClick={() => setPosFilter(code)} className="chip"
                        style={{ cursor: "pointer", flexShrink: 0, fontSize: ".68rem",
                          borderColor: active ? "var(--accent)" : open ? "var(--border)" : "transparent",
                          color: active ? "var(--text)" : open ? "var(--gold)" : "var(--muted)",
                          opacity: open ? 1 : 0.5 }}
                        title={code === "All" ? "All positions" : POS_LABEL[code]}>
                        {code}
                      </button>
                    );
                  })}
                </div>

                {shownCandidates.length === 0 ? (
                  <p style={{ color: "var(--muted)", fontStyle: "italic" }}>
                    {candidates.length === 0 ? "No players left from this draw." : `No ${POS_LABEL[posFilter] || posFilter} in this draw.`}
                  </p>
                ) : (
                  <div className="scroll-x" style={{ maxHeight: 340, overflowY: "auto", display: "grid", gap: 6 }}>
                    {shownCandidates.slice(0, 60).map((p) => {
                      const full = !playerPlaceable(p);
                      const posLabel = p.elig?.length > 1 ? p.elig.join("/") : p.pos;
                      return (
                        <button key={p.id} onClick={() => draft(p)} disabled={full}
                          style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 10px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--panel-2)", color: "var(--text)", cursor: full ? "not-allowed" : "pointer", opacity: full ? 0.4 : 1, textAlign: "left", width: "100%" }}>
                          <span style={{ fontFamily: "var(--font-cond)", fontSize: "1.4rem", minWidth: 32, textAlign: "center", color: p.rating >= 90 ? "var(--gold)" : "var(--text)" }}>{p.rating}</span>
                          <span style={{ flex: 1, minWidth: 0 }}>
                            <span style={{ display: "flex", gap: 7, alignItems: "center", fontWeight: 600, fontSize: ".92rem" }}>
                              {p.name}
                              <span className="chip" style={{ fontSize: ".62rem", padding: "1px 6px", color: "var(--gold)" }}>{posLabel}</span>
                            </span>
                            <span style={{ fontFamily: "var(--font-mono)", fontSize: ".68rem", color: "var(--muted)" }}>
                              {statLine(p)}
                            </span>
                          </span>
                          <span style={{ fontFamily: "var(--font-mono)", fontSize: ".62rem", color: "var(--accent)", whiteSpace: "nowrap" }}>
                            {full ? "FULL" : mode === "cap" ? `$${(salaryFor(p.rating) / 1e6).toFixed(2)}M` : "DRAFT →"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
                {noDraftable && (
                  <button className="btn btn-primary" style={{ width: "100%", marginTop: 10 }} onClick={spinFresh}>Spin again</button>
                )}
              </div>
            )}

            {!reels.team && (
              <p style={{ marginTop: 18, fontSize: ".85rem", color: "var(--muted)", lineHeight: 1.6 }}>
                Hit <b>Spin</b> to roll a random team and season, then draft a player — they slot
                straight into their position. Once you spin you must draft from that team, so spend
                your re-rolls wisely.
              </p>
            )}
          </>
        ) : (
          <ResultView mode={mode} daily={daily} squad={filled} avg={avg} strengths={strengths} onReset={reset} onMode={() => setMode(null)} />
        )}
      </section>

      {/* RIGHT: the diamond + roster sheet */}
      <section className="card" style={{ padding: "1rem 1rem 1.1rem", alignSelf: "start" }}>
        {/* The nine fielding spots as a baseball diamond — the primary visual.
            Tapping a spot focuses the candidate list on that position. Pitchers
            and bench stay in the roster-sheet list below. */}
        <div style={{ marginBottom: 14 }}>
          <DiamondField
            slots={slots}
            squad={squad}
            activeCode={activeFieldCode}
            onPick={pickDiamondSlot}
          />
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--font-mono)", fontSize: ".7rem", letterSpacing: ".12em", color: "var(--muted)", textTransform: "uppercase", paddingBottom: 10, borderBottom: "1px solid var(--border)" }}>
          <span>Roster sheet</span>
          <span style={{ color: "var(--gold)" }}>{filled.length ? `AVG ${avg.toFixed(1)}` : "—"}</span>
        </div>
        <ol style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {slots.map((s, i) => {
            const p = squad[i];
            const [c1] = p ? teamColors(p.team) : ["var(--border)"];
            return (
              <li key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 2px", borderBottom: "1px solid var(--border)" }}>
                <span style={{ fontFamily: "var(--font-cond)", fontSize: "1rem", color: "var(--muted)", minWidth: 18, textAlign: "center" }}>{s.n}</span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: ".62rem", color: "var(--muted)", minWidth: 22 }}>{s.code}</span>
                <span style={{ flex: 1, minWidth: 0, fontSize: ".85rem", display: "flex", flexDirection: "column" }}>
                  {p ? (
                    <>
                      <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ width: 8, height: 8, borderRadius: 2, background: c1, flexShrink: 0 }} />
                        {p.name}
                      </span>
                      <span style={{ fontSize: ".66rem", color: "var(--muted)" }}>{p.team} · {p.era}</span>
                    </>
                  ) : <span style={{ color: "var(--border)" }}>—</span>}
                </span>
                <span style={{ fontFamily: "var(--font-cond)", fontSize: "1.1rem", color: p && p.rating >= 90 ? "var(--gold)" : "var(--text)", minWidth: 26, textAlign: "right" }}>{p ? p.rating : ""}</span>
              </li>
            );
          })}
        </ol>
        <div style={{ display: "flex", gap: 16, marginTop: 12 }}>
          {filled.length > 0 && !done && (
            <button onClick={reset} style={linkBtn}>start over</button>
          )}
          <button onClick={() => setMode(null)} style={linkBtn}>change mode</button>
        </div>
      </section>
    </div>
  );
}

const linkBtn: React.CSSProperties = {
  background: "none", border: "none", color: "var(--muted)", fontFamily: "var(--font-mono)",
  fontSize: ".7rem", letterSpacing: ".1em", cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 3,
};

function Reel({ label, value, spinning, big }: { label: string; value: string | null; spinning?: boolean; big?: boolean }) {
  return (
    <div style={{ flex: big ? 1.7 : 1, background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 8, padding: "12px 12px", overflow: "hidden" }}>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: ".6rem", letterSpacing: ".24em", color: "var(--muted)", marginBottom: 6, textTransform: "uppercase" }}>{label}</div>
      <div style={{
        fontFamily: "var(--font-cond)", fontSize: big ? "1.7rem" : "1.3rem", textTransform: "uppercase",
        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        color: value ? (big ? "var(--text)" : "var(--gold)") : "var(--border)",
        filter: spinning ? "blur(0.6px)" : undefined, opacity: spinning ? 0.85 : 1,
        animation: spinning ? "flick 0.07s steps(2) infinite" : undefined,
      }}>
        {value || (label === "Season" ? "—" : "?")}
      </div>
    </div>
  );
}

function ResultView({ mode, daily, squad, avg, strengths, onReset, onMode }: {
  mode: Mode; daily?: boolean; squad: PoolPlayer[]; avg: number; strengths: Record<string, number[]>;
  onReset: () => void; onMode: () => void;
}) {
  const [name, setNm] = useState("");
  const [saved, setSaved] = useState(false);

  // deterministic seed from the actual players so a given roster always plays
  // out the same season — 162–0 is a genuine ~5% event for a near-perfect squad
  const seed = useMemo(() => squad.reduce((h, p) => (Math.imul(h, 31) + p.pid) >>> 0, 7), [squad]);
  const sim = useMemo(() => {
    const eras = Array.from(new Set(squad.map((p) => p.era)));
    const pool = eras.flatMap((e) => strengths[e] || []);
    return simulateSeason(avg, pool.length ? pool : Object.values(strengths).flat(), seed);
  }, [squad, avg, strengths, seed]);
  const rec = { wins: sim.wins, losses: sim.losses };
  const v = verdict(rec.wins);
  const perfect = mode === "spoon" ? rec.wins === 0 : rec.wins === 162;
  const goalPct = mode === "spoon" ? sim.spoonPct : sim.perfectPct;

  useEffect(() => { setNm(getName()); if (perfect) fanfare(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function save() {
    if (name.trim()) setName(name.trim());
    const score = mode === "spoon" ? 162 - rec.wins : rec.wins;
    // Always post to the per-mode board.
    submitScore(`perfect-${mode}`, score, true);
    // Feed the shared daily board (shown on the home page). The Daily Challenge
    // is the headline contributor — everyone drafts the same fixed nine — but a
    // normal run also lands here so the board is never empty. Daily Challenge
    // submits its win total so the leaderboard ranks "most wins from today's
    // shared draw".
    const dailyScore = daily ? rec.wins : score;
    submitScore(`daily-${todayKey()}`, dailyScore, true);
    setSaved(true);
  }

  return (
    <div style={{ textAlign: "center", padding: "0.5rem 0.25rem", position: "relative" }}>
      {perfect && <Confetti />}
      {daily && (
        <div className="chip" style={{ color: "var(--accent)", marginBottom: 8 }}>
          ⚾ Daily Challenge · {dailyDateLabel()}
        </div>
      )}
      <div style={{ fontFamily: "var(--font-cond)", fontSize: "clamp(56px,12vw,104px)", lineHeight: 1, display: "flex", justifyContent: "center", gap: 8, alignItems: "baseline" }}>
        <span style={{ color: "var(--accent-2)" }}>{rec.wins}</span>
        <span style={{ color: "var(--muted)", fontSize: ".6em" }}>–</span>
        <span style={{ color: rec.losses ? "var(--danger)" : "var(--accent-2)" }}>{rec.losses}</span>
      </div>
      <div style={{ fontFamily: "var(--font-cond)", fontSize: "1.6rem", textTransform: "uppercase", color: "var(--gold)", marginTop: 4 }}>{v.t}</div>
      <p style={{ color: "var(--muted)", maxWidth: 340, margin: "8px auto 0", lineHeight: 1.5 }}>{v.s}</p>

      <div style={{ display: "flex", gap: 3, justifyContent: "center", marginTop: 18, flexWrap: "wrap", maxWidth: 320, marginInline: "auto" }}>
        {Array.from({ length: 162 }).map((_, i) => (
          <span key={i} style={{ width: 8, height: 16, borderRadius: 1, background: i < rec.wins ? "var(--accent-2)" : "var(--border)" }} />
        ))}
      </div>

      <div style={{ display: "flex", gap: 16, justifyContent: "center", marginTop: 18, fontSize: ".8rem", color: "var(--muted)", flexWrap: "wrap" }}>
        <span>Roster rating <strong style={{ color: "var(--text)" }}>{avg.toFixed(1)}</strong></span>
        <span>{mode === "spoon" ? "0–162" : "162–0"} odds <strong style={{ color: "var(--text)" }}>{goalPct < 0.1 ? "<0.1" : goalPct.toFixed(1)}%</strong></span>
        <span>Stronger than <strong style={{ color: "var(--text)" }}>{sim.realPercentile}%</strong> of real teams</span>
      </div>

      <div style={{ marginTop: 18, display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
        {!saved ? (
          <>
            <input value={name} onChange={(e) => setNm(e.target.value)} placeholder="GM name" maxLength={16}
              style={{ padding: ".5rem .7rem", borderRadius: 8, border: "1px solid var(--border)", background: "var(--panel)", color: "var(--text)", maxWidth: 160 }} />
            <button className="btn btn-primary" onClick={save}>Save to Hall of Fame</button>
          </>
        ) : <span className="chip" style={{ color: "var(--accent-2)" }}>✓ Saved to the Hall of Fame</span>}
      </div>

      <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px dashed var(--border)" }}>
        <div style={{ fontSize: ".72rem", letterSpacing: ".1em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 12 }}>
          Share your roster
        </div>
        <ShareButtons
          data={{
            record: `${rec.wins}–${rec.losses}`,
            verdict: v.t,
            avg,
            modeName: MODE_INFO[mode].name,
            players: squad.map((p) => ({ n: p.name, pos: p.pos, team: p.team, era: p.era, rating: p.rating })),
          }}
          caption={`I built a ${rec.wins}–${rec.losses} all-time MLB roster (${v.t}) in MLB 162-0!`}
        />
      </div>

      <div style={{ marginTop: 16, display: "flex", gap: 16, justifyContent: "center" }}>
        <button onClick={onReset} style={linkBtn}>draft a new roster</button>
        <button onClick={onMode} style={linkBtn}>change mode</button>
      </div>

      <AdUnit slot={AD_SLOTS.game} />
    </div>
  );
}
