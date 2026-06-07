import type { Metadata } from "next";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Broker } from "@/lib/types";
import {
  absoluteUrl,
  breadcrumbJsonLd,
  CURRENT_YEAR,
  SITE_NAME,
} from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import ComplianceFooter from "@/components/ComplianceFooter";
import ShouldISwitchClient from "./ShouldISwitchClient";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: `Should I Switch Broker? Savings Calculator (${CURRENT_YEAR}) — ${SITE_NAME}`,
  description:
    "See how much you'd save per year by switching Australian broker. Enter your current platform, trade size, and frequency — we compute the annual cost across every major broker and rank the top three cheapest alternatives.",
  alternates: { canonical: "/tools/should-i-switch" },
  openGraph: {
    title: "Should I Switch Broker? — Annual Savings Calculator",
    description:
      "Compare your current broker against every Australian platform. Live brokerage + FX math shows exactly how much you'd save by switching.",
    url: absoluteUrl("/tools/should-i-switch"),
    images: [
      {
        url: "/api/og?title=Should+I+Switch+Broker%3F&subtitle=Annual+Savings+Calculator&type=default",
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: { card: "summary_large_image" as const },
};

const appLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: `Should I Switch Broker? — ${SITE_NAME}`,
  description:
    "Free interactive tool that calculates your annual broker cost and ranks the cheapest alternatives for your trading profile.",
  url: absoluteUrl("/tools/should-i-switch"),
  applicationCategory: "FinanceApplication",
  operatingSystem: "Any",
  offers: { "@type": "Offer", price: "0", priceCurrency: "AUD" },
};

const breadcrumbLd = breadcrumbJsonLd([
  { name: "Home", url: absoluteUrl("/") },
  { name: "Tools", url: absoluteUrl("/tools") },
  {
    name: "Should I Switch Broker?",
    url: absoluteUrl("/tools/should-i-switch"),
  },
]);

const SWITCH_FAQS = [
  {
    q: "How does the broker savings calculator work?",
    a: "You enter your current broker, typical trade size, how often you trade ASX stocks per year, and whether you trade US shares. The calculator applies each broker's published brokerage schedule (including tiered pricing and FX conversion rates) to your profile and ranks every active Australian platform by total annual cost.",
  },
  {
    q: "Does switching broker require selling my holdings?",
    a: "It depends on the broker. If both your current and new broker are CHESS-sponsored, your holdings can often be transferred in-specie (without selling) via an off-market transfer — though this can take 2–4 weeks and some brokers charge a transfer fee. If your current broker uses a custodian model (e.g., most international platforms), you will generally need to sell and repurchase, which has brokerage and potential capital gains tax implications.",
  },
  {
    q: "Are there capital gains tax implications when I switch?",
    a: "If you transfer holdings in-specie (CHESS to CHESS without selling), there is no CGT event — your original cost base and acquisition date are preserved. If you must sell to switch platforms, each sale is a CGT event. Whether you pay CGT depends on your individual circumstances, cost base, and holding period (holdings held >12 months qualify for the 50% discount). Consult a tax adviser before switching if you have large unrealised gains.",
  },
  {
    q: "What is the difference between CHESS-sponsored and custodian brokers?",
    a: "CHESS-sponsored brokers register your shares directly on the ASX CHESS system under your own Holder Identification Number (HIN). You legally own the shares and they appear on the ASX register. Custodian brokers hold your shares in their name on your behalf — you have a beneficial interest but not direct legal title. CHESS sponsorship gives you cleaner ownership records and easier portability; custodian models are more common among lower-cost international-share platforms.",
  },
];

const switchFaqLd = faqJsonLd(SWITCH_FAQS);

function Loading() {
  return (
    <div className="py-5 md:py-12 animate-pulse">
      <div className="container-custom max-w-3xl">
        <div className="h-6 w-64 bg-slate-100 rounded mb-4" />
        <div className="h-48 bg-slate-100 rounded-2xl mb-6" />
        <div className="h-96 bg-slate-100 rounded-xl" />
      </div>
    </div>
  );
}

export default async function ShouldISwitchPage() {
  const supabase = await createClient();
  const { data: brokers } = await supabase
    .from("brokers")
    .select(
      "id, name, slug, color, icon, logo_url, rating, asx_fee, asx_fee_value, us_fee, us_fee_value, fx_rate, chess_sponsored, smsf_support, is_crypto, inactivity_fee, cta_text, benefit_cta, affiliate_url, sponsorship_tier, status, platform_type",
    )
    .eq("status", "active")
    .eq("is_crypto", false)
    .order("name");

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(appLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      {switchFaqLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(switchFaqLd) }}
        />
      )}
      <Suspense fallback={<Loading />}>
        <ShouldISwitchClient brokers={(brokers as Broker[]) || []} />
      </Suspense>
      <div className="container-custom max-w-3xl pb-8 space-y-8">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900 mb-4">
            Frequently asked questions
          </h2>
          <div className="space-y-4">
            {SWITCH_FAQS.map((faq) => (
              <details
                key={faq.q}
                className="bg-white border border-slate-200 rounded-xl overflow-hidden group"
              >
                <summary className="px-5 py-4 text-sm font-bold text-slate-900 cursor-pointer hover:bg-slate-50 flex items-center justify-between">
                  {faq.q}
                  <span className="text-slate-400 group-open:rotate-180 transition-transform">
                    ▾
                  </span>
                </summary>
                <div className="px-5 pb-4">
                  <p className="text-sm text-slate-600 leading-relaxed">{faq.a}</p>
                </div>
              </details>
            ))}
          </div>
        </div>
        <ComplianceFooter variant="calculator" />
      </div>
    </>
  );
}
