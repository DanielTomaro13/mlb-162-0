import { ImageResponse } from "next/og";

export const dynamic = "force-static";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a0f1d",
          color: "#eef2f8",
          fontSize: 64,
          fontWeight: 800,
          letterSpacing: 1,
        }}
      >
        <div style={{ display: "flex" }}>162</div>
        <div style={{ width: 10, height: 10, borderRadius: 5, background: "#e4322b", marginTop: 8 }} />
      </div>
    ),
    { ...size }
  );
}
