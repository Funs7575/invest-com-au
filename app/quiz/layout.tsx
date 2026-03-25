import type { Metadata } from "next";
import { SITE_NAME, absoluteUrl } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Investing Quiz — Find Your Best Platform or Advisor in 60 Seconds",
  description:
    "Answer up to 6 quick questions and get personalised recommendations — the right investing platform, the right advisor, or both. Free and independent.",
  openGraph: {
    title: "Investing Quiz — Find Your Best Platform or Advisor in 60 Seconds",
    description:
      "Answer up to 6 quick questions for a personalised match — platforms, advisors, super, property, crypto and more. Free and independent.",
    images: [
      {
        url: "/api/og?title=Find+Your+Best+Match&subtitle=Platform+or+advisor+in+60+seconds&type=default",
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Investing Quiz — Find Your Best Platform or Advisor in 60 Seconds",
    description:
      "Answer up to 6 quick questions for a personalised match — platforms, advisors, super, property, crypto and more.",
  },
  alternates: {
    canonical: "/quiz",
  },
};

const howToJsonLd = {
  "@context": "https://schema.org",
  "@type": "HowTo",
  name: "How to Find the Best Investing Platform or Advisor for You",
  description:
    "Answer up to 6 quick questions about your investing goals and situation to get a personalised platform or advisor recommendation in under 60 seconds.",
  totalTime: "PT1M",
  tool: {
    "@type": "HowToTool",
    name: `${SITE_NAME} Investing Quiz`,
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
      {children}
    </>
  );
}
