"use client";

import { useEffect, useRef } from "react";

const CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT?.trim();

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

/** An AdSense unit. Renders nothing until NEXT_PUBLIC_ADSENSE_CLIENT and a slot id are set. */
export function AdSlot({ slot, className }: { slot?: string; className?: string }) {
  const pushed = useRef(false);
  const enabled = Boolean(CLIENT && /^ca-pub-\d+$/.test(CLIENT) && slot && /^\d+$/.test(slot));

  useEffect(() => {
    if (!enabled || pushed.current) return;
    pushed.current = true;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      /* ad blockers */
    }
  }, [enabled]);

  if (!enabled) return null;
  return (
    <aside aria-label="Advertisement" data-print="hide" className={className}>
      <p className="mb-1 text-xs text-muted">Advertisement</p>
      <ins
        className="adsbygoogle block min-h-[100px]"
        data-ad-client={CLIENT}
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </aside>
  );
}
