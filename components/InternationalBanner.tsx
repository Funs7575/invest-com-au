"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";

const DISMISS_KEY = "intl-banner-dismissed-v1";

// AU and NZ don't see the banner
const DOMESTIC_COUNTRIES = new Set(["AU", "NZ"]);

interface Props {
  countryCode: string | null;
}

export default function InternationalBanner({ countryCode }: Props) {
  const [dismissed, setDismissed] = useState(true); // start dismissed to avoid flash

  useEffect(() => {
    try {
      const stored = localStorage.getItem(DISMISS_KEY);
      if (!stored) setDismissed(false);
    } catch {
      setDismissed(false);
    }
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    try { localStorage.setItem(DISMISS_KEY, "1"); } catch { /* ignore */ }
  };

  if (!countryCode || DOMESTIC_COUNTRIES.has(countryCode) || dismissed) return null;

  return (
    <div className="bg-gradient-to-r from-indigo-600 to-blue-700 text-white text-sm">
      <div className="container-custom max-w-7xl flex items-center justify-between gap-3 py-2.5 px-4">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="text-base leading-none shrink-0">🌏</span>
          <p className="text-xs md:text-sm font-medium text-white/95 truncate">
            <span className="hidden md:inline">Investing in Australia from overseas? </span>
            <Link
              href="/foreign-investment"
              className="font-bold text-white underline underline-offset-2 hover:text-blue-100"
            >
              See our international investor guide
            </Link>
            <span className="hidden md:inline text-white/70"> — FIRB rules, broker eligibility, double tax agreements &amp; specialist advisors.</span>
          </p>
        </div>
        <button
          onClick={handleDismiss}
          aria-label="Dismiss"
          className="shrink-0 text-white/70 hover:text-white transition-colors"
        >
          <Icon name="x" size={16} />
        </button>
      </div>
    </div>
  );
}
