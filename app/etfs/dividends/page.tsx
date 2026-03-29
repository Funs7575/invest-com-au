import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, UPDATED_LABEL } from "@/lib/seo";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";
import SectionHeading from "@/components/SectionHeading";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `Best Dividend ETFs Australia (${CURRENT_YEAR}) — VHY, HVST, SYI, ZYAU Compared`,
  description: `Compare the best high-yield dividend ETFs for Australian investors: VHY, HVST, SYI, ZYAU. Distribution yields, franking, MER fees, and income strategies explained. ${UPDATED_LABEL}.`,
  openGraph: {
    title: `Best Dividend ETFs Australia (${CURRENT_YEAR})`,
    description: "High-yield dividend ETF comparison for income-focused Australian investors.",
    url: `${SITE_URL}/etfs/dividends`,
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: `${SITE_URL}/etfs/dividends` },
};

const DIVIDEND_ETFS = [
  {
    ticker: "VHY",
    name: "Vanguard Australian Shares High Yield ETF",
    provider: "Vanguard",
    index: "FTSE Australia High Dividend Yield Index",
    mer: "0.25%",
    grossYield: "~5.5–6.5%",
    franking: "~85%",
    aum: "$3.2B",
    frequency: "Quarterly",
    holdings: "~60",
    pros: ["High franking credits (~85%)", "Focus on quality dividend payers", "Large AUM and excellent liquidity", "Excludes REITs (different tax treatment)"],
    cons: ["Higher MER than VAS (0.25% vs 0.07%)", "Concentrated in banks and resources", "~60 holdings is relatively concentrated vs VAS's 305"],
    verdict: "The most popular dividend ETF for Australian income investors. Strong franking credit ratio makes it very tax-efficient for resident investors.",
  },
  {
    ticker: "HVST",
    name: "Betashares Australian Dividend Harvester Fund",
    provider: "Betashares",
    index: "Active management / covered call overlay",
    mer: "0.90%",
    grossYield: "~7.5–9.0%",
    franking: "~70%",
    aum: "$850M",
    frequency: "Monthly",
    pros: ["Monthly income distributions (popular for retirees)", "Higher gross yield than VHY via covered call strategy", "Actively managed to maximise income"],
    cons: ["Highest MER in category (0.90%)", "Covered call strategy limits capital growth upside", "Active management adds complexity and cost", "Long-term total return typically lags passive alternatives"],
    verdict: "For retirees needing maximum monthly income. The covered call strategy provides very high distributions but at the cost of long-term growth potential.",
  },
  {
    ticker: "SYI",
    name: "SPDR MSCI Australia Select High Dividend Yield ETF",
    provider: "State Street SPDR",
    index: "MSCI Australia Select High Dividend Yield Index",
    mer: "0.35%",
    grossYield: "~5.0–6.0%",
    franking: "~75%",
    aum: "$430M",
    frequency: "Semi-annual",
    pros: ["Quality screen — excludes companies with unsustainable dividends", "MSCI methodology with earnings growth criteria", "State Street (SSgA) backing"],
    cons: ["Higher MER than VHY", "Semi-annual distributions (less frequent than VHY)", "Smaller AUM means slightly wider spreads"],
    verdict: "A quality-screened alternative to VHY. The MSCI methodology filters out dividend traps, but the higher MER and less frequent distributions make VHY more practical for most investors.",
  },
  {
    ticker: "ZYAU",
    name: "Enhanced Income Australian Shares ETF",
    provider: "Betashares",
    index: "Active / covered call on ASX 200",
    mer: "0.70%",
    grossYield: "~6.5–8.0%",
    franking: "~65%",
    aum: "$380M",
    frequency: "Monthly",
    pros: ["Monthly distributions", "Covered call strategy boosts yield above standard ETFs", "ASX 200 core exposure"],
    cons: ["High MER (0.70%)", "Growth-capped by covered call strategy", "Complex product not suitable for simple investors"],
    verdict: "Another covered call income ETF. Similar positioning to HVST but different methodology. Suitable for income-maximising retirees willing to sacrifice growth.",
  },
];

const SECTIONS = [
  {
    heading: "How dividend ETFs generate income",
    body: `Australian dividend ETFs generate income in two ways:

**1. Dividends from underlying holdings:** The ETF collects dividends paid by its portfolio of high-yielding Australian companies and distributes them to unitholders. High dividend ETFs typically hold banks (CBA, NAB, WBC, ANZ), Telstra, Wesfarmers, Woodside, and other large ASX dividend payers.

**2. Franking credits:** One of the major advantages of Australian dividend ETFs. Companies pay corporate tax (30%) before distributing dividends, and the tax paid flows to investors as franking credits. VHY typically carries ~85% franking credit ratio — one of the highest in any ASX ETF category. These credits directly offset your personal tax liability.

**Covered call income ETFs (HVST, ZYAU):** These ETFs go further by writing (selling) call options against their portfolio of shares. This generates option premium income on top of dividends, significantly boosting the stated yield. The trade-off: if the share market rallies strongly, the covered calls are exercised and the ETF's capital upside is capped. This explains why covered call ETFs often lag the market in rising markets but perform better in flat or falling markets.`,
  },
  {
    heading: "Grossed-up yield — the real return calculation",
    body: `The stated distribution yield is only part of the picture for Australian dividend ETFs. Franking credits add significant tax value that isn't reflected in the headline yield.

**Example with VHY:**
- Stated distribution yield: ~5.5%
- Franking credit ratio: ~85%
- Additional franking credit value: ~1.5–2.0%
- Grossed-up effective yield: ~7.0–7.5% (for a taxpayer who can fully utilise franking credits)

For a retiree with income below the tax-free threshold ($18,200), franking credits can result in a cash refund from the ATO — making the effective yield even higher than the grossed-up calculation.

For high-income taxpayers (45% marginal rate), franking credits still offset tax but the reduction from 45% to the net payable rate provides less relative benefit than for lower-income investors.

**International dividend ETFs:** International high-yield ETFs (like WVOL or IHD) do not carry franking credits. For Australian tax residents, a 5% grossed-up Australian dividend ETF often beats a 6% international dividend ETF after tax.`,
  },
  {
    heading: "Dividend ETFs for retirees — what to consider",
    body: `Dividend ETFs are particularly popular with retirees because they provide regular income without needing to sell assets. Key considerations:

**Distribution frequency matters:** Monthly distributions (HVST, ZYAU) allow better cash flow management for retirees paying regular expenses. Quarterly distributions (VHY) are less frequent but the ETF has lower fees and better long-term total return potential.

**Total return vs income focus:** Maximising income through covered call ETFs (HVST, ZYAU) typically reduces long-term capital growth. If your goal is to preserve capital for decades, a standard index ETF with regular distributions (VHY or even VAS) may preserve more wealth than a yield-maximising covered call ETF.

**Tax efficiency in superannuation:** In pension phase (account-based pension), investment income and capital gains are tax-free. Franking credits can be refunded or carried forward within super funds. This makes VHY (with high franking) extremely tax-efficient for SMSF pensioners.

**Income variability:** Dividend ETF distributions are not fixed — they vary based on the dividends paid by underlying companies. Banks and miners may reduce dividends during economic downturns. Covered call ETFs have more stable distributions due to option premium income, but the option income itself varies with market volatility.`,
  },
];

const FAQS = [
  {
    question: "What is the highest-yielding ETF in Australia?",
    answer: "Covered call ETFs like HVST (Betashares Dividend Harvester) and ZYAU (Enhanced Income ETF) offer the highest stated distribution yields — typically 7–9%+ gross. However, these higher yields come from covered call option premiums that cap capital growth. For total return investors, VHY at 5.5–6.5% gross with strong franking often delivers better long-term outcomes.",
  },
  {
    question: "Is VHY better than VAS for income?",
    answer: "VHY provides higher current income than VAS: ~5.5–6.5% yield vs ~3.8–4.2% for VAS, with higher franking credit ratios. However, VAS has a broader 300-stock portfolio, lower MER (0.07% vs 0.25%), and typically better long-term total return due to more diversified exposure. VHY is better for income-focused investors; VAS is better for total return investors.",
  },
  {
    question: "How are dividend ETF distributions taxed?",
    answer: "Dividend ETF distributions include ordinary dividend income (taxed at your marginal rate with franking credit offsets), capital gains (if the ETF realises gains on portfolio rebalancing — discounted rate applies), and sometimes return of capital (not immediately taxable but reduces cost base). Your broker or the ETF provider issues an annual tax statement detailing the composition of each distribution.",
  },
  {
    question: "Can I live off dividend ETF income in retirement?",
    answer: "Possibly, depending on your portfolio size and spending needs. A $1M portfolio in VHY at 5.5% gross yield generates approximately $55,000/year in distributions. With franking credits (grossed up to ~$70,000) and depending on your tax situation, this could cover moderate retirement expenses. For a sustainable income strategy, advisors typically suggest maintaining a cash buffer of 1–2 years expenses and drawing from distributions, avoiding forced selling during market downturns.",
  },
  {
    question: "What is the ex-dividend date and why does it matter?",
    answer: "The ex-dividend date is the date by which you must own the ETF to receive the next distribution. If you buy on or after the ex-dividend date, you won't receive that distribution. For Australian dividend ETFs, the ex-dividend date is typically a few weeks before the payment date. Buying just before ex-dividend means you receive the distribution but the ETF's price typically drops by approximately the distribution amount on the ex-dividend date — so there's no 'free money' in timing purchases around distributions.",
  },
];

export default function DividendETFPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: SITE_URL },
    { name: "ETFs", url: `${SITE_URL}/etfs` },
    { name: "Dividend ETFs" },
  ]);

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };

  return (
    <div className="bg-white min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      {/* Hero */}
      <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white py-10 md:py-14">
        <div className="container-custom">
          <nav className="text-xs text-slate-400 mb-5 flex items-center gap-1.5 flex-wrap">
            <Link href="/" className="hover:text-slate-200">Home</Link>
            <span>/</span>
            <Link href="/etfs" className="hover:text-slate-200">ETFs</Link>
            <span>/</span>
            <span className="text-slate-300">Dividend ETFs</span>
          </nav>
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-500/20 border border-green-500/30 rounded-full text-xs font-semibold text-green-300 mb-4">
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full" />
              Dividend ETFs · {UPDATED_LABEL}
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold leading-[1.1] mb-3 tracking-tight">
              Best Dividend ETFs Australia{" "}
              <span className="text-amber-400">({CURRENT_YEAR})</span>
            </h1>
            <p className="text-sm md:text-base text-slate-300 leading-relaxed">
              Compare VHY, HVST, SYI, and ZYAU — the best high-yield Australian ETFs for income investors.
              We analyse gross yields, franking credits, MER, distribution frequency, and which suits retirees vs accumulation investors.
            </p>
          </div>
        </div>
      </section>

      {/* Callouts */}
      <section className="py-8 bg-slate-50 border-b border-slate-200">
        <div className="container-custom">
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl border border-green-200 p-5">
              <p className="text-xs font-bold text-green-800 uppercase tracking-wide mb-1">VHY Gross Yield</p>
              <p className="text-xl font-black text-green-700">~5.5–6.5%</p>
              <p className="text-xs text-slate-600 mt-1">Grossed-up to ~7.5% after franking credits</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">Highest Yield ETF</p>
              <p className="text-xl font-black text-slate-900">~7.5–9%</p>
              <p className="text-xs text-slate-600 mt-1">HVST covered-call strategy boosts income above standard dividends</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">VHY Franking</p>
              <p className="text-xl font-black text-slate-900">~85%</p>
              <p className="text-xs text-slate-600 mt-1">One of the highest franking credit ratios of any Australian ETF</p>
            </div>
          </div>
        </div>
      </section>

      {/* ETF Cards */}
      <section className="py-10 md:py-14">
        <div className="container-custom">
          <SectionHeading eyebrow="ETF Comparison" title="Australian Dividend ETFs Compared" sub="Data approximate — always verify with the ETF provider." />
          <div className="mt-8 space-y-6">
            {DIVIDEND_ETFS.map((etf, i) => (
              <div key={etf.ticker} className="bg-white border border-slate-200 rounded-2xl p-6 hover:shadow-md transition-shadow">
                <div className="flex flex-wrap items-start gap-3 mb-4">
                  {i === 0 && (
                    <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs font-bold rounded-full border border-green-200 shrink-0">
                      Best for Most Investors
                    </span>
                  )}
                  {(etf.ticker === "HVST" || etf.ticker === "ZYAU") && (
                    <span className="px-2 py-0.5 bg-purple-100 text-purple-800 text-xs font-bold rounded-full border border-purple-200 shrink-0">
                      Covered Call Strategy
                    </span>
                  )}
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-black font-mono text-slate-900">{etf.ticker}</span>
                    <span className="text-sm text-slate-500">{etf.name}</span>
                  </div>
                  <div className="ml-auto flex gap-2 flex-wrap">
                    <span className="text-xs bg-green-50 text-green-800 px-2 py-1 rounded font-semibold border border-green-200">Yield: {etf.grossYield}</span>
                    <span className="text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded font-semibold">MER: {etf.mer}</span>
                  </div>
                </div>

                <div className="grid sm:grid-cols-4 gap-3 mb-4 text-xs">
                  <div><span className="text-slate-400 block mb-0.5">Franking ~</span><span className="font-semibold text-slate-700">{etf.franking}</span></div>
                  <div><span className="text-slate-400 block mb-0.5">AUM</span><span className="font-semibold text-slate-700">{etf.aum}</span></div>
                  <div><span className="text-slate-400 block mb-0.5">Distributions</span><span className="font-semibold text-slate-700">{etf.frequency}</span></div>
                  <div><span className="text-slate-400 block mb-0.5">Holdings</span><span className="font-semibold text-slate-700">{etf.holdings}</span></div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-xs font-bold text-green-700 mb-1">Pros</p>
                    <ul className="space-y-0.5">
                      {etf.pros.map((p) => (
                        <li key={p} className="text-xs text-slate-600 flex items-start gap-1">
                          <span className="text-green-500 shrink-0 mt-0.5">✓</span> {p}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-red-600 mb-1">Cons</p>
                    <ul className="space-y-0.5">
                      {etf.cons.map((c) => (
                        <li key={c} className="text-xs text-slate-600 flex items-start gap-1">
                          <span className="text-red-400 shrink-0 mt-0.5">✗</span> {c}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
                  <span className="text-amber-500 shrink-0">⭐</span>
                  <p className="text-xs text-amber-900 font-medium">{etf.verdict}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Editorial */}
      <section className="py-10 md:py-12 bg-slate-50">
        <div className="container-custom max-w-3xl">
          <SectionHeading eyebrow="Deep Dive" title="Dividend ETF Analysis" />
          <div className="mt-8 space-y-10">
            {SECTIONS.map((sec) => (
              <div key={sec.heading}>
                <h2 className="text-lg font-extrabold text-slate-900 mb-3">{sec.heading}</h2>
                <div className="text-sm text-slate-600 leading-relaxed space-y-3">
                  {sec.body.split("\n\n").map((para, i) => (
                    <p key={i} className="whitespace-pre-line">{para}</p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQs */}
      <section className="py-10 md:py-12">
        <div className="container-custom max-w-2xl">
          <SectionHeading eyebrow="FAQ" title="Dividend ETF Questions" />
          <div className="mt-6 divide-y divide-slate-200">
            {FAQS.map((faq) => (
              <details key={faq.question} className="py-4 group">
                <summary className="text-sm font-semibold text-slate-900 cursor-pointer list-none flex items-center justify-between gap-2">
                  {faq.question}
                  <span className="text-slate-400 group-open:rotate-180 transition-transform shrink-0">▾</span>
                </summary>
                <p className="mt-3 text-sm text-slate-600 leading-relaxed">{faq.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-12 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
        <div className="container-custom text-center max-w-xl">
          <h2 className="text-xl font-extrabold mb-3">Start investing in dividend ETFs</h2>
          <p className="text-sm text-slate-300 mb-6">Compare brokers with low brokerage for ASX-listed ETFs.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/best/etfs" className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm rounded-xl transition-colors">
              Best ETF Brokers →
            </Link>
            <Link href="/best/retirees" className="px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold text-sm rounded-xl transition-colors">
              Best for Retirees →
            </Link>
          </div>
        </div>
      </section>

      <section className="py-6 bg-slate-100 border-t border-slate-200">
        <div className="container-custom max-w-3xl">
          <p className="text-xs text-slate-500 leading-relaxed">{GENERAL_ADVICE_WARNING} ETF yields, franking, and AUM are approximate and change over time. Verify with ETF providers.</p>
        </div>
      </section>
    </div>
  );
}
