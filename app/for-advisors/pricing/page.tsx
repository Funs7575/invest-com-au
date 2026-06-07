import type { Metadata } from "next";
import PricingClient from "./PricingClient";
import { faqJsonLd } from "@/lib/schema-markup";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Advisor Plans & Pricing",
  description:
    "Choose the right plan for your advisory practice. Get qualified leads, priority matching, and premium placement on Invest.com.au.",
  alternates: { canonical: "/for-advisors/pricing" },
};

const PRICING_FAQS = [
  { q: "How does pay-per-lead pricing work?", a: "You are only charged when you receive a qualified lead — someone who has completed our matching quiz and expressed intent to speak with an advisor. Higher tiers receive a discount on every lead: Growth saves 10%, Pro saves 20%, and Elite saves 30%." },
  { q: "Can I change tiers later?", a: "Yes. You can upgrade or downgrade your tier at any time from your advisor dashboard. Upgrades take effect immediately (prorated via Stripe); downgrades take effect at the end of your current billing cycle." },
  { q: "What counts as a lead?", a: "A lead is a verified investor enquiry matched to your profile — including contact form submissions, booking requests, and phone call clicks from your profile page. Each lead is exclusive to you." },
  { q: "Is there a lock-in contract?", a: "No. Monthly plans can be cancelled anytime. The Free tier is always available at no cost with no commitment required." },
  { q: "Do I need an AFSL to join?", a: "Yes — you must be a registered financial adviser, accountant, or authorised representative under an AFSL. We verify all applicants before publishing profiles." },
];

export default function PricingPage() {
  const faqSchema = faqJsonLd(PRICING_FAQS);
  return (
    <>
      {faqSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
      )}
      <PricingClient />
    </>
  );
}
