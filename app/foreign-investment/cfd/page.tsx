import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { breadcrumbJsonLd, SITE_URL } from "@/lib/seo";
import {
  CFD_WARNING,
  NEGATIVE_BALANCE_PROTECTION,
  FOREIGN_INVESTOR_GENERAL_DISCLAIMER,
  BROKER_NON_RESIDENT_NOTE,
} from "@/lib/compliance";
import type { Broker } from "@/lib/types";
import ForeignInvestmentNav from "../ForeignInvestmentNav";
import SectionHeading from "@/components/SectionHeading";

export const metadata: Metadata = {
  title: "CFD & Forex Trading for Non-Residents in Australia — 2026 Guide",
  description:
    "Can non-residents trade CFDs and forex via ASIC-regulated brokers? Leverage limits, tax treatment of CFD gains, negative balance protection, and which brokers accept non-residents. Updated March 2026.",
  openGraph: {
    title: "CFD & Forex Trading for Non-Residents in Australia — 2026",
    description:
      "ASIC leverage limits, tax on CFD gains for non-residents, negative balance protection, and which ASIC-regulated brokers accept international clients.",
    url: `${SITE_URL}/foreign-investment/cfd`,
    images: [
      {
        url: `/api/og?title=${encodeURIComponent("CFD & Forex for Non-Residents")}&sub=${encodeURIComponent("ASIC Leverage Limits · Tax Rules · Broker Eligibility · 2026")}`,
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: `${SITE_URL}/foreign-investment/cfd` },
};

export const revalidate = 86400;

const CFD_SECTIONS = [
  {
    heading: "Can non-residents trade CFDs via Australian brokers?",
    body: "Yes — most ASIC-regulated CFD and forex brokers accept non-residents. Unlike share brokers, CFD/forex providers typically have fewer restrictions on international clients. A valid passport and overseas residential address are usually sufficient to open an account.\n\nThis makes ASIC-regulated brokers an appealing option for non-residents who want access to global markets (forex, indices, commodities, crypto CFDs) under a well-regulated framework with strong consumer protections.",
  },
  {
    heading: "ASIC leverage limits — what applies to non-residents",
    body: "ASIC's product intervention order (2021) applies to all retail clients trading CFDs with ASIC-regulated providers — regardless of where the client lives.\n\nRetail leverage limits under ASIC:\n\n• 30:1 — Major forex pairs (EUR/USD, GBP/USD, USD/JPY, etc.)\n• 20:1 — Minor/non-major forex pairs and gold\n• 10:1 — Major stock indices and minor metals\n• 5:1 — Individual equities and other commodities\n• 2:1 — Cryptocurrency CFDs\n\nThese limits are significantly lower than what offshore, unregulated brokers offer (sometimes 100:1 or 500:1 on forex). If you want higher leverage, you would need to use an offshore broker — at significantly higher regulatory risk.\n\nWholesale/professional client classification: if you can demonstrate financial sophistication (net assets ≥$2.5M or gross income ≥$250k for two consecutive years), you may qualify as a 'wholesale client' and access higher leverage. This requires an accountant's certificate.",
  },
  {
    heading: "Tax on CFD gains for non-residents",
    body: "The tax treatment of CFD gains for non-residents is an area where many investors make costly assumptions.\n\nKey points:\n\n• CFD profits are ordinary income — not capital gains. The 50% CGT discount does NOT apply to CFD trading.\n• Unlike gains on listed shares (which are generally CGT-exempt for non-residents), CFD gains from Australian-regulated brokers may be treated as income sourced in Australia.\n• The source of CFD income depends on where the contract is executed — if via an ASIC-regulated entity in Australia, the income has an Australian source.\n• This means a non-resident trading CFDs via an ASIC-regulated broker could technically owe Australian income tax — at non-resident rates (32.5% from $0, no tax-free threshold).\n\nIn practice, many non-resident CFD traders go untaxed in Australia because withholding is not automatic (unlike dividends). However, ASIC-regulated brokers may report large trading activity to the ATO.\n\nGet a tax ruling if you are trading significant amounts. This is an area where professional advice is essential.",
  },
  {
    heading: "Negative balance protection — why it matters",
    body: "ASIC's product intervention order requires all ASIC-regulated CFD providers to offer negative balance protection to retail clients. This means you cannot lose more money than you have deposited in your trading account — even in extreme market conditions (flash crashes, gap openings, etc.).\n\nThis is a significant consumer protection. Offshore brokers (those not regulated by ASIC) may not offer this protection, meaning a highly leveraged position that moves sharply against you can result in losses exceeding your deposit — and a debt to the broker.\n\nFor non-residents specifically: if you choose an ASIC-regulated broker over an offshore alternative, this protection applies to you equally.",
  },
  {
    heading: "ASIC vs offshore brokers — a key decision for non-residents",
    body: "Non-residents have a choice that Australian residents don't: you can use both ASIC-regulated brokers AND offshore brokers registered in other jurisdictions (Cyprus/CySEC, Cayman Islands, Belize, Vanuatu, etc.).\n\nASIC-regulated brokers:\n• Lower leverage (30:1 max on major forex)\n• Negative balance protection mandatory\n• ATO reporting potential\n• Strong financial requirements (net tangible assets ≥$1M)\n• Client money segregation required\n• Dispute resolution via AFCA\n\nOffshore brokers:\n• Higher leverage available (100:1, 500:1)\n• Less capital requirements for the broker\n• Less consumer protection\n• Dispute resolution options much weaker\n• Withdrawal risks higher with less-regulated entities\n\nThe general recommendation: for most non-residents, an ASIC-regulated broker provides better protections even at lower leverage. Only consider offshore if you specifically need leverage beyond ASIC limits AND you have thoroughly vetted the broker.",
  },
  {
    heading: "Forex trading — currency conversion for non-residents",
    body: "For non-resident forex traders, Australian-dollar denominated accounts add an extra layer of currency risk. If your base currency is USD, EUR, or GBP, consider:\n\n• Broker account currency: most major ASIC brokers offer USD-denominated accounts — this avoids a layer of AUD conversion\n• Withdrawals: ensure the broker supports wire transfers in your home currency\n• Some ASIC-regulated brokers (e.g. IG, CMC Markets, Pepperstone) allow non-AUD account base currencies\n• Tax reporting: profits in AUD must be converted to your home currency at the applicable exchange rate for tax purposes in your home country",
  },
];

const CFD_FAQS = [
  {
    question: "Which ASIC-regulated CFD brokers accept non-residents?",
    answer: "Most major ASIC-regulated CFD/forex brokers accept non-residents, including Pepperstone, IG, CMC Markets, City Index, and OANDA. Requirements typically include a valid passport, overseas residential address, and basic KYC documentation. Unlike share brokers, an Australian address is generally not required.",
  },
  {
    question: "What leverage can I get as a non-resident with an ASIC-regulated broker?",
    answer: "The same as Australian residents: up to 30:1 on major forex pairs, 20:1 on minor forex/gold, 10:1 on major indices, 5:1 on individual equities, and 2:1 on crypto CFDs. ASIC's leverage limits apply to all retail clients regardless of residency. To access higher leverage, you would need a wholesale client classification or use an offshore broker.",
  },
  {
    question: "Do I pay Australian tax on CFD trading profits as a non-resident?",
    answer: "Potentially yes. Unlike gains on listed Australian shares (which are CGT-exempt for most non-residents), CFD gains via Australian-regulated brokers may be treated as Australian-sourced income, taxable at non-resident rates (32.5% from $0, no tax-free threshold). This is not always enforced via automatic withholding, but the liability may exist. Seek professional tax advice if trading significant amounts.",
  },
  {
    question: "Is negative balance protection mandatory with ASIC-regulated brokers?",
    answer: "Yes. Under ASIC's product intervention order (effective 2021), all ASIC-regulated CFD providers must offer retail clients negative balance protection — you cannot lose more than your deposited funds. This protection applies equally to non-resident retail clients.",
  },
  {
    question: "Can I use an offshore CFD broker instead of an ASIC one?",
    answer: "As a non-resident, you are not restricted to ASIC-regulated brokers — you can use offshore brokers registered in other jurisdictions. However, offshore brokers offer significantly less consumer protection: no guaranteed negative balance protection, weaker dispute resolution, and higher financial stability risk. Higher leverage is the primary reason to consider offshore options, but the risk-reward tradeoff is significant.",
  },
  {
    question: "Do I need to declare CFD profits in my home country?",
    answer: "Almost certainly yes. Most countries tax their residents on worldwide income, including profits from CFD trading via Australian or offshore brokers. Even if Australia doesn't withhold tax automatically, your home country will likely require you to report and pay tax on CFD profits. Get advice from a tax professional in your home country.",
  },
];

const ASIC_LEVERAGE_LIMITS = [
  { market: "Major forex pairs", limit: "30:1", examples: "EUR/USD, GBP/USD, USD/JPY", color: "green" },
  { market: "Minor/non-major forex & gold", limit: "20:1", examples: "EUR/AUD, GBP/NZD, Gold (XAU)", color: "green" },
  { market: "Major stock indices & minor metals", limit: "10:1", examples: "S&P 500, ASX 200, Silver", color: "amber" },
  { market: "Individual equities & other commodities", limit: "5:1", examples: "BHP, CBA, Oil (WTI)", color: "amber" },
  { market: "Cryptocurrency CFDs", limit: "2:1", examples: "BTC/USD, ETH/USD", color: "red" },
];

async function getCFDBrokers(): Promise<Broker[]> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("brokers")
      .select("id, name, slug, color, logo_url, cta_text, affiliate_url, rating, accepts_non_residents, accepts_temporary_residents, foreign_investor_notes, regulated_by, platform_type, status")
      .eq("platform_type", "cfd_forex")
      .eq("status", "active")
      .order("rating", { ascending: false });
    return (data ?? []) as unknown as Broker[];
  } catch {
    return [];
  }
}

export default async function ForeignCFDPage() {
  const brokers = await getCFDBrokers();
  const acceptingBrokers = brokers.filter((b) => b.accepts_non_residents !== false);
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: SITE_URL },
    { name: "Foreign Investment", url: `${SITE_URL}/foreign-investment` },
    { name: "CFD & Forex" },
  ]);

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: CFD_FAQS.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };

  return (
    <div className="bg-white min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="relative bg-white border-b border-slate-100 overflow-hidden py-8 md:py-12">
        <div className="container-custom">
          <nav className="text-xs text-slate-500 mb-5 flex items-center gap-1.5 flex-wrap">
            <Link href="/" className="hover:text-slate-900">Home</Link>
            <span className="text-slate-300">/</span>
            <Link href="/foreign-investment" className="hover:text-slate-900">Foreign Investment</Link>
            <span className="text-slate-300">/</span>
            <span className="text-slate-900 font-medium">CFD & Forex</span>
          </nav>
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-full text-xs font-semibold text-slate-600 mb-4">
              <span className="w-1.5 h-1.5 bg-amber-400 rounded-full" />
              Non-Residents & International Traders · Updated March 2026
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold leading-[1.1] mb-3 tracking-tight text-slate-900">
              CFD & Forex Trading{" "}
              <span className="text-amber-500">for Non-Residents</span>
              <br />in Australia
            </h1>
            <p className="text-sm md:text-base text-slate-600 leading-relaxed">
              ASIC leverage limits that apply to all retail clients, tax treatment of CFD gains
              for non-residents, negative balance protection, and how to choose between ASIC
              and offshore providers.
            </p>
          </div>
        </div>
      </section>

      <ForeignInvestmentNav current="/foreign-investment/cfd" />

      {/* ── CFD Risk Warning ─────────────────────────────────────────── */}
      <div className="bg-red-50 border-b border-red-200">
        <div className="container-custom py-4">
          <p className="text-xs text-red-800 leading-relaxed font-medium">{CFD_WARNING}</p>
        </div>
      </div>

      {/* ── Key callouts ─────────────────────────────────────────────── */}
      <section className="py-8 bg-slate-50">
        <div className="container-custom">
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl border border-green-200 p-5">
              <p className="text-xs font-bold text-green-800 uppercase tracking-wide mb-1">Max Leverage (Retail)</p>
              <p className="text-xl font-black text-green-700">30:1</p>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">ASIC leverage cap on major forex pairs for all retail clients. Applies equally to non-residents.</p>
            </div>
            <div className="bg-white rounded-2xl border border-amber-200 p-5">
              <p className="text-xs font-bold text-amber-800 uppercase tracking-wide mb-1">Broker Access</p>
              <p className="text-xl font-black text-amber-700">Generally Open</p>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">Most ASIC-regulated CFD brokers accept non-residents with passport + overseas address — no Australian address required.</p>
            </div>
            <div className="bg-white rounded-2xl border border-red-200 p-5">
              <p className="text-xs font-bold text-red-800 uppercase tracking-wide mb-1">Tax (CFD Gains)</p>
              <p className="text-xl font-black text-red-700">Complex</p>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">CFD profits may be Australian-sourced income for non-residents. Unlike share CGT — no automatic exemption. Get tax advice.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── ASIC Leverage Limits Table ───────────────────────────────── */}
      <section className="py-12 md:py-16">
        <div className="container-custom">
          <SectionHeading
            eyebrow="Leverage limits"
            title="ASIC leverage limits for retail CFD clients"
            sub="Applies to all retail clients of ASIC-regulated providers — including non-residents. Wholesale clients may access higher leverage with an accountant's certificate."
          />
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-left px-4 py-3 text-xs font-bold text-slate-600 uppercase tracking-wide">Market / Asset Class</th>
                  <th className="text-center px-4 py-3 text-xs font-bold text-slate-600 uppercase tracking-wide">Max Leverage</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-slate-600 uppercase tracking-wide hidden md:table-cell">Examples</th>
                </tr>
              </thead>
              <tbody>
                {ASIC_LEVERAGE_LIMITS.map((row, i) => (
                  <tr key={i} className={`border-b border-slate-100 last:border-0 ${i % 2 === 1 ? "bg-slate-50/40" : ""}`}>
                    <td className="px-4 py-3 font-medium text-slate-900 text-xs">{row.market}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-sm font-black ${row.color === "green" ? "text-green-700" : row.color === "amber" ? "text-amber-700" : "text-red-700"}`}>
                        {row.limit}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 hidden md:table-cell">{row.examples}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-slate-400 leading-relaxed">
            Source: ASIC Product Intervention Order (2021). Leverage limits apply to all retail clients. Crypto CFDs capped at 2:1 under a separate ASIC intervention.
          </p>
        </div>
      </section>

      {/* ── CFD Broker Eligibility ───────────────────────────────────── */}
      {brokers.length > 0 && (
        <section className="py-12 md:py-16 bg-slate-50">
          <div className="container-custom">
            <SectionHeading
              eyebrow="Broker eligibility"
              title="ASIC-regulated CFD brokers open to non-residents"
              sub="Most ASIC-regulated CFD providers accept non-residents with a valid passport and overseas address. Verify current policy directly."
            />
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {acceptingBrokers.slice(0, 9).map((b) => (
                <div key={b.id} className="bg-white rounded-xl border border-green-200 p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ backgroundColor: b.color || "#334155" }}>
                      {b.name.charAt(0)}
                    </div>
                    <span className="font-bold text-sm text-slate-900">{b.name}</span>
                    {b.regulated_by && (
                      <span className="ml-auto text-xs bg-blue-100 text-blue-700 font-bold px-2 py-0.5 rounded-full">{b.regulated_by}</span>
                    )}
                  </div>
                  {b.foreign_investor_notes && (
                    <p className="text-xs text-slate-500 leading-relaxed">{b.foreign_investor_notes}</p>
                  )}
                  {b.affiliate_url && (
                    <Link href={b.affiliate_url} target="_blank" rel="noopener noreferrer" className="mt-3 block text-center text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 rounded-lg py-2 transition-colors">
                      Visit {b.name}
                    </Link>
                  )}
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs text-slate-400 leading-relaxed">{BROKER_NON_RESIDENT_NOTE}</p>
            <div className="mt-4">
              <Link href="/best/foreign-investors" className="text-sm font-bold text-amber-600 hover:text-amber-700">
                Best platforms for all foreign investors &rarr;
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ── Content Sections ─────────────────────────────────────────── */}
      <section className="py-12 md:py-16 bg-slate-50">
        <div className="container-custom max-w-3xl">
          <SectionHeading
            eyebrow="Complete guide"
            title="CFD & forex for non-residents — full detail"
          />
          <div className="space-y-10">
            {CFD_SECTIONS.map((section) => (
              <div key={section.heading}>
                <h3 className="text-base font-extrabold text-slate-900 mb-3">{section.heading}</h3>
                <div className="text-sm text-slate-600 leading-relaxed space-y-3">
                  {section.body.split("\n\n").map((para, i) => (
                    <p key={i}>{para}</p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Negative Balance Protection callout ──────────────────────── */}
      <section className="py-8">
        <div className="container-custom max-w-3xl">
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5">
            <p className="text-xs font-bold text-blue-800 uppercase tracking-wide mb-2">ASIC Consumer Protection</p>
            <p className="text-sm text-slate-700 leading-relaxed">{NEGATIVE_BALANCE_PROTECTION}</p>
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────── */}
      <section className="py-12 md:py-16 bg-slate-50">
        <div className="container-custom max-w-3xl">
          <SectionHeading eyebrow="Questions" title="Frequently asked questions" />
          <div className="space-y-4">
            {CFD_FAQS.map((faq) => (
              <details key={faq.question} className="group bg-white rounded-xl border border-slate-200">
                <summary className="px-5 py-4 text-sm font-bold text-slate-900 cursor-pointer list-none flex items-center justify-between hover:bg-slate-50 rounded-xl transition-colors">
                  {faq.question}
                  <span className="text-slate-400 group-open:rotate-180 transition-transform text-base ml-3">⌄</span>
                </summary>
                <div className="px-5 pb-4 text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
                  {faq.answer}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────── */}
      <section className="py-10 bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="container-custom flex flex-col sm:flex-row items-center gap-6 justify-between">
          <div>
            <h2 className="text-lg font-extrabold text-white mb-1">Compare CFD & forex brokers</h2>
            <p className="text-slate-400 text-sm">See all ASIC-regulated CFD providers including fees, platforms, and leverage options.</p>
          </div>
          <div className="flex gap-3 shrink-0">
            <Link href="/cfd-trading" className="px-5 py-3 bg-amber-500 hover:bg-amber-400 text-white font-bold rounded-xl text-sm transition-colors whitespace-nowrap">
              Compare CFD Brokers
            </Link>
            <Link href="/foreign-investment" className="px-5 py-3 border border-slate-600 hover:border-slate-400 text-slate-300 font-semibold rounded-xl text-sm transition-colors whitespace-nowrap">
              ← Back to Hub
            </Link>
          </div>
        </div>
      </section>

      {/* ── Disclaimer ───────────────────────────────────────────────── */}
      <section className="py-6 bg-slate-50 border-t border-slate-200">
        <div className="container-custom">
          <p className="text-xs text-slate-400 leading-relaxed">{FOREIGN_INVESTOR_GENERAL_DISCLAIMER}</p>
        </div>
      </section>
    </div>
  );
}
