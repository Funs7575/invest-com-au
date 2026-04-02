import Link from "next/link";
import { Suspense } from "react";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { breadcrumbJsonLd, SITE_URL, UPDATED_LABEL } from "@/lib/seo";
import { FOREIGN_INVESTOR_GENERAL_DISCLAIMER } from "@/lib/compliance";
import type { Broker } from "@/lib/types";
import SectionHeading from "@/components/SectionHeading";
import { AFFILIATE_REL } from "@/lib/tracking";
import CompareNav from "../CompareNav";

export const metadata: Metadata = {
  title: `Best ASX Brokers That Accept Non-Residents (2026) — Invest.com.au`,
  description:
    "Compare ASX share brokers that accept non-Australian residents. Most Australian brokers require a local address — these don't. Includes fees, ratings, non-resident notes, and affiliate links. " + UPDATED_LABEL,
  openGraph: {
    title: "Best ASX Brokers for Non-Residents — Invest.com.au",
    description:
      "Which Australian share brokers accept non-residents? Compare fees, ratings, and non-resident eligibility. Most brokers require an Australian address — these don't.",
    url: `${SITE_URL}/compare/non-residents`,
    images: [
      {
        url: `/api/og?title=${encodeURIComponent("ASX Brokers for Non-Residents")}&sub=${encodeURIComponent("No Australian Address Required · Fees · Ratings · 2026")}`,
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: `${SITE_URL}/compare/non-residents` },
};

export const revalidate = 3600;

async function getNonResidentBrokers(): Promise<Broker[]> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("brokers")
      .select("id, name, slug, color, logo_url, cta_text, affiliate_url, rating, asx_fee, asx_fee_value, us_fee, us_fee_value, fx_rate, chess_sponsored, accepts_non_residents, foreign_investor_notes, platform_type, regulated_by, status, tagline, deal, deal_text, editors_pick, updated_at, fee_last_checked")
      .eq("accepts_non_residents", true)
      .eq("status", "active")
      .order("rating", { ascending: false });
    return (data ?? []) as unknown as Broker[];
  } catch {
    return [];
  }
}

async function getAllBrokers(): Promise<Broker[]> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("brokers")
      .select("id, name, slug, accepts_non_residents, platform_type, status, rating")
      .eq("status", "active")
      .eq("platform_type", "share_broker")
      .order("rating", { ascending: false });
    return (data ?? []) as unknown as Broker[];
  } catch {
    return [];
  }
}

const FAQS = [
  {
    question: "Why don't most Australian brokers accept non-residents?",
    answer:
      "Australian brokers are regulated by ASIC and must conduct Know Your Customer (KYC) and AML/CTF checks. For non-residents, verifying identity and address without access to Australian address verification databases adds complexity. Most domestic retail brokers take the simpler path of requiring an Australian residential address. International brokers like Interactive Brokers have built global compliance infrastructure.",
  },
  {
    question: "What documents do non-residents need to open an ASX account?",
    answer:
      "Typically: a valid passport or government photo ID, proof of overseas residential address (utility bill or bank statement dated within 3 months), a Tax Identification Number (TIN) from your country or your Australian TFN, and a declaration of non-residency for Australian tax purposes. For US shares, a W-8BEN form may also be required.",
  },
  {
    question: "What withholding tax applies to non-residents on ASX dividends?",
    answer:
      "Unfranked dividends: 30% withholding tax (reduced to 15% under most DTAs). Fully franked dividends: 0% withholding tax (the company has already paid tax via imputation). Capital gains on ASX shares: generally exempt for non-residents holding less than 10% of the company (Section 855-10 ITAA 1997). Interest income: 10% withholding.",
  },
  {
    question: "Can non-residents buy US shares through an Australian broker?",
    answer:
      "Yes, through brokers like Interactive Brokers. You'll need to complete a W-8BEN form to access the DTA-reduced US dividend withholding rate (15% for Australian residents; complex for non-residents — the broker manages this). Interactive Brokers handles W-8BEN and other IRS forms directly for international clients.",
  },
  {
    question: "Is CHESS sponsorship available for non-residents?",
    answer:
      "CHESS sponsorship is the Australian system of direct share ownership registered under your name. Most brokers accepting non-residents (including Interactive Brokers) use custodial models, not CHESS. Custodial accounts at well-regulated brokers are generally safe, but the direct protection of CHESS isn't available.",
  },
];

export default async function NonResidentBrokersPage() {
  const [nonResidentBrokers, allBrokers] = await Promise.all([
    getNonResidentBrokers(),
    getAllBrokers(),
  ]);

  const acceptCount = nonResidentBrokers.length;
  const totalCount = allBrokers.length;

  return (
    <div className="bg-white min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbJsonLd([
              { name: "Home", url: SITE_URL },
              { name: "Compare", url: `${SITE_URL}/compare` },
              { name: "Non-Resident Brokers" },
            ])
          ),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: FAQS.map((faq) => ({
              "@type": "Question",
              name: faq.question,
              acceptedAnswer: { "@type": "Answer", text: faq.answer },
            })),
          }),
        }}
      />

      <Suspense><CompareNav /></Suspense>

      {/* ── Hero ── */}
      <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white py-10 md:py-14">
        <div className="container-custom">
          <nav className="text-xs text-slate-400 mb-5 flex items-center gap-1.5 flex-wrap">
            <Link href="/" className="hover:text-slate-200">Home</Link>
            <span>/</span>
            <Link href="/compare" className="hover:text-slate-200">Compare</Link>
            <span>/</span>
            <span className="text-slate-300">Non-Residents</span>
          </nav>

          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/20 border border-amber-500/30 rounded-full text-xs font-semibold text-amber-300 mb-4">
              <span className="w-1.5 h-1.5 bg-amber-400 rounded-full" />
              Updated March 2026
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold leading-[1.1] mb-4 tracking-tight">
              Best ASX Brokers{" "}
              <span className="text-amber-400">That Accept Non-Residents</span>
            </h1>
            <p className="text-sm md:text-base text-slate-300 leading-relaxed mb-6">
              Most Australian share brokers require an Australian residential address — which means they&apos;re effectively
              closed to true non-residents. Of {totalCount > 0 ? `the ${totalCount}+ brokers` : "the brokers"} we track,
              only <strong className="text-amber-400">{acceptCount > 0 ? acceptCount : "a select few"}</strong> explicitly
              accept non-Australian residents. Here they are, with key details on fees, conditions, and non-resident eligibility.
            </p>

            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Accept non-residents", value: acceptCount > 0 ? `${acceptCount}` : "Select few" },
                { label: "Require AU address", value: totalCount > acceptCount ? `${totalCount - acceptCount}+` : "Most" },
                { label: "Best for non-residents", value: "Interactive Brokers" },
              ].map((stat) => (
                <div key={stat.label} className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
                  <p className="text-xl font-extrabold text-amber-400">{stat.value}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="container-custom py-8 md:py-12 space-y-12 md:space-y-16">

        {/* ── Non-resident-friendly brokers ── */}
        <section>
          <SectionHeading
            eyebrow="Eligible Brokers"
            title="Brokers that accept non-Australian residents"
            sub="These brokers have confirmed they accept non-residents. Always verify eligibility for your specific country before applying."
          />

          {nonResidentBrokers.length > 0 ? (
            <div className="space-y-4">
              {nonResidentBrokers.map((broker, index) => (
                <div key={broker.id} className="border border-slate-200 rounded-2xl overflow-hidden hover:border-amber-200 transition-colors">
                  <div className="p-5">
                    <div className="flex items-start gap-4">
                      {/* Logo / initial */}
                      <div
                        className="shrink-0 w-14 h-14 rounded-xl flex items-center justify-center text-white font-extrabold text-xl"
                        style={{ backgroundColor: broker.color || "#1e293b" }}
                      >
                        {broker.name?.charAt(0)}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-3 flex-wrap mb-2">
                          <div>
                            <Link href={`/broker/${broker.slug}`} className="font-extrabold text-slate-900 hover:text-amber-700 text-base">
                              {index + 1}. {broker.name}
                            </Link>
                            {broker.editors_pick && (
                              <span className="ml-2 text-xs font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Editor&apos;s Pick</span>
                            )}
                          </div>
                          {broker.rating && (
                            <span className="text-sm font-bold text-amber-600 ml-auto shrink-0">★ {broker.rating.toFixed(1)}/5</span>
                          )}
                        </div>

                        {broker.tagline && (
                          <p className="text-sm text-slate-500 mb-3">{broker.tagline}</p>
                        )}

                        {/* Fee/feature grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                          {[
                            { label: "ASX Fee", value: broker.asx_fee || "—" },
                            { label: "US Fee", value: broker.us_fee || "—" },
                            { label: "FX Rate", value: broker.fx_rate ? `${broker.fx_rate}%` : "—" },
                            { label: "CHESS", value: broker.chess_sponsored ? "Yes" : "No" },
                          ].map((item) => (
                            <div key={item.label} className="bg-slate-50 rounded-lg p-2 text-center">
                              <p className="text-xs text-slate-500 mb-0.5">{item.label}</p>
                              <p className="text-sm font-bold text-slate-800">{item.value}</p>
                            </div>
                          ))}
                        </div>

                        {/* Non-resident specific note */}
                        {broker.foreign_investor_notes && (
                          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 mb-3">
                            <p className="text-xs text-emerald-800">
                              <span className="font-bold">Non-resident eligibility: </span>
                              {broker.foreign_investor_notes}
                            </p>
                          </div>
                        )}

                        {/* Deal */}
                        {broker.deal && broker.deal_text && (
                          <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 mb-3">
                            <p className="text-xs font-semibold text-amber-700">{broker.deal_text}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* CTAs */}
                    <div className="flex gap-3 mt-4">
                      {broker.affiliate_url && (
                        <a
                          href={broker.affiliate_url}
                          target="_blank"
                          rel={AFFILIATE_REL}
                          className="flex-1 text-center px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold rounded-xl text-sm transition-colors"
                        >
                          {broker.cta_text || "Open Account"} &rarr;
                        </a>
                      )}
                      <Link
                        href={`/broker/${broker.slug}`}
                        className="px-4 py-2.5 border border-slate-200 hover:border-slate-300 text-slate-600 hover:text-slate-800 font-semibold rounded-xl text-sm transition-colors"
                      >
                        Full Review
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Fallback when no DB data */
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 text-center">
              <p className="text-slate-500 mb-4">Loading broker data...</p>
              <p className="text-sm text-slate-400">
                In the meantime, <Link href="/compare" className="text-amber-600 underline">see all brokers</Link> and filter for non-resident eligibility.
              </p>
            </div>
          )}
        </section>

        {/* ── Why most don't accept non-residents ── */}
        <section>
          <SectionHeading
            eyebrow="Why It&apos;s Rare"
            title="Why most Australian brokers don&apos;t accept non-residents"
          />
          <div className="prose prose-sm max-w-none text-slate-600 space-y-3">
            <p>
              Australia&apos;s AML/CTF (Anti-Money Laundering and Counter-Terrorism Financing) laws require all financial
              services providers to verify the identity and address of their customers. For Australian residents,
              this is straightforward — drivers licences, Medicare cards, and utility bills are all easily verifiable
              through ASIC and government databases.
            </p>
            <p>
              For non-residents, there is no equivalent Australian document. Brokers must rely on international
              document verification services, which add complexity, cost, and compliance risk. Most domestic
              retail brokers have decided this isn&apos;t worth it — they focus on the much larger Australian resident market.
            </p>
            <p>
              International brokers like Interactive Brokers have built global compliance infrastructure specifically
              to handle this. They operate across 200+ countries and have the KYC/AML systems to onboard clients
              from almost anywhere.
            </p>
          </div>
        </section>

        {/* ── Tax considerations ── */}
        <section className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
          <h2 className="font-bold text-amber-800 mb-3 text-base">Tax considerations for non-resident ASX investors</h2>
          <div className="grid sm:grid-cols-2 gap-4 text-sm">
            {[
              { title: "Unfranked dividends", desc: "30% withholding (reduced under DTA — typically 15% for most treaty countries)." },
              { title: "Fully franked dividends", desc: "0% withholding — the company has already paid 30% corporate tax. Best for non-residents." },
              { title: "Capital gains on ASX shares", desc: "Generally EXEMPT for portfolio holders under 10% — a major advantage of non-resident status." },
              { title: "Interest income", desc: "10% withholding on Australian bank deposits. A final tax — no return needed." },
            ].map((item) => (
              <div key={item.title} className="bg-white/70 rounded-lg p-3">
                <p className="font-bold text-slate-800 mb-1">{item.title}</p>
                <p className="text-slate-600">{item.desc}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-amber-700 mt-3">
            Check your country&apos;s DTA with Australia.{" "}
            <Link href="/foreign-investment/from/us" className="underline font-semibold">See DTA rates by country &rarr;</Link>
          </p>
        </section>

        {/* ── FAQs ── */}
        <section>
          <SectionHeading eyebrow="FAQs" title="Non-resident broker questions answered" />
          <div className="space-y-4">
            {FAQS.map((faq) => (
              <div key={faq.question} className="border border-slate-200 rounded-xl p-5">
                <h3 className="font-bold text-slate-800 text-sm mb-2">{faq.question}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{faq.answer}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Country links ── */}
        <section>
          <SectionHeading
            eyebrow="Investing by Country"
            title="Country-specific investing guides"
            sub="Rules, DTA rates, and broker access vary by country. Find your country&apos;s guide."
          />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {[
              { flag: "🇸🇬", label: "Singapore", href: "/foreign-investment/singapore" },
              { flag: "🇭🇰", label: "Hong Kong", href: "/foreign-investment/hong-kong" },
              { flag: "🇬🇧", label: "United Kingdom", href: "/foreign-investment/united-kingdom" },
              { flag: "🇦🇪", label: "UAE / Dubai", href: "/foreign-investment/united-arab-emirates" },
              { flag: "🇨🇳", label: "China", href: "/foreign-investment/china" },
              { flag: "🇺🇸", label: "United States", href: "/foreign-investment/from/us" },
              { flag: "🇯🇵", label: "Japan", href: "/foreign-investment/from/jp" },
              { flag: "🇩🇪", label: "Germany", href: "/foreign-investment/from/de" },
              { flag: "🇳🇿", label: "New Zealand", href: "/foreign-investment/from/nz" },
              { flag: "🇮🇳", label: "India", href: "/foreign-investment/from/in" },
            ].map((c) => (
              <Link key={c.href} href={c.href} className="flex items-center gap-2 p-3 border border-slate-200 rounded-xl hover:border-amber-300 hover:bg-amber-50/20 text-sm font-semibold text-slate-700 hover:text-amber-700 transition-all">
                <span className="text-base">{c.flag}</span>
                <span className="text-xs">{c.label}</span>
              </Link>
            ))}
          </div>
        </section>

        {/* ── Related ── */}
        <section>
          <SectionHeading eyebrow="Related" title="More for non-resident investors" />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { title: "Withholding Tax Guide", href: "/foreign-investment/tax" },
              { title: "Can Non-Residents Open an Australian Bank Account?", href: "/foreign-investment/guides/non-resident-bank-account" },
              { title: "Send Money to Australia", href: "/foreign-investment/send-money-australia" },
              { title: "Foreign Investment Hub", href: "/foreign-investment" },
              { title: "Buy Property in Australia as a Foreigner", href: "/foreign-investment/guides/buy-property-australia-foreigner" },
              { title: "Find a Tax Agent", href: "/advisors/tax-agents" },
            ].map((link) => (
              <Link key={link.href} href={link.href} className="group block p-4 border border-slate-200 rounded-xl hover:border-amber-300 hover:bg-amber-50/20 transition-all">
                <span className="font-semibold text-sm text-slate-800 group-hover:text-amber-700">{link.title} &rarr;</span>
              </Link>
            ))}
          </div>
        </section>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500 leading-relaxed">{FOREIGN_INVESTOR_GENERAL_DISCLAIMER}</p>
        </div>
      </div>
    </div>
  );
}
