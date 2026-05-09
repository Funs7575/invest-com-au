"use client";

/**
 * CountryRuleAlerts — surfaces 1-2 high-impact rule-change notifications
 * relevant to the visitor's intent country.
 *
 * PR queue #15 (partial): ships banner infra + hardcoded content seeded
 * from the most material rule changes per corridor as of 2026-05.
 * Future PR adds the table + admin CRUD so editorial can update without
 * a deploy. Per founder 2026-05-09 (no post-launch deferral): ship infra
 * now, expand content over the runway.
 *
 * Reads iv_intent_country cookie. Renders a small alert strip when there
 * are alerts for that country. Each alert is dismissable per-session
 * (sessionStorage) so repeat visits don't keep showing the same alert
 * after the user has acknowledged it.
 *
 * Compliance posture: each alert ends with "see a specialist" — these
 * are general-information rule references, not personal advice. Source
 * cited (HMRC / IRS / ATO / Treasury) where applicable.
 */

import { useEffect, useState } from "react";
import {
  INTENT_COUNTRY_COOKIE,
  isKnownIntentCountry,
  type IntentCountryCode,
} from "@/lib/intent-context";

interface RuleAlert {
  id: string;
  /** Severity drives the colour palette — info (blue) / warning (amber) / urgent (red). */
  severity: "info" | "warning" | "urgent";
  headline: string;
  body: string;
  source: string;
  /** Optional CTA — e.g. link to the relevant /foreign-investment/<slug> page. */
  ctaHref?: string;
  ctaLabel?: string;
}

const ALERTS_BY_COUNTRY: Partial<Record<IntentCountryCode, ReadonlyArray<RuleAlert>>> = {
  uk: [
    {
      id: "uk-firb-established-ban-2025",
      severity: "warning",
      headline: "AU established-dwelling ban active until 31 March 2027",
      body: "Foreign buyers (including UK residents) cannot purchase established AU residential dwellings between 1 April 2025 and 31 March 2027. New builds + off-the-plan remain available with FIRB approval.",
      source: "Treasury / FIRB",
      ctaHref: "/foreign-investment/united-kingdom",
      ctaLabel: "UK investor guide",
    },
  ],
  us: [
    {
      id: "us-fatca-threshold-2026",
      severity: "info",
      headline: "FATCA reporting thresholds: $50k year-end / $75k anytime",
      body: "US persons (including dual citizens in AU) must file Form 8938 if specified foreign financial assets exceed these thresholds at year-end or any time during the year. AU super may be reportable depending on structure.",
      source: "IRS",
      ctaHref: "/foreign-investment/united-states",
      ctaLabel: "US investor guide",
    },
  ],
  in: [
    {
      id: "in-dasp-claim-window",
      severity: "info",
      headline: "DASP super refund: claim within 6 months of permanent departure",
      body: "Indian residents who worked in AU and have departed permanently can claim DASP. Tax withheld at 35% (taxed component) / 45-65% (untaxed component). Late claims forfeit to ATO unclaimed-super pool.",
      source: "ATO",
      ctaHref: "/foreign-investment/india",
      ctaLabel: "India investor guide",
    },
  ],
  ae: [
    {
      id: "ae-no-dta-30pct",
      severity: "warning",
      headline: "No UAE-AU DTA — 30% withholding on unfranked dividends",
      body: "There is no AU-UAE double-tax agreement, so unfranked AU dividends + royalties paid to UAE residents are taxed at the full 30% withholding rate. Fully-franked AU dividends remain at 0% withholding regardless.",
      source: "ATO",
      ctaHref: "/foreign-investment/united-arab-emirates",
      ctaLabel: "UAE investor guide",
    },
  ],
  sa: [
    {
      id: "sa-no-dta-30pct",
      severity: "warning",
      headline: "No Saudi-AU DTA — 30% withholding on unfranked dividends",
      body: "There is no AU-Saudi DTA. Unfranked AU dividends + royalties paid to Saudi residents are taxed at the full 30% withholding rate. Halal-compliant equity investing focuses on franked dividends (0% withholding) + property.",
      source: "ATO",
      ctaHref: "/foreign-investment/saudi-arabia",
      ctaLabel: "Saudi investor guide",
    },
  ],
  hk: [
    {
      id: "hk-au-tiea-active",
      severity: "info",
      headline: "AU-HK tax-info exchange agreement is in force",
      body: "AU broker accounts opened by HK residents may be reported to AU under the TIEA. AU residents with HK accounts are reciprocally reportable. Cross-border tax planning should account for this transparency layer.",
      source: "ATO",
      ctaHref: "/foreign-investment/hong-kong",
      ctaLabel: "HK investor guide",
    },
  ],
  cn: [
    {
      id: "cn-fx-cap-50k",
      severity: "info",
      headline: "Mainland China FX cap: USD 50,000/yr personal foreign exchange",
      body: "China's State Administration of Foreign Exchange limits personal foreign-currency conversion to USD 50,000 per year. Plan large AU investments around this cap (or use compliant business / migration vehicles).",
      source: "SAFE",
      ctaHref: "/foreign-investment/china",
      ctaLabel: "China investor guide",
    },
  ],
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

function readDismissed(alertId: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(`iv-rule-alert-dismissed:${alertId}`) === "1";
  } catch {
    return false;
  }
}

const SEVERITY_CLASSES: Record<RuleAlert["severity"], string> = {
  info: "border-blue-200 bg-blue-50 text-blue-900",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
  urgent: "border-red-200 bg-red-50 text-red-900",
};

const SEVERITY_ICONS: Record<RuleAlert["severity"], string> = {
  info: "ℹ️",
  warning: "⚠️",
  urgent: "🚨",
};

export default function CountryRuleAlerts() {
  const [country, setCountry] = useState<IntentCountryCode | null>(null);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    setCountry(readIntentCountry());
  }, []);

  useEffect(() => {
    if (!country) return;
    const alerts = ALERTS_BY_COUNTRY[country];
    if (!alerts) return;
    const dismissed = new Set(alerts.filter((a) => readDismissed(a.id)).map((a) => a.id));
    setDismissedIds(dismissed);
  }, [country]);

  if (!country) return null;
  const alerts = ALERTS_BY_COUNTRY[country];
  if (!alerts) return null;

  const visible = alerts.filter((a) => !dismissedIds.has(a.id));
  if (visible.length === 0) return null;

  const dismiss = (alertId: string) => {
    try {
      sessionStorage.setItem(`iv-rule-alert-dismissed:${alertId}`, "1");
    } catch {
      /* ignore */
    }
    setDismissedIds((prev) => new Set([...prev, alertId]));
  };

  return (
    <div className="space-y-2 my-4" data-testid="country-rule-alerts">
      {visible.map((alert) => (
        <div
          key={alert.id}
          className={`rounded-xl border p-4 flex flex-wrap items-start justify-between gap-x-4 gap-y-2 ${SEVERITY_CLASSES[alert.severity]}`}
          role="region"
          aria-label={`Country rule alert: ${alert.headline}`}
          data-testid={`rule-alert-${alert.id}`}
        >
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold leading-snug mb-1">
              <span aria-hidden className="mr-1.5">{SEVERITY_ICONS[alert.severity]}</span>
              {alert.headline}
            </p>
            <p className="text-xs leading-relaxed mb-1.5">{alert.body}</p>
            <p className="text-[0.65rem] opacity-75">
              Source: {alert.source} · General information only — see a specialist for personal advice.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {alert.ctaHref && alert.ctaLabel && (
              <a
                href={alert.ctaHref}
                className="text-xs font-bold underline underline-offset-2 hover:opacity-80"
                data-testid={`rule-alert-${alert.id}-cta`}
              >
                {alert.ctaLabel} →
              </a>
            )}
            <button
              type="button"
              onClick={() => dismiss(alert.id)}
              className="text-xs opacity-70 hover:opacity-100"
              aria-label="Dismiss alert"
              data-testid={`rule-alert-${alert.id}-dismiss`}
            >
              ✕
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
