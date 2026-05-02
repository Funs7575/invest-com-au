"use client";

import { useEffect, useRef } from "react";
import { setIntentCountryAction } from "@/lib/intent-context-actions";

/**
 * Drop into a /foreign-investment/<country> page to remember the user's
 * country in a cookie for 90 days. Renders nothing.
 *
 * Idempotent — calls the action once per page load. Safe to render
 * unconditionally; if the user has already opted out by clearing the
 * cookie elsewhere, they'll just see the country re-set on their next
 * visit to this page (which mirrors the user's actual intent — they
 * came back).
 */
export default function RememberCountry({ code }: { code: string }) {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    // Server action — runs over RSC channel, no fetch boilerplate needed.
    void setIntentCountryAction(code);
  }, [code]);

  return null;
}
