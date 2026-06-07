import type { Metadata } from "next";
import Link from "next/link";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, UPDATED_LABEL } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";
import SectionHeading from "@/components/SectionHeading";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `Best Dividend ETFs Australia (${CURRENT_YEAR}) — Income, Yield & Franking Compared`,
  description: `Compare the best income and dividend ETFs for Australian investors: VHY, IHD, SYI, RDV. Distribution yields, franking credits, grossed-up returns, MER fees, and tax treatment explained. ${UPDATED_LABEL}.`,
  openGraph: {
    title: `Best Dividend ETFs Australia (${CURRENT_YEAR})`,
    description: "Dividend and income ETF comparison for income-focused Australian investors — yield, franking, and tax.",
    url: `${SITE_URL}/etfs/dividends`,
    images: [{ url: `/api/og?title=${encodeURIComponent("Dividend ETFs Australia")}&sub=${encodeURIComponent("Yield · Franking · Income · 2026")}`, width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: `${SITE_URL}/etfs/dividends` },
};

// ─── Comparison table data ──────────────────────────────────────
interface DividendEtf {
  ticker: string;
  name: string;
  provider: string;
  mer: string;
  yield: string;
  franking: string;
  note: string;
  type: "high-yield" | "active" | "diversified" | "esg";
}

const DIVIDEND_ETFS: DividendEtf[] = [
  {
    ticker: "VHY",
    name: "Vanguard Australian Shares High Yield ETF",
    provider: "Vanguard",
    mer: "0.25%",
    yield: "~5.5%",
    franking: "High",
    note: "The default income holding for most Australian investors — large, liquid, low fee, and heavily franked.",
    type: "high-yield",
  },
  {
    ticker: "IHD",
    name: "iShares S&P/ASX Dividend Opportunities ETF",
    provider: "iShares (BlackRock)",
    mer: "0.30%",
    yield: "~5%",
    franking: "High",
    note: "Screens the ASX for sustainable, high-yielding payers. A close substitute for VHY with a slightly different methodology.",
    type: "high-yield",
  },
  {
    ticker: "SYI",
    name: "SPDR MSCI Australia Select High Dividend Yield ETF",
    provider: "State Street SPDR",
    mer: "0.35%",
    yield: "~5%",
    franking: "High",
    note: "MSCI quality screen aims to exclude dividend traps — companies whose high yield reflects a falling price.",
    type: "high-yield",
  },
  {
    ticker: "RDV",
    name: "BetaShares Australian Dividend Harvester Fund",
    provider: "BetaShares",
    mer: "0.90% (active)",
    yield: "High distribution",
    franking: "Franking + options",
    note: "Actively managed with a covered-call (options) overlay to lift distributions. Highest fee in the group; growth is capped.",
    type: "active",
  },
  {
    ticker: "DHHF",
    name: "BetaShares Diversified All Growth ETF",
    provider: "BetaShares",
    mer: "0.19%",
    yield: "Lower (growth)",
    franking: "Partial",
    note: "Not a dividend ETF — a 100% growth, all-in-one global + Australian portfolio. Listed here only to contrast: it favours total return over income.",
    type: "diversified",
  },
  {
    ticker: "FAIR / ETHI",
    name: "BetaShares Sustainability Leaders ETFs",
    provider: "BetaShares",
    mer: "0.49% / 0.59%",
    yield: "Modest + franking (FAIR)",
    franking: "FAIR: AU franking · ETHI: none",
    note: "ESG-screened. FAIR (Australian) still passes through franking; ETHI (global) does not. Income is a secondary feature, not the goal.",
    type: "esg",
  },
];

// ─── Editorial sections (markdown-ish, rendered as paragraphs) ──
const SECTIONS: { heading: string; body: string }[] = [
  {
    heading: "How dividend ETFs work",
    body: `A dividend ETF holds a basket of high-dividend-yielding shares — typically large, profitable, cash-generative companies that return a big slice of earnings to shareholders. In Australia that universe is dominated by the major banks, miners, supermarkets, Telstra, and Wesfarmers.

The ETF collects the dividends paid by every company it holds, then passes them through to you as distributions. Crucially for Australian investors, it also passes through the franking credits attached to those dividends. Most Australian dividend ETFs distribute quarterly, so the income arrives in four lumps across the year.

The central trade-off is yield versus growth. A company paying out 80–90% of its earnings as dividends has little left to reinvest in expansion, so its share price tends to grow more slowly than a company that retains and reinvests its profits. A dividend ETF therefore tilts your portfolio toward current income and away from capital growth — a sensible tilt for a retiree drawing on the portfolio, and a questionable one for a 30-year-old who has decades for growth to compound.`,
  },
  {
    heading: "Franking credits — the hidden yield boost",
    body: `Franking credits are the single biggest reason Australian dividend ETFs are more attractive to local investors than international equivalents. Australian companies pay 30% corporate tax (25% for base-rate entities) before distributing profits. The tax already paid is attached to the dividend as a franking credit, and it flows straight through the ETF to you.

The headline distribution yield understates the real, after-tax return because it ignores those credits. The grossed-up yield adds them back. As a rough illustration: a fully franked 5.5% cash yield grosses up to roughly 7% once the attached franking credits are included. That gap is real money — it either reduces the tax you owe on the distribution or, for low-rate investors, comes back as a refund.

We explain the mechanics, worked examples, and refund rules in detail on our dedicated guide to franking credits.`,
  },
  {
    heading: "Yield versus total return — beware the dividend trap",
    body: `It is tempting to rank dividend ETFs purely by headline yield, but yield is not return. Total return is the sum of income (distributions) and capital growth (the change in unit price). A 6% yielding ETF whose price falls 2% a year has delivered a 4% total return; a 4% yielding broad-market ETF whose price rises 5% has delivered 9%.

The "dividend trap" is the failure mode of yield-chasing. A share's yield rises mechanically when its price falls, so a screen that simply buys the highest yielders can load up on structurally declining businesses whose dividends are about to be cut. Quality-screened products (SYI, IHD) try to filter these out, but no screen is perfect.

The practical comparison is against a plain broad-market ETF such as VAS (Vanguard Australian Shares, tracking the ASX 300). VAS yields less — closer to 3.5–4% — but it is broader, cheaper (0.07% MER), and historically delivers stronger total return because it is not tilted away from growth. For an accumulating investor, VAS usually wins on total return; for an investor who specifically values income today, the higher yield of a dividend ETF is the point.`,
  },
  {
    heading: "Distributions and reinvestment",
    body: `Most Australian dividend ETFs distribute quarterly, though some pay semi-annually and a handful of active income funds pay monthly. The distribution is variable, not fixed — it rises and falls with the dividends the underlying companies actually declare.

Many ETFs offer a Dividend Reinvestment Plan (DRP). Instead of receiving cash, your distribution is automatically used to buy more units, often with no brokerage. For an investor still in the accumulation phase, a DRP is a simple way to compound; for a retiree, taking the cash is usually the whole point.

A common misconception: reinvested distributions are still taxable. Even though you never see the cash, the ATO treats a reinvested distribution exactly like a cash one — it is assessable income in the year it is paid, and the franking credits and capital-gains components flow through the same way. The reinvested amount also forms the cost base of the new units you acquire.`,
  },
  {
    heading: "Tax treatment of dividend ETF distributions",
    body: `ETF distributions are assessable income. You include them in your tax return for the financial year in which they were paid (or reinvested). The taxable amount is the grossed-up figure — the cash distribution plus attached franking credits — and the credits then offset your tax payable.

Each year the ETF issues an AMMA (Attribution Managed Investment Trust Member Annual) statement. This breaks the distribution into its components: Australian dividend income, franking credits, interest, capital gains (which may qualify for the CGT discount), and any foreign income with attached foreign tax offsets. You transfer those components into the matching labels of your return. Most ETF providers and brokers make the AMMA available after the end of the financial year, in time for tax lodgement.

Who benefits most from franking? Low-rate and pension-phase investors. An SMSF in pension phase pays 0% tax on earnings, so its franking credits are fully refunded in cash — the franking effectively adds its full value to the return. A high-income investor on the 47% marginal rate still uses the credits to reduce tax, but the relative benefit is smaller. This is why dividend ETFs are most prized inside super pensions and by retirees on low taxable incomes.`,
  },
  {
    heading: "Dividend ETF vs direct dividend shares",
    body: `You can build an income stream by buying high-yielding shares directly — the banks and big miners — instead of a dividend ETF. Both approaches have a place.

A dividend ETF gives you instant diversification across dozens of payers, so a single company slashing its dividend barely moves your income. It passes franking through automatically, requires almost no ongoing effort, and rebalances itself. The cost is the MER and the fact that you cannot tilt toward your own favourites.

Direct shares give you control: you choose exactly which companies you hold, and you can concentrate franking by overweighting the most heavily franked payers (the major banks are the classic example). You pay no MER once you own them, and you can manage capital gains at the individual-security level. The cost is single-company risk and the work of research and monitoring. A DRP is available either way — most large dividend payers and most dividend ETFs both offer one.`,
  },
  {
    heading: "International dividend ETFs",
    body: `Global dividend ETFs hold high-yielding shares from overseas markets. The structural drawback for an Australian investor is franking: foreign companies do not pay Australian corporate tax, so their dividends carry no franking credits. The grossed-up advantage that makes a 5.5% Australian yield so attractive simply does not exist offshore.

Worse, foreign dividends are often subject to withholding tax in the source country before they reach you. The Australian system gives you a Foreign Income Tax Offset (FITO) for that withholding, which prevents double taxation, but it does not replicate the value of franking. The net result is that a 5–6% international dividend yield is usually worth less after tax to an Australian resident than a comparable franked Australian yield.

International dividend ETFs can still play a role for geographic diversification, but for pure income their appeal is materially lower than domestic equivalents. Most investors get their global exposure through broad-market funds (VGS and similar) and source income from Australian holdings.`,
  },
  {
    heading: "Risks of dividend ETFs",
    body: `Sector concentration is the headline risk. The Australian high-yield universe is dominated by financials and resources, so a typical dividend ETF is heavily weighted toward the four major banks and the big miners. You are far less diversified than the index-level holding count suggests — a bank-sector shock or a fall in iron-ore prices hits the whole portfolio.

Interest-rate sensitivity is the second. High-yield equities compete with bonds and term deposits for income-seekers' money. When interest rates rise, the relative attraction of a 5% equity yield falls and high-yield share prices tend to de-rate, so dividend ETFs can underperform in a rising-rate environment.

Dividend cuts in downturns are the third. Distributions are not guaranteed. In the 2020 COVID shock the major banks cut or deferred dividends sharply on regulator guidance, and dividend ETF income fell with them. An income stream built on equity dividends is more variable than many retirees expect.

Finally, capital underperformance versus growth. By design these funds tilt away from high-growth companies, so over long horizons they typically lag broad-market and growth-oriented ETFs on total return. The income comes at the cost of compounding.`,
  },
  {
    heading: "Building an income portfolio",
    body: `A robust retirement income strategy rarely puts everything into a single high-yield ETF. Concentrating in one dividend fund stacks the sector, interest-rate, and dividend-cut risks on top of each other.

A more resilient approach blends sources: a dividend ETF for franked equity income, government and corporate bond ETFs for defensive ballast and predictable coupons, possibly some hybrids for additional yield, and a slice of broad-market or growth exposure so the portfolio keeps compounding through a long retirement.

Many retirees use a bucket approach: hold one to two years of spending in cash, a few years of income-generating assets (dividend and bond ETFs) in a second bucket, and longer-term growth assets in a third. Distributions and the cash bucket fund day-to-day spending, so you avoid being forced to sell growth assets during a market downturn. The dividend ETF is one component of that structure — not the whole of it.`,
  },
];

// ─── FAQ data — keys match the FaqItem { q, a } shape ───────────
const FAQS: { q: string; a: string }[] = [
  {
    q: "What is the best dividend ETF in Australia?",
    a: "There is no single best for everyone, but VHY (Vanguard Australian Shares High Yield) is the most popular default — it is large, liquid, low-cost at 0.25%, yields around 5.5%, and is heavily franked. IHD and SYI are close substitutes that add a quality screen to reduce dividend traps. RDV (BetaShares Dividend Harvester) targets a higher distribution via a covered-call options strategy, but charges 0.90% and caps capital growth. The right choice depends on whether you prioritise low fees, a quality screen, or maximum current income.",
  },
  {
    q: "Do dividend ETFs pay franking credits?",
    a: "Australian dividend ETFs do. They hold ASX-listed companies that pay 30% corporate tax before distributing dividends, and the franking credits attached to those dividends flow through the ETF to you. This is a major advantage for resident investors — a fully franked 5.5% cash yield grosses up to roughly 7% once franking is included. International dividend ETFs do not pay franking credits, because foreign companies are not subject to Australian corporate tax.",
  },
  {
    q: "How often do dividend ETFs pay distributions?",
    a: "Most Australian dividend ETFs distribute quarterly, so income arrives four times a year. Some pay semi-annually, and a few actively managed income funds pay monthly. The amount is variable, not fixed — it rises and falls with the dividends the underlying companies actually declare. Many ETFs also offer a Dividend Reinvestment Plan (DRP) so you can automatically buy more units instead of taking cash.",
  },
  {
    q: "Are dividend ETFs good for retirees?",
    a: "They suit many retirees well. They provide regular, franked income without needing to sell units, and the franking credits are especially valuable in pension phase — an SMSF paying 0% tax on earnings receives the franking back as a cash refund. The caveats are sector concentration (heavy in banks and miners), interest-rate sensitivity, and the fact that distributions can be cut in a downturn, as they were in 2020. A diversified income portfolio, rather than a single high-yield ETF, manages those risks better.",
  },
  {
    q: "Should I choose a high-yield ETF or a broad market ETF?",
    a: "It depends on whether you need income now or want maximum long-term growth. A high-yield ETF like VHY pays more income today but tilts away from growth, so its total return often lags. A broad-market ETF like VAS yields less (around 3.5–4%) but is broader, cheaper at 0.07%, and historically delivers stronger total return. For a retiree drawing on the portfolio, the higher income can be worth the trade-off; for a young accumulator, the growth and tax efficiency of a broad-market or growth ETF usually win.",
  },
];

export default function DividendETFPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: SITE_URL },
    { name: "ETFs", url: `${SITE_URL}/etfs` },
    { name: "Dividend ETFs" },
  ]);

  const faqSchema = faqJsonLd(FAQS.map((f) => ({ q: f.q, a: f.a })));

  return (
    <div className="bg-white min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      {faqSchema && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      )}

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="relative bg-white border-b border-slate-100 overflow-hidden py-8 md:py-12">
        <div className="container-custom">
          <nav aria-label="Breadcrumb" className="text-xs text-slate-500 mb-5 flex items-center gap-1.5 flex-wrap">
            <Link href="/" className="hover:text-slate-900">Home</Link>
            <span>/</span>
            <Link href="/etfs" className="hover:text-slate-900">ETFs</Link>
            <span>/</span>
            <span className="text-slate-900 font-medium">Dividend ETFs</span>
          </nav>
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 border border-slate-200 rounded-full text-xs font-semibold text-slate-600 mb-4">
              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full" />
              Dividend &amp; Income ETFs · {UPDATED_LABEL}
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold leading-[1.1] mb-3 tracking-tight text-slate-900">
              Best Dividend ETFs in Australia{" "}
              <span className="text-amber-600">({CURRENT_YEAR})</span>
            </h1>
            <p className="text-sm md:text-base text-slate-600 leading-relaxed max-w-2xl">
              Dividend ETFs target income-producing shares — the kind of large, profitable companies
              that return a big share of their earnings to investors. They&apos;re popular with retirees
              and income-focused investors because they combine diversification with regular distributions
              and, in Australia, valuable franking credits. We compare yield, franking, fees, and the
              tax treatment that decides who actually benefits.
            </p>
            <div className="flex flex-wrap gap-3 mt-5">
              <Link href="/dividends/franking-credits" className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold rounded-lg transition-colors">
                Franking credits explained →
              </Link>
              <Link href="/etfs" className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg transition-colors border border-slate-200">
                All ETF categories →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Key Callouts ─────────────────────────────────────────────── */}
      <section className="py-8 bg-slate-50 border-b border-slate-200">
        <div className="container-custom">
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl border border-green-200 p-5">
              <p className="text-xs font-bold text-green-800 uppercase tracking-wide mb-1">Typical cash yield</p>
              <p className="text-xl font-black text-green-700">~5–5.5%</p>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">Headline distribution yield on the major Australian dividend ETFs such as VHY.</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">Grossed-up with franking</p>
              <p className="text-xl font-black text-slate-900">~7%</p>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">A fully franked 5.5% cash yield is worth roughly 7% once franking credits are added back.</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">Distribution frequency</p>
              <p className="text-xl font-black text-slate-900">Quarterly</p>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">Most Australian dividend ETFs pay four times a year; a few income funds pay monthly.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Comparison table ─────────────────────────────────────────── */}
      <section className="py-10 md:py-14">
        <div className="container-custom">
          <SectionHeading
            eyebrow="ETF Comparison"
            title="Australian Dividend ETFs Compared"
            sub="Ticker, fee, indicative yield, and franking. Figures are approximate and change over time — always verify with the ETF provider."
          />
          <div className="mt-8 overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
            <table className="w-full min-w-[680px] border-collapse text-sm" aria-label="Australian dividend ETFs comparison">
              <thead>
                <tr className="border-b-2 border-slate-200 text-left">
                  <th scope="col" className="py-3 pr-4 font-bold text-slate-900">ETF</th>
                  <th scope="col" className="py-3 px-4 font-bold text-slate-900">MER</th>
                  <th scope="col" className="py-3 px-4 font-bold text-slate-900">Indicative yield</th>
                  <th scope="col" className="py-3 px-4 font-bold text-slate-900">Franking</th>
                  <th scope="col" className="py-3 pl-4 font-bold text-slate-900">Notes</th>
                </tr>
              </thead>
              <tbody>
                {DIVIDEND_ETFS.map((etf) => (
                  <tr key={etf.ticker} className="border-b border-slate-100 align-top">
                    <td className="py-4 pr-4">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-black text-slate-900">{etf.ticker}</span>
                        {etf.type === "active" && (
                          <span className="px-1.5 py-0.5 bg-purple-100 text-purple-800 text-[10px] font-bold rounded border border-purple-200">Active</span>
                        )}
                        {etf.type === "diversified" && (
                          <span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 text-[10px] font-bold rounded border border-blue-200">Contrast</span>
                        )}
                        {etf.type === "esg" && (
                          <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded border border-emerald-200">ESG</span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">{etf.name}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">{etf.provider}</div>
                    </td>
                    <td className="py-4 px-4 font-semibold text-slate-700 whitespace-nowrap">{etf.mer}</td>
                    <td className="py-4 px-4 font-semibold text-green-700 whitespace-nowrap">{etf.yield}</td>
                    <td className="py-4 px-4 text-slate-700">{etf.franking}</td>
                    <td className="py-4 pl-4 text-xs text-slate-600 leading-relaxed">{etf.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-xs text-slate-500 leading-relaxed">
            DHHF is included only as a contrast — it is a 100% growth, all-in-one diversified ETF, not an income
            product. FAIR and ETHI are ESG-screened; FAIR (Australian) still passes through franking, while ETHI (global) does not.
          </p>
        </div>
      </section>

      {/* ── Franking highlight ───────────────────────────────────────── */}
      <section className="py-10 md:py-12 bg-gradient-to-br from-amber-50 to-white border-y border-amber-100">
        <div className="container-custom max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-100 border border-amber-200 rounded-full text-xs font-bold text-amber-800 mb-4">
            Franking advantage
          </div>
          <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-4">The grossed-up yield is higher than the cash yield</h2>
          <p className="text-sm text-slate-600 leading-relaxed mb-4">
            Australian dividend ETFs pass through the franking credits attached to the dividends they collect.
            Because the headline distribution yield ignores those credits, it understates the real after-tax
            return. The grossed-up yield adds them back.
          </p>
          <div className="grid sm:grid-cols-3 gap-3 mb-4">
            <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
              <p className="text-xs text-slate-500 mb-1">Cash distribution yield</p>
              <p className="text-2xl font-black text-slate-900">5.5%</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
              <p className="text-xs text-slate-500 mb-1">+ Franking credits</p>
              <p className="text-2xl font-black text-amber-600">~1.5%</p>
            </div>
            <div className="bg-white rounded-xl border border-green-200 p-4 text-center">
              <p className="text-xs text-slate-500 mb-1">Grossed-up yield</p>
              <p className="text-2xl font-black text-green-700">~7%</p>
            </div>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed">
            That gap is real money — it either reduces the tax you owe on the distribution or, for low-rate
            investors, comes back as a refund.{" "}
            <Link href="/dividends/franking-credits" className="text-amber-600 hover:text-amber-700 font-semibold">
              See our full guide to franking credits →
            </Link>
          </p>
        </div>
      </section>

      {/* ── Distributions & reinvestment ─────────────────────────────── */}
      <section className="py-10 md:py-12">
        <div className="container-custom max-w-4xl">
          <SectionHeading
            eyebrow="Cash Flow"
            title="Distributions, frequency &amp; reinvestment"
            sub="How the income actually reaches you — and the tax catch on reinvesting it."
          />
          <div className="mt-8 grid sm:grid-cols-3 gap-4">
            <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Frequency</p>
              <p className="text-sm text-slate-700 leading-relaxed">
                Most Australian dividend ETFs pay <span className="font-semibold">quarterly</span> — four
                distributions a year. Some pay semi-annually, and a few actively managed income funds pay monthly.
                The amount is variable, not fixed.
              </p>
            </div>
            <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Reinvestment (DRP)</p>
              <p className="text-sm text-slate-700 leading-relaxed">
                Many ETFs offer a <span className="font-semibold">Dividend Reinvestment Plan</span>. Instead of
                cash, your distribution buys more units — often with no brokerage. Great for accumulators; most
                retirees take the cash.
              </p>
            </div>
            <div className="bg-amber-50 rounded-2xl border border-amber-200 p-5">
              <p className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-2">The tax catch</p>
              <p className="text-sm text-slate-700 leading-relaxed">
                Reinvested distributions are <span className="font-semibold">still taxable</span> in the year
                they&apos;re paid — even though you never see the cash. The reinvested amount also forms the cost
                base of the new units.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── International dividend ETFs ───────────────────────────────── */}
      <section className="py-10 md:py-12 bg-slate-50">
        <div className="container-custom max-w-3xl">
          <SectionHeading
            eyebrow="Global Income"
            title="What about international dividend ETFs?"
            sub="They exist — but the franking gap makes them less compelling for Australian residents."
          />
          <div className="mt-8 grid sm:grid-cols-2 gap-5">
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <h3 className="text-base font-bold text-slate-900 mb-3">The franking gap</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Global dividend ETFs hold high-yielding shares from overseas markets. But foreign companies
                don&apos;t pay Australian corporate tax, so their dividends carry{" "}
                <span className="font-semibold">no franking credits</span>. The grossed-up advantage that makes a
                5.5% Australian yield so valuable simply doesn&apos;t exist offshore.
              </p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <h3 className="text-base font-bold text-slate-900 mb-3">Foreign withholding &amp; FITO</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Foreign dividends are often taxed in the source country before they reach you. Australia gives you
                a <span className="font-semibold">Foreign Income Tax Offset (FITO)</span> to prevent double
                taxation, but it doesn&apos;t replicate franking. After tax, a 5–6% international yield is usually
                worth less to a resident than a comparable franked Australian yield.
              </p>
            </div>
          </div>
          <p className="mt-6 text-sm text-slate-600 leading-relaxed">
            International dividend ETFs still help with geographic diversification, but for pure income their
            appeal is materially lower. Most investors source income from{" "}
            <Link href="/etfs/dividends" className="text-amber-600 hover:text-amber-700 font-semibold">Australian holdings</Link>{" "}
            and get global exposure through broad-market funds such as{" "}
            <Link href="/etfs/international" className="text-amber-600 hover:text-amber-700 font-semibold">VGS and similar</Link>.
          </p>
        </div>
      </section>

      {/* ── Editorial deep dive ──────────────────────────────────────── */}
      <section className="py-10 md:py-12">
        <div className="container-custom max-w-3xl">
          <SectionHeading eyebrow="Deep Dive" title="Everything you need to know about income ETFs" />
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

      {/* ── Who it suits ─────────────────────────────────────────────── */}
      <section className="py-10 md:py-12">
        <div className="container-custom max-w-4xl">
          <SectionHeading
            eyebrow="Suitability"
            title="Who do dividend ETFs suit?"
            sub="Income tilt is a feature for some investors and a drag for others."
          />
          <div className="mt-8 grid md:grid-cols-2 gap-5">
            <div className="bg-green-50 rounded-2xl border border-green-200 p-6">
              <h3 className="text-base font-bold text-green-900 mb-3 flex items-center gap-2">
                <span className="text-green-600">✓</span> Often a good fit
              </h3>
              <ul className="space-y-2 text-sm text-slate-700">
                <li className="flex items-start gap-2"><span className="text-green-500 shrink-0 mt-0.5">•</span> Retirees who need regular income without selling units</li>
                <li className="flex items-start gap-2"><span className="text-green-500 shrink-0 mt-0.5">•</span> SMSFs in pension phase, where franking credits are refunded in full</li>
                <li className="flex items-start gap-2"><span className="text-green-500 shrink-0 mt-0.5">•</span> Income-focused investors on lower marginal tax rates</li>
                <li className="flex items-start gap-2"><span className="text-green-500 shrink-0 mt-0.5">•</span> Anyone who values a franked, diversified income stream over a single stock</li>
              </ul>
            </div>
            <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6">
              <h3 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2">
                <span className="text-slate-400">✗</span> Usually a weaker fit
              </h3>
              <ul className="space-y-2 text-sm text-slate-700">
                <li className="flex items-start gap-2"><span className="text-slate-400 shrink-0 mt-0.5">•</span> Young accumulators with decades for growth to compound</li>
                <li className="flex items-start gap-2"><span className="text-slate-400 shrink-0 mt-0.5">•</span> High-income earners, who pay tax on income they don&apos;t need yet</li>
                <li className="flex items-start gap-2"><span className="text-slate-400 shrink-0 mt-0.5">•</span> Investors chasing maximum total return rather than current income</li>
                <li className="flex items-start gap-2"><span className="text-slate-400 shrink-0 mt-0.5">•</span> Anyone uncomfortable with heavy bank and resources concentration</li>
              </ul>
            </div>
          </div>
          <p className="mt-6 text-sm text-slate-600 leading-relaxed">
            For accumulators, a broad-market fund such as{" "}
            <Link href="/etfs/asx-200" className="text-amber-600 hover:text-amber-700 font-semibold">VAS or another ASX 200 ETF</Link>{" "}
            — or a growth-oriented diversified ETF — typically wins on after-tax total return. The income tilt of a
            dividend ETF only pays off when you actually want the income.
          </p>
        </div>
      </section>

      {/* ── ETF vs direct shares ─────────────────────────────────────── */}
      <section className="py-10 md:py-12 bg-slate-50">
        <div className="container-custom max-w-4xl">
          <SectionHeading
            eyebrow="Comparison"
            title="Dividend ETF vs direct dividend shares"
            sub="Both build an income stream — the difference is diversification versus control."
          />
          <div className="mt-8 grid md:grid-cols-2 gap-5">
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <h3 className="text-base font-bold text-slate-900 mb-3">Dividend ETF</h3>
              <ul className="space-y-2 text-sm text-slate-600">
                <li className="flex items-start gap-2"><span className="text-green-500 shrink-0 mt-0.5">✓</span> Instant diversification — one dividend cut barely moves your income</li>
                <li className="flex items-start gap-2"><span className="text-green-500 shrink-0 mt-0.5">✓</span> Franking passed through automatically</li>
                <li className="flex items-start gap-2"><span className="text-green-500 shrink-0 mt-0.5">✓</span> Low effort — the fund rebalances itself</li>
                <li className="flex items-start gap-2"><span className="text-red-400 shrink-0 mt-0.5">✗</span> Ongoing MER; no control over individual holdings</li>
                <li className="flex items-start gap-2"><span className="text-slate-400 shrink-0 mt-0.5">•</span> DRP available</li>
              </ul>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <h3 className="text-base font-bold text-slate-900 mb-3">Direct dividend shares</h3>
              <ul className="space-y-2 text-sm text-slate-600">
                <li className="flex items-start gap-2"><span className="text-green-500 shrink-0 mt-0.5">✓</span> Full control over exactly what you own</li>
                <li className="flex items-start gap-2"><span className="text-green-500 shrink-0 mt-0.5">✓</span> Can concentrate franking (e.g. overweight the banks)</li>
                <li className="flex items-start gap-2"><span className="text-green-500 shrink-0 mt-0.5">✓</span> No MER once purchased; per-security CGT management</li>
                <li className="flex items-start gap-2"><span className="text-red-400 shrink-0 mt-0.5">✗</span> Single-company risk and ongoing research effort</li>
                <li className="flex items-start gap-2"><span className="text-slate-400 shrink-0 mt-0.5">•</span> DRP available</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQs ─────────────────────────────────────────────────────── */}
      <section className="py-10 md:py-12">
        <div className="container-custom max-w-2xl">
          <SectionHeading eyebrow="FAQ" title="Dividend ETF Questions" />
          <div className="mt-6 divide-y divide-slate-200">
            {FAQS.map((faq) => (
              <details key={faq.q} className="py-4 group">
                <summary className="text-sm font-semibold text-slate-900 cursor-pointer list-none flex items-center justify-between gap-2">
                  {faq.q}
                  <span className="text-slate-400 group-open:rotate-180 transition-transform shrink-0">▾</span>
                </summary>
                <p className="mt-3 text-sm text-slate-600 leading-relaxed">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────── */}
      <section className="py-12 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
        <div className="container-custom text-center max-w-xl">
          <h2 className="text-xl font-extrabold mb-3">Start investing in dividend ETFs</h2>
          <p className="text-sm text-slate-300 mb-6">Compare brokers with low brokerage on ASX-listed ETFs — and tools to project your franked income.</p>
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

      {/* ── Disclaimer ───────────────────────────────────────────────── */}
      <section className="py-6 bg-slate-100 border-t border-slate-200">
        <div className="container-custom max-w-3xl">
          <p className="text-xs text-slate-500 leading-relaxed">
            {GENERAL_ADVICE_WARNING} ETF yields, franking ratios, fees, and assets under management are approximate
            and change over time. Verify current figures with the ETF provider&apos;s product disclosure statement
            before investing.
          </p>
        </div>
      </section>
    </div>
  );
}
