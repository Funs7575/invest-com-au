"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

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

  const saveAndClose = (preferences: CookiePreferences) => {
    localStorage.setItem("cookie-preferences", JSON.stringify(preferences));
    localStorage.setItem("cookie-consent", preferences.analytics ? "accepted" : "declined");
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
      role="dialog"
      aria-modal="false"
      aria-label="Cookie consent"
      className={`fixed bottom-0 left-0 right-0 z-[200] bg-slate-900 text-white transition-transform duration-300 ${
        isAnimating ? "translate-y-0" : "translate-y-full"
      }`}
      style={{ boxShadow: "0 -4px 20px rgba(0,0,0,0.2)" }}
    >
      <div className="container-custom py-4">
        {!showPrefs ? (
          /* Standard banner */
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex-1">
              <p className="text-sm leading-relaxed">
                We use cookies to enhance your experience, analyse site traffic, and track affiliate links.{" "}
                <Link href="/privacy" className="text-slate-300 underline hover:text-white transition-colors">
                  Privacy Policy
                </Link>
                .
              </p>
            </div>
            <div className="flex gap-2 flex-shrink-0 flex-wrap">
              <button
                onClick={() => setShowPrefs(true)}
                className="px-3 py-2.5 min-h-[44px] text-xs font-medium text-slate-400 hover:text-white transition-colors underline"
              >
                Manage Preferences
              </button>
              <button
                onClick={handleDeclineAll}
                className="px-4 py-2.5 min-h-[44px] text-sm font-medium text-slate-300 hover:text-white transition-colors"
              >
                Essential Only
              </button>
              <button
                onClick={handleAcceptAll}
                className="px-6 py-2.5 min-h-[44px] bg-white text-slate-900 font-semibold rounded-lg hover:bg-slate-100 transition-colors text-sm"
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
                  <p className="text-xs text-slate-400">Required for the site to function. Cannot be disabled.</p>
                </div>
                <input type="checkbox" checked disabled className="rounded border-slate-600 text-amber-500" />
              </label>

              {/* Analytics */}
              <label className="flex items-center justify-between gap-3 bg-slate-800 rounded-lg px-3 py-2.5 cursor-pointer">
                <div>
                  <p className="text-sm font-medium">Analytics Cookies</p>
                  <p className="text-xs text-slate-400">Google Analytics — helps us understand how visitors use our site.</p>
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
                  <p className="text-xs text-slate-400">Track clicks to partner platforms so we can earn commissions that fund this free service.</p>
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
                className="px-4 py-2.5 min-h-[44px] text-sm font-medium text-slate-400 hover:text-white transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleSavePrefs}
                className="px-6 py-2.5 min-h-[44px] bg-white text-slate-900 font-semibold rounded-lg hover:bg-slate-100 transition-colors text-sm"
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
