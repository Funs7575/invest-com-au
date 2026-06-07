import { createClient } from "@/lib/supabase/server";
import type { Broker } from "@/lib/types";
import type { Metadata } from "next";
import { Suspense } from "react";
import CalculatorsClient from "./CalculatorsClient";
import AdvisorPrompt from "@/components/AdvisorPrompt";
import LeadMagnet from "@/components/LeadMagnet";
import ComplianceFooter from "@/components/ComplianceFooter";
import CalcToPlanBridge from "@/components/get-matched/CalcToPlanBridge";
import { faqJsonLd } from "@/lib/schema-markup";

const CALCULATORS_FAQS = [
  {
    q: "What is a brokerage fee and how is it calculated?",
    a: "A brokerage fee is the commission charged by a trading platform each time you buy or sell a security. For Australian brokers, fees fall into two models: flat fees (e.g. $9.50 per trade regardless of size) and percentage fees (e.g. 0.10% of the trade value, typically with a minimum of $5–$10). On smaller trades (under $5,000), flat-fee brokers are usually cheaper. On larger trades, percentage-fee brokers can be cheaper once the flat-fee cap kicks in. The trade-cost calculator above lets you compare exact fees across all major Australian brokers for any trade size.",
  },
  {
    q: "How do I calculate capital gains tax on Australian shares?",
    a: "Australian CGT is calculated as: capital gain = sale proceeds minus cost base (purchase price plus brokerage on both sides). If you held the asset for 12 months or more, you apply the 50% CGT discount — halving the gain before adding it to your taxable income. You then pay tax at your marginal income tax rate on the discounted gain. Inside super, the tax rate is 15% with a one-third discount (10% effective). In SMSF pension phase, gains are tax-free. The CGT estimator on this page models all of these scenarios and shows the actual after-tax proceeds.",
  },
  {
    q: "What is CHESS sponsorship and why does it matter?",
    a: "CHESS (Clearing House Electronic Subregister System) is ASX's central share registry. CHESS sponsorship means your shares are registered directly in your name on the ASX register — you own them outright. Non-CHESS (custodian) models hold shares in the broker's name on your behalf. CHESS sponsorship matters because: your shares survive broker insolvency (they're yours in the registry), you receive corporate actions directly, and you can transfer to any other CHESS broker without selling. Most full-service and mid-tier Australian brokers offer CHESS; many low-cost international platforms do not.",
  },
  {
    q: "What is the difference between FX fee and market spread?",
    a: "When you buy US shares in AUD, the broker converts your dollars to USD. They make money in two ways: an explicit FX fee (e.g. '0.60% currency conversion fee') and/or a spread — the difference between the interbank exchange rate and the rate they give you. Brokers that advertise 'no FX fee' often embed a wider spread instead. For example, if the real AUD/USD rate is 0.6500 and the broker gives you 0.6440, they've taken a 60 pip spread worth ~0.92% on $1,000. The FX cost calculator on this page factors in both the stated fee and the indicative spread to give you a realistic comparison.",
  },
];

const calcFaqLd = faqJsonLd(CALCULATORS_FAQS);

export const revalidate = 1800;

/* ──────────────────────────────────────────────
   Dynamic metadata based on searchParams
   ────────────────────────────────────────────── */

const CALC_TITLES: Record<string, string> = {
  "trade-cost": "Trade Cost Calculator",
  fx: "FX Cost Calculator",
  switching: "Platform Switching Simulator",
  cgt: "Capital Gains Tax Estimator",
  franking: "Franking Credits Calculator",
  chess: "CHESS Sponsorship Lookup",
  "fee-impact": "Fee Impact Calculator",
  "compound-interest": "Compound Interest Calculator",
  "dividend-reinvestment": "Dividend Reinvestment Calculator",
  fire: "FIRE Calculator (Financial Independence)",
  "property-vs-shares": "Property vs Shares Calculator",
};

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const params = await searchParams;
  const calc = typeof params.calc === "string" ? params.calc : undefined;
  const calcTitle = calc ? CALC_TITLES[calc] : undefined;

  // Build a dynamic subtitle from params
  let subtitle = "";
  if (calc === "trade-cost" && params.tc_amt) {
    subtitle = ` — $${Number(params.tc_amt).toLocaleString("en-AU")} ${params.tc_mkt === "us" ? "US" : "ASX"} Trade`;
  } else if (calc === "fx" && params.fx_amt) {
    subtitle = ` — $${Number(params.fx_amt).toLocaleString("en-AU")} Conversion`;
  } else if (calc === "cgt" && params.cg_amt) {
    subtitle = ` — $${Number(params.cg_amt).toLocaleString("en-AU")} Gain`;
  } else if (calc === "franking" && params.fr_dy) {
    subtitle = ` — ${params.fr_dy}% Yield`;
  }

  const title = calcTitle
    ? `${calcTitle}${subtitle}`
    : "Investing Tools & Calculators";

  const description = calcTitle
    ? `Use the free ${calcTitle} to compare broker fees and make smarter investing decisions.`
    : "Free tools for Australian investors: compare broker fees, estimate capital gains tax, calculate FX costs on US shares, and check CHESS sponsorship.";

  return {
    title,
    description,
    openGraph: {
      title: calcTitle ? `${calcTitle}${subtitle}` : "Investing Tools & Calculators",
      description: calcTitle
        ? `Use the free ${calcTitle} to compare broker fees and make smarter investing decisions.`
        : "Free tools for Australian investors: compare broker fees, estimate tax, calculate FX costs on US shares.",
      images: [{ url: `/api/og?title=${encodeURIComponent(calcTitle || "Investing Tools")}&subtitle=${encodeURIComponent(subtitle ? subtitle.replace(" — ", "") : "Compare fees, estimate tax & more")}&type=default`, width: 1200, height: 630 }],
    },
    twitter: { card: "summary_large_image" as const },
    alternates: { canonical: "/calculators" },
  };
}

export default async function CalculatorsPage() {
  // Defensive fetch — the hub is just navigation tiles, so failing
  // the broker query should not take the page down. Degrade to an
  // empty broker list and let CalculatorsClient render without the
  // "select your broker" preselects.
  let brokers: Broker[] = [];
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("brokers")
      .select("id, name, slug, color, icon, logo_url, rating, asx_fee, asx_fee_value, us_fee, us_fee_value, fx_rate, chess_sponsored, smsf_support, is_crypto, cta_text, affiliate_url, sponsorship_tier, benefit_cta, status")
      .eq("status", "active")
      .order("name");
    brokers = (data as Broker[]) || [];
  } catch {
    // Silent degrade — client renders tools with no preselected broker.
  }

  const calcJsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Investing Fee Calculators",
    description: "Free calculators to compare trading costs, FX fees, capital gains tax, and more across Australian investing platforms.",
    applicationCategory: "FinanceApplication",
    operatingSystem: "Web",
    offers: { "@type": "Offer", price: "0", priceCurrency: "AUD" },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(calcJsonLd) }} />
      {calcFaqLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(calcFaqLd) }} />
      )}
      <Suspense fallback={<CalculatorsLoading />}>
        <CalculatorsClient brokers={brokers} />
      </Suspense>
      <div className="container-custom max-w-4xl pb-6 md:pb-12">
        <AdvisorPrompt context="tax" />
        <div className="mt-6">
          <LeadMagnet />
        </div>
        <CalcToPlanBridge
          goal="grow"
          headline="Done with the numbers? Get a personalised action plan."
          subtitle="Answer 5-7 quick questions — we'll match you to the right platform, opportunity, or verified pro for your situation."
        />
        <ComplianceFooter variant="calculator" />
        <div className="mt-8 space-y-3">
          <h2 className="text-lg font-bold text-slate-900 mb-4">Frequently asked questions</h2>
          {CALCULATORS_FAQS.map((faq) => (
            <details key={faq.q} className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden group">
              <summary className="px-5 py-4 text-sm font-bold text-slate-900 cursor-pointer hover:bg-slate-100 flex items-center justify-between">
                {faq.q}
                <span className="text-slate-400 group-open:rotate-180 transition-transform ml-2 shrink-0">▾</span>
              </summary>
              <div className="px-5 pb-4">
                <p className="text-sm text-slate-600 leading-relaxed">{faq.a}</p>
              </div>
            </details>
          ))}
        </div>
      </div>
    </>
  );
}

function CalculatorsLoading() {
  return (
    <div className="pt-5 pb-8 md:py-12">
      <div className="container-custom">
        <div className="h-6 md:h-10 w-36 md:w-80 bg-slate-200 rounded animate-pulse mb-1 md:mb-4 md:mx-auto" />
        <div className="h-3.5 md:h-6 w-56 md:w-96 bg-slate-100 rounded animate-pulse mb-2.5 md:mb-10 md:mx-auto" />
        {/* Mobile: horizontal pills skeleton */}
        <div className="md:hidden flex gap-1.5 overflow-hidden mb-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-7 w-20 bg-slate-100 rounded-full animate-pulse shrink-0" />
          ))}
        </div>
        {/* Desktop: grid skeleton */}
        <div className="hidden md:grid md:grid-cols-3 lg:grid-cols-7 gap-4 mb-14">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="border border-slate-200 rounded-xl p-5 animate-pulse">
              <div className="h-8 w-8 bg-slate-200 rounded mb-2" />
              <div className="h-4 w-20 bg-slate-200 rounded mb-1" />
              <div className="h-3 w-28 bg-slate-100 rounded" />
            </div>
          ))}
        </div>
        <div className="h-48 md:h-64 bg-slate-100 rounded-xl md:rounded-2xl animate-pulse" />
      </div>
    </div>
  );
}
