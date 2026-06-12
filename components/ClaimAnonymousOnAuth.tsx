"use client";

import { useEffect, useRef } from "react";
import { useUser } from "@/lib/hooks/useUser";
import { getSessionId } from "@/lib/session";
import { useToast } from "@/components/Toast";

/**
 * Global trigger that fires /api/account/claim-anonymous once
 * when the user first becomes authenticated in a tab.
 *
 * Flow:
 *   1. Anonymous visitor saves a broker / takes the quiz.
 *      Those writes land in anonymous_saves / user_quiz_history
 *      keyed by our first-party session_id cookie.
 *   2. User signs up or signs in.
 *   3. This component detects the auth state flip and POSTs
 *      the session_id so the server can claim those rows and
 *      attach them to the new user_id.
 *
 * Idempotency: the server-side claim is safe to replay
 * (upserts on user_bookmarks, is-null filter on user_quiz_history).
 * We still cache a flag in sessionStorage so we don't fire it on
 * every navigation within a tab.
 */
export default function ClaimAnonymousOnAuth() {
  const { user, loading } = useUser();
  const { toast } = useToast();
  const fired = useRef(false);

  useEffect(() => {
    if (loading || !user || fired.current) return;

    const sessionId = getSessionId();
    if (!sessionId) return;

    let skip = false;
    try {
      const stamped = sessionStorage.getItem(`inv_claimed_${user.id}`);
      if (stamped) skip = true;
    } catch {
      /* sessionStorage unavailable — fire anyway, server dedups */
    }
    if (skip) {
      fired.current = true;
      return;
    }

    fired.current = true;
    fetch("/api/account/claim-anonymous", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: sessionId }),
    })
      .then(async (res) => {
        if (!res.ok) return;
        try {
          sessionStorage.setItem(`inv_claimed_${user.id}`, "1");
          // Sync moment: tell the user their pre-auth saves made it home.
          const cached = localStorage.getItem("inv_anon_saves");
          const count = cached ? (JSON.parse(cached) as unknown[]).length : 0;
          localStorage.removeItem("inv_anon_saves");
          if (count > 0) {
            toast(
              count === 1 ? "Your saved item is now in your account" : `Your ${count} saves are now in your account`,
              "success",
              3000,
            );
          }
        } catch {
          /* ignore */
        }
      })
      .catch(() => {
        // Non-blocking — the user can still use the site
        // without their pre-auth state migrated.
      });
  }, [user, loading, toast]);

  return null;
}
