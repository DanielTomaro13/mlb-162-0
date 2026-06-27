"use client";

import { useEffect, useState } from "react";
import ModelNav from "@/components/ModelNav";
import { loadModelMeta, pct, type ModelMeta } from "@/lib/modeldb";

const wrap = { maxWidth: 1080, margin: "0 auto", padding: "0 16px" } as const;
const tile = { border: "1px solid var(--border)", borderRadius: 14, background: "var(--panel)", padding: "16px 18px" } as const;

function Tile({ h, big, sub }: { h: string; big: string; sub: string }) {
  return (
    <div style={tile}>
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
    <main style={{ ...wrap, paddingTop: 24, paddingBottom: 48 }}>
      <h1 style={{ fontFamily: "var(--font-cond)", fontSize: 30, margin: "0 0 4px" }}>The Model · Backtest</h1>
      <p style={{ color: "var(--muted)", margin: "0 0 16px" }}>
        Walk-forward evaluation of the team-Elo moneyline against the home base rate.
      </p>
      <ModelNav />

      {!bt || !bt.n ? (
        <p style={{ color: "var(--muted)" }}>Backtest not available.</p>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 14 }}>
            <Tile h="Games scored" big={bt.n.toLocaleString()} sub={`holdout from ${bt.holdout_start_season}`} />
            <Tile h="Accuracy" big={pct(bt.accuracy)} sub={`home base rate ${pct(bt.home_win_rate)}`} />
            <Tile h="Log loss" big={String(bt.log_loss)} sub={`baseline ${bt.baseline_log_loss}`} />
            <Tile h="Brier" big={String(bt.brier)} sub={bt.beats_baseline ? "beats baseline ✓" : "below baseline"} />
          </div>
          <p style={{ color: "var(--muted)", marginTop: 18 }}>
            Each game is predicted from the team-Elo ratings as they stood before first pitch, then scored against the result.
            Elo is updated chronologically, so no future information leaks into a prediction.
          </p>
        </>
      )}
    </main>
  );
}
