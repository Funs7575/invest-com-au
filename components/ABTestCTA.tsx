"use client";

import { useEffect, useState, useRef } from "react";
import { getVariant, type ABTestConfig, type ABVariant } from "@/lib/ab-test";
import { trackClick, trackEvent, getBenefitCta, AFFILIATE_REL } from "@/lib/tracking";

interface BrokerInfo {
  name: string;
  slug: string;
  affiliate_url?: string | null;
  asx_fee_value?: number | null;
  asx_fee?: string | null;
  deal?: boolean | null;
  deal_text?: string | null;
  cta_text?: string | null;
  benefit_cta?: string | null;
}

interface Props {
  broker: BrokerInfo;
  activeTests: ABTestConfig[];
  page: string;
  cpcCampaignLink?: string;
}

export default function ABTestCTA({ broker, activeTests, page, cpcCampaignLink }: Props) {
  const [variants, setVariants] = useState<Record<number, ABVariant>>({});
  const impressionsFired = useRef<Set<number>>(new Set());

  // Determine which test applies to this page (first match)
  const matchingTest = activeTests.find(
    (t) => t.status === "running"
  );

  useEffect(() => {
    if (!matchingTest) return;

    const variant = getVariant(matchingTest.id, matchingTest.traffic_split);
    setVariants((prev) => ({ ...prev, [matchingTest.id]: variant }));

    // Fire impression tracking (once per test per mount)
    if (!impressionsFired.current.has(matchingTest.id)) {
      impressionsFired.current.add(matchingTest.id);
      fetch("/api/ab-track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          test_id: matchingTest.id,
          variant,
          event_type: "impression",
          broker_slug: broker.slug,
        }),
      }).catch(() => {});
    }
  }, [matchingTest, broker.slug]);

  // Build the CTA link
  const ctaHref = cpcCampaignLink || `/go/${broker.slug}?placement=compare_cta`;

  // If no active test, render standard CTA
  if (!matchingTest || !variants[matchingTest.id]) {
    return (
      <a
        href={ctaHref}
        target="_blank"
        rel={AFFILIATE_REL}
        onClick={() => {
          trackClick(broker.slug, broker.name, "compare-table", page, "compare");
          trackEvent("affiliate_click", { broker_slug: broker.slug, source: "compare-table" }, page);
        }}
        className="inline-block px-4 py-2 bg-amber-600 text-white text-sm font-semibold rounded-lg hover:bg-amber-700 transition-all duration-200 group-hover:scale-105 group-hover:shadow-lg"
      >
        {getBenefitCta(broker as Parameters<typeof getBenefitCta>[0], "compare")}
      </a>
    );
  }

  // Active test: render variant
  const variant = variants[matchingTest.id];
  const variantConfig = variant === "a" ? matchingTest.variant_a : matchingTest.variant_b;
  const ctaText = variantConfig.text || getBenefitCta(broker as Parameters<typeof getBenefitCta>[0], "compare");
  const ctaColor = variantConfig.color || "amber-600";

  // Map color string to Tailwind classes
  const colorClasses: Record<string, string> = {
    "amber-600": "bg-amber-600 hover:bg-amber-700",
    "amber-700": "bg-amber-700 hover:bg-amber-800",
    "blue-600": "bg-blue-600 hover:bg-blue-700",
    "blue-700": "bg-blue-700 hover:bg-blue-800",
    "emerald-600": "bg-emerald-600 hover:bg-emerald-700",
    "green-600": "bg-green-600 hover:bg-green-700",
    "red-600": "bg-red-600 hover:bg-red-700",
    "violet-600": "bg-violet-600 hover:bg-violet-700",
    "slate-900": "bg-slate-900 hover:bg-slate-800",
    "orange-600": "bg-orange-600 hover:bg-orange-700",
  };
  const bgClass = colorClasses[ctaColor] || "bg-amber-600 hover:bg-amber-700";

  return (
    <a
      href={ctaHref}
      target="_blank"
      rel={AFFILIATE_REL}
      onClick={() => {
        // Track A/B test click
        fetch("/api/ab-track", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            test_id: matchingTest.id,
            variant,
            event_type: "click",
            broker_slug: broker.slug,
          }),
        }).catch(() => {});
        // Standard tracking
        trackClick(broker.slug, broker.name, "compare-table", page, "compare");
        trackEvent("affiliate_click", { broker_slug: broker.slug, source: "compare-table", ab_test: matchingTest.name, ab_variant: variant }, page);
      }}
      className={`inline-block px-4 py-2 ${bgClass} text-white text-sm font-semibold rounded-lg transition-all duration-200 group-hover:scale-105 group-hover:shadow-lg`}
    >
      {ctaText}
    </a>
  );
}
