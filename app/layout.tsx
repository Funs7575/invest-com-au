import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { JetBrains_Mono } from "next/font/google";
import { Suspense } from "react";
import { headers } from "next/headers";
import { stripLocalePrefix, BCP47_TAG, LOCALE_DIR } from "@/lib/i18n/locales";
import "./globals.css";
import LayoutShell from "@/components/LayoutShell";
import CountryModeBanner from "@/components/country-mode/CountryModeBanner";
import { ThemeProvider } from "@/components/ThemeProvider";
import PlausibleAnalytics from "@/components/PlausibleAnalytics";
import { PostHogProvider } from "@/components/PostHogProvider";
// 5 side-effect-only components (UtmCapture, RouteChangeFocus,
// ServiceWorkerRegistrar, ClaimAnonymousOnAuth, WebVitals) all return
// null and only run useEffect. Bundled together via a client wrapper
// so each loads in its own client chunk after hydration instead of
// blocking the critical-path layout bundle. See LayoutSideEffects.tsx.
import LayoutSideEffects from "@/components/LayoutSideEffects";
import ChatWidget from "@/components/ChatWidget";
import ReportProblemButton from "@/components/ReportProblemButton";
import PushNotificationOptIn from "@/components/PushNotificationOptIn";
import NewsletterExitIntentModal from "@/components/NewsletterExitIntentModal";
import ExitIntentBrokerMatch from "@/components/ExitIntentBrokerMatch";
import ExitIntentCapture from "@/components/ExitIntentCapture";
import { isFlagEnabled, loadFlag } from "@/lib/feature-flags";
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
  variable: "--font-inter",
  fallback: ["system-ui", "-apple-system", "Arial", "sans-serif"],
});

// Dropped weight 800 — audit flagged it as unused on a monospace font
// (we have it in 122 callers but none style it at weight 800). Saves
// ~15 kB across two third-party font requests.
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-jetbrains-mono",
  weight: ["400", "700"],
});

// Source_Serif_4 removed — was loaded on every page but only 1 caller
// (components/HomeFridayBriefing.tsx). Falls back to system serif stack
// defined in globals.css, which is indistinguishable in the one place
// the class is applied. Saves a third-party request + ~30 kB transfer.

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
  // Four layout-level flag reads. Previously serial — 4 sequential
  // Supabase round-trips on every page render. Now parallelised so a
  // cold L1 cache only adds 1 cross-Atlantic hop, not 4. The L2 cache
  // wrapper from PR #940 (unstable_cache) keeps subsequent reads off
  // Supabase entirely for the revalidate window.
  //   - chatbot_widget / report_button / push_notifications: admin-
  //     rampable feature flags (0% → 100% via /admin/automation/flags).
  //   - newsletter_exit_intent: default-on; missing row = enabled,
  //     existing row honours enabled+rollout_pct.
  const [chatEnabled, reportButtonEnabled, pushEnabled, newsletterExitIntentFlag, exitIntentBrokerMatchEnabled, exitIntentCaptureEnabled] =
    await Promise.all([
      isFlagEnabled("chatbot_widget"),
      isFlagEnabled("report_button"),
      isFlagEnabled("push_notifications"),
      loadFlag("newsletter_exit_intent"),
      // default-on: show broker-match popup unless flag explicitly disables it
      loadFlag("exit_intent_broker_match"),
      // default-off: enable only when ready to replace NewsletterExitIntentModal
      isFlagEnabled("exit_intent_capture"),
    ]);
  const newsletterExitIntentEnabled = newsletterExitIntentFlag
    ? newsletterExitIntentFlag.enabled &&
      newsletterExitIntentFlag.rollout_pct > 0
    : true;
  const brokerMatchExitIntentEnabled = exitIntentBrokerMatchEnabled
    ? exitIntentBrokerMatchEnabled.enabled && exitIntentBrokerMatchEnabled.rollout_pct > 0
    : true;

  // Country Mode / Language Mode: derive the active locale from the
  // URL prefix and set <html lang> + <html dir> accordingly. proxy.ts
  // stamps x-pathname so we can read it here (Next.js root layouts
  // don't get pathname via params).
  const headerStore = await headers();
  const pathname = headerStore.get("x-pathname") ?? "/";
  const { locale } = stripLocalePrefix(pathname);
  const htmlLang = BCP47_TAG[locale];
  const htmlDir = LOCALE_DIR[locale];

  return (
    <html lang={htmlLang} dir={htmlDir} suppressHydrationWarning className={`${inter.variable} ${jetbrainsMono.variable}`}>
      {/* Inline script adds .js-ready immediately so CSS animations only run when JS is available.
          Without this, hero-fade-up starts at opacity:0 and stays invisible until JS loads. */}
      <head>
        {/* Preconnect to external APIs for faster initial requests.
            ui-avatars + randomuser back avatar fallbacks across
            advisor listings (/find-advisor, /advisors) where the
            avatar is the LCP candidate — preconnect saves ~100-300 ms
            of connection setup on cold visits. */}
        <link rel="preconnect" href="https://guggzyqceattncjwvgyc.supabase.co" />
        <link rel="dns-prefetch" href="https://guggzyqceattncjwvgyc.supabase.co" />
        <link rel="preconnect" href="https://ui-avatars.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://ui-avatars.com" />
        <link rel="preconnect" href="https://randomuser.me" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://randomuser.me" />
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
        <PlausibleAnalytics />
        <PostHogProvider>
        <LayoutSideEffects />

        <ThemeProvider>
          <LayoutShell countryModeBanner={<CountryModeBanner />}>{children}</LayoutShell>
          {chatEnabled && <ChatWidget />}
          {reportButtonEnabled && <ReportProblemButton />}
          {pushEnabled && <Suspense fallback={null}><PushNotificationOptIn /></Suspense>}
          {newsletterExitIntentEnabled && !exitIntentCaptureEnabled && (
            <Suspense fallback={null}>
              <NewsletterExitIntentModal />
            </Suspense>
          )}
          {exitIntentCaptureEnabled && (
            <Suspense fallback={null}>
              <ExitIntentCapture />
            </Suspense>
          )}
          {brokerMatchExitIntentEnabled && (
            <Suspense fallback={null}>
              <ExitIntentBrokerMatch />
            </Suspense>
          )}
        </ThemeProvider>
        </PostHogProvider>
      </body>
    </html>
  );
}
