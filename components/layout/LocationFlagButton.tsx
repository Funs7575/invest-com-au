"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";

// ─── Country data (single source of truth, used to be split across
// InternationalBanner) ──────────────────────────────────────────────────────

// 12 corridors invest.com.au has dedicated guides for. Order roughly by
// migration volume into Australia, then by financial-corridor importance.
const SUPPORTED_COUNTRIES: ReadonlyArray<{
  code: string;
  name: string;
  // Country page slug. Most are /foreign-investment/{slug}, but we keep this
  // explicit so the UK / US / China / India bespoke pages route differently
  // from the templated [country] dynamic page.
  slug: string;
}> = [
  { code: "GB", name: "the UK", slug: "united-kingdom" },
  { code: "IN", name: "India", slug: "india" },
  { code: "CN", name: "China", slug: "china" },
  { code: "US", name: "the US", slug: "united-states" },
  { code: "SG", name: "Singapore", slug: "singapore" },
  { code: "HK", name: "Hong Kong", slug: "hong-kong" },
  { code: "NZ", name: "New Zealand", slug: "new-zealand" },
  { code: "AE", name: "the UAE", slug: "united-arab-emirates" },
  { code: "KR", name: "South Korea", slug: "south-korea" },
  { code: "JP", name: "Japan", slug: "japan" },
  { code: "MY", name: "Malaysia", slug: "malaysia" },
  { code: "SA", name: "Saudi Arabia", slug: "saudi-arabia" },
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
          className="absolute right-0 top-full mt-2 z-[60] w-[320px] bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/60 overflow-hidden"
        >
          <div className="p-4">
            {supported && !isAU ? (
              <>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Detected location
                </p>
                <p className="text-sm font-semibold text-slate-900 mb-3">
                  We&apos;ve detected you&apos;re in {flagEmoji(effective)} {supported.name}.
                </p>
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
                <button
                  type="button"
                  onClick={() => {
                    setOverrideAndPersist("AU");
                    setOpen(false);
                  }}
                  className="block w-full text-left text-xs text-slate-500 hover:text-slate-900 underline underline-offset-2"
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
