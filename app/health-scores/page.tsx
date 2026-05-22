import { createClient } from "@/lib/supabase/server";
import type { Broker, BrokerHealthScore } from "@/lib/types";
import HealthScoresClient from "./HealthScoresClient";
import { absoluteUrl, breadcrumbJsonLd } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";

export const revalidate = 3600;

export const metadata = {
  title: "Platform Health Scores — Safety Ratings for Investors",
  description:
    "Proprietary safety scores for every Australian investing platform. Regulatory compliance, client money handling, financial stability, platform reliability, and insurance — all in one dashboard.",
  openGraph: {
    title: "Platform Health & Risk Scores",
    description:
      "See how safe your platform really is with our proprietary 0-100 health scores across 5 key safety dimensions.",
    images: [
      {
        url: "/api/og?title=Platform+Health+Scores&subtitle=Safety+Ratings+for+Every+Australian+Platform&type=default",
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: { card: "summary_large_image" as const },
  alternates: { canonical: "/health-scores" },
};

const HEALTH_SCORES_FAQ = faqJsonLd([
  {
    q: "What are platform health scores and how are they calculated?",
    a: "Platform health scores are proprietary 0–100 safety ratings that assess each Australian investing platform across five dimensions: regulatory compliance, client money handling, financial stability, platform reliability, and insurance coverage. Each dimension is scored independently and combined into an overall health score so investors can compare platforms at a glance.",
  },
  {
    q: "Is my money safe with an online broker in Australia?",
    a: "Australian brokers regulated by ASIC must hold client money in segregated trust accounts separate from company funds. CHESS-sponsored brokers go further: your shares are registered directly in your name on the ASX's CHESS system, so they remain yours even if the broker becomes insolvent. Custodial brokers hold shares on your behalf, which introduces additional counterparty risk. Always check a platform's health score and CHESS sponsorship status before depositing funds.",
  },
  {
    q: "What is CHESS sponsorship and why does it matter?",
    a: "CHESS (Clearing House Electronic Sub-Register System) sponsorship means your ASX shares are legally registered in your own name on the ASX sub-register. You receive a Holder Identification Number (HIN) that uniquely identifies your holdings. If a CHESS-sponsored broker fails, your shares are unaffected because they never belonged to the broker. Custodial brokers hold shares in an omnibus account in the broker's name, which means your assets are part of the broker's estate in an insolvency.",
  },
  {
    q: "Are Australian investment platforms covered by the government guarantee scheme?",
    a: "The Australian Government Financial Claims Scheme (FCS) protects deposits up to AUD $250,000 per person per authorised deposit-taking institution (ADI). This covers cash held in bank accounts, including cash balances at broker-affiliated banks. However, the FCS does not cover investment products such as shares or ETFs — those are protected through CHESS registration or segregated client money rules, not the deposit guarantee.",
  },
  {
    q: "What is the difference between a custodian and CHESS-sponsored broker?",
    a: "A CHESS-sponsored broker registers your shares directly in your name on the ASX CHESS system, giving you a Holder Identification Number (HIN) and direct ownership. A custodial broker holds shares in an omnibus account on your behalf; you own a beneficial interest but are not on the CHESS register. Custodial accounts are common among international and low-cost platforms. CHESS sponsorship offers stronger asset protection in an insolvency, while custodial accounts may offer fractional shares or access to international markets.",
  },
]);

export default async function HealthScoresPage() {
  const supabase = await createClient();

  const [brokersRes, scoresRes] = await Promise.all([
    supabase.from("brokers").select("id, name, slug, color, icon, logo_url, rating, status").eq("status", "active").eq("is_crypto", false).order("name"),
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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(HEALTH_SCORES_FAQ) }}
      />
      <HealthScoresClient
        brokers={(brokersRes.data as Broker[]) || []}
        scores={(scoresRes.data as BrokerHealthScore[]) || []}
      />
    </>
  );
}
