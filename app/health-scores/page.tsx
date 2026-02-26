import { createClient } from "@/lib/supabase/server";
import type { Broker, BrokerHealthScore } from "@/lib/types";
import HealthScoresClient from "./HealthScoresClient";
import { absoluteUrl, breadcrumbJsonLd, SITE_NAME } from "@/lib/seo";

export const revalidate = 3600;

export const metadata = {
  title: "Broker Health & Risk Scores — Safety Ratings for Australian Brokers",
  description:
    "Proprietary safety scores for every Australian broker. Regulatory compliance, client money handling, financial stability, platform reliability, and insurance — all in one dashboard.",
  openGraph: {
    title: `Broker Health & Risk Scores — ${SITE_NAME}`,
    description:
      "See how safe your broker really is with our proprietary 0-100 health scores across 5 key safety dimensions.",
    images: [
      {
        url: "/api/og?title=Broker+Health+Scores&subtitle=Safety+Ratings+for+Every+Australian+Broker&type=default",
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: { card: "summary_large_image" as const },
  alternates: { canonical: "/health-scores" },
};

export default async function HealthScoresPage() {
  const supabase = await createClient();

  const [brokersRes, scoresRes] = await Promise.all([
    supabase.from("brokers").select("id, name, slug, color, icon, rating, status").eq("status", "active").eq("is_crypto", false).order("name"),
    supabase.from("broker_health_scores").select("*"),
  ]);

  const breadcrumbLd = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Broker Health Scores" },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <HealthScoresClient
        brokers={(brokersRes.data as Broker[]) || []}
        scores={(scoresRes.data as BrokerHealthScore[]) || []}
      />
    </>
  );
}
