import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { breadcrumbJsonLd, SITE_URL } from "@/lib/seo";
import { BROKER_NON_RESIDENT_NOTE, FOREIGN_INVESTOR_GENERAL_DISCLAIMER, CRYPTO_REGULATORY_NOTE } from "@/lib/compliance";
import type { Broker } from "@/lib/types";
import ForeignInvestmentNav from "../ForeignInvestmentNav";
import SectionHeading from "@/components/SectionHeading";

export const metadata: Metadata = {
  title: "Crypto for Non-Residents in Australia — AUSTRAC, KYC & Tax — 2026 Guide",
  description:
    "Can non-residents use Australian crypto exchanges? AUSTRAC KYC requirements, CGT treatment for non-residents, which exchanges accept non-residents, and Australian crypto tax rules. Updated March 2026.",
  openGraph: {
    title: "Australian Crypto for Non-Residents — AUSTRAC, KYC & Tax — 2026",
    description:
      "Which AUSTRAC-registered exchanges accept non-residents, enhanced KYC requirements, and the complex CGT treatment of crypto for non-residents.",
    url: `${SITE_URL}/foreign-investment/crypto`,
    images: [
      {
        url: `/api/og?title=${encodeURIComponent("Crypto for Non-Residents in Australia")}&sub=${encodeURIComponent("AUSTRAC · KYC · CGT Rules · Exchange Eligibility · 2026")}`,
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: `${SITE_URL}/foreign-investment/crypto` },
};

export const revalidate = 43200;

const CRYPTO_SECTIONS = [
  {
    heading: "Can non-residents use Australian crypto exchanges?",
    body: "Yes — most major AUSTRAC-registered Australian crypto exchanges accept non-resident users. Unlike share brokers, crypto exchanges generally don't require an Australian residential address. The key requirement is identity verification (KYC): a valid passport and overseas address are sufficient for most platforms.",
  },
  {
    heading: "AUSTRAC registration — what it means for non-residents",
    body: "All crypto exchanges operating in Australia must be registered with AUSTRAC (Australian Transaction Reports and Analysis Centre) as a Digital Currency Exchange (DCE). This registration requires the exchange to implement Know Your Customer (KYC) and Anti-Money Laundering (AML) procedures.\n\nFor non-residents, this means stricter identity verification than for Australian residents:\n\n• Passport and high-quality photo — no expired documents\n• Overseas residential address verification\n• For larger transactions or high volumes: source of funds documentation\n• Liveness checks (selfie with ID) are standard\n• Some exchanges perform enhanced due diligence (EDD) for high-risk jurisdictions\n\nAUSTRAC's requirements mean Australian-based exchanges have strong identity verification — which actually provides users with greater regulatory protections than some offshore alternatives.",
  },
  {
    heading: "CGT on crypto for non-residents — a grey area",
    body: "The CGT treatment of cryptocurrency gains for non-residents is legally complex and not yet definitively resolved by Australian courts or ATO rulings. The key question is whether crypto is 'taxable Australian property' (TAP) — the category for which non-residents CANNOT claim the standard CGT exemption.\n\nThe ATO's view and most tax practitioners' interpretation is that most cryptocurrency held on Australian exchanges is NOT taxable Australian property — it is not Australian land or an interest in an Australian entity. This means non-residents should generally be exempt from Australian CGT on crypto gains under Section 855-10.\n\nHowever, this is not black-letter law. DeFi positions, NFTs, and more exotic assets are even less clear.\n\nThe more important practical point: even if Australian CGT doesn't apply, your home country will almost certainly tax crypto gains. Don't assume tax-free — get advice on your home country's treatment.",
  },
  {
    heading: "Offshore exchanges vs. AUSTRAC-registered exchanges",
    body: "Non-residents have a wider choice than Australian residents — you can use both Australian AUSTRAC-registered exchanges AND offshore exchanges (Binance global, Kraken, Bybit, OKX, etc.).\n\nConsiderations when choosing:\n\nAUSTRAC-registered exchanges:\n• Regulated by Australian law — consumer protections apply\n• AUD deposits via bank transfer (PayID, BPAY, OSKO)\n• Liquidity for AUD trading pairs\n• ATO data-sharing — the ATO can obtain transaction records\n\nOffshore exchanges:\n• Wider range of assets (more altcoins, higher leverage)\n• Non-Australian regulatory oversight\n• Usually require USD or stablecoin deposits (no AUD)\n• ATO has data-sharing agreements with many global exchanges — don't assume privacy",
  },
  {
    heading: "ATO data-sharing — implications for non-residents",
    body: "The ATO participates in the OECD's Common Reporting Standard (CRS) and has bilateral data-sharing agreements with tax authorities in 100+ countries. This means:\n\n• Crypto exchanges in Australia report transaction data to the ATO\n• The ATO shares information with foreign tax authorities\n• Your home country's tax authority may receive data about your Australian crypto activity\n\nThis does not mean you owe Australian tax — but it does mean your home country tax authority may know about your Australian crypto holdings and gains. Declare appropriately in your home country.",
  },
];

const CRYPTO_FAQS = [
  {
    question: "Do non-residents pay Australian tax on crypto gains?",
    answer: "Based on the current ATO interpretation and most tax practitioners' views, non-residents are generally NOT subject to Australian CGT on crypto gains — crypto is not 'taxable Australian property'. However, this is not settled law. More importantly, you will likely owe tax on crypto gains in your home country. Get local tax advice.",
  },
  {
    question: "Do I need an Australian bank account to use an Australian crypto exchange?",
    answer: "Not necessarily. Most AUSTRAC-registered exchanges can receive international wire transfers or stablecoin deposits. However, AUD PayID/BPAY deposits require an Australian bank account — which is convenient for Australian residents and temporary visa holders.",
  },
  {
    question: "Is there GST on crypto purchases for non-residents?",
    answer: "The ATO treats most cryptocurrency as an asset, not a currency. There is generally no GST on buying or selling cryptocurrency. However, if you receive crypto as payment for goods or services, different rules may apply. The GST rules are also relevant for businesses — seek advice.",
  },
  {
    question: "What documents do I need to open an account on an Australian crypto exchange?",
    answer: "You will need: (1) a valid passport or government photo ID, (2) proof of residential address (usually a utility bill, bank statement, or government letter within the last 3 months), and (3) for higher verification tiers: a selfie holding your ID and sometimes a source of funds declaration for larger deposits.",
  },
  {
    question: "Can I use an Australian crypto exchange if I'm from a sanctioned country?",
    answer: "No. AUSTRAC-registered exchanges must comply with Australian sanctions law and the Australian Sanctions Office's targeted financial sanctions lists. Residents of sanctioned countries (currently including Russia, North Korea, Iran, Belarus, Myanmar) will not be able to open accounts on Australian exchanges.",
  },
];

async function getBrokers(): Promise<Broker[]> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("brokers")
      .select("id, name, slug, color, logo_url, cta_text, affiliate_url, rating, accepts_non_residents, accepts_temporary_residents, requires_australian_address, foreign_investor_notes, platform_type, status")
      .eq("platform_type", "crypto_exchange")
      .eq("status", "active")
      .order("rating", { ascending: false });
    return (data ?? []) as unknown as Broker[];
  } catch {
    return [];
  }
}

export default async function ForeignCryptoPage() {
  const exchanges = await getBrokers();

  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: SITE_URL },
    { name: "Foreign Investment", url: `${SITE_URL}/foreign-investment` },
    { name: "Crypto" },
  ]);

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: CRYPTO_FAQS.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };

  const acceptingExchanges = exchanges.filter((b) => (b as any).accepts_non_residents !== false);

  return (
    <div className="bg-white min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      <ForeignInvestmentNav current="/foreign-investment/crypto" />

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="relative bg-white border-b border-slate-100 overflow-hidden py-8 md:py-12">
        <div className="container-custom">
          <nav className="text-xs text-slate-500 mb-5 flex items-center gap-1.5 flex-wrap">
            <Link href="/" className="hover:text-slate-900">Home</Link>
            <span className="text-slate-300">/</span>
            <Link href="/foreign-investment" className="hover:text-slate-900">Foreign Investment</Link>
            <span className="text-slate-300">/</span>
            <span className="text-slate-900 font-medium">Crypto</span>
          </nav>
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-full text-xs font-semibold text-slate-600 mb-4">
              <span className="w-1.5 h-1.5 bg-amber-400 rounded-full" />
              AUSTRAC · KYC · Updated March 2026
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold leading-[1.1] mb-3 tracking-tight text-slate-900">
              <span className="text-amber-500">Crypto</span> for Non-Residents{" "}
              <br />in Australia
            </h1>
            <p className="text-sm md:text-base text-slate-600 leading-relaxed">
              Most AUSTRAC-registered exchanges accept non-residents. Learn the KYC requirements,
              understand the CGT grey area, and see which exchanges are most accessible.
            </p>
          </div>
        </div>
      </section>

      {/* ── Key callouts ─────────────────────────────────────────────── */}
      <section className="py-8 bg-slate-50">
        <div className="container-custom">
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl border border-green-200 p-5">
              <p className="text-xs font-bold text-green-800 uppercase tracking-wide mb-1">Exchange Access</p>
              <p className="text-xl font-black text-green-700">Generally Open</p>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">Most AUSTRAC exchanges accept non-residents. Enhanced KYC required.</p>
            </div>
            <div className="bg-white rounded-2xl border border-amber-200 p-5">
              <p className="text-xs font-bold text-amber-800 uppercase tracking-wide mb-1">CGT for Non-Residents</p>
              <p className="text-xl font-black text-amber-700">Likely Exempt</p>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">Crypto likely not 'taxable Australian property' — but not settled law. Home country CGT still applies.</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">Withholding Tax</p>
              <p className="text-xl font-black text-slate-700">None</p>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">No Australian withholding tax applies to crypto transactions. CGT may apply in home country.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Exchange Eligibility ─────────────────────────────────────── */}
      {acceptingExchanges.length > 0 && (
        <section className="py-12 md:py-16">
          <div className="container-custom">
            <SectionHeading
              eyebrow="Exchange eligibility"
              title="Australian crypto exchanges open to non-residents"
              sub="AUSTRAC-registered exchanges that accept international users. Verify directly — policies can change."
            />
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {acceptingExchanges.slice(0, 9).map((b) => (
                <div key={b.id} className="bg-white rounded-xl border border-green-200 p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ backgroundColor: b.color || "#334155" }}>
                      {b.name.charAt(0)}
                    </div>
                    <span className="font-bold text-sm text-slate-900">{b.name}</span>
                    <span className="ml-auto text-xs bg-green-100 text-green-700 font-bold px-2 py-0.5 rounded-full">AUSTRAC ✓</span>
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
            <p className="mt-4 text-xs text-slate-400 leading-relaxed">{BROKER_NON_RESIDENT_NOTE}</p>
          </div>
        </section>
      )}

      {/* ── Content Sections ─────────────────────────────────────────── */}
      <section className="py-12 md:py-16 bg-slate-50">
        <div className="container-custom max-w-3xl">
          <SectionHeading
            eyebrow="Complete guide"
            title="Crypto investing for non-residents — full detail"
          />
          <div className="space-y-10">
            {CRYPTO_SECTIONS.map((section) => (
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
            {CRYPTO_FAQS.map((faq) => (
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
            <h2 className="text-lg font-extrabold text-white mb-1">Compare all crypto exchanges</h2>
            <p className="text-slate-400 text-sm">Full comparison of AUSTRAC-registered exchanges with fees, features, and supported assets.</p>
          </div>
          <div className="flex gap-3 shrink-0">
            <Link href="/crypto" className="px-5 py-3 bg-amber-500 hover:bg-amber-400 text-white font-bold rounded-xl text-sm transition-colors whitespace-nowrap">
              Compare Exchanges
            </Link>
            <Link href="/foreign-investment" className="px-5 py-3 border border-slate-600 hover:border-slate-400 text-slate-300 font-semibold rounded-xl text-sm transition-colors whitespace-nowrap">
              ← Back to Hub
            </Link>
          </div>
        </div>
      </section>

      <section className="py-6 bg-slate-50 border-t border-slate-200">
        <div className="container-custom">
          <p className="text-xs text-slate-400 leading-relaxed">{FOREIGN_INVESTOR_GENERAL_DISCLAIMER} {CRYPTO_REGULATORY_NOTE}</p>
        </div>
      </section>
    </div>
  );
}
