"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { getSessionId } from "@/lib/session";

/**
 * Wave 16 — Newsletter-focused exit-intent modal.
 *
 * Distinct from the existing `ExitIntentModal` (which drives the
 * abandoned-form recovery drip). This one funnels into the new
 * newsletter_subscriptions table via /api/newsletter-segments/subscribe
 * and logs impressions + dismissals + conversions to the
 * exit_intent_events table for A/B tuning.
 *
 * Trigger rules:
 *   Desktop: mouseleave toward the top of the window
 *   Mobile:  sharp upward scroll after seeing 40%+ of the page
 *
 * One-shot per session (sessionStorage flag). Caller gates via
 * feature flag so we can dark-launch + ramp with zero deploys.
 */
interface Props {
  variant?: string;
  disabled?: boolean;
}

export default function NewsletterExitIntentModal({
  variant = "default_v1",
  disabled = false,
}: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const firedRef = useRef(false);

  const logEvent = useCallback(
    (action: "shown" | "dismissed" | "converted_subscribe" | "converted_quiz") => {
      try {
        void fetch("/api/exit-intent-log", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            variant,
            action,
            session_id: getSessionId(),
            page_path: pathname,
          }),
          keepalive: true,
        });
      } catch {
        // best-effort
      }
    },
    [variant, pathname],
  );

  // Only fire on pages where the reader is actively consuming
  // content — article / compare / broker / advisor / best-for /
  // tools. Never on homepage, login, account, onboarding or
  // admin flows where an exit-intent popup is just friction.
  const isEligiblePath = useCallback((path: string): boolean => {
    if (!path || path === "/") return false;
    const ALLOW_PREFIXES = [
      "/article/",
      "/compare",
      "/broker/",
      "/advisor/",
      "/advisors/",
      "/best/",
      "/best-for/",
      "/invest/",
      "/tools/",
      "/how-to/",
      "/versus/",
      "/research/",
      "/foreign-investment/",
      "/smsf",
    ];
    const DENY_PREFIXES = [
      "/admin",
      "/advisor-portal",
      "/account",
      "/login",
      "/signup",
      "/onboarding",
      "/checkout",
      "/quiz",
      "/find-advisor",
    ];
    if (DENY_PREFIXES.some((p) => path.startsWith(p))) return false;
    return ALLOW_PREFIXES.some((p) => path.startsWith(p));
  }, []);

  const maybeFire = useCallback(() => {
    if (firedRef.current || disabled) return;
    if (!isEligiblePath(pathname || "")) return;
    try {
      const k = "inv_newsletter_exit_intent_shown";
      if (sessionStorage.getItem(k)) return;
      sessionStorage.setItem(k, "1");
    } catch {
      /* sessionStorage unavailable — fire anyway */
    }
    firedRef.current = true;
    setOpen(true);
    logEvent("shown");
  }, [disabled, logEvent, isEligiblePath, pathname]);

  useEffect(() => {
    if (disabled) return;

    const onMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 10) maybeFire();
    };

    // Mobile fallback
    let seenDeep = false;
    let lastScroll = 0;
    let upCount = 0;
    const onScroll = () => {
      const y = window.scrollY;
      const h = document.documentElement.scrollHeight - window.innerHeight;
      if (h > 0 && y / h > 0.4) seenDeep = true;
      if (seenDeep && y < lastScroll - 40) {
        upCount += 1;
        if (upCount >= 2) maybeFire();
      } else if (y > lastScroll) {
        upCount = 0;
      }
      lastScroll = y;
    };

    // Mobile-UA 45s idle fallback — if the reader hasn't
    // interacted (scroll, tap, touchmove) for 45 seconds AND has
    // already seen some of the page, fire the modal.
    let lastInteraction = Date.now();
    const isMobileUA =
      typeof navigator !== "undefined" &&
      /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
    const onInteraction = () => {
      lastInteraction = Date.now();
    };
    const idleCheck = window.setInterval(() => {
      if (!isMobileUA) return;
      if (Date.now() - lastInteraction >= 45_000 && seenDeep) maybeFire();
    }, 5_000);

    document.addEventListener("mouseleave", onMouseLeave);
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("touchstart", onInteraction, { passive: true });
    document.addEventListener("touchmove", onInteraction, { passive: true });
    return () => {
      document.removeEventListener("mouseleave", onMouseLeave);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("touchstart", onInteraction);
      document.removeEventListener("touchmove", onInteraction);
      window.clearInterval(idleCheck);
    };
  }, [maybeFire, disabled]);

  const dismiss = useCallback(() => {
    setOpen(false);
    logEvent("dismissed");
  }, [logEvent]);

  const subscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setMsg(null);
    try {
      const res = await fetch("/api/newsletter-segments/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, segment: "weekly" }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error || "Could not subscribe");
        return;
      }
      setMsg(json.message || "Thanks! Check your inbox to confirm.");
      logEvent("converted_subscribe");
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Newsletter signup"
      className="fixed inset-0 z-[60] flex items-end md:items-center justify-center bg-black/50"
    >
      <div className="w-full md:max-w-md bg-white rounded-t-2xl md:rounded-2xl border border-slate-200 shadow-xl p-6 relative">
        <button
          type="button"
          onClick={dismiss}
          aria-label="Close"
          className="absolute top-3 right-3 text-slate-400 hover:text-slate-700 text-xl leading-none w-8 h-8 flex items-center justify-center"
        >
          ×
        </button>

        <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600 mb-2">
          Before you go
        </p>
        <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-2">
          Fee changes, delivered weekly
        </h2>
        <p className="text-sm text-slate-600 mb-4">
          Every Monday we send a short email with broker fee changes, new
          editorial picks, and one actionable investing insight. Free, no
          spam, one-click unsubscribe.
        </p>

        {msg ? (
          <p className="text-sm font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-3 py-2">
            {msg}
          </p>
        ) : (
          <form onSubmit={subscribe} className="space-y-3">
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40"
            />
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold text-sm px-4 py-2.5 rounded-lg"
            >
              {submitting ? "Subscribing…" : "Get the weekly digest"}
            </button>
            {error && (
              <p role="alert" className="text-xs text-red-700">
                {error}
              </p>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
