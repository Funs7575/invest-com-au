"use client";

/**
 * EligibilityQuizSkipBanner — pre-quiz nudge for visitors with a known
 * country who'd rather skip the quiz and go straight to specialists.
 *
 * PR queue #13 from ~/.claude/plans/sleepy-growing-planet.md (originally
 * proposed in chat 2026-05-09 as "based on settings, you're eligible
 * for X" pattern, option C).
 *
 * Reads `iv_intent_country` cookie on mount. When set, renders a banner
 * above the quiz Step 1 with:
 *   - Country flag + "We see you're in {Country}"
 *   - Country-specific specialty pitch (UK → pension, US → FATCA, etc.)
 *   - "Skip the quiz, see {N} specialists" CTA → routes to the
 *     country-pre-filtered specialty page (PR #684 wired the URLs)
 *   - "Take the 30-sec quiz instead" dismiss link
 *
 * Pure client component — reads cookie, no API call. Visitor can
 * dismiss via the inline link (sets sessionStorage flag so it doesn't
 * re-show during the same session).
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  INTENT_COUNTRY_COOKIE,
  intentCountryMeta,
  isKnownIntentCountry,
  type IntentCountryCode,
} from "@/lib/intent-context";

const DISMISS_KEY = "iv-quiz-skip-banner-dismissed";

interface CtaConfig {
  href: string;
  pitch: string;
}

const CTA_BY_COUNTRY: Record<IntentCountryCode, CtaConfig> = {
  uk: {
    href: "/advisors/international-tax-specialists?specialty=UK%20Pension%20Transfer&country=uk",
    pitch: "UK-AU pension transfer (QROPS) specialists",
  },
  us: {
    href: "/advisors/international-tax-specialists?specialty=FATCA-Aware%20US%20Expat%20Planning&country=us",
    pitch: "FATCA / PFIC-aware US-AU specialists",
  },
  in: {
    href: "/advisors/international-tax-specialists?specialty=DASP%20Processing&country=in",
    pitch: "India-AU cross-border tax + DASP specialists",
  },
  cn: { href: "/advisors/international-tax-specialists?country=cn", pitch: "Mandarin-speaking AU advisors" },
  hk: { href: "/advisors/international-tax-specialists?country=hk", pitch: "HK-AU cross-border specialists" },
  sg: { href: "/advisors/international-tax-specialists?country=sg", pitch: "Singapore-AU cross-border specialists" },
  jp: { href: "/advisors/international-tax-specialists?country=jp", pitch: "Japan-AU cross-border specialists" },
  kr: { href: "/advisors/international-tax-specialists?country=kr", pitch: "Korea-AU cross-border specialists" },
  my: { href: "/advisors/international-tax-specialists?country=my", pitch: "Malaysia-AU cross-border specialists" },
  nz: { href: "/advisors/international-tax-specialists?country=nz", pitch: "Trans-Tasman tax specialists" },
  ae: { href: "/advisors/migration-agents?country=ae", pitch: "UAE migration + cross-border specialists" },
  sa: { href: "/advisors/migration-agents?country=sa", pitch: "Saudi migration + cross-border specialists" },
};

function readIntentCountry(): IntentCountryCode | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split("; ")
    .find((c) => c.startsWith(`${INTENT_COUNTRY_COOKIE}=`));
  if (!match) return null;
  const value = match.split("=")[1];
  if (value && isKnownIntentCountry(value)) return value;
  return null;
}

function readDismissed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

export default function EligibilityQuizSkipBanner() {
  const [country, setCountry] = useState<IntentCountryCode | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setDismissed(readDismissed());
    setCountry(readIntentCountry());
  }, []);

  if (!country || dismissed) return null;

  const cta = CTA_BY_COUNTRY[country];
  if (!cta) return null;

  const meta = intentCountryMeta(country);
  const countryDisplay = meta.label.replace(/ investors$/, "").trim() || meta.name;

  return (
    <div
      className="rounded-xl border border-blue-200 bg-blue-50 p-4 mb-6 flex flex-wrap items-start justify-between gap-x-4 gap-y-2"
      role="region"
      aria-label="Country-specific advisor shortcut"
      data-testid="quiz-skip-banner"
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm text-blue-900 leading-snug">
          <span aria-hidden className="mr-1">{meta.flag}</span>
          <strong>We see you&rsquo;re in {countryDisplay}.</strong>{" "}
          Already know what you need? Skip the quiz and browse {cta.pitch} directly.
        </p>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <Link
          href={cta.href}
          className="inline-flex items-center gap-1.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-lg transition-colors"
          data-testid="quiz-skip-banner-cta"
        >
          See specialists <span aria-hidden>→</span>
        </Link>
        <button
          type="button"
          onClick={() => {
            try {
              sessionStorage.setItem(DISMISS_KEY, "1");
            } catch {
              /* ignore */
            }
            setDismissed(true);
          }}
          className="text-xs text-blue-700 hover:text-blue-900 underline underline-offset-2"
          data-testid="quiz-skip-banner-dismiss"
        >
          Take the quiz instead
        </button>
      </div>
    </div>
  );
}
