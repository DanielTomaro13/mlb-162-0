/**
 * Draws a shareable card of a drafted roster + record to a canvas and returns
 * it as a PNG blob (for the native share sheet / Instagram) plus an object URL
 * (for a preview and download). Pure client-side, no assets.
 */
export interface SharePlayer { n: string; pos: string; team: string; era: string; rating: number; }
export interface ShareInput {
  record: string;     // e.g. "118–44"
  verdict: string;    // e.g. "WORLD SERIES FAVORITE"
  avg: number;        // roster rating
  modeName: string;   // e.g. "Starting Nine"
  players: SharePlayer[];
}

export async function makeShareImage(d: ShareInput): Promise<{ blob: Blob; url: string } | null> {
  const W = 1080, H = 1350;
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const ctx = c.getContext("2d");
  if (!ctx) return null;

  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, "#0a0f1d"); g.addColorStop(0.55, "#0e1426"); g.addColorStop(1, "#111a30");
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#e4322b"; ctx.fillRect(0, 0, W, 12);

  const PAD = 72;
  ctx.textBaseline = "alphabetic";

  // wordmark
  ctx.fillStyle = "#97a6c4";
  ctx.font = "700 30px system-ui, sans-serif";
  ctx.fillText(`MLB 162-0  ·  ${d.modeName.toUpperCase()}`, PAD, 96);

  // record
  const parts = d.record.split("–");
  ctx.font = "900 150px system-ui, sans-serif";
  const winsTxt = parts[0], dash = "–", lossTxt = parts[1] ?? "";
  let x = PAD; const recY = 270;
  ctx.fillStyle = "#37c281"; ctx.fillText(winsTxt, x, recY); x += ctx.measureText(winsTxt).width + 16;
  ctx.fillStyle = "#97a6c4"; ctx.fillText(dash, x, recY); x += ctx.measureText(dash).width + 16;
  ctx.fillStyle = lossTxt === "0" ? "#37c281" : "#e4322b"; ctx.fillText(lossTxt, x, recY);

  // verdict + rating
  ctx.fillStyle = "#f2c14e"; ctx.font = "800 48px system-ui, sans-serif";
  ctx.fillText(d.verdict, PAD, recY + 72);
  ctx.fillStyle = "#97a6c4"; ctx.font = "500 30px system-ui, sans-serif";
  ctx.fillText(`Roster rating ${d.avg.toFixed(1)}`, PAD, recY + 118);

  // roster list
  const listTop = recY + 176;
  const listBottom = H - 130;
  const n = d.players.length;
  const rowH = Math.min(70, (listBottom - listTop) / n);
  ctx.font = "600 30px system-ui, sans-serif";
  d.players.forEach((p, i) => {
    const y = listTop + i * rowH + rowH * 0.7;
    ctx.fillStyle = "#243150"; ctx.fillRect(PAD, listTop + i * rowH + rowH * 0.15, W - PAD * 2, 1);
    ctx.fillStyle = "#97a6c4"; ctx.font = "600 24px system-ui, sans-serif";
    ctx.fillText(p.pos.padEnd(3), PAD, y);
    ctx.fillStyle = "#eef2f8"; ctx.font = "600 30px system-ui, sans-serif";
    ctx.fillText(p.n, PAD + 86, y);
    ctx.fillStyle = "#97a6c4"; ctx.font = "400 22px system-ui, sans-serif";
    ctx.fillText(`${p.team} · ${p.era}`, PAD + 86, y + 26);
    ctx.fillStyle = p.rating >= 90 ? "#f2c14e" : "#eef2f8";
    ctx.font = "800 34px system-ui, sans-serif"; ctx.textAlign = "right";
    ctx.fillText(String(p.rating), W - PAD, y);
    ctx.textAlign = "left";
  });

  // footer
  ctx.fillStyle = "#e4322b"; ctx.font = "800 34px system-ui, sans-serif";
  ctx.fillText("mlb162-0.com", PAD, H - 56);
  ctx.fillStyle = "#97a6c4"; ctx.font = "500 26px system-ui, sans-serif";
  ctx.textAlign = "right";
  ctx.fillText("build your all-time roster", W - PAD, H - 56);
  ctx.textAlign = "left";

  const blob: Blob | null = await new Promise((res) => c.toBlob((b) => res(b), "image/png", 0.92));
  if (!blob) return null;
  return { blob, url: URL.createObjectURL(blob) };
}
