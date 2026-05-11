"use client";

import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, Suspense, useState } from "react";
import { hasAnalyticsConsent } from "@/lib/consent";

const GA_ID = process.env.NEXT_PUBLIC_GA_ID || "";

function AnalyticsTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [consent, setConsent] = useState(false);

  // Listen for consent changes (banner interaction + cross-tab)
  useEffect(() => {
    setConsent(hasAnalyticsConsent());
    const handleStorage = () => setConsent(hasAnalyticsConsent());
    window.addEventListener("storage", handleStorage);
    // Poll for same-tab updates (localStorage events don't fire in the same tab)
    const interval = setInterval(() => setConsent(hasAnalyticsConsent()), 1000);
    return () => { window.removeEventListener("storage", handleStorage); clearInterval(interval); };
  }, []);

  // Update GA consent mode when consent state changes
  useEffect(() => {
    if (!GA_ID || typeof window === "undefined" || !window.gtag) return;
    window.gtag("consent", "update", {
      analytics_storage: consent ? "granted" : "denied",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
    });
  }, [consent]);

  // Track page views only when consent is granted
  useEffect(() => {
    if (!GA_ID || typeof window === "undefined" || !consent) return;
    const url = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : "");
    window.gtag?.("config", GA_ID, { page_path: url });
  }, [pathname, searchParams, consent]);

  return null;
}

export default function GoogleAnalytics() {
  if (!GA_ID) return null;

  return (
    <>
      {/* Set default consent to denied before the GA tag fires.
          afterInteractive is sufficient here because the GA script also
          uses afterInteractive — Next.js preserves DOM order so the
          consent default executes first. beforeInteractive was unnecessary
          and blocked page rendering (PP-04). */}
      <Script id="ga-consent-default" strategy="afterInteractive">
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
