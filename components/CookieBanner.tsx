"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { buildConsentCookie } from "@/lib/consent";

interface CookiePreferences {
  essential: boolean; // always true
  analytics: boolean;
  affiliate: boolean;
}

const DEFAULT_PREFS: CookiePreferences = { essential: true, analytics: false, affiliate: false };

export function getCookiePreferences(): CookiePreferences {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  try {
    const raw = localStorage.getItem("cookie-preferences");
    if (raw) return JSON.parse(raw);
    const legacy = localStorage.getItem("cookie-consent");
    if (legacy === "accepted") return { essential: true, analytics: true, affiliate: true };
    if (legacy === "declined") return DEFAULT_PREFS;
  } catch {}
  return DEFAULT_PREFS;
}

export default function CookieBanner() {
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showPrefs, setShowPrefs] = useState(false);
  const [prefs, setPrefs] = useState<CookiePreferences>(DEFAULT_PREFS);
  const bannerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const consent = localStorage.getItem("cookie-consent");
    const preferences = localStorage.getItem("cookie-preferences");
    if (!consent && !preferences) {
      setTimeout(() => {
        setIsVisible(true);
        setTimeout(() => setIsAnimating(true), 50);
      }, 1000);
    }
  }, []);

  // Reserve space for the fixed banner so it never covers page content (e.g.
  // the lower options of a long quiz step). Re-measures on resize and when the
  // preferences panel expands; clears the padding when the banner closes.
  useEffect(() => {
    if (!isVisible) {
      document.body.style.paddingBottom = "";
      return;
    }
    const apply = () => {
      const h = bannerRef.current?.offsetHeight ?? 0;
      document.body.style.paddingBottom = h > 0 ? `${h}px` : "";
    };
    apply();
    window.addEventListener("resize", apply);
    return () => {
      window.removeEventListener("resize", apply);
      document.body.style.paddingBottom = "";
    };
  }, [isVisible, showPrefs]);

  const saveAndClose = (preferences: CookiePreferences) => {
    localStorage.setItem("cookie-preferences", JSON.stringify(preferences));
    localStorage.setItem("cookie-consent", preferences.analytics ? "accepted" : "declined");
    // Mirror to an SSR-readable cookie so the server + first client render gate
    // pixels synchronously, instead of waiting for a localStorage read (§5 #20).
    document.cookie = buildConsentCookie(preferences.analytics);
    setIsAnimating(false);
    setTimeout(() => setIsVisible(false), 300);
  };

  const handleAcceptAll = () => {
    saveAndClose({ essential: true, analytics: true, affiliate: true });
  };

  const handleDeclineAll = () => {
    saveAndClose({ essential: true, analytics: false, affiliate: false });
  };

  const handleSavePrefs = () => {
    saveAndClose(prefs);
  };

  if (!isVisible) return null;

  return (
    <div
      ref={bannerRef}
      role="dialog"
      aria-modal="false"
      aria-label="Cookie consent"
      className={`fixed bottom-0 left-0 right-0 z-[200] bg-slate-900 text-white transition-transform duration-300 ${
        isAnimating ? "translate-y-0" : "translate-y-full"
      }`}
      style={{ boxShadow: "0 -4px 20px rgba(0,0,0,0.2)" }}
    >
      <div className="container-custom py-2.5 sm:py-4">
        {!showPrefs ? (
          /* Standard banner — slim on phones so the first screen stays the
             product's, not the consent bar's (Northstar F1.3). Same legal
             substance, tighter layout. */
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4">
            <div className="flex-1">
              <p className="text-xs sm:text-sm leading-snug sm:leading-relaxed">
                We use cookies to enhance your experience, analyse site traffic, and track affiliate links.{" "}
                <Link href="/privacy" className="text-slate-300 underline hover:text-white transition-colors">
                  Privacy Policy
                </Link>
                .
              </p>
            </div>
            <div className="flex gap-1.5 sm:gap-2 flex-shrink-0 flex-wrap items-center">
              <button
                onClick={() => setShowPrefs(true)}
                className="px-2.5 sm:px-3 py-2.5 min-h-11 text-xs font-medium text-slate-300 hover:text-white transition-colors underline"
              >
                <span className="sm:hidden">Manage</span>
                <span className="hidden sm:inline">Manage Preferences</span>
              </button>
              <button
                onClick={handleDeclineAll}
                className="px-3 sm:px-4 py-2.5 min-h-11 text-xs sm:text-sm font-medium text-slate-300 hover:text-white transition-colors"
              >
                Essential Only
              </button>
              <button
                onClick={handleAcceptAll}
                className="px-4 sm:px-6 py-2.5 min-h-11 bg-white text-slate-900 font-semibold rounded-lg hover:bg-slate-100 transition-colors text-xs sm:text-sm"
              >
                Accept All
              </button>
            </div>
          </div>
        ) : (
          /* Granular preferences */
          <div>
            <p className="text-sm font-semibold mb-3">Cookie Preferences</p>
            <div className="space-y-2.5 mb-4">
              {/* Essential — always on */}
              <label className="flex items-center justify-between gap-3 bg-slate-800 rounded-lg px-3 py-2.5">
                <div>
                  <p className="text-sm font-medium">Essential Cookies</p>
                  <p className="text-xs text-slate-300">Required for the site to function. Cannot be disabled.</p>
                </div>
                <input type="checkbox" checked disabled className="rounded border-slate-600 text-amber-500" />
              </label>

              {/* Analytics */}
              <label className="flex items-center justify-between gap-3 bg-slate-800 rounded-lg px-3 py-2.5 cursor-pointer">
                <div>
                  <p className="text-sm font-medium">Analytics Cookies</p>
                  <p className="text-xs text-slate-300">Google Analytics — helps us understand how visitors use our site.</p>
                </div>
                <input
                  type="checkbox"
                  checked={prefs.analytics}
                  onChange={(e) => setPrefs({ ...prefs, analytics: e.target.checked })}
                  className="rounded border-slate-600 text-amber-500 focus:ring-amber-500/30 cursor-pointer"
                />
              </label>

              {/* Affiliate tracking */}
              <label className="flex items-center justify-between gap-3 bg-slate-800 rounded-lg px-3 py-2.5 cursor-pointer">
                <div>
                  <p className="text-sm font-medium">Affiliate & Advertising Cookies</p>
                  <p className="text-xs text-slate-300">Track clicks to partner platforms so we can earn commissions that fund this free service.</p>
                </div>
                <input
                  type="checkbox"
                  checked={prefs.affiliate}
                  onChange={(e) => setPrefs({ ...prefs, affiliate: e.target.checked })}
                  className="rounded border-slate-600 text-amber-500 focus:ring-amber-500/30 cursor-pointer"
                />
              </label>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowPrefs(false)}
                className="px-4 py-2.5 min-h-11 text-sm font-medium text-slate-300 hover:text-white transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleSavePrefs}
                className="px-6 py-2.5 min-h-11 bg-white text-slate-900 font-semibold rounded-lg hover:bg-slate-100 transition-colors text-sm"
              >
                Save Preferences
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
