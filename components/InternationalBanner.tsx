"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";

const DISMISS_KEY = "intl-banner-dismissed-v1";

// AU doesn't see the banner
const DOMESTIC_COUNTRIES = new Set(["AU"]);

const COUNTRY_SLUG_MAP: Record<string, string> = {
  SG: "singapore",
  HK: "hong-kong",
  CN: "china",
  AE: "united-arab-emirates",
  GB: "united-kingdom",
  US: "united-states",
  JP: "japan",
  IN: "india",
  MY: "malaysia",
  NZ: "new-zealand",
  KR: "south-korea",
  SA: "saudi-arabia",
};

const COUNTRY_NAMES: Record<string, string> = {
  SG: "Singapore",
  HK: "Hong Kong",
  CN: "China",
  AE: "the UAE",
  GB: "the UK",
  US: "the USA",
  JP: "Japan",
  IN: "India",
  MY: "Malaysia",
  NZ: "New Zealand",
  KR: "South Korea",
  SA: "Saudi Arabia",
};

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

  const slug = COUNTRY_SLUG_MAP[countryCode];
  const name = COUNTRY_NAMES[countryCode];
  const href = slug ? `/foreign-investment/${slug}` : "/foreign-investment";
  const message = name
    ? `Investing in Australia from ${name}?`
    : "Investing in Australia from overseas?";
  const linkText = name
    ? `See our guide for ${name} investors →`
    : "See our international investor guide →";

  return (
    <div className="bg-amber-50 border-b border-amber-200">
      <div className="container-custom max-w-7xl flex items-center justify-between gap-3 py-2 px-4">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm leading-none shrink-0">🌏</span>
          <p className="text-xs font-medium text-amber-900 truncate">
            <span className="hidden md:inline">{message} </span>
            <Link
              href={href}
              className="font-bold text-amber-700 underline underline-offset-2 hover:text-amber-900"
            >
              {linkText}
            </Link>
            {!name && (
              <span className="hidden md:inline text-amber-700/70"> — FIRB rules, broker eligibility, double tax agreements &amp; specialist advisors.</span>
            )}
          </p>
        </div>
        <button
          onClick={handleDismiss}
          aria-label="Dismiss"
          className="shrink-0 text-amber-600/70 hover:text-amber-800 transition-colors"
        >
          <Icon name="x" size={14} />
        </button>
      </div>
    </div>
  );
}
