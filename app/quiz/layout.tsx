import type { Metadata } from "next";
import { SITE_NAME, absoluteUrl } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Broker Quiz — Filter Brokers in 60 Seconds",
  description:
    "Answer 5 quick questions and narrow down Australian brokers based on your priorities. Free, independent, and takes under 60 seconds.",
  openGraph: {
    title: "Broker Quiz — Filter Brokers in 60 Seconds",
    description:
      "Answer 5 quick questions and narrow down Australian brokers based on your priorities.",
    images: [
      {
        url: "/api/og?title=Find+Your+Best+Broker&subtitle=Take+the+60-second+quiz&type=default",
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Broker Quiz — Filter Brokers in 60 Seconds",
    description:
      "Answer 5 quick questions and narrow down Australian brokers based on your priorities.",
  },
  alternates: {
    canonical: "/quiz",
  },
};

const howToJsonLd = {
  "@context": "https://schema.org",
  "@type": "HowTo",
  name: "How to Find the Best Broker for You",
  description:
    "Answer 4 quick questions about your investing goals and preferences to get a personalised broker recommendation in under 60 seconds.",
  totalTime: "PT1M",
  tool: {
    "@type": "HowToTool",
    name: `${SITE_NAME} Broker Quiz`,
  },
  step: [
    {
      "@type": "HowToStep",
      name: "Select your investing goal",
      text: "Choose whether you want to buy crypto, actively trade, earn dividend income, or grow long-term wealth.",
      url: absoluteUrl("/quiz"),
    },
    {
      "@type": "HowToStep",
      name: "Share your experience level",
      text: "Tell us if you're a complete beginner, have some experience, or are an advanced investor.",
      url: absoluteUrl("/quiz"),
    },
    {
      "@type": "HowToStep",
      name: "Choose your investment amount",
      text: "Select how much you're looking to invest — from under $5,000 to over $100,000.",
      url: absoluteUrl("/quiz"),
    },
    {
      "@type": "HowToStep",
      name: "Pick what matters most",
      text: "Choose your top priority: lowest fees, safety (CHESS sponsorship), best tools, or simplicity.",
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
