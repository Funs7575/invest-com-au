"use client";

import { useState, useCallback } from "react";
import { buildShareableUrl } from "@/hooks/use-calculator-state";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";

export type CalcSlug =
  | "retirement"
  | "compound-interest"
  | "mortgage"
  | "savings"
  | "super-contributions"
  | "cgt";

interface ShareResultProps {
  /** Must match the key passed to useCalculatorState (e.g. "mortgage_calculator"). */
  calculatorKey: string;
  /** Human-readable result label to appear in share text (e.g. "$2,450/mo"). */
  resultLabel: string;
  /** Page title for navigator.share title field. */
  calcTitle: string;
  /** Slug for OG image theming (accent colour per calculator). */
  calcSlug: CalcSlug;
  /** Current calculator state — all inputs included in the shareable URL. */
  state: Record<string, unknown>;
  /** Whether to render the AFSL general-advice disclaimer beneath the button. Default true. */
  showDisclaimer?: boolean;
  className?: string;
}

/**
 * Reusable share-result affordance for calculators.
 *
 * Preference chain:
 *   1. navigator.share (native OS share sheet — mobile + modern desktop)
 *   2. navigator.clipboard.writeText (background copy)
 *   3. window.prompt (last resort for non-secure contexts)
 *
 * The shared URL encodes all calculator inputs as query params so the linked
 * page reproduces the exact result. A parameterised OG card is pre-warmed
 * via a hidden <img> so link-unfurl crawlers (Slack, Twitter, LinkedIn) get
 * an instant render.
 *
 * AFSL compliance: shows GENERAL_ADVICE_WARNING when showDisclaimer=true so
 * the share affordance itself carries the required disclosure. Page-level
 * ComplianceFooter already handles pages that display the footer — pass
 * showDisclaimer={false} to avoid duplication.
 */
export default function ShareResult({
  calculatorKey,
  resultLabel,
  calcTitle,
  calcSlug,
  state,
  showDisclaimer = true,
  className,
}: ShareResultProps) {
  const [status, setStatus] = useState<"idle" | "copied" | "shared">("idle");

  const handleShare = useCallback(async () => {
    if (typeof window === "undefined") return;

    const deepLink = buildShareableUrl(window.location.pathname, calculatorKey, state);
    const ogUrl = `/api/og?type=calculator&calc=${encodeURIComponent(calcSlug)}&result=${encodeURIComponent(resultLabel)}&title=${encodeURIComponent(calcTitle)}`;
    const text = `${resultLabel} — ${calcTitle}. See the full calculation: ${deepLink}`;

    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: calcTitle, text, url: deepLink });
        setStatus("shared");
        return;
      } catch {
        // User cancelled or share sheet unavailable — fall through to clipboard.
      }
    }

    try {
      await navigator.clipboard.writeText(deepLink);
    } catch {
      // Clipboard API unavailable in non-secure context.
      window.prompt("Copy this link to share your result:", deepLink);
      return;
    }

    setStatus("copied");
    setTimeout(() => setStatus("idle"), 2500);

    // Suppress unused variable — ogUrl is only used for the hidden img below.
    void ogUrl;
  }, [calculatorKey, state, resultLabel, calcTitle, calcSlug]);

  const ogUrl =
    typeof window !== "undefined"
      ? `/api/og?type=calculator&calc=${encodeURIComponent(calcSlug)}&result=${encodeURIComponent(resultLabel)}&title=${encodeURIComponent(calcTitle)}`
      : null;

  return (
    <div className={className}>
      <button
        type="button"
        onClick={handleShare}
        aria-label="Share this calculator result"
        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold border border-slate-200 rounded-lg bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-800 transition-colors shadow-sm"
      >
        {status === "copied" ? (
          <>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
              <path d="M2 7l4 4 6-6" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="text-emerald-700">Link copied!</span>
          </>
        ) : status === "shared" ? (
          <>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
              <path d="M2 7l4 4 6-6" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="text-emerald-700">Shared!</span>
          </>
        ) : (
          <>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
              <circle cx="11" cy="2.5" r="1.5" stroke="currentColor" strokeWidth="1.4" />
              <circle cx="11" cy="11.5" r="1.5" stroke="currentColor" strokeWidth="1.4" />
              <circle cx="3" cy="7" r="1.5" stroke="currentColor" strokeWidth="1.4" />
              <path d="M9.5 3.3L4.5 6.2M9.5 10.7L4.5 7.8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
            Share result
          </>
        )}
      </button>

      {/* Hidden OG pre-warm: helps CDN cache the render before the link is unfurled. */}
      {ogUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={ogUrl}
          alt=""
          aria-hidden
          loading="lazy"
          className="sr-only"
          width={1}
          height={1}
        />
      )}

      {showDisclaimer && (
        <p className="mt-3 text-[0.65rem] leading-relaxed text-slate-400">
          {GENERAL_ADVICE_WARNING}
        </p>
      )}
    </div>
  );
}
