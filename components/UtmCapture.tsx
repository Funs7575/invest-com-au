"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

/**
 * Captures UTM parameters from the URL and stores them in sessionStorage.
 * Forms that submit to API routes can include these values.
 * Rendered once in the root layout.
 */
export default function UtmCapture() {
  const searchParams = useSearchParams();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const source = searchParams.get("utm_source");
    const medium = searchParams.get("utm_medium");
    const campaign = searchParams.get("utm_campaign");

    // Only store if at least one UTM param is present (don't overwrite existing)
    if (source || medium || campaign) {
      if (source) sessionStorage.setItem("utm_source", source);
      if (medium) sessionStorage.setItem("utm_medium", medium);
      if (campaign) sessionStorage.setItem("utm_campaign", campaign);
      sessionStorage.setItem("referral_url", document.referrer || "");
    }
  }, [searchParams]);

  return null;
}

/** Get stored UTM params for form submissions */
export function getStoredUtm(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const result: Record<string, string> = {};
  const source = sessionStorage.getItem("utm_source");
  const medium = sessionStorage.getItem("utm_medium");
  const campaign = sessionStorage.getItem("utm_campaign");
  const referral = sessionStorage.getItem("referral_url");
  if (source) result.utm_source = source;
  if (medium) result.utm_medium = medium;
  if (campaign) result.utm_campaign = campaign;
  if (referral) result.referral_url = referral;
  return result;
}
