import { ImageResponse } from "next/og";

export const dynamic = "force-static";
export const alt = "MLB 162-0 — build the perfect all-time MLB roster";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OG() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "70px 80px",
          background: "linear-gradient(135deg,#0a0f1d,#0e1426 55%,#111a30)",
          color: "#eef2f8",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 30, color: "#97a6c4", letterSpacing: 6 }}>
          ALL-TIME MLB DRAFT
        </div>
        <div style={{ display: "flex", fontSize: 122, fontWeight: 800, lineHeight: 1, marginTop: 12 }}>
          BUILD THE PERFECT
        </div>
        <div style={{ display: "flex", fontSize: 122, fontWeight: 800, lineHeight: 1 }}>
          <span style={{ color: "#e4322b" }}>162–0</span>
          <span style={{ marginLeft: 24 }}>SEASON</span>
        </div>
        <div style={{ display: "flex", fontSize: 34, color: "#97a6c4", marginTop: 28 }}>
          mlb162-0.com · spin · draft · go undefeated
        </div>
      </div>
    ),
    { ...size }
  );
}
