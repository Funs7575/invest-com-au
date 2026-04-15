import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Suspense } from "react";
import "./globals.css";
import LayoutShell from "@/components/LayoutShell";
import { ThemeProvider } from "@/components/ThemeProvider";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import UtmCapture from "@/components/UtmCapture";
import InternationalBannerServer from "@/components/InternationalBannerServer";
import RouteChangeFocus from "@/components/RouteChangeFocus";
import ServiceWorkerRegistrar from "@/components/ServiceWorkerRegistrar";
import ChatWidget from "@/components/ChatWidget";
import PushNotificationOptIn from "@/components/PushNotificationOptIn";
import ClaimAnonymousOnAuth from "@/components/ClaimAnonymousOnAuth";
import NewsletterExitIntentModal from "@/components/NewsletterExitIntentModal";
import { isFlagEnabled, loadFlag } from "@/lib/feature-flags";

import { SpeedInsights } from "@vercel/speed-insights/next";
import WebVitals from "@/components/WebVitals";
import { SITE_URL, SITE_NAME, SITE_DESCRIPTION, websiteJsonLd } from "@/lib/seo";

const inter = localFont({
  src: [
    { path: "../public/fonts/Inter-Regular.woff2", weight: "400", style: "normal" },
    { path: "../public/fonts/Inter-Medium.woff2", weight: "500", style: "normal" },
    { path: "../public/fonts/Inter-SemiBold.woff2", weight: "600", style: "normal" },
    { path: "../public/fonts/Inter-Bold.woff2", weight: "700", style: "normal" },
    { path: "../public/fonts/Inter-ExtraBold.woff2", weight: "800", style: "normal" },
  ],
  display: "swap",
  fallback: ["system-ui", "-apple-system", "Arial", "sans-serif"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — Compare Platforms & Find Advisors`,
    template: `%s — ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  openGraph: {
    type: "website",
    locale: "en_AU",
    siteName: SITE_NAME,
    title: `${SITE_NAME} — Compare Platforms & Find Advisors`,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    images: [
      {
        url: "/api/og",
        width: 1200,
        height: 630,
        alt: `${SITE_NAME} — Compare Australian Investing Platforms`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — Compare Platforms & Find Advisors`,
    description: SITE_DESCRIPTION,
  },
  alternates: {},
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#ffffff",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Feature-flag gate for the chat widget — admins can ramp it
  // from 0% → 100% via /admin/automation/flags.
  const chatEnabled = await isFlagEnabled("chatbot_widget");
  const pushEnabled = await isFlagEnabled("push_notifications");
  // Exit-intent newsletter modal — default-on with a feature flag
  // escape hatch. If no `newsletter_exit_intent` row exists, the
  // modal ships live; admins can disable or segment via
  // /admin/automation/flags by inserting a row with enabled=false.
  const newsletterExitIntentFlag = await loadFlag("newsletter_exit_intent");
  const newsletterExitIntentEnabled = newsletterExitIntentFlag
    ? newsletterExitIntentFlag.enabled &&
      newsletterExitIntentFlag.rollout_pct > 0
    : true;
  return (
    <html lang="en-AU" suppressHydrationWarning>
      {/* Inline script adds .js-ready immediately so CSS animations only run when JS is available.
          Without this, hero-fade-up starts at opacity:0 and stays invisible until JS loads. */}
      <head>
        {/* Preconnect to external APIs for faster initial requests */}
        <link rel="preconnect" href="https://guggzyqceattncjwvgyc.supabase.co" />
        <link rel="dns-prefetch" href="https://guggzyqceattncjwvgyc.supabase.co" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="alternate" type="application/rss+xml" title="Invest.com.au Articles" href="/feed.xml" />
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js-ready')" }} />
        {/* Flash-of-wrong-theme guard — reads the stored preference
            (or system MQ) BEFORE React hydrates so the page loads
            in the correct palette without a flash. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{var t=localStorage.getItem('theme');if(!t||t==='system'){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}document.documentElement.classList.toggle('dark',t==='dark');}catch(e){}})()",
          }}
        />
        {/* WebSite structured data for Google Sitelinks Search Box */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd()) }}
        />
      </head>
      <body className={inter.className}>
        <noscript>
          <div style={{ padding: "1rem", textAlign: "center", background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
            <p style={{ fontSize: "0.875rem", color: "#334155" }}>
              This site works best with JavaScript enabled.
              Please enable JavaScript in your browser for the full experience.
            </p>
          </div>
        </noscript>
        <GoogleAnalytics />
        <Suspense fallback={null}><UtmCapture /></Suspense>
        <Suspense fallback={null}><RouteChangeFocus /></Suspense>
        <Suspense fallback={null}><ServiceWorkerRegistrar /></Suspense>
        <Suspense fallback={null}><ClaimAnonymousOnAuth /></Suspense>

        <ThemeProvider>
          <InternationalBannerServer />
          <LayoutShell>{children}</LayoutShell>
          {chatEnabled && <ChatWidget />}
          {pushEnabled && <Suspense fallback={null}><PushNotificationOptIn /></Suspense>}
          {newsletterExitIntentEnabled && (
            <Suspense fallback={null}>
              <NewsletterExitIntentModal />
            </Suspense>
          )}
        </ThemeProvider>
        <Suspense fallback={null}><WebVitals /></Suspense>
        <SpeedInsights />
      </body>
    </html>
  );
}
