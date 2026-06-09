import { createClient } from "@/lib/supabase/server";
import type { Broker, BrokerTransferGuide } from "@/lib/types";
import SwitchClient from "./SwitchClient";
import { absoluteUrl, breadcrumbJsonLd, CURRENT_YEAR, SITE_NAME } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { SWITCH_TYPES } from "@/lib/switching";
import Link from "next/link";
import type { Metadata } from "next";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: `Switch Broker, Super, or Savings Account — Step-by-Step Guide (${CURRENT_YEAR}) | ${SITE_NAME}`,
  description:
    "Step-by-step guides to switch your broker (CHESS transfer), super fund (myGov rollover), or savings account. Estimate your cost of staying vs switching.",
  openGraph: {
    title: "Switch Broker, Super, or Savings — ${SITE_NAME}",
    description:
      "Guided switching checklists and cost-of-staying estimates for Australian investors.",
    images: [
      {
        url: "/api/og?title=Switching+Guide&subtitle=Broker+%7C+Super+%7C+Savings&type=default",
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: { card: "summary_large_image" as const },
  alternates: { canonical: "/switch" },
};

const TYPE_DESCRIPTIONS: Record<string, string> = {
  broker: "Transfer your ASX/US shares, HIN, and cost-base records to a new broker. No sell-down required for CHESS-sponsored holdings.",
  super: "Roll over your super via myGov. Includes a pre-switch insurance check and beneficiary update guide.",
  savings: "Open a new account first, migrate direct debits and payroll, then close the old one. Covers intro-rate expiry traps.",
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

  const faqLd = faqJsonLd([
    {
      q: "Can I transfer my shares to a new broker without selling them?",
      a: "Yes, if your shares are CHESS-sponsored (you have a HIN starting with 'X'). You can initiate an off-market CHESS transfer through your new broker. The process takes 3–5 business days and your shares stay in your name throughout. Custodial (non-CHESS) holdings may require a sell-down — check with your current broker.",
    },
    {
      q: "Will I lose my super insurance if I switch funds?",
      a: "You may lose your existing insurance cover when you switch super funds. Insurance inside super often has no medical underwriting, so pre-existing conditions may not be covered by a new fund. Check your current fund's insurance cover (death, TPD, income protection) before initiating any rollover. ASIC's MoneySmart guidance recommends checking this before switching.",
    },
    {
      q: "What is the safest way to roll over superannuation?",
      a: "The ATO recommends using the 'Find and transfer super' tool in myGov (linked to the ATO). This transfers your balance directly between funds within 3–5 business days and is free. Alternatively, you can complete ATO form NAT 75359 and submit it to your new fund.",
    },
    {
      q: "How do I switch savings accounts without missing a direct debit?",
      a: "The safest approach is to open the new account first, transfer most (but not all) of your funds, then migrate each direct debit to the new BSB and account number before closing the old account. Keep enough in the old account to cover pending payments for at least two full billing cycles while you complete the migration.",
    },
    {
      q: "How much could I save by switching brokers?",
      a: "Savings depend on how many trades you make and which platforms you compare. Use the per-type switching guides to enter your specific numbers and see an estimate based on real fee data.",
    },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      {faqLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
        />
      )}

      <div className="py-5 md:py-12">
        <div className="container-custom max-w-3xl mx-auto">
          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="text-sm text-slate-500 mb-6">
            <Link href="/" className="hover:text-brand">Home</Link>
            <span className="mx-2">/</span>
            <span className="text-brand">Switch</span>
          </nav>

          {/* Hero */}
          <div className="bg-gradient-to-br from-violet-600 to-violet-800 rounded-2xl p-6 md:p-10 text-white mb-8 relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.1),transparent_60%)]" />
            <div className="relative">
              <h1 className="text-2xl md:text-4xl font-extrabold mb-3">
                Switching Guide
              </h1>
              <p className="text-sm md:text-base text-violet-100 max-w-xl">
                Factual step-by-step guides for switching your broker, super fund, or savings account. Enter your numbers to see the cost of staying vs switching.
              </p>
            </div>
          </div>

          {/* Type cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
            {SWITCH_TYPES.map((t) => (
              <Link
                key={t.type}
                href={`/switch/${t.slug}`}
                className="group block bg-white border border-slate-200 rounded-xl p-5 hover:border-violet-300 hover:shadow-sm transition-all"
              >
                <div className="w-10 h-10 bg-violet-50 rounded-lg flex items-center justify-center mb-3 group-hover:bg-violet-100 transition-colors">
                  <span className="text-violet-600 text-lg">
                    {t.type === "broker" ? "📊" : t.type === "super" ? "🏛️" : "💰"}
                  </span>
                </div>
                <h2 className="text-base font-bold text-slate-900 mb-1">{t.label}</h2>
                <p className="text-xs text-slate-500 leading-relaxed">{TYPE_DESCRIPTIONS[t.type]}</p>
                <span className="mt-3 inline-block text-xs font-semibold text-violet-600 group-hover:underline">
                  View checklist + estimate →
                </span>
              </Link>
            ))}
          </div>

          {/* Existing broker-to-broker switch planner (preserved) */}
          <div className="border-t border-slate-200 pt-8 mb-4">
            <h2 className="text-lg font-bold text-slate-900 mb-1">Broker-to-Broker Switch Planner</h2>
            <p className="text-sm text-slate-500 mb-5">Select two brokers to get a personalised checklist and savings estimate.</p>
          </div>
        </div>
      </div>

      <SwitchClient
        brokers={(brokersRes.data as Broker[]) || []}
        transferGuides={(guidesRes.data as BrokerTransferGuide[]) || []}
      />
    </>
  );
}
