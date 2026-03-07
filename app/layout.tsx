import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import LayoutShell from "@/components/LayoutShell";
import { ThemeProvider } from "@/components/ThemeProvider";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import { SpeedInsights } from "@vercel/speed-insights/next";
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
        alt: `${SITE_NAME} — Compare Australian Brokers`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — Compare Platforms & Find Advisors`,
    description: SITE_DESCRIPTION,
  },
  alternates: {
    canonical: "/",
  },
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
        {/* Prevent flash of wrong theme by applying dark class before first paint */}
        <script dangerouslySetInnerHTML={{ __html: "(function(){try{var t=localStorage.getItem('theme');if(t==='dark'||(t!=='light'&&matchMedia('(prefers-color-scheme:dark)').matches))document.documentElement.classList.add('dark')}catch(e){}})()" }} />
        {/* WebSite structured data for Google Sitelinks Search Box */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd()) }}
        />
      </head>
      <body className={inter.className}>
        <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:bg-slate-900 focus:text-white focus:rounded-lg focus:text-sm focus:font-semibold">
          Skip to content
        </a>
        <noscript>
          <div style={{ padding: "1rem", textAlign: "center", background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
            <p style={{ fontSize: "0.875rem", color: "#334155" }}>
              This site works best with JavaScript enabled.
              Please enable JavaScript in your browser for the full experience.
            </p>
          </div>
        </noscript>
        <GoogleAnalytics />
        <ThemeProvider>
          <LayoutShell>{children}</LayoutShell>
        </ThemeProvider>
        <SpeedInsights />
      </body>
    </html>
  );
}
