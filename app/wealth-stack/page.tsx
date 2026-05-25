import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { absoluteUrl, breadcrumbJsonLd, SITE_NAME } from "@/lib/seo";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";
import { isFlagEnabled } from "@/lib/feature-flags";
import WealthStackClient from "./WealthStackClient";

// FIN_NOTEBOOK Revenue #1 (concierge wealth-stack) — the user-facing
// surface. Reads the user's prior quiz answers from sessionStorage if
// available, otherwise prompts the minimal question set inline. Calls
// /api/wealth-stack to get a goal-prioritised multi-product
// recommendation (broker + super + savings + crypto + robo), then
// renders an affiliate-clickable stack with per-component CTAs.
//
// Attribution: each component CTA carries `stackId` + `kind` query
// params so the lead/affiliate pipeline can attribute every click back
// to the same recommendation event. The downstream attribution wiring
// in the leads table is a separate PR.

export const revalidate = 0;

export const metadata: Metadata = {
  title: `Your Wealth Stack — ${SITE_NAME}`,
  description:
    "Get a personalised stack of investing products — broker, super fund, savings account, crypto exchange — matched to your goals in 60 seconds.",
  alternates: { canonical: "/wealth-stack" },
  openGraph: {
    title: `Your Wealth Stack — ${SITE_NAME}`,
    description:
      "Multi-product investing recommendation matched to your goals: broker, super, savings, crypto, robo.",
    url: absoluteUrl("/wealth-stack"),
    images: [
      {
        url: "/api/og?title=Your+Wealth+Stack&subtitle=Broker+%2B+Super+%2B+Savings+%2B+Crypto&type=quiz",
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: { card: "summary_large_image" },
};

export default async function WealthStackPage() {
  // Kill-switch: flip `wealth_stack` off in /admin/automation/flags to hide
  // this page without a deploy. Default-off until the flag row is created.
  const enabled = await isFlagEnabled("wealth_stack");
  if (!enabled) notFound();

  const breadcrumbs = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Your Wealth Stack" },
  ]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 md:py-14">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }}
      />

      {/* Prominent general advice warning — required above named multi-product picks */}
      <div
        role="note"
        aria-label="General advice warning"
        className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800 leading-relaxed"
      >
        <p className="font-semibold mb-0.5">General information only</p>
        <p>{GENERAL_ADVICE_WARNING}</p>
      </div>

      <WealthStackClient />
    </div>
  );
}
