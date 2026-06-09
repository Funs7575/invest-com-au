import { createClient } from "@/lib/supabase/server";
import type { Broker, BrokerHealthScore } from "@/lib/types";
import HealthScoresClient from "./HealthScoresClient";
import { absoluteUrl, breadcrumbJsonLd } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";

export const revalidate = 3600;

const HEALTH_SCORE_FAQS = [
  {
    q: "What is a Platform Health Score?",
    a: "A Platform Health Score is Invest.com.au's proprietary 0–100 safety rating for Australian investing platforms. It aggregates five weighted dimensions: regulatory compliance (ASIC authorisation, AFSL scope, licence history), client money handling (segregated accounts, CHESS sponsorship, custodian model), financial stability (capital adequacy, parent group strength, operating history), platform reliability (uptime record, execution reliability, system redundancy), and investor protections (EDR membership, insurance coverage, compensation scheme membership).",
  },
  {
    q: "What factors make up the Platform Health Score?",
    a: "The five dimensions and their weightings are: Regulatory Compliance (30%) — ASIC/AFSL status, licence scope, any enforcement history; Client Money (25%) — CHESS-sponsored vs custodian model, fund segregation, and counterparty risk; Financial Stability (20%) — capital adequacy, group parent strength, operating history; Platform Reliability (15%) — uptime and execution track record; and Investor Protections (10%) — AFCA EDR membership, professional indemnity insurance, and whether any compensation scheme applies.",
  },
  {
    q: "Is the Platform Health Score produced by ASIC or any regulator?",
    a: "No. The Platform Health Score is an independent proprietary rating produced by Invest.com.au's editorial team. It is not affiliated with, endorsed by, or sourced from ASIC, AFCA, or any other regulator. It represents our editorial assessment based on publicly available ASIC register data, broker disclosures, and platform documentation. For regulatory status, always verify directly on the ASIC Financial Services Register.",
  },
  {
    q: "How often are Platform Health Scores updated?",
    a: "Health scores are reviewed quarterly at minimum, and updated immediately when a significant event occurs — such as a licence cancellation, regulatory action, AFCA determination, or change in ownership. The page itself refreshes via ISR every hour. The date of last review is shown on each individual platform's score detail.",
  },
];

const healthFaqLd = faqJsonLd(HEALTH_SCORE_FAQS);

export const metadata = {
  title: "Platform Health Scores — Safety Ratings for Investors",
  description:
    "Safety scores for every investing platform: regulatory compliance, client money handling, financial stability, platform reliability, and insurance.",
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
      {healthFaqLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(healthFaqLd) }} />
      )}
      <HealthScoresClient
        brokers={(brokersRes.data as Broker[]) || []}
        scores={(scoresRes.data as BrokerHealthScore[]) || []}
      />
      {/* FAQ accordion — GEO pivot */}
      <div className="border-t border-slate-200 bg-white">
        <div className="container-custom max-w-4xl py-8 md:py-10">
          <h2 className="text-lg font-extrabold text-slate-900 mb-5">Frequently asked questions</h2>
          <div className="space-y-3">
            {HEALTH_SCORE_FAQS.map((faq) => (
              <details key={faq.q} className="group rounded-xl border border-slate-200 bg-slate-50">
                <summary className="flex cursor-pointer items-center justify-between gap-4 px-5 py-4 font-semibold text-slate-900 list-none">
                  {faq.q}
                  <span className="shrink-0 text-slate-400 group-open:rotate-180 transition-transform" aria-hidden="true">▾</span>
                </summary>
                <p className="px-5 pb-5 text-sm text-slate-600 leading-relaxed">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
