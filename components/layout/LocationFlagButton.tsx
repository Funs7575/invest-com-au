"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { COUNTRY_CONFIGS } from "@/lib/foreign-investment-country-data";
import type { IntentCountryCode } from "@/lib/intent-context";

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

const STORAGE_KEY = "iv-location-flag-override";

export default function LocationFlagButton() {
  const [open, setOpen] = useState(false);
  const [override, setOverride] = useState<string | null>(null);
  const [detectedCountry, setDetectedCountry] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  // Read any previously-set override from localStorage. We don't render the
  // localStorage value during SSR (hydration mismatch risk) — wait for
  // useEffect to populate it.
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: localStorage is read post-hydration to keep SSR markup consistent
      if (stored) setOverride(stored);
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
  const effective = override ?? detectedCountry ?? "AU";
  const supported = SUPPORTED_COUNTRIES.find((c) => c.code === effective);
  const isAU = effective === "AU";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={
          isAU
            ? "Switch to investing-from-overseas view"
            : `Investing from ${supported?.name ?? "overseas"}? Switch view`
        }
        className="p-2 rounded-xl text-base hover:bg-slate-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 leading-none"
      >
        <span aria-hidden>{flagEmoji(effective)}</span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-2 z-[60] w-[360px] bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/60 overflow-hidden"
        >
          <div className="p-4">
            {supported && !isAU ? (
              <>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  {override ? "Viewing as" : "Detected location"}
                </p>
                <p className="text-sm font-semibold text-slate-900 mb-3">
                  {override
                    ? `You're browsing as ${flagEmoji(effective)} ${supported.name}.`
                    : `We've detected you're in ${flagEmoji(effective)} ${supported.name}.`}
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
                    setOpen(false);
                  }}
                  className="block w-full text-left text-xs text-slate-500 hover:text-slate-900 underline underline-offset-2 mt-2"
                >
                  I&apos;m browsing as an Australian &rarr;
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
                  href={`/foreign-investment/${c.slug}`}
                  onClick={() => {
                    // Setting the override here lets the user "stick" to a
                    // country view if they intentionally pick one. The flag
                    // updates to match.
                    setOverrideAndPersist(c.code);
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
