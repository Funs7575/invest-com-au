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

const calcFaqLd = faqJsonLd([
  {
    q: "What is a brokerage fee calculator?",
    a: "A brokerage fee calculator estimates how much you'll pay per trade at different Australian brokers. Enter your trade size and frequency to compare the annual cost across platforms like Commsec, SelfWealth, Pearler, Moomoo, and others. Because broker fees are flat, percentage-based, or hybrid, the cheapest broker depends entirely on your trade size and how often you trade.",
  },
  {
    q: "How is CGT calculated in Australia?",
    a: "Capital Gains Tax is calculated on the net capital gain — your proceeds minus the cost base (including brokerage). If you've held the asset for more than 12 months, a 50% discount applies for individuals. The discounted gain is added to your taxable income and taxed at your marginal rate. The calculator shows an estimate only — always use your actual cost base records and consult a tax adviser.",
  },
  {
    q: "What is an FX fee on international shares?",
    a: "Most Australian brokers charge a currency conversion fee (FX margin) when you buy US or UK shares. This fee — typically 0.5%–1.0% of the trade value — is charged on top of brokerage. A $10,000 US trade at a 0.6% FX margin costs $60 in conversion, which can exceed your brokerage. Use the FX calculator to see the true cost across brokers including Interactive Brokers, CommSec, Stake, and CMC.",
  },
  {
    q: "What is CHESS sponsorship and how do I check it?",
    a: "CHESS (Clearing House Electronic Subregister System) is the ASX's settlement system. A CHESS-sponsored broker registers your shares in your name with a Holder Identification Number (HIN), so they're legally yours even if the broker fails. Custodian brokers (like Stake, eToro) hold shares in an omnibus account — you have a beneficial interest but face counterparty risk. Use the CHESS lookup tool to check whether a specific broker is CHESS-sponsored.",
  },
  {
    q: "What is the compound interest calculator?",
    a: "The compound interest calculator projects how a lump sum or regular contributions grow over time when returns are reinvested. It applies a chosen annual return rate (net of fees and tax) and shows the effect of compounding — earning returns on returns. Over 30 years at 7%, $10,000 grows to $76,000. Over 40 years, the same amount reaches $150,000. Starting early dramatically outweighs the benefit of higher returns or larger contributions later.",
  },
]);

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
      {calcFaqLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(calcFaqLd) }} />}
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
