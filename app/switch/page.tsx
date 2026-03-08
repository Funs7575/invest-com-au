import { createClient } from "@/lib/supabase/server";
import type { Broker, BrokerTransferGuide } from "@/lib/types";
import SwitchClient from "./SwitchClient";
import { absoluteUrl, breadcrumbJsonLd, SITE_NAME } from "@/lib/seo";

export const revalidate = 3600;

export const metadata = {
  title: "Platform Switch Planner — Personalised Migration Checklist",
  description:
    "Generate a personalised switching checklist between Australian platforms. See savings, CHESS transfer steps, CGT implications, and a 'nothing missed' migration plan.",
  openGraph: {
    title: `Platform Switch Planner — ${SITE_NAME}`,
    description:
      "Personalised platform migration checklist with CHESS transfer steps, CGT guidance, and savings calculator.",
    images: [
      {
        url: "/api/og?title=Platform+Switch+Planner&subtitle=Personalised+Migration+Checklist&type=default",
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: { card: "summary_large_image" as const },
  alternates: { canonical: "/switch" },
};

export default async function SwitchPage() {
  const supabase = await createClient();

  const [brokersRes, guidesRes] = await Promise.all([
    supabase
      .from("brokers")
      .select("id, name, slug, color, icon, logo_url, rating, asx_fee, asx_fee_value, cta_text, affiliate_url, sponsorship_tier, benefit_cta, status")
      .eq("status", "active")
      .order("name"),
    supabase.from("broker_transfer_guides").select("*"),
  ]);

  const breadcrumbLd = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Switch Platforms" },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <SwitchClient
        brokers={(brokersRes.data as Broker[]) || []}
        transferGuides={(guidesRes.data as BrokerTransferGuide[]) || []}
      />
    </>
  );
}
