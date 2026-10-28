"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const DISMISS_KEY = "marketmover-promo-dismissed";
const DISMISS_MS = 14 * 24 * 60 * 60 * 1000;
const SHOW_DELAY_MS = 1500;
/** Home and the Perfect Season page — the site's main game. */
const SHOW_ON = new Set(["/", "/play"]);

const HREF =
  "https://www.marketmover.net?utm_source=mlb162-0&utm_medium=popup&utm_campaign=crosspromo";

function normalizePath(pathname: string): string {
  let path = pathname || "/";
  if (BASE && (path === BASE || path.startsWith(`${BASE}/`))) {
    path = path.slice(BASE.length) || "/";
  }
  if (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);
  return path;
}

function dismissed(now = Date.now()): boolean {
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY) || "");
    return Number.isFinite(at) && now - at < DISMISS_MS;
  } catch {
    return false;
  }
}

/**
 * Short MarketMover cross-promo. Appears ~1.5s after landing on the home page
 * or the main game (`/play`). Closing it (or pressing Escape) hides it for 14 days.
 */
export default function MarketMoverPromo() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!SHOW_ON.has(normalizePath(pathname)) || dismissed()) {
      setOpen(false);
      return;
    }
    const timer = window.setTimeout(() => setOpen(true), SHOW_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismiss();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function dismiss() {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* private mode / blocked storage */
    }
    setOpen(false);
  }

  if (!open) return null;

  return (
    <aside className="mm-pop pop" role="dialog" aria-modal="false" aria-labelledby="mm-pop-title">
      <img
        className="mm-pop-mark"
        src={`${BASE}/marketmover-mark.png`}
        alt=""
        width={88}
        height={88}
      />
      <div className="mm-pop-body">
        <h2 id="mm-pop-title" className="mm-pop-title">MarketMover</h2>
        <p className="mm-pop-copy">
          Live prices and model markets in one place. More markets coming.
        </p>
        <a className="btn btn-primary mm-pop-cta" href={HREF}>
          Open MarketMover
        </a>
      </div>
      <button type="button" className="mm-pop-x" onClick={dismiss} aria-label="Dismiss for 14 days">
        ×
      </button>
    </aside>
  );
}
