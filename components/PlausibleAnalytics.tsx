import Script from "next/script";

const PLAUSIBLE_DOMAIN = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;

/**
 * Plausible Analytics — cookieless, GDPR-compliant pageview tracking.
 *
 * Unlike GA4, Plausible collects no personal data and requires no cookie
 * consent banner. It can load unconditionally for all visitors. The
 * data-domain attribute tells Plausible which site to attribute traffic to.
 *
 * No consent gate needed (see TT-03 migration notes in REMEDIATION_QUEUE.md).
 * GA4 removal (GoogleAnalytics.tsx + NEXT_PUBLIC_GA_ID) is deferred to TT-03 iter 2.
 */
export default function PlausibleAnalytics() {
  if (!PLAUSIBLE_DOMAIN) return null;

  return (
    <Script
      defer
      data-domain={PLAUSIBLE_DOMAIN}
      src="https://plausible.io/js/script.js"
      strategy="afterInteractive"
    />
  );
}
