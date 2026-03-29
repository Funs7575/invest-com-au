import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, UPDATED_LABEL } from "@/lib/seo";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";
import SectionHeading from "@/components/SectionHeading";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `Best Bond ETFs Australia (${CURRENT_YEAR}) — Fixed Income ETFs Compared`,
  description: `Compare the best Australian bond and fixed income ETFs: VAF, IAF, BOND, CRED, FLOT and more. Government bonds, corporate bonds, and cash ETFs analysed by yield, duration, and credit quality. ${UPDATED_LABEL}.`,
  openGraph: {
    title: `Best Bond ETFs Australia (${CURRENT_YEAR}) — Fixed Income ETF Guide`,
    description: "Complete guide to bond and fixed income ETFs in Australia. Compare government bonds, corporate bonds, and inflation-linked ETFs.",
    url: `${SITE_URL}/etfs/bonds`,
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: `${SITE_URL}/etfs/bonds` },
};

const BOND_ETFS = [
  {
    ticker: "VAF",
    name: "Vanguard Australian Fixed Interest ETF",
    provider: "Vanguard",
    index: "Bloomberg AusBond Composite 0+ Yr Index",
    mer: "0.20%",
    aum: "$3.8B",
    yield: "~4.1%",
    duration: "~6.5 years",
    creditQuality: "AAA / Government",
    type: "Australian Bonds (Broad)",
    pros: [
      "Broad diversification across government and semi-government bonds",
      "Largest Australian bond ETF — excellent liquidity",
      "Low credit risk — mostly AAA-rated government bonds",
      "Natural portfolio hedge against equity market downturns",
    ],
    cons: [
      "Interest rate sensitive — rises in rates reduce unit price",
      "Lower yield than corporate bond ETFs",
      "Returns are lower than equities over the long run",
    ],
    verdict: "The core building block for fixed income exposure in an Australian portfolio. Reliable, liquid, and low-risk.",
  },
  {
    ticker: "IAF",
    name: "iShares Core Composite Bond ETF",
    provider: "BlackRock iShares",
    index: "Bloomberg AusBond Composite 0+ Yr Index",
    mer: "0.15%",
    aum: "$2.1B",
    yield: "~4.1%",
    duration: "~6.5 years",
    creditQuality: "AAA / Government",
    type: "Australian Bonds (Broad)",
    pros: [
      "Slightly cheaper MER than VAF",
      "Same index as VAF — near-identical performance",
      "BlackRock's institutional-grade management",
      "Strong liquidity and AUM",
    ],
    cons: [
      "Similar interest rate sensitivity to VAF",
      "Returns are income-focused, not capital growth",
    ],
    verdict: "The cheapest way to access broad Australian bond market exposure. Essentially interchangeable with VAF.",
  },
  {
    ticker: "BOND",
    name: "PIMCO Australian Short-Term Bond ETF",
    provider: "PIMCO",
    index: "Actively managed",
    mer: "0.49%",
    aum: "$620M",
    yield: "~4.6%",
    duration: "~1.5 years",
    creditQuality: "Investment Grade",
    type: "Short-Duration Active",
    pros: [
      "Short duration means lower interest rate risk",
      "Active management by PIMCO — a global bond specialist",
      "Higher yield than passive broad-market funds",
      "Less price volatility than long-duration bond ETFs",
    ],
    cons: [
      "Higher MER for an active fund",
      "Active risk — manager can underperform",
      "Less transparent holdings than passive index ETFs",
    ],
    verdict: "Good choice for investors wanting income with low interest rate risk. The PIMCO brand adds credibility for active bond management.",
  },
  {
    ticker: "CRED",
    name: "BetaShares Australian Investment Grade Corporate Bond ETF",
    provider: "Betashares",
    index: "Solactive Australian Investment Grade Corporate Bond Select Index",
    mer: "0.25%",
    aum: "$480M",
    yield: "~4.8%",
    duration: "~4.5 years",
    creditQuality: "BBB to AAA (Corporate)",
    type: "Corporate Bonds",
    pros: [
      "Higher yield than government bond ETFs",
      "Investment-grade only — avoids junk bonds",
      "Diversified across Australian corporate issuers",
      "Good for income-focused portfolios",
    ],
    cons: [
      "Higher credit risk than government bond ETFs",
      "Corporate bonds correlate more with equities in stress periods",
      "Smaller AUM than VAF/IAF means wider spreads",
    ],
    verdict: "For investors seeking higher income than government bonds can offer while maintaining investment-grade credit quality.",
  },
  {
    ticker: "FLOT",
    name: "VanEck Australian Floating Rate ETF",
    provider: "VanEck",
    index: "Bloomberg AusBond Credit FRN 0+ Yr Index",
    mer: "0.22%",
    aum: "$890M",
    yield: "~5.0%",
    duration: "~0.2 years",
    creditQuality: "Investment Grade (floating rate notes)",
    type: "Floating Rate Notes",
    pros: [
      "Minimal interest rate sensitivity — floats with the RBA cash rate",
      "Yields rise when rates rise (unlike fixed-rate bonds)",
      "Low price volatility",
      "Attractive in rising or high rate environments",
    ],
    cons: [
      "Yields fall when rates fall — the flip side of floating rate",
      "Less diversification benefit vs equities than traditional bonds",
      "Niche product — best understood as a cash-plus return",
    ],
    verdict: "An excellent option in a high or rising interest rate environment. Protects against rate risk that affects standard bond ETFs.",
  },
];

const SECTIONS = [
  {
    heading: "Why hold bonds in your portfolio?",
    body: `Bond ETFs serve a fundamentally different purpose to share ETFs. Rather than seeking capital growth, bonds provide income, stability, and — crucially — protection when equity markets fall.

**The core role of bonds:**
During severe equity market drawdowns (GFC 2008-09, COVID crash March 2020), high-quality government bond ETFs typically rise or hold steady while share prices fall sharply. This is the 'flight to safety' effect: when investors panic, they sell shares and buy government bonds, pushing bond prices up. For a balanced portfolio, this negative correlation reduces volatility and can improve risk-adjusted returns.

**How bond ETFs work:**
When you buy a bond ETF, you're buying a fund that holds a portfolio of individual bonds. Each bond pays a fixed interest rate (coupon) and returns the principal at maturity. The ETF pools hundreds of bonds with different maturities and reinvests as bonds mature, maintaining a consistent average duration.

Bond ETF prices move inversely with interest rates. When rates rise, existing bond prices fall (newer bonds pay more, making existing ones less attractive). When rates fall, bond prices rise. This is why bond ETFs suffered in 2022-23 when the RBA raised rates aggressively.

**Bond ETFs vs term deposits:**
Many Australian investors choose term deposits instead of bond ETFs. Key differences:
- Term deposits are fixed-term (you're locked in). Bond ETFs are liquid (sell anytime on ASX).
- Term deposits are government-guaranteed up to $250K per institution. Bond ETFs are not (though government bond ETFs hold actual government bonds, which carry similar implicit security).
- Bond ETFs provide more diversification. Term deposits provide certainty of return.
- For portfolios above $500K, bond ETFs are typically more tax-efficient than multiple term deposits.`,
  },
  {
    heading: "Duration: the most important number in bond investing",
    body: `Duration measures a bond ETF's sensitivity to interest rate changes. Specifically, it approximates the percentage change in price for each 1% change in interest rates.

**Practical example:**
VAF has a duration of approximately 6.5 years. If interest rates rise by 1%, VAF's price falls by approximately 6.5%. If rates fall by 1%, VAF's price rises by approximately 6.5%.

**Duration and your portfolio strategy:**
- **Short duration (0–2 years):** Low interest rate sensitivity. Suitable for investors nervous about rate movements. Lower yield but more stable price. Examples: FLOT, BOND.
- **Medium duration (3–5 years):** Balanced approach. Moderate rate sensitivity, moderate yield.
- **Long duration (7+ years):** High interest rate sensitivity but highest yield and most defensive benefit during equity crashes. Examples: VGB (government bonds to 10+ years).

**The 2022–23 lesson:**
Australian bond ETFs suffered meaningful losses in 2022-23 as the RBA raised the cash rate from 0.10% to 4.35%. VAF fell approximately 8–10% in price during this period. Investors who understood duration weren't surprised — the maths worked exactly as expected. Short-duration ETFs like FLOT outperformed dramatically during this period.

**Matching duration to your time horizon:**
If you need to access funds in 2 years, a long-duration bond ETF creates unnecessary risk. Match the approximate duration of your bond ETF to your investment time horizon.`,
  },
  {
    heading: "Government bonds vs corporate bonds — which is better?",
    body: `The choice between government and corporate bond ETFs is a classic risk-return trade-off.

**Government bond ETFs (VAF, IAF, VGB):**
- Issued by the Australian federal and state governments
- Effectively zero credit risk — the Australian government has never defaulted
- Lower yields than corporate bonds
- Provide the strongest portfolio diversification benefit against equities
- Best choice for genuine defensive allocation

**Corporate bond ETFs (CRED, IHCB):**
- Issued by Australian and international companies
- Higher yields compensate for credit risk (risk of default)
- Investment-grade corporate bonds (BBB to AAA) have low but non-zero default risk
- Correlate more with equities during market stress — reducing the diversification benefit
- Appropriate for income-focused portfolios where yield is the priority

**High-yield bonds (caution):**
High-yield (junk) bond ETFs offer the highest yields but correlate almost perfectly with equities during market downturns — providing essentially no diversification benefit. Most Australian investors are better served by investment-grade bonds for their fixed income allocation and equities for growth.

**The practical recommendation:**
For most Australian investors, a simple split between VAF or IAF (broad Australian bonds) and a corporate bond ETF like CRED provides a good balance of yield and defensiveness. Aim for 60-70% government/semi-government and 30-40% corporate bonds within your fixed income allocation.`,
  },
];

const FAQS = [
  {
    question: "Are bond ETFs safe?",
    answer: "Government bond ETFs like VAF and IAF are among the safest investments available — they hold bonds backed by the Australian government, which has never defaulted. However, 'safe' doesn't mean 'no risk.' Bond prices fall when interest rates rise. If you hold VAF for 10 years, you'll almost certainly earn a positive return. If you need to sell after rates have just spiked, you may sell at a loss. Short-duration bond ETFs like FLOT carry significantly less interest rate risk.",
  },
  {
    question: "What is the typical yield on Australian bond ETFs?",
    answer: `In 2026, Australian government bond ETFs yield approximately 4.0–4.5% per annum (reflecting the RBA cash rate environment). Corporate bond ETFs yield 4.5–5.5%. Floating rate ETFs like FLOT yield close to the RBA cash rate plus a small spread. These yields fluctuate as interest rates change — when rates rise, new bonds pay more, so the effective yield on bond ETFs increases over time as the portfolio is refreshed.`,
  },
  {
    question: "Should I hold bonds inside or outside super?",
    answer: "Bond income is taxed at your marginal rate outside super, or at 15% (or 0% in pension phase) inside super. For most working Australians in the 32.5%+ tax bracket, holding bond ETFs inside super (via a platform or SMSF) is significantly more tax-efficient than outside super. This is the opposite of the recommendation for franked equities, which are more tax-efficient outside super for many investors.",
  },
  {
    question: "How do bond ETFs pay income?",
    answer: "Bond ETFs distribute income (interest payments from the underlying bonds) typically monthly or quarterly. Unlike equity ETFs which pay dividends with franking credits, bond distributions are unfranked interest income taxed at your full marginal rate. This is why bonds are often described as 'less tax-efficient' than Australian equity ETFs for investors outside super.",
  },
  {
    question: "What percentage of my portfolio should be in bonds?",
    answer: "Traditional guidance suggests holding your age as a percentage in bonds (e.g. 40% bonds at age 40). Modern approaches are more nuanced — a 40-year-old with a high risk tolerance and long investment horizon might hold only 10–20% in bonds. Key factors: your time horizon, income stability, tolerance for portfolio volatility, and whether you need regular income from investments. Speak with a financial adviser for personalised asset allocation advice.",
  },
  {
    question: "How did bond ETFs perform during COVID and the rate rises?",
    answer: "During the COVID crash (Feb-March 2020), VAF rose approximately 2-3% as investors fled to safety — demonstrating the defensive benefit of government bonds. During the 2022-23 rate hiking cycle, VAF fell approximately 8-10% as rates rose sharply from 0.10% to 4.35%. Short-duration ETFs like FLOT held up much better. This illustrates that the defensive value of bonds is most apparent during equity market crashes, but they carry real interest rate risk when central banks tighten.",
  },
];

export default function BondETFsPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: SITE_URL },
    { name: "ETFs", url: `${SITE_URL}/etfs` },
    { name: "Bond & Fixed Income ETFs" },
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
            <span className="text-slate-300">Bond & Fixed Income ETFs</span>
          </nav>
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-500/20 border border-slate-500/30 rounded-full text-xs font-semibold text-slate-300 mb-4">
              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full" />
              Fixed Income · {UPDATED_LABEL}
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold leading-[1.1] mb-3 tracking-tight">
              Best Bond ETFs Australia{" "}
              <span className="text-amber-400">({CURRENT_YEAR})</span>
            </h1>
            <p className="text-sm md:text-base text-slate-300 leading-relaxed max-w-2xl">
              Compare the best Australian bond and fixed income ETFs — government bonds, corporate bonds,
              floating rate notes, and short-duration options. Yield, duration, credit quality, and MER analysed independently.
            </p>
            <div className="flex flex-wrap gap-3 mt-5">
              <Link href="/etfs" className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-lg transition-colors border border-white/20">
                ← All ETF Categories
              </Link>
              <Link href="/etfs/dividends" className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-lg transition-colors border border-white/20">
                Dividend ETFs →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Callouts */}
      <section className="py-8 bg-slate-50 border-b border-slate-200">
        <div className="container-custom">
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">RBA Cash Rate (2026)</p>
              <p className="text-xl font-black text-slate-900">~4.10%</p>
              <p className="text-xs text-slate-600 mt-1">Sets the floor for short-duration bond yields. Government bond ETFs yield 4–4.5%.</p>
            </div>
            <div className="bg-white rounded-2xl border border-amber-200 p-5">
              <p className="text-xs font-bold text-amber-800 uppercase tracking-wide mb-1">VAF Duration</p>
              <p className="text-xl font-black text-amber-700">~6.5 years</p>
              <p className="text-xs text-slate-600 mt-1">A 1% rate rise reduces VAF price by ~6.5%. Duration is the key number for bond ETF investors.</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">Lowest MER</p>
              <p className="text-xl font-black text-slate-900">0.15% (IAF)</p>
              <p className="text-xs text-slate-600 mt-1">iShares Core Composite Bond ETF — the cheapest broad Australian bond exposure.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ETF Comparison Cards */}
      <section className="py-10 md:py-14">
        <div className="container-custom">
          <SectionHeading
            eyebrow="Bond ETF Comparison"
            title="Australian Bond & Fixed Income ETFs"
            sub="Key metrics and independent analysis for the most popular Australian bond ETFs."
          />
          <div className="mt-8 space-y-6">
            {BOND_ETFS.map((etf) => (
              <div key={etf.ticker} className="bg-white border border-slate-200 rounded-2xl p-6 hover:shadow-md transition-shadow">
                <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-mono text-lg font-black text-slate-900 bg-slate-100 px-3 py-1 rounded-lg">{etf.ticker}</span>
                      <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded font-semibold">{etf.type}</span>
                    </div>
                    <p className="text-sm font-semibold text-slate-700">{etf.name}</p>
                    <p className="text-xs text-slate-500">{etf.provider} · {etf.index}</p>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                    {[
                      { label: "MER", value: etf.mer },
                      { label: "AUM", value: etf.aum },
                      { label: "Yield", value: etf.yield },
                      { label: "Duration", value: etf.duration },
                    ].map((m) => (
                      <div key={m.label} className="bg-slate-50 rounded-xl p-2.5">
                        <p className="text-xs text-slate-500 mb-0.5">{m.label}</p>
                        <p className="text-sm font-bold text-slate-900">{m.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-xs font-bold text-green-700 mb-1.5">Pros</p>
                    <ul className="space-y-1">
                      {etf.pros.map((p) => (
                        <li key={p} className="text-xs text-slate-600 flex items-start gap-1.5">
                          <span className="text-green-500 mt-0.5 shrink-0">✓</span>{p}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-red-700 mb-1.5">Cons</p>
                    <ul className="space-y-1">
                      {etf.cons.map((c) => (
                        <li key={c} className="text-xs text-slate-600 flex items-start gap-1.5">
                          <span className="text-red-400 mt-0.5 shrink-0">✗</span>{c}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                  <p className="text-xs font-bold text-amber-800 mb-1">Our Take</p>
                  <p className="text-xs text-slate-700 leading-relaxed">{etf.verdict}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Editorial */}
      <section className="py-10 bg-slate-50">
        <div className="container-custom max-w-3xl">
          <SectionHeading eyebrow="Bond ETF Guide" title="Everything You Need to Know About Bond ETFs" />
          <div className="mt-8 space-y-10">
            {SECTIONS.map((sec) => (
              <div key={sec.heading}>
                <h2 className="text-lg font-extrabold text-slate-900 mb-3">{sec.heading}</h2>
                <div className="prose prose-sm max-w-none text-slate-600 leading-relaxed">
                  {sec.body.split("\n\n").map((para, i) => (
                    <p key={i} className="mb-3 last:mb-0 whitespace-pre-line">{para}</p>
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
          <SectionHeading eyebrow="FAQ" title="Bond ETF Questions Answered" />
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

      {/* Related */}
      <section className="py-10 bg-slate-50 border-t border-slate-200">
        <div className="container-custom">
          <SectionHeading eyebrow="Related ETFs" title="Explore Other ETF Categories" />
          <div className="mt-6 grid sm:grid-cols-3 gap-4">
            {[
              { title: "ASX 200 ETFs", href: "/etfs/asx-200", icon: "🇦🇺", desc: "VAS, A200, STW, IOZ" },
              { title: "Dividend ETFs", href: "/etfs/dividends", icon: "💰", desc: "VHY, HVST, SYI, ZYAU" },
              { title: "US Market ETFs", href: "/etfs/us-exposure", icon: "🇺🇸", desc: "IVV, NDQ, QUS, VTS" },
            ].map((cat) => (
              <Link key={cat.href} href={cat.href} className="group bg-white border border-slate-200 rounded-xl p-5 hover:border-amber-300 hover:shadow-sm transition-all">
                <div className="text-2xl mb-2">{cat.icon}</div>
                <p className="text-sm font-bold text-slate-900 group-hover:text-amber-700 mb-1">{cat.title}</p>
                <p className="text-xs text-slate-500 font-mono">{cat.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-12 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
        <div className="container-custom text-center max-w-xl">
          <h2 className="text-xl font-extrabold mb-3">Ready to add bonds to your portfolio?</h2>
          <p className="text-sm text-slate-300 mb-6">
            Compare brokers that offer ASX-listed bond ETFs with low brokerage and no platform fees.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/best/etfs" className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm rounded-xl transition-colors">
              Best ETF Brokers →
            </Link>
            <Link href="/etfs" className="px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold text-sm rounded-xl transition-colors">
              All ETF Categories →
            </Link>
          </div>
        </div>
      </section>

      <section className="py-6 bg-slate-100 border-t border-slate-200">
        <div className="container-custom max-w-3xl">
          <p className="text-xs text-slate-500 leading-relaxed">{GENERAL_ADVICE_WARNING}</p>
        </div>
      </section>
    </div>
  );
}
