"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { loadPlayers, NOTABLE_LIMIT, type ClientPlayer } from "@/lib/games-data";
import { teamColors } from "@/lib/teams";
import { avg3, POS_GROUP } from "@/lib/format";

type ProfilePlayer = ClientPlayer;

const FILTERS = ["All", "Hitters", "Pitchers"];
const POSITIONS = ["All", "Infield", "Outfield", "DH", "Pitcher"];

// POS_GROUP maps DH -> "Hitter"; we surface that group label as "DH".
function posGroup(p: ProfilePlayer): string {
  const g = POS_GROUP[p.pos] ?? "";
  return g === "Hitter" ? "DH" : g;
}

type SortKey = "rating" | "fame" | "name" | "hr" | "ops" | "hits" | "sb" | "w" | "so" | "sv" | "eraAvg";
const SORTS: { key: SortKey; label: string; asc?: boolean }[] = [
  { key: "rating", label: "Rating" },
  { key: "fame", label: "Fame" },
  { key: "name", label: "Name" },
  { key: "hr", label: "HR" },
  { key: "ops", label: "OPS" },
  { key: "hits", label: "Hits" },
  { key: "sb", label: "SB" },
  { key: "w", label: "Wins" },
  { key: "so", label: "Strikeouts" },
  { key: "sv", label: "Saves" },
  { key: "eraAvg", label: "ERA", asc: true },
];

function sortValue(p: ProfilePlayer, key: SortKey): number {
  // Kind-specific keys are 0 for the wrong kind, sinking them in the order.
  if (key === "name" || key === "rating" || key === "fame") return 0;
  const batKeys: SortKey[] = ["hr", "ops", "hits", "sb"];
  const pitKeys: SortKey[] = ["w", "so", "sv", "eraAvg"];
  if (batKeys.includes(key) && p.kind !== "bat") return key === "eraAvg" ? Infinity : 0;
  if (pitKeys.includes(key) && p.kind !== "pit") return key === "eraAvg" ? Infinity : 0;
  return Number(p[key as keyof ProfilePlayer]);
}

function statLine(p: ProfilePlayer): string {
  return p.kind === "bat"
    ? `${p.posName} · ${p.hr} HR · ${avg3(p.ops)} OPS`
    : `${p.posName} · ${p.w} W · ${p.so} K · ${p.eraAvg.toFixed(2)} ERA`;
}

export default function PlayersBrowser() {
  const [players, setPlayers] = useState<ProfilePlayer[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { loadPlayers().then((p) => { setPlayers(p); setLoading(false); }); }, []);
  // games.json is fame-sorted; the first NOTABLE_LIMIT have static profile pages.
  const notable = useMemo(() => new Set(players.slice(0, NOTABLE_LIMIT).map((p) => p.id)), [players]);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("All");
  const [pos, setPos] = useState("All");
  const [team, setTeam] = useState("All teams");
  const [sort, setSort] = useState<SortKey>("rating");
  const teams = useMemo(() => ["All teams", ...Array.from(new Set(players.map((p) => p.team))).sort()], [players]);
  const shown = useMemo(() => {
    const query = q.trim().toLowerCase();
    const sortDef = SORTS.find((s) => s.key === sort)!;
    return players
      .filter((p) => filter === "All" || (filter === "Hitters" ? p.kind === "bat" : p.kind === "pit"))
      .filter((p) => pos === "All" || posGroup(p) === pos)
      .filter((p) => team === "All teams" || p.team === team)
      .filter((p) => !query || p.name.toLowerCase().includes(query) || p.team.toLowerCase().includes(query))
      .sort((a, b) => {
        if (sort === "name") return a.name.localeCompare(b.name);
        if (sort === "rating") return b.rating - a.rating || b.fame - a.fame;
        if (sort === "fame") return b.fame - a.fame || b.rating - a.rating;
        const av = sortValue(a, sort), bv = sortValue(b, sort);
        return (sortDef.asc ? av - bv : bv - av) || b.rating - a.rating;
      })
      .slice(0, 150);
  }, [players, q, filter, pos, team, sort]);

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search players or teams…"
        style={{ width: "100%", padding: ".7rem .9rem", borderRadius: 10, border: "1px solid var(--border)", background: "var(--panel)", color: "var(--text)" }} />
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
        {FILTERS.map((f) => (
          <button key={f} onClick={() => setFilter(f)} className="chip"
            style={{ cursor: "pointer", borderColor: filter === f ? "var(--accent)" : "var(--border)", color: filter === f ? "var(--text)" : "var(--muted)" }}>
            {f}
          </button>
        ))}
        <select value={pos} onChange={(e) => setPos(e.target.value)}
          style={{ marginLeft: "auto", padding: ".4rem .6rem", borderRadius: 999, border: "1px solid var(--border)", background: "var(--panel-2)", color: "var(--text)", fontSize: 16 }}>
          {POSITIONS.map((c) => <option key={c} value={c}>{c === "All" ? "All positions" : c}</option>)}
        </select>
        <select value={team} onChange={(e) => setTeam(e.target.value)}
          style={{ padding: ".4rem .6rem", borderRadius: 999, border: "1px solid var(--border)", background: "var(--panel-2)", color: "var(--text)", fontSize: 16 }}>
          {teams.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)}
          style={{ padding: ".4rem .6rem", borderRadius: 999, border: "1px solid var(--border)", background: "var(--panel-2)", color: "var(--text)", fontSize: 16 }}>
          {SORTS.map((s) => <option key={s.key} value={s.key}>Sort: {s.label}</option>)}
        </select>
      </div>
      <div className="grid-cards">
        {shown.map((p) => {
          const [c1] = teamColors(p.team);
          const inner = (
            <>
              <span style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <strong style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</strong>
                <span style={{ fontFamily: "var(--font-cond)", fontSize: "1.3rem", color: p.rating >= 90 ? "var(--gold)" : "var(--text)" }}>{p.rating}</span>
              </span>
              <span style={{ display: "flex", gap: 8, alignItems: "center", fontSize: ".8rem", color: "var(--muted)" }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: c1 }} />{p.team}
              </span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: ".7rem", color: "var(--muted)" }}>{statLine(p)}</span>
            </>
          );
          const cardStyle = { padding: "1rem", display: "grid", gap: 4 } as const;
          return notable.has(p.id) ? (
            <Link key={p.id} href={`/players/${p.id}/${p.slug}`} className="card" style={cardStyle}>{inner}</Link>
          ) : (
            <div key={p.id} className="card" style={cardStyle}>{inner}</div>
          );
        })}
      </div>
      {loading && <p style={{ color: "var(--muted)" }}>Loading players…</p>}
      {!loading && shown.length === 0 && <p style={{ color: "var(--muted)" }}>No players match.</p>}
    </div>
  );
}
