#!/usr/bin/env node
/**
 * sync-model.mjs — pull the MLB-Modelling pipeline output into the web app.
 *
 * The statistical model lives in the separate MLB-Modelling repo; this copies its
 * published JSON into web/public/data/model-*.json so the /model, /value, /ratings
 * and /backtest pages render same-origin. Run before `npm run build`.
 *
 *   node scripts/sync-model.mjs            # fetch from the MLB-Modelling repo (raw)
 *   MODEL_SRC=/path/to/MLB-Model/docs/data node scripts/sync-model.mjs   # local copy
 */
import { mkdir, writeFile, copyFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "..", "web", "public", "data");
const FILES = ["predictions", "odds", "ratings", "meta"];
const RAW = "https://raw.githubusercontent.com/DanielTomaro13/MLB-Modelling/main/docs/data";

await mkdir(OUT, { recursive: true });

for (const f of FILES) {
  const dest = join(OUT, `model-${f}.json`);
  try {
    if (process.env.MODEL_SRC) {
      await copyFile(join(process.env.MODEL_SRC, `${f}.json`), dest);
    } else {
      const r = await fetch(`${RAW}/${f}.json`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      await writeFile(dest, await r.text());
    }
    console.log(`synced model-${f}.json`);
  } catch (e) {
    console.warn(`skip model-${f}.json (${e.message}) — keeping existing copy`);
  }
}
