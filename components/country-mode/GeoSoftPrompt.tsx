"use client";

/**
 * Country Mode soft prompt — the GeoIP-driven suggestion banner.
 *
 * Renders only when ALL of the following are true:
 *   - The iv_intent_country cookie is empty (user hasn't picked a
 *     country in the flag selector or via a /quiz?country= deeplink)
 *   - The localStorage flag-button override is empty (existing visitors
 *     who had set "AU" or a country pre-cookie-wiring shouldn't be
 *     re-prompted)
 *   - The "country prompt dismissed" localStorage flag is unset
 *   - /api/geo returns an ISO code that maps to a supported
 *     IntentCountryCode
 *
 * The first three are post-hydration checks; the fourth requires a
 * fetch. We render nothing during SSR to avoid hydration mismatch and
 * cache-fragmentation on the homepage edge cache. By design — see
 * docs/architecture/country-mode.md for the SSR-vs-CSR tradeoffs.
 *
 * Soft prompt: per the addendum, GeoIP suggests, never forces. The two
 * CTAs are equal-weight ("View HK version" / "Stay on global"), and
 * dismissal is sticky (never re-shows for the same browser).
 */

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  intentCountryFromIso,
  intentCountryMeta,
  INTENT_COUNTRY_COOKIE,
  type IntentCountryCode,
} from "@/lib/intent-context";
import { setIntentCountryAction } from "@/lib/intent-context-actions";
import { trackEvent } from "@/lib/tracking";

const FLAG_OVERRIDE_KEY = "iv-location-flag-override";
const DISMISSED_KEY = "iv-country-prompt-dismissed";

function hasCookie(name: string): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie
    .split("; ")
    .some((c) => c.startsWith(`${name}=`));
}

function safeLocalStorageGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeLocalStorageSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}

export default function GeoSoftPrompt() {
  const router = useRouter();
  const [suggested, setSuggested] = useState<IntentCountryCode | null>(null);

  useEffect(() => {
    // Eligibility gates — short-circuit cheap checks before fetching.
    if (hasCookie(INTENT_COUNTRY_COOKIE)) return;
    if (safeLocalStorageGet(FLAG_OVERRIDE_KEY)) return;
    if (safeLocalStorageGet(DISMISSED_KEY)) return;

    let cancelled = false;
    fetch("/api/geo")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled) return;
        if (!data || typeof data.country !== "string") return;
        const code = intentCountryFromIso(data.country);
        if (!code) return;
        setSuggested(code);
        trackEvent("country_mode_detected", { country: code, source: "geo" });
      })
      .catch(() => {
        /* dev mode / offline — leave hidden */
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (!suggested) return null;

  const meta = intentCountryMeta(suggested);

  return (
    <div
      className="bg-slate-900 text-white"
      role="dialog"
      aria-label={`Suggested country: ${meta.name}`}
    >
      <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-sm">
        <p>
          <span aria-hidden className="mr-2">{meta.flag}</span>
          Looks like you&rsquo;re in {meta.name}. See the {meta.name.replace(/^the /, "")} investor view?
        </p>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={async () => {
              trackEvent("country_mode_selected", {
                country: suggested,
                source: "geo_prompt",
              });
              try {
                await setIntentCountryAction(suggested);
              } catch {
                /* surface as a missed conversion — don't block nav */
              }
              safeLocalStorageSet(FLAG_OVERRIDE_KEY, meta.iso);
              setSuggested(null);
              router.push(`/foreign-investment/${meta.slug}`);
            }}
            className="bg-amber-400 hover:bg-amber-300 text-slate-900 font-semibold px-3 py-1.5 rounded-lg transition-colors"
          >
            View {meta.name.replace(/^the /, "")} version
          </button>
          <button
            type="button"
            onClick={() => {
              trackEvent("country_mode_dismissed", {
                country: suggested,
                source: "geo_prompt",
              });
              safeLocalStorageSet(DISMISSED_KEY, "1");
              setSuggested(null);
            }}
            className="text-slate-300 hover:text-white underline underline-offset-2"
          >
            Stay on global
          </button>
        </div>
      </div>
    </div>
  );
}
