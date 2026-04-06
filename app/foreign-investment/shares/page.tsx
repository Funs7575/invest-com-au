import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { breadcrumbJsonLd, SITE_URL } from "@/lib/seo";
import { BROKER_NON_RESIDENT_NOTE, FOREIGN_INVESTOR_GENERAL_DISCLAIMER, WITHHOLDING_TAX_NOTE } from "@/lib/compliance";
import type { Broker } from "@/lib/types";
import ForeignInvestmentNav from "../ForeignInvestmentNav";
import SectionHeading from "@/components/SectionHeading";

export const metadata: Metadata = {
  title: "Investing in Australian Shares as a Non-Resident — 2026 Guide — Invest.com.au",
  description:
    "Can non-residents buy Australian shares? Which brokers accept non-residents? How withholding tax works on dividends, CGT exemption for non-residents, CHESS sponsorship, and W-8BEN for US shares. Updated March 2026.",
  openGraph: {
    title: "Australian Share Investing for Non-Residents — 2026",
    description:
      "Which brokers accept non-residents, how dividend withholding tax works, the CGT exemption on shares, and what documents you need.",
    url: `${SITE_URL}/foreign-investment/shares`,
    images: [
      {
        url: `/api/og?title=${encodeURIComponent("Australian Shares for Non-Residents")}&sub=${encodeURIComponent("Broker Eligibility · WHT · CGT Exemption · 2026")}`,
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: `${SITE_URL}/foreign-investment/shares` },
};

export const revalidate = 43200;

const SHARES_SECTIONS = [
  {
    heading: "Can non-residents buy Australian shares?",
    body: "Yes — there is no legal restriction on non-residents owning Australian company shares or ETFs. The ASX is open to international investors. The practical challenge is finding an Australian broker that accepts non-residents, as most domestic retail brokers require an Australian residential address. Interactive Brokers is the standout option for true non-residents without an Australian address.",
  },
  {
    heading: "What non-residents need to open a brokerage account",
    body: "Whether or not an Australian address is required varies by broker. You will always need:\n\n• Valid passport (or other government photo ID)\n• Your residential address (Australian or international depending on broker)\n• Tax File Number (TFN) — or a declaration that you are a non-resident for tax purposes\n• In many cases: source of funds documentation for large transfers\n• For US shares: a W-8BEN form (certifying you are a non-US person)\n\nProvide your TFN or non-resident declaration upfront. If you don't, the broker must withhold at the highest marginal rate on dividends.",
  },
  {
    heading: "Dividend withholding tax — the key variable",
    body: "When Australian companies pay dividends to non-residents:\n\n• Unfranked dividends: 30% withholding tax (reduced by DTA — e.g. 15% for US and UK residents)\n• Fully franked dividends: 0% withholding tax (the company has already paid 30% corporate tax)\n• Partially franked: 30% applied only to the unfranked portion\n\nMost major Australian blue-chip companies (CBA, BHP, Woolworths, etc.) pay fully or substantially franked dividends — making them much more attractive for non-resident investors than unfranked equivalents.\n\nImportant: non-residents receive the grossed-up dividend but cannot claim the franking credit refund that Australian residents receive. The imputation system provides no benefit beyond zero withholding on the franked portion.",
  },
  {
    heading: "Capital gains tax — the big advantage for non-residents",
    body: "This is often the most surprising rule for non-resident investors: non-residents are generally EXEMPT from Australian CGT on gains from selling listed Australian company shares.\n\nThe exemption (Section 855-10 of ITAA 1997) applies where the non-resident holds less than 10% of the company (a 'portfolio investment'). This covers virtually all retail and even most institutional non-resident investors.\n\nThe exemption does NOT apply to:\n• Direct interests of ≥10% in an Australian company\n• Shares in 'land-rich' companies (where ≥50% of assets are Australian real property)\n• Assets used in carrying on an Australian business\n\nThe practical result: a non-resident can buy and sell Australian listed shares (ETFs, blue-chips, small-caps) without any Australian CGT on the profit. This can be a significant structural advantage for long-term investors from countries with low capital gains tax rates.",
  },
  {
    heading: "CHESS sponsorship for non-residents",
    body: "CHESS sponsorship is available to non-residents where the broker supports it. CHESS gives you direct ownership of shares registered in your own name on the ASX register, rather than through the broker's custodial account.\n\nFor non-residents, CHESS provides additional security — if the broker fails, CHESS-sponsored holdings are legally yours and can be transferred to another broker. Non-CHESS (custodial) accounts add counterparty risk.\n\nNote: most brokers that accept non-residents (notably Interactive Brokers) use custodial models, not CHESS. Custodial accounts at regulated, well-capitalised brokers are generally safe, but the direct ownership benefit of CHESS is not available.",
  },
  {
    heading: "US shares and the W-8BEN form",
    body: "If you invest in US shares through an Australian broker, you will be asked to complete a W-8BEN form. This certifies that you are a non-US person, which entitles you to the DTA-reduced US dividend withholding rate (15% for Australian residents, rather than the default 30%).\n\nFor non-residents of Australia investing in US shares via an Australian broker, the W-8BEN situation is more complex — the broker may require Australian tax residency to file the W-8BEN on your behalf. Interactive Brokers handles this directly regardless of residence.\n\nUS capital gains for non-US persons are generally not subject to US tax — the US does not tax portfolio capital gains of non-resident aliens on listed securities.",
  },
];

const SHARES_FAQS = [
  {
    question: "Which Australian brokers accept non-residents without an Australian address?",
    answer: "Interactive Brokers is the primary option for genuine non-residents without an Australian address — it operates in 200+ countries. Most domestic Australian brokers (CommSec, Stake, Moomoo, nabtrade, Selfwealth) require an Australian residential address.",
  },
  {
    question: "Do I pay CGT in Australia when I sell Australian shares as a non-resident?",
    answer: "Generally no. Section 855-10 of the ITAA 1997 exempts non-residents from Australian CGT on disposals of shares in Australian listed companies, provided the holding is less than 10% of the company. This is the main structural advantage of non-resident status for share investors. You may still owe CGT in your home country.",
  },
  {
    question: "How is dividend withholding tax deducted?",
    answer: "Withholding tax is deducted automatically by the company's share registry or paying agent before the dividend is credited to your brokerage account. You don't need to do anything — but you need to ensure your broker has your correct residency status on file. If you haven't declared your non-residency, the broker may withhold at the wrong rate.",
  },
  {
    question: "Can I get a refund of Australian withholding tax on dividends?",
    answer: "No. Withholding tax on dividends and interest for non-residents is a final tax — there is no way to reclaim it through an Australian tax return. However, you may be able to claim a foreign income tax offset in your home country for Australian withholding tax paid (depending on your home country's tax rules).",
  },
  {
    question: "Do I need a TFN to invest in Australian shares as a non-resident?",
    answer: "You don't need a TFN, but you must provide your TFN or a declaration that you are a non-resident for tax purposes. If you provide neither, the broker must withhold at the top marginal rate on dividends. Declare your non-residency to ensure the correct withholding rate is applied.",
  },
];

async function getBrokers(): Promise<Broker[]> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("brokers")
      .select("id, name, slug, color, logo_url, cta_text, affiliate_url, rating, accepts_non_residents, accepts_temporary_residents, requires_australian_address, foreign_investor_notes, min_deposit, chess_sponsored, regulated_by, platform_type, deal, editors_pick, status")
      .eq("platform_type", "share_broker")
      .eq("status", "active")
      .order("rating", { ascending: false });
    return (data ?? []) as unknown as Broker[];
  } catch {
    return [];
  }
}

export default async function ForeignSharesPage() {
  const brokers = await getBrokers();

  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: SITE_URL },
    { name: "Foreign Investment", url: `${SITE_URL}/foreign-investment` },
    { name: "Shares" },
  ]);

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: SHARES_FAQS.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };

  // Separate brokers by eligibility
  const acceptNonResidents = brokers.filter((b) => (b as any).accepts_non_residents === true);
  const acceptTempOnly = brokers.filter((b) => (b as any).accepts_non_residents === false && (b as any).accepts_temporary_residents === true);
  const unknown = brokers.filter((b) => (b as any).accepts_non_residents === null);

  return (
    <div className="bg-white min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      <ForeignInvestmentNav current="/foreign-investment/shares" />

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="relative bg-white border-b border-slate-100 overflow-hidden py-8 md:py-12">
        <div className="container-custom">
          <nav className="text-xs text-slate-500 mb-5 flex items-center gap-1.5 flex-wrap">
            <Link href="/" className="hover:text-slate-900">Home</Link>
            <span className="text-slate-300">/</span>
            <Link href="/foreign-investment" className="hover:text-slate-900">Foreign Investment</Link>
            <span className="text-slate-300">/</span>
            <span className="text-slate-900 font-medium">Australian Shares</span>
          </nav>
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-full text-xs font-semibold text-slate-600 mb-4">
              <span className="w-1.5 h-1.5 bg-amber-400 rounded-full" />
              Non-Residents & Temp Visa Holders · Updated March 2026
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold leading-[1.1] mb-3 tracking-tight text-slate-900">
              Investing in{" "}
              <span className="text-amber-500">Australian Shares</span>
              <br />as a Non-Resident
            </h1>
            <p className="text-sm md:text-base text-slate-600 leading-relaxed">
              Which brokers accept non-residents, how dividend withholding tax works, the CGT
              exemption that makes Australian shares attractive for non-residents, and the
              documents you need.
            </p>
          </div>
        </div>
      </section>

      {/* ── Key callout boxes ────────────────────────────────────────── */}
      <section className="py-8 bg-slate-50">
        <div className="container-custom">
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl border border-green-200 p-5">
              <p className="text-xs font-bold text-green-800 uppercase tracking-wide mb-1">CGT Advantage</p>
              <p className="text-xl font-black text-green-700">0% CGT</p>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">Non-residents generally exempt from Australian CGT on listed shares (Section 855-10). CGT may still apply in home country.</p>
            </div>
            <div className="bg-white rounded-2xl border border-amber-200 p-5">
              <p className="text-xs font-bold text-amber-800 uppercase tracking-wide mb-1">Unfranked Dividends</p>
              <p className="text-xl font-black text-amber-700">30% WHT</p>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">Reduced to typically 15% under DTA (USA, UK, NZ, etc.). Fully franked dividends: 0%.</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">Broker Access</p>
              <p className="text-xl font-black text-slate-700">Limited</p>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">Most AU domestic brokers require Australian address. Interactive Brokers accepts global non-residents.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Broker Eligibility Table ─────────────────────────────────── */}
      <section className="py-12 md:py-16">
        <div className="container-custom">
          <SectionHeading
            eyebrow="Broker eligibility"
            title="Which share brokers accept non-residents?"
            sub="Eligibility is based on each broker's published T&Cs. Verify directly before opening an account — policies change."
          />

          {acceptNonResidents.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-bold text-green-800 mb-3 flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full" />
                Accepts non-residents (no Australian address required)
              </h3>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {acceptNonResidents.map((b) => (
                  <div key={b.id} className="bg-white rounded-xl border-2 border-green-200 p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ backgroundColor: b.color || "#334155" }}>
                        {b.name.charAt(0)}
                      </div>
                      <span className="font-bold text-sm text-slate-900">{b.name}</span>
                    </div>
                    {(b as any).foreign_investor_notes && (
                      <p className="text-xs text-slate-500 leading-relaxed">{(b as any).foreign_investor_notes}</p>
                    )}
                    {b.affiliate_url && (
                      <Link href={b.affiliate_url} target="_blank" rel="noopener noreferrer" className="mt-3 block text-center text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 rounded-lg py-2 transition-colors">
                        Visit {b.name}
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {acceptTempOnly.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-bold text-amber-800 mb-3 flex items-center gap-2">
                <span className="w-2 h-2 bg-amber-500 rounded-full" />
                Temporary visa holders in Australia only (Australian address required)
              </h3>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {acceptTempOnly.map((b) => (
                  <div key={b.id} className="bg-white rounded-xl border border-amber-200 p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ backgroundColor: b.color || "#334155" }}>
                        {b.name.charAt(0)}
                      </div>
                      <span className="font-bold text-sm text-slate-900">{b.name}</span>
                    </div>
                    {(b as any).foreign_investor_notes && (
                      <p className="text-xs text-slate-500 leading-relaxed">{(b as any).foreign_investor_notes}</p>
                    )}
                    {b.affiliate_url && (
                      <Link href={b.affiliate_url} target="_blank" rel="noopener noreferrer" className="mt-3 block text-center text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg py-2 transition-colors">
                        Visit {b.name}
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {unknown.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-slate-500 mb-3 flex items-center gap-2">
                <span className="w-2 h-2 bg-slate-400 rounded-full" />
                Eligibility not confirmed — verify directly
              </h3>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {unknown.slice(0, 6).map((b) => (
                  <div key={b.id} className="bg-white rounded-xl border border-slate-200 p-4 opacity-70">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ backgroundColor: b.color || "#334155" }}>
                        {b.name.charAt(0)}
                      </div>
                      <span className="font-bold text-sm text-slate-900">{b.name}</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-2">Eligibility not confirmed. Contact broker directly.</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <p className="mt-4 text-xs text-slate-400 leading-relaxed">{BROKER_NON_RESIDENT_NOTE}</p>
          <div className="mt-4">
            <Link href="/compare" className="text-sm font-bold text-amber-600 hover:text-amber-700">
              Compare all share trading platforms &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* ── Content Sections ─────────────────────────────────────────── */}
      <section className="py-12 md:py-16 bg-slate-50">
        <div className="container-custom max-w-3xl">
          <SectionHeading
            eyebrow="Complete guide"
            title="Share investing for non-residents — full detail"
          />
          <div className="space-y-10">
            {SHARES_SECTIONS.map((section) => (
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

      {/* ── FAQ ──────────────────────────────────────────────────────── */}
      <section className="py-12 md:py-16">
        <div className="container-custom max-w-3xl">
          <SectionHeading eyebrow="Questions" title="Frequently asked questions" />
          <div className="space-y-4">
            {SHARES_FAQS.map((faq) => (
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
            <h2 className="text-lg font-extrabold text-white mb-1">Compare share brokers</h2>
            <p className="text-slate-400 text-sm">See all platforms including fees, features, and our eligibility ratings.</p>
          </div>
          <div className="flex gap-3 shrink-0">
            <Link href="/share-trading" className="px-5 py-3 bg-amber-500 hover:bg-amber-400 text-white font-bold rounded-xl text-sm transition-colors whitespace-nowrap">
              Compare Brokers
            </Link>
            <Link href="/foreign-investment" className="px-5 py-3 border border-slate-600 hover:border-slate-400 text-slate-300 font-semibold rounded-xl text-sm transition-colors whitespace-nowrap">
              ← Back to Hub
            </Link>
          </div>
        </div>
      </section>

      <section className="py-6 bg-slate-50 border-t border-slate-200">
        <div className="container-custom">
          <p className="text-xs text-slate-400 leading-relaxed">{FOREIGN_INVESTOR_GENERAL_DISCLAIMER} {WITHHOLDING_TAX_NOTE}</p>
        </div>
      </section>
    </div>
  );
}
