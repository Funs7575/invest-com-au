import { createClient } from "@/lib/supabase/server";
import type { Broker } from "@/lib/types";
import { Suspense } from "react";
import XRayClient from "./XRayClient";
import { absoluteUrl, breadcrumbJsonLd, SITE_NAME } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";

export const revalidate = 3600;

export const metadata = {
  title: "Portfolio X-Ray — Analyse Your Investment Holdings",
  description:
    "Free portfolio analysis: diversification scores, sector breakdowns, concentration risk alerts, fee drag analysis, and personalised recommendations.",
  openGraph: {
    title: "Portfolio X-Ray — Analyse Your Investment Holdings",
    description:
      "Upload your holdings and get instant analysis: diversification score, sector & geographic breakdown, concentration risk, fee drag, and dividend yield estimates.",
    images: [
      {
        url: "/api/og?title=Portfolio+X-Ray&subtitle=Analyse+Your+Investment+Holdings&type=default",
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: { card: "summary_large_image" as const },
  alternates: { canonical: "/portfolio-xray" },
};

const PORTFOLIO_XRAY_FAQS = [
  {
    q: "What does the Portfolio X-Ray tool analyse?",
    a: "Portfolio X-Ray analyses your investment holdings across five dimensions: (1) Diversification score — how well your portfolio is spread across sectors, geographies, and asset classes; (2) Sector breakdown — how much is in financials, materials, tech, healthcare, energy, etc.; (3) Concentration risk — flags holdings above 20% of total portfolio value and single-sector overweights; (4) Fee drag analysis — compares your broker's per-trade costs against lower-cost alternatives and estimates 10-year savings; (5) Dividend yield estimate — aggregate gross yield including franking credits.",
  },
  {
    q: "How does Portfolio X-Ray calculate a diversification score?",
    a: "The diversification score (0–100) measures how evenly your holdings are spread. A portfolio of 1 holding scores near 0; a highly diversified portfolio scores near 100. The algorithm weights three factors: sector concentration (are you >40% in one GICS sector?), geographic concentration (AU-only vs global exposure), and individual holding concentration (is any single stock >20%?). ETFs with broad exposure count as diversified internally, not as concentrated single-position holdings.",
  },
  {
    q: "What is concentration risk and why does it matter?",
    a: "Concentration risk is the danger of too much money in a single stock, sector, or geography — when that bet goes wrong, the portfolio takes a disproportionate hit. Australian investors face a specific concentration problem called 'home bias': the ASX is dominated by financials (30%) and materials (20%), so an ASX-only portfolio is already sector-concentrated even if spread across 20 stocks. Portfolio X-Ray flags these risks specifically and suggests diversification moves, such as adding ex-Australia ETFs or reducing single-stock positions above 20% of the portfolio.",
  },
  {
    q: "Does Portfolio X-Ray store my portfolio data?",
    a: "No. All portfolio analysis is performed locally in your browser. Holdings data you enter is never transmitted to Invest.com.au's servers — it stays on your device for the duration of your session. If you close the tab or refresh, holdings are cleared (unless you save them using the save button, which stores them in your browser's localStorage — not our servers). No account login is required to use the full tool.",
  },
];

const xrayFaqLd = faqJsonLd(PORTFOLIO_XRAY_FAQS);

function jsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Portfolio X-Ray Tool",
    description:
      "Analyse your investment portfolio for diversification, sector breakdown, concentration risk, and fee optimisation. Free tool for Australian investors.",
    applicationCategory: "FinanceApplication",
    operatingSystem: "Web",
    url: absoluteUrl("/portfolio-xray"),
    offers: { "@type": "Offer", price: "0", priceCurrency: "AUD" },
    provider: {
      "@type": "Organization",
      name: SITE_NAME,
      url: absoluteUrl("/"),
    },
  };
}

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-slate-50 py-12">
      <div className="mx-auto max-w-4xl px-4">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-64 rounded bg-slate-200" />
          <div className="h-4 w-96 rounded bg-slate-200" />
          <div className="h-64 rounded-xl bg-slate-200" />
        </div>
      </div>
    </div>
  );
}

export default async function PortfolioXRayPage() {
  const supabase = await createClient();

  const { data: brokers } = await supabase
    .from("brokers")
    .select("id, name, slug, color, logo_url, icon, asx_fee, asx_fee_value, us_fee, us_fee_value, fx_rate, affiliate_url, rating, platform_type, status")
    .eq("status", "active")
    .eq("platform_type", "share_broker")
    .order("rating", { ascending: false });

  const breadcrumbLd = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Portfolio X-Ray" },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd()) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      {xrayFaqLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(xrayFaqLd) }} />
      )}
      <Suspense fallback={<LoadingFallback />}>
        <XRayClient brokers={(brokers as Broker[]) || []} />
      </Suspense>
      {/* FAQ accordion — GEO pivot */}
      <div className="border-t border-slate-200 bg-white">
        <div className="container-custom max-w-4xl py-8 md:py-10">
          <h2 className="text-lg font-extrabold text-slate-900 mb-5">Frequently asked questions</h2>
          <div className="space-y-3">
            {PORTFOLIO_XRAY_FAQS.map((faq) => (
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
