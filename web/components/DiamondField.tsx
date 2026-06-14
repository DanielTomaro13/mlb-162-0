"use client";
/* =========================================================================
   DIAMOND FIELD — the nine fielding spots laid out on a baseball diamond.
   Pitcher on the mound (centre), catcher at home (bottom), the infield corners
   around the diamond, the outfield up top, and the DH off to the side. Each
   spot is a tappable target: empty spots show the position code, filled spots
   show the drafted player's name + a rating chip tinted in their team colour.
   The currently-active (next-to-fill) spot is highlighted.

   Purely presentational — all draft state and the tap callback live in the
   parent (PerfectSeasonGame). Pitchers (SP/RP/CL) are NOT on the diamond and
   stay in the parent's roster-sheet list.
   ========================================================================= */
import type { PoolPlayer, Slot } from "@/lib/types";
import { teamColors } from "@/lib/teams";

/** The nine on-field spots, placed as percentages of the field box. The DH sits
 *  off to the lower-right as it doesn't take a defensive position. */
const SPOTS: Record<string, { x: number; y: number; label: string }> = {
  CF: { x: 50, y: 13, label: "CF" },
  LF: { x: 19, y: 24, label: "LF" },
  RF: { x: 81, y: 24, label: "RF" },
  "2B": { x: 62, y: 40, label: "2B" },
  SS: { x: 38, y: 40, label: "SS" },
  "3B": { x: 22, y: 56, label: "3B" },
  "1B": { x: 78, y: 56, label: "1B" },
  P: { x: 50, y: 55, label: "P" }, // mound — visual only, pitchers live in the list
  C: { x: 50, y: 86, label: "C" },
  DH: { x: 88, y: 84, label: "DH" },
};

/** Field spots in the order their slots appear, excluding the pitcher mound
 *  which is decorative (no SP/RP/CL slot is drafted here). */
const FIELD_CODES = ["C", "1B", "2B", "3B", "SS", "LF", "CF", "RF", "DH"] as const;

interface DiamondSlot {
  index: number;          // index into the parent's squad/slots arrays
  code: string;
  player: PoolPlayer | null;
}

export default function DiamondField({
  slots,
  squad,
  activeCode,
  onPick,
}: {
  slots: Slot[];
  squad: (PoolPlayer | null)[];
  /** position code of the slot the player should fill next (highlighted) */
  activeCode?: string | null;
  /** called with the position code when a field spot is tapped */
  onPick?: (code: string) => void;
}) {
  // Map each on-field code to its first matching slot (most modes have one of
  // each fielding position; if a mode ever repeated one we take the first open,
  // else the first overall).
  const byCode: Record<string, DiamondSlot> = {};
  FIELD_CODES.forEach((code) => {
    let chosen = -1;
    slots.forEach((s, i) => {
      if (s.code !== code) return;
      if (chosen === -1) chosen = i;
      else if (!squad[i] && squad[chosen]) chosen = i; // prefer an open one
    });
    if (chosen !== -1) byCode[code] = { index: chosen, code, player: squad[chosen] ?? null };
  });

  return (
    <div style={{ position: "relative", width: "100%", maxWidth: 440, margin: "0 auto" }}>
      {/* aspect-ratio box keeps the diamond square-ish and phone-friendly */}
      <div style={{ position: "relative", width: "100%", paddingTop: "92%" }}>
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
          aria-hidden
        >
          {/* outfield grass */}
          <path
            d="M 50 4 A 70 70 0 0 1 96 62 L 50 92 L 4 62 A 70 70 0 0 1 50 4 Z"
            fill="var(--panel-2)"
            stroke="var(--border)"
            strokeWidth="0.6"
          />
          {/* infield dirt diamond (home-1B-2B-3B) */}
          <path
            d="M 50 86 L 78 56 L 50 40 L 22 56 Z"
            fill="rgba(228,50,43,0.10)"
            stroke="var(--border)"
            strokeWidth="0.5"
          />
          {/* base paths */}
          <path
            d="M 50 86 L 78 56 L 50 40 L 22 56 Z"
            fill="none"
            stroke="var(--accent-2)"
            strokeOpacity="0.45"
            strokeWidth="0.5"
          />
          {/* pitcher's mound */}
          <circle cx="50" cy="55" r="3.4" fill="rgba(228,50,43,0.18)" stroke="var(--border)" strokeWidth="0.4" />
        </svg>

        {FIELD_CODES.map((code) => {
          const spot = SPOTS[code];
          const slot = byCode[code];
          const player = slot?.player ?? null;
          const active = !player && activeCode === code;
          const [c1] = player ? teamColors(player.team) : ["var(--border)"];
          const high = player && player.rating >= 90;
          return (
            <button
              key={code}
              type="button"
              onClick={() => onPick?.(code)}
              title={player ? `${player.name} · ${player.team}` : spot.label}
              style={{
                position: "absolute",
                left: `${spot.x}%`,
                top: `${spot.y}%`,
                transform: "translate(-50%, -50%)",
                width: player ? "29%" : "13%",
                minWidth: player ? 84 : 40,
                padding: player ? "5px 7px" : "6px 4px",
                borderRadius: 10,
                cursor: onPick ? "pointer" : "default",
                background: player ? "var(--panel)" : active ? "rgba(228,50,43,0.16)" : "var(--panel-2)",
                border: `1.5px solid ${active ? "var(--accent)" : player ? c1 : "var(--border)"}`,
                boxShadow: active ? "0 0 0 2px rgba(228,50,43,0.35)" : player ? `0 1px 0 ${c1}` : "none",
                color: "var(--text)",
                display: "grid",
                gap: 2,
                textAlign: "center",
                lineHeight: 1.1,
                transition: "background .15s, border-color .15s",
                zIndex: player ? 2 : 1,
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: ".54rem",
                  letterSpacing: ".06em",
                  color: active ? "var(--accent)" : "var(--muted)",
                  textTransform: "uppercase",
                }}
              >
                {spot.label}
              </span>
              {player ? (
                <>
                  <span
                    style={{
                      fontSize: ".74rem",
                      fontWeight: 600,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {player.name}
                  </span>
                  <span
                    style={{
                      justifySelf: "center",
                      fontFamily: "var(--font-cond)",
                      fontSize: ".8rem",
                      lineHeight: 1,
                      padding: "1px 6px",
                      borderRadius: 6,
                      background: c1,
                      color: high ? "var(--gold)" : "#fff",
                    }}
                  >
                    {player.rating}
                  </span>
                </>
              ) : (
                <span
                  style={{
                    fontFamily: "var(--font-cond)",
                    fontSize: "1.05rem",
                    color: active ? "var(--accent)" : "var(--muted)",
                  }}
                >
                  {spot.label}
                </span>
              )}
            </button>
          );
        })}

        {/* decorative pitcher's-mound label (no slot — pitchers live in the list) */}
        <div
          style={{
            position: "absolute",
            left: `${SPOTS.P.x}%`,
            top: `${SPOTS.P.y}%`,
            transform: "translate(-50%, -50%)",
            fontFamily: "var(--font-mono)",
            fontSize: ".5rem",
            letterSpacing: ".08em",
            color: "var(--muted)",
            pointerEvents: "none",
            textTransform: "uppercase",
            opacity: 0.7,
          }}
        >
          P
        </div>
      </div>
    </div>
  );
}
