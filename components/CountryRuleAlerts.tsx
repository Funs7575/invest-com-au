"use client";

/**
 * CountryRuleAlerts — surfaces 1-2 high-impact rule-change notifications
 * relevant to the visitor's intent country.
 *
 * Reads the iv_intent_country cookie, then fetches active alerts for
 * that country from /api/country-rule-alerts (DB-backed; managed via
 * /admin/country-rule-alerts). Each alert is dismissable per-session
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
import type {
  PublicRuleAlert,
  AlertSeverity,
} from "@/lib/country-rule-alerts";

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

function readDismissed(alertKey: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(`iv-rule-alert-dismissed:${alertKey}`) === "1";
  } catch {
    return false;
  }
}

const SEVERITY_CLASSES: Record<AlertSeverity, string> = {
  info: "border-blue-200 bg-blue-50 text-blue-900",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
  urgent: "border-red-200 bg-red-50 text-red-900",
};

const SEVERITY_ICONS: Record<AlertSeverity, string> = {
  info: "ℹ️",
  warning: "⚠️",
  urgent: "🚨",
};

export default function CountryRuleAlerts() {
  const [country, setCountry] = useState<IntentCountryCode | null>(null);
  const [alerts, setAlerts] = useState<PublicRuleAlert[]>([]);
  const [dismissedKeys, setDismissedKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing cookie (external state) into React on mount
    setCountry(readIntentCountry());
  }, []);

  useEffect(() => {
    if (!country) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset to empty when country clears
      setAlerts([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/country-rule-alerts?country=${encodeURIComponent(country)}`,
        );
        if (!res.ok) return;
        const json = (await res.json()) as { alerts?: PublicRuleAlert[] };
        if (cancelled) return;
        const next = json.alerts ?? [];
        setAlerts(next);
        setDismissedKeys(
          new Set(next.filter((a) => readDismissed(a.alert_key)).map((a) => a.alert_key)),
        );
      } catch {
        // network failure — banner stays hidden, no user-visible breakage
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [country]);

  if (!country || alerts.length === 0) return null;

  const visible = alerts.filter((a) => !dismissedKeys.has(a.alert_key));
  if (visible.length === 0) return null;

  const dismiss = (alertKey: string) => {
    try {
      sessionStorage.setItem(`iv-rule-alert-dismissed:${alertKey}`, "1");
    } catch {
      /* ignore */
    }
    setDismissedKeys((prev) => new Set([...prev, alertKey]));
  };

  return (
    <div className="space-y-2 my-4" data-testid="country-rule-alerts">
      {visible.map((alert) => (
        <div
          key={alert.alert_key}
          className={`rounded-xl border p-4 flex flex-wrap items-start justify-between gap-x-4 gap-y-2 ${SEVERITY_CLASSES[alert.severity]}`}
          role="region"
          aria-label={`Country rule alert: ${alert.headline}`}
          data-testid={`rule-alert-${alert.alert_key}`}
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
            {alert.cta_href && alert.cta_label && (
              <a
                href={alert.cta_href}
                className="text-xs font-bold underline underline-offset-2 hover:opacity-80"
                data-testid={`rule-alert-${alert.alert_key}-cta`}
              >
                {alert.cta_label} →
              </a>
            )}
            <button
              type="button"
              onClick={() => dismiss(alert.alert_key)}
              className="text-xs opacity-70 hover:opacity-100"
              aria-label="Dismiss alert"
              data-testid={`rule-alert-${alert.alert_key}-dismiss`}
            >
              ✕
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
