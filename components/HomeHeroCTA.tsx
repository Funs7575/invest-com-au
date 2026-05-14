"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { getVariant, type ABTestConfig, type ABVariant } from "@/lib/ab-test";
import { DesignIcon } from "@/components/design/DesignIcon";

const DEFAULT_TEXT = "Get matched in 60 seconds";

export default function HomeHeroCTA() {
  const [activeTest, setActiveTest] = useState<ABTestConfig | null>(null);
  const [variant, setVariant] = useState<ABVariant | null>(null);
  const impressionFired = useRef(false);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("site_ab_tests")
      .select("id, name, test_type, variant_a, variant_b, traffic_split, status")
      .eq("status", "running")
      .eq("page", "/")
      .limit(1)
      .then(({ data }: { data: ABTestConfig[] | null }) => {
        const test = data?.[0];
        if (!test) return;
        const v = getVariant(test.id, test.traffic_split);
        setActiveTest(test);
        setVariant(v);
        if (!impressionFired.current) {
          impressionFired.current = true;
          fetch("/api/ab-track", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              test_id: test.id,
              variant: v,
              event_type: "impression",
            }),
          }).catch(() => {});
        }
      });
  }, []);

  const ctaText =
    activeTest && variant
      ? ((variant === "a" ? activeTest.variant_a : activeTest.variant_b).text ?? DEFAULT_TEXT)
      : DEFAULT_TEXT;

  function handleClick() {
    if (!activeTest || !variant) return;
    fetch("/api/ab-track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        test_id: activeTest.id,
        variant,
        event_type: "click",
      }),
      keepalive: true,
    }).catch(() => {});
  }

  return (
    <Link
      href="/quiz"
      className="hero-cta-pokie"
      style={{
        fontSize: 16,
        fontWeight: 700,
        padding: "14px 24px",
        borderRadius: 12,
        background: "linear-gradient(180deg, var(--color-coral-400), var(--color-coral-500))",
        color: "white",
        textDecoration: "none",
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        whiteSpace: "nowrap",
      }}
      onClick={handleClick}
    >
      {ctaText} <DesignIcon name="arrow-right" size={16} strokeWidth={2.6} />
    </Link>
  );
}
