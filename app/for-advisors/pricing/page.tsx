import type { Metadata } from "next";
import { absoluteUrl, breadcrumbJsonLd } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import PricingClient from "./PricingClient";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Advisor Plans & Pricing — Invest.com.au",
  description:
    "Choose the right plan for your advisory practice. Get qualified leads, priority matching, and premium placement on Invest.com.au. Free to start, upgrade anytime.",
  alternates: { canonical: "/for-advisors/pricing" },
  openGraph: {
    title: "Advisor Plans & Pricing — Invest.com.au",
    description:
      "Free, Growth, Pro, and Elite plans for Australian financial advisors. Pay per lead, unlock priority placement, and grow your practice.",
    images: [
      {
        url: "/api/og?title=Advisor+Plans+%26+Pricing&subtitle=Free+to+start%2C+upgrade+anytime&type=default",
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: { card: "summary_large_image" as const },
};

const breadcrumbLd = breadcrumbJsonLd([
  { name: "Home", url: absoluteUrl("/") },
  { name: "For Advisors", url: absoluteUrl("/for-advisors") },
  { name: "Plans & Pricing", url: absoluteUrl("/for-advisors/pricing") },
]);

const webPageLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "Advisor Plans & Pricing",
  description:
    "Comparison of Free, Growth, Pro, and Elite advisor tiers on Invest.com.au — including monthly fees, lead discounts, and feature inclusions.",
  url: absoluteUrl("/for-advisors/pricing"),
};

const faqLd = faqJsonLd([
  {
    q: "How does pay-per-lead pricing work?",
    a: "You are only charged when you receive a qualified lead — someone who has completed our matching quiz and expressed intent to speak with an advisor. Higher tiers receive a discount on every lead: Growth saves 10%, Pro saves 20%, and Elite saves 30%.",
  },
  {
    q: "Can I change tiers later?",
    a: "Yes. You can upgrade or downgrade your tier at any time from your advisor dashboard. Upgrades take effect immediately (prorated via Stripe); downgrades take effect at the end of your current billing cycle.",
  },
  {
    q: "What counts as a lead?",
    a: "A lead is a verified investor enquiry matched to your profile — including contact form submissions, booking requests, and phone call clicks from your profile page. Each lead is exclusive to you.",
  },
  {
    q: "Is there a lock-in contract?",
    a: "No. Monthly plans can be cancelled anytime. The Free tier is always available at no cost with no commitment required.",
  },
  {
    q: "Do I need an AFSL to join?",
    a: "Yes — you must be a registered financial adviser, accountant, or authorised representative under an AFSL. We verify all applicants before publishing profiles.",
  },
]);

export default function AdvisorPricingPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />
      <PricingClient />
    </>
  );
}
