"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Lightweight product tour for newly-approved professionals (C3).
 *
 * No new deps — pure React + Tailwind + `getBoundingClientRect`. Each
 * step is anchored to a `data-tour="..."` attribute on an existing
 * element. If the target isn't on the current page (or hasn't been
 * mounted yet), the step is skipped — the user always reaches the
 * "Done" terminus, never gets stuck on a missing anchor.
 *
 * Suppression:
 *   - Client side: localStorage key `iv_pro_onboarding_done`. Set on
 *     skip / completion. Cheap re-render guard so we don't paint the
 *     overlay for returning pros.
 *   - Server side: POST /api/pros/onboarding-done stamps
 *     `professionals.onboarding_done_at`. The localStorage flag is the
 *     fast path; the server stamp survives a different browser /
 *     incognito visit.
 *
 * The tour only renders once mounted on the client and once the user
 * has been confirmed "first time" — the `useEffect` gates SSR so the
 * server-rendered HTML stays empty for SEO + hydration sanity.
 */

const STORAGE_KEY = "iv_pro_onboarding_done";

interface Step {
  targetSelector: string;
  title: string;
  body: string;
}

const STEPS: Step[] = [
  {
    targetSelector: '[data-tour="inbox"]',
    title: "Here's your Quote Inbox",
    body: "All Match Requests you're eligible for land here. New requests page in real-time — the bell shows unread.",
  },
  {
    // No clean target for "how to accept briefs" — gracefully skipped
    // until a target exists. Listed so the step count is stable.
    targetSelector: '[data-tour="accept-briefs"]',
    title: "Here's how to accept briefs",
    body: "Open a request, review the brief, then click Accept. We charge credits and unlock the consumer's contact details.",
  },
  {
    targetSelector: '[data-tour="balance"]',
    title: "Here's your credit balance",
    body: "1 credit = A$1. Accept costs vary by brief (usually 1-3 credits). Top up below to stay above the threshold.",
  },
  {
    targetSelector: '[data-tour="auto-recharge"]',
    title: "Enable auto-recharge so you never miss a brief",
    body: "When your balance drops below your threshold, we charge your saved card automatically. Highest-converting providers always have headroom.",
  },
];

interface AnchorRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

function readRect(selector: string): AnchorRect | null {
  if (typeof document === "undefined") return null;
  const el = document.querySelector(selector);
  if (!el) return null;
  const rect = el.getBoundingClientRect();
  // Refuse zero-size / off-viewport elements — they're effectively
  // missing (hidden via responsive classes, conditionally rendered).
  if (rect.width === 0 || rect.height === 0) return null;
  return {
    top: rect.top + window.scrollY,
    left: rect.left + window.scrollX,
    width: rect.width,
    height: rect.height,
  };
}

export default function ProOnboardingTour() {
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);
  const [anchor, setAnchor] = useState<AnchorRect | null>(null);

  // Client-side mount gate — keeps SSR output empty and avoids
  // reading localStorage during server render. Intentional set-state
  // in effect — we're synchronising React state with the browser
  // environment (window + localStorage), the only place we can do so.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    try {
      if (window.localStorage.getItem(STORAGE_KEY)) {
        setDone(true);
      }
    } catch {
      /* localStorage disabled / private mode — show the tour and rely
         on the server stamp + opt-out next time. */
    }
  }, []);

  // Resolve anchor for the current step; advance through steps that
  // don't have a target on this page so the user never sees a card
  // pointing at nothing.
  useEffect(() => {
    if (!mounted || done) return;
    if (step >= STEPS.length) return;
    const current = STEPS[step];
    if (!current) return;
    const rect = readRect(current.targetSelector);
    if (rect) {
      // Sync React state to the measured DOM position. Intentional
      // set-state-in-effect — `getBoundingClientRect` is external
      // (DOM) state we're capturing into React.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAnchor(rect);
      return;
    }
    // Skip this step and try the next on the same frame.
    setAnchor(null);
    const t = setTimeout(() => setStep((s) => s + 1), 0);
    return () => clearTimeout(t);
  }, [mounted, step, done]);

  // Track scroll/resize so the callout keeps tracking its anchor.
  useEffect(() => {
    if (!mounted || done) return;
    if (step >= STEPS.length) return;
    const current = STEPS[step];
    if (!current) return;
    function update() {
      if (!current) return;
      const rect = readRect(current.targetSelector);
      setAnchor(rect);
    }
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [mounted, step, done]);

  const complete = useCallback(async () => {
    try {
      window.localStorage.setItem(STORAGE_KEY, new Date().toISOString());
    } catch {
      /* ignore — server stamp below is the durable record */
    }
    setDone(true);
    try {
      await fetch("/api/pros/onboarding-done", { method: "POST" });
    } catch {
      /* silent — server stamp is best-effort */
    }
  }, []);

  if (!mounted || done) return null;
  if (step >= STEPS.length) {
    // Reached the end without explicit completion (e.g. all targets
    // missing). Stamp and unmount on next tick.
    void complete();
    return null;
  }

  const current = STEPS[step];
  if (!current || !anchor) return null;

  const isFirst = step === 0;
  const isLast = step === STEPS.length - 1;

  // Position the callout below the anchor by default. Flip above when
  // the anchor sits in the bottom half of the viewport.
  const viewportH =
    typeof window !== "undefined" ? window.innerHeight : 800;
  const anchorMidY = anchor.top - window.scrollY + anchor.height / 2;
  const placeAbove = anchorMidY > viewportH * 0.6;

  const calloutTop = placeAbove
    ? anchor.top - 12 - 180 // approx card height
    : anchor.top + anchor.height + 12;
  const calloutLeft = Math.max(
    16,
    Math.min(
      anchor.left + anchor.width / 2 - 160,
      (typeof document !== "undefined"
        ? document.documentElement.clientWidth
        : 800) - 336,
    ),
  );

  return (
    <div
      aria-live="polite"
      className="fixed inset-0 z-[60] pointer-events-none"
      data-testid="pro-onboarding-tour"
    >
      {/* Anchor highlight ring */}
      <div
        aria-hidden
        className="absolute rounded-lg ring-4 ring-amber-400/70 transition-all duration-150"
        style={{
          top: anchor.top - window.scrollY,
          left: anchor.left - window.scrollX,
          width: anchor.width,
          height: anchor.height,
        }}
      />

      {/* Callout card */}
      <div
        role="dialog"
        aria-label={current.title}
        className="absolute w-80 sm:w-[22rem] pointer-events-auto bg-white rounded-xl border border-slate-200 shadow-xl p-4"
        style={{
          top: Math.max(8, calloutTop - window.scrollY),
          left: calloutLeft,
        }}
      >
        <p className="text-[10px] font-bold uppercase tracking-widest text-amber-600 mb-1">
          Step {step + 1} of {STEPS.length}
        </p>
        <h3 className="text-base font-bold text-slate-900 mb-1.5">
          {current.title}
        </h3>
        <p className="text-sm text-slate-600 mb-4 leading-relaxed">
          {current.body}
        </p>
        <div className="flex items-center justify-between gap-2">
          {isFirst ? (
            <button
              type="button"
              onClick={() => void complete()}
              className="text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
            >
              Skip tour
            </button>
          ) : (
            <span />
          )}
          <button
            type="button"
            onClick={() => {
              if (isLast) {
                void complete();
              } else {
                setStep((s) => s + 1);
              }
            }}
            className="inline-flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold text-xs px-3.5 py-2 rounded-lg transition-colors"
          >
            {isLast ? "Done" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}
