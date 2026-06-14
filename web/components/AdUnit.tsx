"use client";
import { useEffect, useRef } from "react";
import { AD_CLIENT } from "@/lib/ads";

/**
 * A single responsive AdSense display unit. Renders nothing until a real slot
 * id is provided, so empty placements never shift the layout or interrupt a
 * game. Labelled "Advertisement" per AdSense policy.
 *
 * The push is deferred until the unit actually has layout width — responsive
 * units throw "No slot size for availableWidth=…" if pushed while the container
 * is still 0/too-narrow during hydration.
 */
export default function AdUnit({
  slot,
  format = "auto",
  style,
}: {
  slot?: string;
  format?: string;
  style?: React.CSSProperties;
}) {
  const insRef = useRef<HTMLModElement>(null);
  const pushed = useRef(false);

  useEffect(() => {
    if (!slot || pushed.current) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const tryPush = () => {
      if (cancelled || pushed.current) return;
      const el = insRef.current;
      if (!el) return;
      if (el.offsetWidth < 120) { timer = setTimeout(tryPush, 250); return; }
      try {
        ((window as unknown as { adsbygoogle: unknown[] }).adsbygoogle =
          (window as unknown as { adsbygoogle: unknown[] }).adsbygoogle || []).push({});
        pushed.current = true;
      } catch {}
    };
    tryPush();
    return () => { cancelled = true; clearTimeout(timer); };
  }, [slot]);

  if (!slot) return null;

  return (
    // width:100% matters — inside a CSS grid/flex parent a margin:auto wrapper
    // shrinks to its widest child (the label), which would starve the responsive
    // unit and trigger "No slot size for availableWidth".
    <div style={{ width: "100%", margin: "1.5rem auto", textAlign: "center", ...style }}>
      <div style={{ fontSize: ".58rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 4 }}>
        Advertisement
      </div>
      {/* Reserve a min-height so the responsive unit expanding after load doesn't
          shift content below it (keeps Cumulative Layout Shift near zero). */}
      <ins
        ref={insRef}
        className="adsbygoogle"
        style={{ display: "block", minHeight: 100 }}
        data-ad-client={AD_CLIENT}
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    </div>
  );
}
