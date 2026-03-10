"use client";

import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, Suspense, useState } from "react";

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

/**
 * Check cookie consent from localStorage.
 * Returns "accepted", "declined", or null (not yet responded).
 */
function getCookieConsent(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("cookie-consent");
}

function AnalyticsTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [consent, setConsent] = useState<string | null>(null);

  // Listen for consent changes (banner interaction)
  useEffect(() => {
    setConsent(getCookieConsent());
    const handleStorage = () => setConsent(getCookieConsent());
    window.addEventListener("storage", handleStorage);
    // Also poll since localStorage events don't fire in the same tab
    const interval = setInterval(() => {
      const current = getCookieConsent();
      setConsent(prev => prev !== current ? current : prev);
    }, 1000);
    return () => { window.removeEventListener("storage", handleStorage); clearInterval(interval); };
  }, []);

  // Update consent mode when consent changes
  useEffect(() => {
    if (!GA_ID || typeof window === "undefined" || !window.gtag) return;
    if (consent === "accepted") {
      window.gtag("consent", "update", {
        analytics_storage: "granted",
        ad_storage: "denied",
        ad_user_data: "denied",
        ad_personalization: "denied",
      });
    } else if (consent === "declined") {
      window.gtag("consent", "update", {
        analytics_storage: "denied",
        ad_storage: "denied",
        ad_user_data: "denied",
        ad_personalization: "denied",
      });
    }
  }, [consent]);

  // Track page views only when consent is granted
  useEffect(() => {
    if (!GA_ID || typeof window === "undefined" || consent !== "accepted") return;
    const url = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : "");
    window.gtag?.("config", GA_ID, { page_path: url });
  }, [pathname, searchParams, consent]);

  return null;
}

export default function GoogleAnalytics() {
  if (!GA_ID) return null;

  return (
    <>
      {/* Set default consent to denied BEFORE gtag loads */}
      <Script id="ga-consent-default" strategy="beforeInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('consent', 'default', {
            'analytics_storage': 'denied',
            'ad_storage': 'denied',
            'ad_user_data': 'denied',
            'ad_personalization': 'denied',
            'wait_for_update': 500
          });
        `}
      </Script>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />
      <Script id="ga-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_ID}', {
            page_path: window.location.pathname,
            cookie_flags: 'SameSite=None;Secure',
          });
          // If user already accepted, grant immediately
          if (localStorage.getItem('cookie-consent') === 'accepted') {
            gtag('consent', 'update', { 'analytics_storage': 'granted' });
          }
        `}
      </Script>
      <Suspense fallback={null}>
        <AnalyticsTracker />
      </Suspense>
    </>
  );
}
