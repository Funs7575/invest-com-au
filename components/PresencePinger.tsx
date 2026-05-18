"use client";

import { useEffect, useRef } from "react";

interface Props {
  /** Either "professional" (lights up `presence_pings.professional_id`)
   * or "team" (lights up `presence_pings.team_id` — typically not used
   * directly; team online state is derived from member pings). */
  kind: "professional" | "team";
  /** The professional_id or team_id row to keep fresh. */
  id: number;
}

/**
 * Heartbeat client. Pings `/api/presence/ping` every 90 seconds while the
 * tab is visible. Server-side helpers in `lib/presence` consider a row
 * "online" while the last ping is within 5 minutes (STALE_WINDOW_MS).
 *
 * Mount this once on a page the pro / member already has open while they
 * work (e.g. the squad inbox, the pro dashboard). No UI rendered.
 */
export default function PresencePinger({ kind, id }: Props) {
  const lastPingRef = useRef<number>(0);

  useEffect(() => {
    let cancelled = false;
    const POLL_MS = 90 * 1000;

    async function ping() {
      if (cancelled || document.hidden) return;
      const now = Date.now();
      if (now - lastPingRef.current < 60 * 1000) return;
      lastPingRef.current = now;
      try {
        await fetch("/api/presence/ping", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ kind, id }),
        });
      } catch {
        /* silent — best-effort heartbeat */
      }
    }

    void ping();
    const interval = window.setInterval(ping, POLL_MS);
    document.addEventListener("visibilitychange", ping);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", ping);
    };
  }, [kind, id]);

  return null;
}
