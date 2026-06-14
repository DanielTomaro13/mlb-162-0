"use client";
/* Invincibles — a lean roster-builder + Monte-Carlo season simulator. Spin a
   team + season, draft a nine-man lineup (C–DH) plus an ace and a closer, then
   run thousands of 162-game seasons to see your win distribution, your odds of
   going a flawless 162–0 and how you rate against real MLB sides. Shares the
   engine with /play. */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { loadGamesData, type GamePlayer } from "@/lib/games-data";
import { simulateSeason, type SimResult } from "@/lib/sim";
import { POS_LABEL, avg3 } from "@/lib/format";
import { teamColors } from "@/lib/teams";
import { submitScore, topScores, type ScoreEntry } from "@/lib/leaderboard";
import { getName, setName } from "@/lib/progress";
import { tick, settle, fanfare } from "@/lib/sound";
import Confetti from "@/components/Confetti";

const rnd = <T,>(a: T[]): T => a[Math.floor(Math.random() * a.length)];

/** The nine field positions in batting order, plus an ace and a closer. */
const POS_ORDER = ["C", "1B", "2B", "3B", "SS", "LF", "CF", "RF", "DH", "SP", "CL"];
const SLOTS = POS_ORDER.map((c, i) => ({ code: c, n: i + 1 }));

/** A short, kind-aware stat line for a player card. */
function statLine(p: GamePlayer): string {
  return p.kind === "pit"
    ? `${p.w} W · ${p.eraAvg.toFixed(2)} ERA`
    : `${p.hr} HR · ${avg3(p.ops)} OPS`;
}

export default function InvinciblesGame() {
  const [pool, setPool] = useState<GamePlayer[] | null>(null);
  const [strengths, setStrengths] = useState<Record<string, number[]>>({});
  const [squad, setSquad] = useState<(GamePlayer | null)[]>(SLOTS.map(() => null));
  const [reels, setReels] = useState<{ team: string | null; era: string | null }>({ team: null, era: null });
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<SimResult | null>(null);
  const [name, setNm] = useState("");
  const [saved, setSaved] = useState(false);
  const [board, setBoard] = useState<ScoreEntry[]>([]);
  const [posFilter, setPosFilter] = useState("All");
  const spinRef = useRef(false);

  useEffect(() => {
    loadGamesData().then((d) => { setPool(d.players); setStrengths(d.strengthsBySeason); });
    setNm(getName());
  }, []);

  const undrafted = useCallback((p: GamePlayer) => !squad.some((s) => s && s.id === p.id), [squad]);
  const candidates = useMemo(() => {
    if (!pool || !reels.team) return [];
    return pool.filter((p) => p.team === reels.team && (!reels.era || seasonOf(p) === reels.era) && undrafted(p))
      .sort((a, b) => b.rating - a.rating);
  }, [pool, reels, undrafted]);

  const filled = squad.filter(Boolean) as GamePlayer[];
  const avg = filled.length ? filled.reduce((a, b) => a + b.rating, 0) / filled.length : 0;
  const complete = filled.length === SLOTS.length;

  const openPosCodes = useMemo(() => {
    const set = new Set<string>();
    SLOTS.forEach((s, i) => { if (!squad[i]) set.add(s.code); });
    return set;
  }, [squad]);
  const shownCandidates = useMemo(
    () => posFilter === "All" ? candidates : candidates.filter((p) => p.pos === posFilter),
    [candidates, posFilter]
  );

  function spin() {
    if (!pool || spinRef.current || complete) return;
    spinRef.current = true; setSpinning(true); setPosFilter("All");
    const teams = Array.from(new Set(pool.filter(undrafted).map((p) => p.team)));
    const team = rnd(teams);
    const eras = Array.from(new Set(pool.filter((p) => p.team === team && undrafted(p)).map(seasonOf)));
    const target = { team, era: eras.length ? rnd(eras) : null };
    let t = 0;
    const done = () => { clearInterval(iv); setReels(target); setSpinning(false); spinRef.current = false; settle(); };
    const iv = setInterval(() => {
      t++;
      tick();
      setReels({ team: rnd(teams), era: null });
      if (t >= 12) done();
    }, 70);
    setTimeout(done, 1400);
  }

  const slotFull = (code: string) => !SLOTS.some((s, i) => s.code === code && !squad[i]);
  function draft(p: GamePlayer) {
    const slot = SLOTS.findIndex((s, i) => s.code === p.pos && !squad[i]);
    if (slot === -1) return;
    setSquad((sq) => { const n = sq.slice(); n[slot] = { ...p }; return n; });
    setReels({ team: null, era: null });
  }

  function simulate() {
    const eras = Array.from(new Set(filled.map(seasonOf)));
    const sp = eras.flatMap((e) => strengths[e] || []);
    const res = simulateSeason(avg, sp.length ? sp : Object.values(strengths).flat());
    setResult(res);
    if (res.wins === 162) fanfare();
  }
  function reset() {
    setSquad(SLOTS.map(() => null)); setReels({ team: null, era: null }); setResult(null); setSaved(false);
  }
  async function save() {
    if (name.trim()) setName(name.trim());
    await submitScore("invincibles", result ? result.wins : 0, true);
    setSaved(true);
    setBoard(await topScores("invincibles", true, 10));
  }

  if (!pool) return <p style={{ color: "var(--muted)" }}>Loading the all-time pool…</p>;

  if (result) {
    const peak = Math.max(...result.distribution);
    const perfect = result.wins === 162;
    return (
      <div className="card" style={{ padding: "1.25rem", position: "relative" }}>
        {perfect && <Confetti />}
        <h2 style={{ marginTop: 0 }}>Season simulated</h2>
        <div style={{ display: "flex", gap: 20, flexWrap: "wrap", alignItems: "baseline" }}>
          <div style={{ fontFamily: "var(--font-cond)", fontSize: "3rem", lineHeight: 1 }}>
            <span style={{ color: "var(--accent-2)" }}>{result.wins}</span>
            <span style={{ color: "var(--muted)" }}>–</span>
            <span style={{ color: "var(--danger)" }}>{result.losses}</span>
          </div>
          <div style={{ fontSize: ".88rem", color: "var(--muted)", display: "grid", gap: 2 }}>
            <span>Roster rating <strong style={{ color: "var(--text)" }}>{avg.toFixed(1)}</strong></span>
            <span>162–0 in <strong style={{ color: "var(--gold)" }}>{result.perfectPct < 0.1 ? "<0.1" : result.perfectPct.toFixed(1)}%</strong> of seasons</span>
            <span>Stronger than <strong style={{ color: "var(--text)" }}>{result.realPercentile}%</strong> of real sides</span>
          </div>
        </div>
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: ".72rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 6 }}>Win distribution (0–162)</div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 1, height: 80 }}>
            {result.distribution.map((c, w) => (
              <div key={w} title={`${w} wins`} style={{ flex: 1, height: `${(c / peak) * 100}%`, minHeight: 1, background: w === result.wins ? "var(--accent)" : "var(--panel-2)", borderRadius: 1 }} />
            ))}
          </div>
        </div>
        <div style={{ marginTop: 18, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          {!saved ? (
            <>
              <input value={name} onChange={(e) => setNm(e.target.value)} placeholder="GM name" maxLength={16}
                style={{ padding: ".5rem .7rem", borderRadius: 8, border: "1px solid var(--border)", background: "var(--panel)", color: "var(--text)", maxWidth: 150 }} />
              <button className="btn btn-primary" onClick={save}>Save to Hall of Fame</button>
            </>
          ) : <span className="chip" style={{ color: "var(--accent-2)" }}>✓ Saved</span>}
          <button className="btn" onClick={reset}>New roster</button>
        </div>
        {saved && board.length > 0 && (
          <div style={{ marginTop: 18 }}>
            <div style={{ fontSize: ".72rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 6 }}>Hall of Fame</div>
            <ol style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {board.map((e, i) => (
                <li key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 2px", borderBottom: "1px solid var(--border)", fontSize: ".84rem" }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: ".7rem", color: "var(--muted)", minWidth: 22 }}>{i + 1}</span>
                  <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.name}</span>
                  <span style={{ fontFamily: "var(--font-cond)", color: e.score >= 162 ? "var(--gold)" : "var(--text)" }}>{e.score}</span>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "minmax(0,1.1fr) minmax(0,0.9fr)" }} className="inv-grid">
      <style>{`@media (max-width: 800px){ .inv-grid { grid-template-columns: 1fr !important; } }`}</style>
      <section className="card" style={{ padding: "1.25rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
          <span className="chip">{filled.length} / {SLOTS.length} drafted</span>
          <span style={{ fontFamily: "var(--font-cond)", fontSize: "1.1rem", color: "var(--gold)", textTransform: "uppercase" }}>Invincibles</span>
        </div>
        {!reels.team || spinning ? (
          <button className="btn btn-primary" style={{ width: "100%" }} onClick={spin} disabled={spinning || complete}>
            {spinning ? "Spinning…" : complete ? "Roster full — simulate →" : "Spin"}
          </button>
        ) : (
          <div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
              <strong>{reels.team}</strong>{reels.era && <span style={{ color: "var(--gold)" }}>· {reels.era}</span>}
              <span className="chip" style={{ marginLeft: "auto" }}>{shownCandidates.length} of {candidates.length}</span>
            </div>
            <div className="scroll-x" style={{ display: "flex", gap: 5, marginBottom: 10, paddingBottom: 2 }}>
              {["All", ...POS_ORDER].map((code) => {
                const open = code === "All" || openPosCodes.has(code);
                const active = posFilter === code;
                return (
                  <button key={code} onClick={() => setPosFilter(code)} className="chip"
                    style={{ cursor: "pointer", flexShrink: 0, fontSize: ".68rem",
                      borderColor: active ? "var(--accent)" : open ? "var(--border)" : "transparent",
                      color: active ? "var(--text)" : open ? "var(--gold)" : "var(--muted)", opacity: open ? 1 : 0.5 }}
                    title={code === "All" ? "All positions" : POS_LABEL[code]}>
                    {code}
                  </button>
                );
              })}
            </div>
            <div style={{ maxHeight: 340, overflowY: "auto", display: "grid", gap: 6 }}>
              {shownCandidates.slice(0, 50).map((p) => {
                const full = slotFull(p.pos);
                return (
                  <button key={p.id} onClick={() => draft(p)} disabled={full}
                    style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 10px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--panel-2)", color: "var(--text)", cursor: full ? "not-allowed" : "pointer", opacity: full ? 0.4 : 1, textAlign: "left" }}>
                    <span style={{ fontFamily: "var(--font-cond)", fontSize: "1.3rem", minWidth: 30, textAlign: "center", color: p.rating >= 90 ? "var(--gold)" : "var(--text)" }}>{p.rating}</span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ fontWeight: 600, fontSize: ".9rem" }}>{p.name} <span className="chip" style={{ fontSize: ".6rem", padding: "0 5px", color: "var(--gold)" }}>{p.pos}</span></span>
                      <span style={{ display: "block", fontFamily: "var(--font-mono)", fontSize: ".64rem", color: "var(--muted)", marginTop: 2 }}>{statLine(p)}</span>
                    </span>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: ".62rem", color: "var(--accent)" }}>{full ? "FULL" : "→"}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
        {complete && (
          <button className="btn btn-primary" style={{ width: "100%", marginTop: 12 }} onClick={simulate}>Simulate season →</button>
        )}
      </section>

      <section className="card" style={{ padding: "1rem", alignSelf: "start" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--font-mono)", fontSize: ".68rem", letterSpacing: ".12em", color: "var(--muted)", textTransform: "uppercase", paddingBottom: 8, borderBottom: "1px solid var(--border)" }}>
          <span>Roster</span><span style={{ color: "var(--gold)" }}>{filled.length ? `AVG ${avg.toFixed(1)}` : "—"}</span>
        </div>
        <ol style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {SLOTS.map((s, i) => {
            const p = squad[i];
            const [c1] = p ? teamColors(p.team) : ["var(--border)"];
            return (
              <li key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 2px", borderBottom: "1px solid var(--border)", fontSize: ".84rem" }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: ".6rem", color: "var(--muted)", minWidth: 22 }}>{s.code}</span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  {p ? <><span style={{ display: "inline-block", width: 7, height: 7, borderRadius: 2, background: c1, marginRight: 6 }} />{p.name} <span style={{ color: "var(--muted)", fontSize: ".7rem" }}>{seasonOf(p)}</span></> : <span style={{ color: "var(--border)" }}>{POS_LABEL[s.code]}</span>}
                </span>
                <span style={{ fontFamily: "var(--font-cond)", color: p && p.rating >= 90 ? "var(--gold)" : "var(--text)" }}>{p ? p.rating : ""}</span>
              </li>
            );
          })}
        </ol>
        {filled.length > 0 && <button className="btn" style={{ width: "100%", marginTop: 10 }} onClick={reset}>Start over</button>}
      </section>
    </div>
  );
}

/** A player's "era" string for the season pool — their primary career season. */
function seasonOf(p: GamePlayer): string {
  return String(p.lastYear);
}
