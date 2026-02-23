import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import LayoutShell from "@/components/LayoutShell";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { SITE_URL, SITE_NAME, SITE_DESCRIPTION } from "@/lib/seo";

const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"] });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — Australia's Independent Broker Comparison`,
    template: `%s — ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  openGraph: {
    type: "website",
    locale: "en_AU",
    siteName: SITE_NAME,
    title: `${SITE_NAME} — Australia's Independent Broker Comparison`,
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
    title: `${SITE_NAME} — Australia's Independent Broker Comparison`,
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
    <html lang="en-AU">
      {/* Inline script adds .js-ready immediately so CSS animations only run when JS is available.
          Without this, hero-fade-up starts at opacity:0 and stays invisible until JS loads. */}
      <head>
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js-ready')" }} />
      </head>
      <body className={inter.className}>
        <GoogleAnalytics />
        <LayoutShell>{children}</LayoutShell>
        <SpeedInsights />
      </body>
    </html>
  );
}
