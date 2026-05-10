"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { COUNTRY_CONFIGS } from "@/lib/foreign-investment-country-data";
import {
  INTENT_COUNTRY_COOKIE,
  type IntentCountryCode,
} from "@/lib/intent-context";
import {
  setIntentCountryAction,
  clearIntentCountryAction,
} from "@/lib/intent-context-actions";
import { COUNTRY_MODE_OPEN_SELECTOR_EVENT } from "@/components/country-mode/CountryModeBannerSwitchButton";
import { trackEvent } from "@/lib/tracking";

// ─── Country data (single source of truth, used to be split across
// InternationalBanner) ──────────────────────────────────────────────────────

// 12 corridors invest.com.au has dedicated guides for. Order roughly by
// migration volume into Australia, then by financial-corridor importance.
//
// `intentCode` maps the ISO 3166-1 alpha-2 country code (used by
// /api/geo and the localStorage override) to the IntentCountryCode used
// throughout the app's CountryConfig system. Most are a direct
// lowercase match; only GB → uk diverges (GB is the ISO code, "uk" is
// the intent slug).
const SUPPORTED_COUNTRIES: ReadonlyArray<{
  code: string;
  name: string;
  intentCode: IntentCountryCode;
  slug: string;
}> = [
  { code: "GB", name: "the UK", intentCode: "uk", slug: "united-kingdom" },
  { code: "IN", name: "India", intentCode: "in", slug: "india" },
  { code: "CN", name: "China", intentCode: "cn", slug: "china" },
  { code: "US", name: "the US", intentCode: "us", slug: "united-states" },
  { code: "SG", name: "Singapore", intentCode: "sg", slug: "singapore" },
  { code: "HK", name: "Hong Kong", intentCode: "hk", slug: "hong-kong" },
  { code: "NZ", name: "New Zealand", intentCode: "nz", slug: "new-zealand" },
  { code: "AE", name: "the UAE", intentCode: "ae", slug: "united-arab-emirates" },
  { code: "KR", name: "South Korea", intentCode: "kr", slug: "south-korea" },
  { code: "JP", name: "Japan", intentCode: "jp", slug: "japan" },
  { code: "MY", name: "Malaysia", intentCode: "my", slug: "malaysia" },
  { code: "SA", name: "Saudi Arabia", intentCode: "sa", slug: "saudi-arabia" },
];

// Convert a 2-letter ISO 3166-1 alpha-2 code to its flag emoji by mapping
// ASCII letters to regional-indicator codepoints (🇦 = U+1F1E6).
function flagEmoji(code: string): string {
  const upper = code.toUpperCase();
  if (upper.length !== 2) return "🌏";
  return String.fromCodePoint(
    0x1f1e6 + upper.charCodeAt(0) - 65,
    0x1f1e6 + upper.charCodeAt(1) - 65,
  );
}

// Slugs that have a /ar/ Arabic country page. When the visitor picks
// one of these, we route them to the Arabic version so they land in
// their native script + RTL layout. PR queue #6 — Phase 5 completion.
const ARABIC_COUNTRY_SLUGS: ReadonlySet<string> = new Set([
  "united-arab-emirates",
  "saudi-arabia",
]);

function countryHubUrl(slug: string): string {
  return ARABIC_COUNTRY_SLUGS.has(slug)
    ? `/ar/foreign-investment/${slug}`
    : `/foreign-investment/${slug}`;
}

const STORAGE_KEY = "iv-location-flag-override";
const DISMISSED_KEY = "iv-country-prompt-dismissed";

function hasIntentCountryCookie(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie
    .split("; ")
    .some((c) => c.startsWith(`${INTENT_COUNTRY_COOKIE}=`));
}

export default function LocationFlagButton() {
  const [open, setOpen] = useState(false);
  const [override, setOverride] = useState<string | null>(null);
  const [detectedCountry, setDetectedCountry] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Read any previously-set override from localStorage. We don't render the
  // localStorage value during SSR (hydration mismatch risk) — wait for
  // useEffect to populate it.
  //
  // Migration: if localStorage has a non-AU supported override but the
  // iv_intent_country cookie isn't set, sync it. Existing users who
  // selected a country before Country Mode wired the server action need
  // this one-time write so the homepage / advisors / compare surfaces
  // pick up their preference. localStorage "AU" maps to "no country
  // mode" so we explicitly skip it.
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: localStorage is read post-hydration to keep SSR markup consistent
      if (stored) setOverride(stored);
      if (localStorage.getItem(DISMISSED_KEY) === "1") setDismissed(true);
      if (stored && stored !== "AU" && !hasIntentCountryCookie()) {
        const match = SUPPORTED_COUNTRIES.find((c) => c.code === stored);
        if (match) {
          // Fire-and-forget — server action sets the cookie via
          // Set-Cookie. No need to await: the page is already rendered
          // with localStorage as the override; the cookie just needs
          // to land before the next navigation.
          void setIntentCountryAction(match.intentCode);
        }
      }
    } catch {
      /* ignore */
    }
  }, []);

  // Fetch detected country code from /api/geo on mount. The endpoint reads
  // x-vercel-ip-country server-side and is edge-cached for 1h, so this is
  // cheap. Until the response lands, we render with the "AU" fallback.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/geo")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled) return;
        if (data && typeof data.country === "string") {
          setDetectedCountry(data.country);
        }
      })
      .catch(() => {
        /* dev mode / offline — leave fallback */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Close on outside click / Esc.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Listen for the open-selector custom event — fired by
  // CountryModeBanner's "Switch country" button. Decoupled from the
  // banner so neither component imports the other directly.
  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener(COUNTRY_MODE_OPEN_SELECTOR_EVENT, handler);
    return () => window.removeEventListener(COUNTRY_MODE_OPEN_SELECTOR_EVENT, handler);
  }, []);

  const setOverrideAndPersist = useCallback((value: string | null) => {
    setOverride(value);
    try {
      if (value) localStorage.setItem(STORAGE_KEY, value);
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  // Effective country = explicit override (user clicked one in the popover)
  // OR detected country OR fallback "AU" so the button always renders a flag.
  // When the user has dismissed the soft-prompt, ignore the detected
  // signal so the popover treats them as AU/global rather than re-prompting.
  const detectedEffective = !override && dismissed ? null : detectedCountry;
  const effective = override ?? detectedEffective ?? "AU";
  const supported = SUPPORTED_COUNTRIES.find((c) => c.code === effective);
  // Three popover states:
  //   - explicit:  user picked a country (override) → show actions list + reset
  //   - suggested: GeoIP detected an unconfirmed country → soft prompt
  //   - generic:   AU / no signal → "Investing from overseas?" generic CTA
  const popoverState: "explicit" | "suggested" | "generic" =
    supported && override
      ? "explicit"
      : supported && !override && detectedEffective
        ? "suggested"
        : "generic";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={
          popoverState === "explicit" && supported
            ? `Currently viewing as ${supported.name}. Switch country`
            : popoverState === "suggested" && supported
              ? `Investing from ${supported.name}? Switch view`
              : "Switch to investing-from-overseas view"
        }
        className="px-2 py-2 rounded-xl text-base hover:bg-slate-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 leading-none flex items-center gap-1.5"
      >
        <span aria-hidden>{flagEmoji(effective)}</span>
        {/* Country name only renders for confirmed selection — a detected
        but unconfirmed country shouldn't put a name in the nav, since
        the user hasn't agreed they're in country mode yet. */}
        {popoverState === "explicit" && supported && (
          <>
            {/* Mobile: ISO short ("HK"). ≥sm: full short name ("Hong Kong"). */}
            <span className="sm:hidden text-xs font-semibold text-slate-700">
              {supported.code}
            </span>
            <span className="hidden sm:inline text-xs font-medium text-slate-700">
              {supported.name.replace(/^the /, "")}
            </span>
          </>
        )}
        {/* Always-on chevron — telegraphs that the trigger is a menu, not a label. */}
        <span aria-hidden className="text-[0.6rem] text-slate-400 leading-none">
          ▾
        </span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-2 z-[60] w-[360px] bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/60 overflow-hidden"
        >
          <div className="p-4">
            {popoverState === "suggested" && supported ? (
              <>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Suggested
                </p>
                <p className="text-sm font-semibold text-slate-900 mb-3">
                  Looks like you&rsquo;re in {flagEmoji(effective)} {supported.name}. See the {supported.name.replace(/^the /, "")} investor view?
                </p>
                <div className="flex flex-col gap-2">
                  <Link
                    href={countryHubUrl(supported.slug)}
                    onClick={() => {
                      setOverrideAndPersist(supported.code);
                      void setIntentCountryAction(supported.intentCode);
                      trackEvent("country_mode_selected", {
                        country: supported.intentCode,
                        source: "popover_suggestion",
                      });
                      setOpen(false);
                    }}
                    className="block text-center bg-amber-400 hover:bg-amber-300 text-slate-900 font-semibold px-3 py-2 rounded-xl transition-colors"
                  >
                    View {supported.name.replace(/^the /, "")} version
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      // Don't lie about location — keep override empty
                      // but mark the prompt dismissed so the popover
                      // shows the generic state next time.
                      try {
                        localStorage.setItem(DISMISSED_KEY, "1");
                      } catch {
                        /* ignore */
                      }
                      setDismissed(true);
                      trackEvent("country_mode_dismissed", {
                        country: supported.intentCode,
                        source: "popover_suggestion",
                      });
                      setOpen(false);
                    }}
                    className="text-center text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 transition-colors"
                  >
                    Stay on global
                  </button>
                </div>
              </>
            ) : popoverState === "explicit" && supported ? (
              <>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Viewing as
                </p>
                <p className="text-sm font-semibold text-slate-900 mb-3">
                  You&rsquo;re browsing as {flagEmoji(effective)} {supported.name}.
                </p>
                {(() => {
                  const actions = COUNTRY_CONFIGS[supported.intentCode]?.defaultActions ?? [];
                  if (actions.length > 0) {
                    return (
                      <div className="-mx-1 mb-2 max-h-[320px] overflow-y-auto">
                        {actions.map((a) => (
                          <Link
                            key={a.href + a.label}
                            href={a.href}
                            onClick={() => setOpen(false)}
                            className="flex items-start gap-3 px-3 py-2 rounded-xl hover:bg-amber-50 transition-colors group"
                          >
                            <span aria-hidden className="text-base leading-tight mt-0.5">{a.emoji}</span>
                            <span className="flex-1 min-w-0">
                              <span className="block text-sm font-semibold text-slate-900 group-hover:text-amber-800 truncate">
                                {a.label}
                              </span>
                              <span className="block text-xs text-slate-500 leading-snug line-clamp-2">
                                {a.sublabel}
                              </span>
                            </span>
                            <span aria-hidden className="text-slate-400 group-hover:text-amber-600 text-sm shrink-0 mt-0.5">
                              →
                            </span>
                          </Link>
                        ))}
                      </div>
                    );
                  }
                  // Fallback: country isn't in COUNTRY_CONFIGS (shouldn't
                  // happen for the 12 supported codes, but the typed map is
                  // Partial<Record<…>> so handle defensively).
                  return (
                    <Link
                      href={`/foreign-investment/${supported.slug}`}
                      onClick={() => setOpen(false)}
                      className="block p-3 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl mb-2 transition-colors group"
                    >
                      <p className="text-sm font-bold text-slate-900">
                        Investing in Australia from {supported.name}? &rarr;
                      </p>
                      <p className="text-xs text-slate-600 mt-0.5">
                        Country-specific guide: tax, FIRB, brokers and specialists.
                      </p>
                    </Link>
                  );
                })()}
                <button
                  type="button"
                  onClick={() => {
                    setOverrideAndPersist("AU");
                    // Clear the cookie too — otherwise downstream
                    // surfaces (compare, advisors, homepage strips)
                    // would still see the previous country preference.
                    void clearIntentCountryAction();
                    setOpen(false);
                  }}
                  className="block w-full text-center text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 mt-3 transition-colors"
                >
                  Switch to Australia <span aria-hidden>🇦🇺</span>
                </button>
              </>
            ) : (
              <>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Investing from overseas?
                </p>
                <p className="text-sm font-semibold text-slate-900 mb-3">
                  We have country-specific guides covering tax, FIRB rules, eligible brokers, and specialist advisors.
                </p>
                <Link
                  href="/foreign-investment"
                  onClick={() => setOpen(false)}
                  className="block p-3 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl mb-3 transition-colors"
                >
                  <p className="text-sm font-bold text-slate-900">Foreign investor hub &rarr;</p>
                  <p className="text-xs text-slate-600 mt-0.5">
                    All 12 country guides, DTA rates, visa pathways, and cross-border advisors.
                  </p>
                </Link>
              </>
            )}
          </div>

          <div className="border-t border-slate-100 bg-slate-50/50 p-3">
            <p className="text-[0.65rem] font-bold text-slate-500 uppercase tracking-wider mb-2 px-1">
              Country guides
            </p>
            <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
              {SUPPORTED_COUNTRIES.map((c) => (
                <Link
                  key={c.code}
                  href={countryHubUrl(c.slug)}
                  onClick={() => {
                    // Setting the override here lets the user "stick" to a
                    // country view if they intentionally pick one. The flag
                    // updates to match. The cookie write feeds downstream
                    // SSR surfaces (advisors / compare / homepage strips)
                    // — without it, picking a country here only affected
                    // this component's local UI.
                    setOverrideAndPersist(c.code);
                    void setIntentCountryAction(c.intentCode);
                    trackEvent("country_mode_selected", {
                      country: c.intentCode,
                      source: "popover_grid",
                    });
                    setOpen(false);
                  }}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white transition-colors"
                >
                  <span aria-hidden>{flagEmoji(c.code)}</span>
                  <span className="text-xs font-medium text-slate-700">{c.name.replace(/^the /, "")}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
