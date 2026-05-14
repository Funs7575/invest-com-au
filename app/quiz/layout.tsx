import type { Metadata } from "next";
import Link from "next/link";
import { SITE_NAME, absoluteUrl } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Get Matched — Filter Australian Platforms & Advisors in 60 Seconds",
  description:
    "Answer up to 6 quick questions to get matched with Australian investment platforms and professional directories that fit your criteria. Free and independent.",
  openGraph: {
    title: "Get Matched — Filter Australian Platforms & Advisors in 60 Seconds",
    description:
      "Answer up to 6 quick questions to get matched with platforms and advisers — shares, super, property, crypto and more. Free and independent.",
    images: [
      {
        url: "/api/og?title=Get+Matched&subtitle=Find+a+platform+or+adviser+in+60+seconds&type=default",
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Get Matched — Filter Australian Platforms & Advisors in 60 Seconds",
    description:
      "Answer up to 6 quick questions to get matched with platforms and advisers — shares, super, property, crypto and more.",
  },
  alternates: {
    canonical: "/quiz",
  },
};

const howToJsonLd = {
  "@context": "https://schema.org",
  "@type": "HowTo",
  name: "How to Get Matched with Investing Platforms and Advisors",
  description:
    "Answer up to 6 quick questions about your investing goals and situation to get matched with platforms and directories that fit your preferences in under 60 seconds.",
  totalTime: "PT1M",
  tool: {
    "@type": "HowToTool",
    name: `${SITE_NAME} Get Matched`,
  },
  step: [
    {
      "@type": "HowToStep",
      name: "Select your investing goal",
      text: "Choose from long-term growth, crypto, active trading, hands-off automated investing, retirement/super, property investing, buying a home, or getting expert help.",
      url: absoluteUrl("/quiz"),
    },
    {
      "@type": "HowToStep",
      name: "Choose your approach",
      text: "Tell us if you want to manage investments yourself, get expert help, or you're not sure yet.",
      url: absoluteUrl("/quiz"),
    },
    {
      "@type": "HowToStep",
      name: "Share your experience or situation",
      text: "For DIY investors: beginner, some experience, or advanced. For advisor seekers: simple, moderate, or complex situation.",
      url: absoluteUrl("/quiz"),
    },
    {
      "@type": "HowToStep",
      name: "Choose your investment amount",
      text: "Select how much you're looking to invest — from under $10,000 to over $500,000.",
      url: absoluteUrl("/quiz"),
    },
    {
      "@type": "HowToStep",
      name: "Pick what matters most",
      text: "For platforms: lowest fees, safety (CHESS), best tools, or simplicity. For advisors: your preferred expert type.",
      url: absoluteUrl("/quiz"),
    },
    {
      "@type": "HowToStep",
      name: "Property sub-question (if applicable)",
      text: "If you selected property investing, tell us whether you want to buy physical property, invest in REITs, or use super for property.",
      url: absoluteUrl("/quiz"),
    },
  ],
};

export default function QuizLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToJsonLd) }}
      />
      <div className="bg-amber-50 border-b border-amber-200">
        <div className="max-w-5xl mx-auto px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
          <p className="text-xs text-amber-900 leading-snug flex-1">
            <strong>Get Matched has been upgraded.</strong> The new flow builds you a full Investment Action Plan — not just a broker shortlist.
          </p>
          <Link
            href="/get-matched"
            className="inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-4 py-2 rounded-lg whitespace-nowrap"
          >
            Try the new Get Matched →
          </Link>
        </div>
      </div>
      {children}
    </>
  );
}
