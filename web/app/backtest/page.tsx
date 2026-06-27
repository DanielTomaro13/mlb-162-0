"use client";

import { useEffect, useState } from "react";
import { Shell, S } from "@/components/ui";
import { loadModelMeta, pct, type ModelMeta } from "@/lib/modeldb";

function Tile({ h, big, sub }: { h: string; big: string; sub: string }) {
  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 14, background: "var(--panel)", padding: "16px 18px" }}>
      <h3 style={{ margin: "0 0 6px", fontSize: 14, color: "var(--muted)" }}>{h}</h3>
      <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-.02em" }}>{big}</div>
      <p style={{ margin: "4px 0 0", color: "var(--muted)", fontSize: 13 }}>{sub}</p>
    </div>
  );
}

export default function BacktestPage() {
  const [meta, setMeta] = useState<ModelMeta | null>(null);
  useEffect(() => { loadModelMeta().then(setMeta); }, []);
  const bt = meta?.backtest;

  return (
    <Shell title="The Model · Backtest" blurb="Walk-forward test of the team-Elo moneyline (the component we can score as-of) against the home-team base rate. Lower log-loss is better.">
      {!bt || !bt.n ? (
        <p style={S.mut}>Backtest not available.</p>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 14 }}>
            <Tile h="Games scored" big={bt.n.toLocaleString()} sub={`holdout from ${bt.holdout_start_season}`} />
            <Tile h="Accuracy" big={pct(bt.accuracy)} sub={`home base rate ${pct(bt.home_win_rate)}`} />
            <Tile h="Log loss" big={String(bt.log_loss)} sub={`baseline ${bt.baseline_log_loss}`} />
            <Tile h="Brier" big={String(bt.brier)} sub={bt.beats_baseline ? "beats baseline ✓" : "below baseline"} />
          </div>
          <p style={{ ...S.mut, marginTop: 18, maxWidth: 760, lineHeight: 1.5 }}>
            Each game is predicted from the Elo ratings as they stood before first pitch, then scored against the result.
            Elo updates chronologically, so no future information leaks in. MLB moneylines are inherently low-edge —
            a small but consistent log-loss gain over the base rate is the realistic target, and the full published model
            adds the starting pitcher on top of this Elo baseline.
          </p>
        </>
      )}
    </Shell>
  );
}
