import type { Metadata } from "next";
import Link from "next/link";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, UPDATED_LABEL } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";
import SectionHeading from "@/components/SectionHeading";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `US ETFs for Australian Investors (${CURRENT_YEAR}) — VOO, IVV, QQQ, NDQ & the VTS Estate-Tax Trap`,
  description: `How Australians invest in US ETFs: US-domiciled (VOO, SPY, QQQ, VTI) vs ASX-listed US-exposure ETFs (IVV, NDQ, VTS). US estate tax, W-8BEN, currency hedging, FITO and the AMMA tax advantage explained. ${UPDATED_LABEL}.`,
  openGraph: {
    title: `US ETFs for Australian Investors (${CURRENT_YEAR})`,
    description:
      "US-domiciled vs Australian-domiciled US-exposure ETFs — estate tax, tax reporting, currency and cost compared for Australian investors.",
    url: `${SITE_URL}/global-investing/etfs/us`,
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: `${SITE_URL}/global-investing/etfs/us` },
};

// ─── US-domiciled ETFs (bought via IBKR / Stake US) ──────────────
const US_DOMICILED_ETFS = [
  {
    ticker: "VOO",
    name: "Vanguard S&P 500 ETF",
    index: "S&P 500",
    mer: "0.03%",
    access: "IBKR / Stake (US market)",
    note: "The cheapest large-cap US exposure anywhere — but US-domiciled, so estate tax and W-8BEN apply.",
  },
  {
    ticker: "SPY",
    name: "SPDR S&P 500 ETF Trust",
    index: "S&P 500",
    mer: "0.0945%",
    access: "IBKR / Stake (US market)",
    note: "The original and most heavily traded S&P 500 ETF. Higher MER than VOO; deepest options liquidity.",
  },
  {
    ticker: "QQQ",
    name: "Invesco QQQ Trust",
    index: "NASDAQ 100",
    mer: "0.20%",
    access: "IBKR / Stake (US market)",
    note: "Concentrated tech / growth exposure (Apple, Microsoft, Nvidia, Alphabet, Amazon). Higher volatility.",
  },
  {
    ticker: "VTI",
    name: "Vanguard Total Stock Market ETF",
    index: "CRSP US Total Market",
    mer: "0.03%",
    access: "IBKR / Stake (US market)",
    note: "The whole US market — large, mid and small caps (3,500+ holdings). The broadest single US holding.",
  },
  {
    ticker: "SCHD",
    name: "Schwab US Dividend Equity ETF",
    index: "Dow Jones US Dividend 100",
    mer: "0.06%",
    access: "IBKR / Stake (US market)",
    note: "Quality dividend tilt. Popular for income, but US-domiciled — dividends carry 15% US withholding.",
  },
];

// ─── ASX-listed US-exposure ETFs (bought via any AU broker) ──────
const ASX_LISTED_US_ETFS = [
  {
    ticker: "IVV",
    name: "iShares S&P 500 ETF (ASX)",
    index: "S&P 500",
    mer: "0.04%",
    domicile: "Australia",
    estateTax: false,
    note: "The benchmark for most retail investors. ASX-listed AND Australian-domiciled — no US estate tax, AMMA statement at tax time.",
  },
  {
    ticker: "NDQ",
    name: "Betashares NASDAQ 100 ETF (ASX)",
    index: "NASDAQ 100",
    mer: "0.22%",
    domicile: "Australia",
    estateTax: false,
    note: "ASX tech tilt. Australian-domiciled, so the estate-tax and W-8BEN complexity of QQQ does not apply.",
  },
  {
    ticker: "VTS",
    name: "Vanguard US Total Market Shares ETF (ASX)",
    index: "CRSP US Total Market",
    mer: "0.03%",
    domicile: "United States",
    estateTax: true,
    note: "Trades on the ASX but is US-DOMICILED. Lowest MER on this list — but US estate tax applies over US$60K and a W-8BEN is required. Read the trap below.",
  },
  {
    ticker: "IJH",
    name: "iShares S&P MidCap ETF (ASX)",
    index: "S&P MidCap 400",
    mer: "0.07%",
    domicile: "Australia",
    estateTax: false,
    note: "US mid-cap exposure (the 400 companies just below the S&P 500). Australian-domiciled — pairs with IVV for size diversification.",
  },
];

// ─── MER comparison: long-term cost on $100K ─────────────────────
const MER_ROWS = [
  { ticker: "VOO", domicile: "US", mer: "0.03%", annual: "$30", thirtyYear: "~$900 in fees", flag: "Lowest MER — but US estate tax risk" },
  { ticker: "VTS", domicile: "US", mer: "0.03%", annual: "$30", thirtyYear: "~$900 in fees", flag: "Lowest MER — but US estate tax risk" },
  { ticker: "IVV", domicile: "Australia", mer: "0.04%", annual: "$40", thirtyYear: "~$1,200 in fees", flag: "No estate tax · AMMA statement" },
  { ticker: "IJH", domicile: "Australia", mer: "0.07%", annual: "$70", thirtyYear: "~$2,100 in fees", flag: "No estate tax · mid-cap" },
  { ticker: "QQQ", domicile: "US", mer: "0.20%", annual: "$200", thirtyYear: "~$6,000 in fees", flag: "US estate tax risk" },
  { ticker: "NDQ", domicile: "Australia", mer: "0.22%", annual: "$220", thirtyYear: "~$6,600 in fees", flag: "No estate tax · ASX-listed" },
];

const FAQS = [
  {
    q: "What is the best US ETF for Australian investors?",
    a: "For most retail investors the practical answer is IVV (iShares S&P 500 on the ASX): it tracks the S&P 500 at a 0.04% MER, is Australian-domiciled (so no US estate tax), settles in AUD, and produces a single AMMA statement at tax time. Cost-focused investors who use a US broker and accept the estate-tax and W-8BEN paperwork may prefer VOO or VTI at 0.03%, but the ~0.01% MER saving is tiny next to the estate-tax exposure for larger balances. NDQ (or QQQ) suits a smaller NASDAQ growth tilt on top of a core S&P 500 holding.",
  },
  {
    q: "Should I buy US-domiciled or ASX-listed US ETFs?",
    a: "It depends on your balance and your tolerance for paperwork. US-domiciled ETFs (VOO, SPY, QQQ, VTI) bought through IBKR have marginally lower MERs and deeper liquidity, but you must lodge a W-8BEN, you receive a US 1042-S form each year, and assets over US$60,000 are exposed to US estate tax on death. Australian-domiciled ETFs (IVV, NDQ, IJH) carry a slightly higher MER but have no US estate tax, settle in AUD, and report everything on one AMMA statement. For most retail Australians the simpler, estate-tax-free ASX-domiciled route wins.",
  },
  {
    q: "Does VTS have US estate tax risk?",
    a: "Yes. Vanguard's VTS (and its ex-US sibling VEU) trade on the ASX but are legally US-domiciled — they are cross-listings of US funds. That means they carry the same US estate tax exposure as VOO or VTI: US-situated assets above US$60,000 can be subject to US estate tax of up to 40% on the holder's death, and you must complete a W-8BEN and receive a 1042-S. Many Australians buy VTS purely for its 0.03% MER without realising this. The Australian-domiciled IVV avoids the issue entirely at a 0.04% MER.",
  },
  {
    q: "How are US ETF dividends taxed in Australia?",
    a: "US companies do not pay Australian franking credits, so distributions are unfranked foreign income. For US-domiciled ETFs (VOO, QQQ, VTS), a 15% US withholding tax is deducted at source provided you have lodged a W-8BEN (otherwise 30%); that withholding is reported on a 1042-S and you generally claim it as a Foreign Income Tax Offset (FITO) on your Australian return. For Australian-domiciled ETFs (IVV, NDQ), the fund handles the US withholding internally and passes the foreign income and FITO entitlement to you on a single AMMA statement — which is the main reason they are simpler at tax time.",
  },
  {
    q: "Do I already have US exposure if I own VGS?",
    a: "Yes — heavily. VGS (Vanguard MSCI World ex-Australia) is roughly 70% US by weight, because the US makes up the bulk of developed-market capitalisation. If you already hold VGS or a similar global fund, adding a large dedicated US ETF can leave you very concentrated in the same US mega-caps. A dedicated US or NASDAQ position is best treated as a deliberate tilt on top of your global core, not a duplicate of exposure you already own.",
  },
];

export default function GlobalInvestingUSETFPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: SITE_URL },
    { name: "Global Investing", url: `${SITE_URL}/global-investing` },
    { name: "ETFs", url: `${SITE_URL}/global-investing/etfs/global` },
    { name: "US ETFs" },
  ]);

  const faqSchema = faqJsonLd(FAQS);

  return (
    <div className="bg-white min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      {faqSchema && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      )}

      {/* Hero */}
      <section className="relative bg-white border-b border-slate-100 overflow-hidden py-8 md:py-12">
        <div className="container-custom">
          <nav aria-label="Breadcrumb" className="text-xs text-slate-500 mb-5 flex items-center gap-1.5 flex-wrap">
            <Link href="/" className="hover:text-slate-900">Home</Link>
            <span>/</span>
            <Link href="/global-investing" className="hover:text-slate-900">Global Investing</Link>
            <span>/</span>
            <Link href="/global-investing/etfs/global" className="hover:text-slate-900">ETFs</Link>
            <span>/</span>
            <span className="text-slate-900 font-medium">US ETFs</span>
          </nav>
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 border border-slate-200 rounded-full text-xs font-semibold text-slate-600 mb-4">
              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full" />
              US Market ETFs · {UPDATED_LABEL}
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold leading-[1.1] mb-3 tracking-tight text-slate-900">
              US ETFs for Australian Investors{" "}
              <span className="text-amber-600">({CURRENT_YEAR})</span>
            </h1>
            <p className="text-sm md:text-base text-slate-600 leading-relaxed max-w-2xl">
              US ETFs give Australians exposure to the world&apos;s largest, deepest and most liquid share market.
              But before you compare tickers, there&apos;s one decision that matters more than MER: do you buy a{" "}
              <span className="font-semibold text-slate-800">US-domiciled</span> ETF or an{" "}
              <span className="font-semibold text-slate-800">Australian-domiciled US-exposure</span> ETF? The two look
              almost identical on a price chart, but they differ sharply on US estate tax and tax reporting.
            </p>
            <div className="flex flex-wrap gap-3 mt-5">
              <Link
                href="/global-investing/tax/us-estate-tax"
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold rounded-lg transition-colors"
              >
                US estate tax explained →
              </Link>
              <Link
                href="/global-investing/etfs/global"
                className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg transition-colors border border-slate-200"
              >
                ← All international ETFs
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Callouts */}
      <section className="py-8 bg-slate-50 border-b border-slate-200">
        <div className="container-custom">
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl border border-amber-200 p-5">
              <p className="text-xs font-bold text-amber-800 uppercase tracking-wide mb-1">Cheapest S&amp;P 500 (US-domiciled)</p>
              <p className="text-xl font-black text-amber-700">0.03% (VOO)</p>
              <p className="text-xs text-slate-600 mt-1">$30/year per $100K — but US estate tax and a W-8BEN apply.</p>
            </div>
            <div className="bg-white rounded-2xl border border-emerald-200 p-5">
              <p className="text-xs font-bold text-emerald-700 uppercase tracking-wide mb-1">Simplest for most Australians</p>
              <p className="text-xl font-black text-emerald-700">IVV (0.04%)</p>
              <p className="text-xs text-slate-600 mt-1">ASX-listed and Australian-domiciled — no estate tax, one AMMA statement.</p>
            </div>
            <div className="bg-white rounded-2xl border border-red-200 p-5">
              <p className="text-xs font-bold text-red-700 uppercase tracking-wide mb-1">US estate-tax threshold</p>
              <p className="text-xl font-black text-red-700">US$60,000</p>
              <p className="text-xs text-slate-600 mt-1">US-situated assets above this can face US estate tax up to 40% — VTS &amp; VEU included.</p>
            </div>
          </div>
        </div>
      </section>

      {/* THE DOMICILE DECISION */}
      <section className="py-10 md:py-14">
        <div className="container-custom max-w-3xl">
          <SectionHeading
            eyebrow="Read this first"
            title="The domicile decision — the most important point"
            sub="Two ETFs can track the exact same index and still be taxed completely differently. Domicile, not MER, is the first thing to settle."
          />
          <p className="text-sm text-slate-600 leading-relaxed mb-6">
            &quot;US ETF&quot; can mean two very different things for an Australian. The underlying shares are the same; what
            changes is <span className="font-semibold text-slate-800">where the fund is legally domiciled</span> — and that
            drives whether you face US estate tax and how messy your tax return becomes.
          </p>

          <div className="grid md:grid-cols-2 gap-5">
            <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
              <p className="text-xs font-bold text-red-700 uppercase tracking-wide mb-2">US-domiciled ETFs</p>
              <p className="text-sm font-semibold text-slate-900 mb-2">VOO, SPY, QQQ, VTI — and ASX-listed VTS &amp; VEU</p>
              <ul className="space-y-1.5 text-xs text-slate-700">
                <li className="flex items-start gap-1.5"><span className="text-slate-500 shrink-0 mt-0.5">•</span> Bought via Interactive Brokers (or Stake&apos;s US market)</li>
                <li className="flex items-start gap-1.5"><span className="text-emerald-600 shrink-0 mt-0.5">+</span> Lowest MERs available (VOO/VTI at 0.03%)</li>
                <li className="flex items-start gap-1.5"><span className="text-red-500 shrink-0 mt-0.5">–</span> <span className="font-semibold">US estate tax</span> on US-situated assets over US$60,000 (up to 40%)</li>
                <li className="flex items-start gap-1.5"><span className="text-red-500 shrink-0 mt-0.5">–</span> A W-8BEN must be lodged to get the 15% (not 30%) withholding rate</li>
                <li className="flex items-start gap-1.5"><span className="text-red-500 shrink-0 mt-0.5">–</span> More complex tax — you receive a US <span className="font-mono">1042-S</span> form each year</li>
              </ul>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5">
              <p className="text-xs font-bold text-emerald-700 uppercase tracking-wide mb-2">Australian-domiciled ETFs</p>
              <p className="text-sm font-semibold text-slate-900 mb-2">IVV, NDQ, IJH (iShares S&amp;P 500 etc. on the ASX)</p>
              <ul className="space-y-1.5 text-xs text-slate-700">
                <li className="flex items-start gap-1.5"><span className="text-slate-500 shrink-0 mt-0.5">•</span> Bought via any Australian broker (CommSec, Stake, Pearler, SelfWealth)</li>
                <li className="flex items-start gap-1.5"><span className="text-emerald-600 shrink-0 mt-0.5">+</span> <span className="font-semibold">No US estate tax</span> — the fund, not you, holds the US shares</li>
                <li className="flex items-start gap-1.5"><span className="text-emerald-600 shrink-0 mt-0.5">+</span> Simpler tax — a single AMMA statement; no W-8BEN, no 1042-S</li>
                <li className="flex items-start gap-1.5"><span className="text-emerald-600 shrink-0 mt-0.5">+</span> Settles in AUD on the ASX</li>
                <li className="flex items-start gap-1.5"><span className="text-red-500 shrink-0 mt-0.5">–</span> Slightly higher MER (IVV 0.04% vs VOO 0.03%)</li>
              </ul>
            </div>
          </div>

          <div className="mt-6 bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-start gap-3">
            <span className="text-amber-500 shrink-0 text-lg">⚠️</span>
            <p className="text-sm text-amber-900 leading-relaxed">
              <span className="font-bold">Recommended for most retail investors:</span> the Australian-domiciled route
              (IVV / NDQ). The estate-tax and reporting simplicity usually outweighs the tiny MER difference. The
              detail of how US estate tax works — including who it hits and how to mitigate it — is covered on our{" "}
              <Link href="/global-investing/tax/us-estate-tax" className="font-semibold underline decoration-amber-400 underline-offset-2 hover:text-amber-700">
                US estate tax guide
              </Link>
              .
            </p>
          </div>
        </div>
      </section>

      {/* US-DOMICILED TABLE */}
      <section className="py-10 md:py-12 bg-slate-50 border-y border-slate-200">
        <div className="container-custom">
          <SectionHeading
            eyebrow="Comparison"
            title="US-domiciled ETFs (bought via IBKR)"
            sub="The lowest-cost, deepest US funds — accessed through a US broker. Remember: all of these carry US estate-tax exposure and a W-8BEN obligation. Approximate data — verify current figures with the issuer."
          />
          <div className="mt-8 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <table className="w-full text-left text-sm" aria-label="US-domiciled ETFs accessible via IBKR — ticker, fund, MER and access method">
              <thead className="bg-slate-100 text-slate-600">
                <tr>
                  <th scope="col" className="px-4 py-3 font-bold">Ticker</th>
                  <th scope="col" className="px-4 py-3 font-bold">Fund / Index</th>
                  <th scope="col" className="px-4 py-3 font-bold">MER</th>
                  <th scope="col" className="px-4 py-3 font-bold">How to access</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {US_DOMICILED_ETFS.map((etf) => (
                  <tr key={etf.ticker} className="align-top hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <span className="font-mono font-black text-slate-900">{etf.ticker}</span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-800">{etf.name}</p>
                      <p className="text-xs text-slate-500">{etf.index}</p>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">{etf.note}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-bold text-slate-900">{etf.mer}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">{etf.access}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-500 mt-3">
            All funds above are US-domiciled. See our{" "}
            <Link href="/global-investing/guides/ibkr-australia-setup" className="underline underline-offset-2 hover:text-slate-800">
              IBKR Australia setup guide
            </Link>{" "}
            for opening a US-market brokerage account and lodging your W-8BEN.
          </p>
        </div>
      </section>

      {/* ASX-LISTED US-EXPOSURE TABLE */}
      <section className="py-10 md:py-12">
        <div className="container-custom">
          <SectionHeading
            eyebrow="Comparison"
            title="ASX-listed US-exposure ETFs"
            sub="Bought on the ASX through any Australian broker. Most are Australian-domiciled — but watch VTS, which is US-domiciled despite its ASX listing."
          />
          <div className="mt-8 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <table className="w-full text-left text-sm" aria-label="ASX-listed US-exposure ETFs — ticker, fund, MER and domicile">
              <thead className="bg-slate-100 text-slate-600">
                <tr>
                  <th scope="col" className="px-4 py-3 font-bold">Ticker</th>
                  <th scope="col" className="px-4 py-3 font-bold">Fund / Index</th>
                  <th scope="col" className="px-4 py-3 font-bold">MER</th>
                  <th scope="col" className="px-4 py-3 font-bold">Domicile</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ASX_LISTED_US_ETFS.map((etf) => (
                  <tr key={etf.ticker} className={`align-top hover:bg-slate-50 ${etf.estateTax ? "bg-red-50/60" : ""}`}>
                    <td className="px-4 py-3">
                      <span className="font-mono font-black text-slate-900">{etf.ticker}</span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-800">{etf.name}</p>
                      <p className="text-xs text-slate-500">{etf.index}</p>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">{etf.note}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-bold text-slate-900">{etf.mer}</span>
                    </td>
                    <td className="px-4 py-3">
                      {etf.estateTax ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700 border border-red-200">
                          {etf.domicile} · estate tax
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700 border border-emerald-200">
                          {etf.domicile}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-500 mt-3">
            Approximate data — verify current MER, AUM and domicile with the issuer&apos;s PDS before investing.
          </p>
        </div>
      </section>

      {/* THE VTS / VEU TRAP */}
      <section className="py-10 md:py-14 bg-slate-50 border-y border-slate-200">
        <div className="container-custom max-w-3xl">
          <SectionHeading
            eyebrow="Watch out"
            title="The VTS / VEU trap"
            sub="The single most common surprise for Australian US-ETF investors."
          />
          <div className="bg-white border border-red-200 rounded-2xl p-6">
            <p className="text-sm text-slate-700 leading-relaxed mb-4">
              Vanguard&apos;s <span className="font-mono font-bold">VTS</span> (US Total Market) and{" "}
              <span className="font-mono font-bold">VEU</span> (All-World ex-US) are listed on the ASX and quoted in AUD,
              so they look exactly like ordinary Australian ETFs. They are not. Both are{" "}
              <span className="font-semibold text-red-700">cross-listings of US-domiciled Vanguard funds</span> — legally
              they sit in the United States.
            </p>
            <p className="text-sm text-slate-700 leading-relaxed mb-4">
              That gives them the lowest MERs on the ASX (VTS at just 0.03%), which is exactly why they&apos;re popular. But
              it also means they carry the full US-domiciled burden that many holders never realise:
            </p>
            <ul className="space-y-1.5 text-sm text-slate-700 mb-4">
              <li className="flex items-start gap-2"><span className="text-red-500 shrink-0 mt-0.5">•</span> <span className="font-semibold">US estate tax</span> on holdings over US$60,000 — potentially up to 40% on death</li>
              <li className="flex items-start gap-2"><span className="text-red-500 shrink-0 mt-0.5">•</span> A <span className="font-semibold">W-8BEN</span> is required to claim the 15% treaty withholding rate</li>
              <li className="flex items-start gap-2"><span className="text-red-500 shrink-0 mt-0.5">•</span> A US <span className="font-mono">1042-S</span> form each year, on top of your Australian tax statement</li>
            </ul>
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
              <p className="text-sm text-emerald-900 leading-relaxed">
                <span className="font-bold">Contrast with IVV.</span> The Australian-domiciled iShares S&amp;P 500 (IVV) is
                only 0.01% more expensive (0.04%) yet has <span className="font-semibold">no US estate tax</span>, no
                W-8BEN, and no 1042-S. For most investors that 0.01% is a small price for a far simpler — and
                estate-tax-free — structure. The same logic applies when choosing between VEU (US-domiciled) and a
                local ex-US option.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* WHY US EXPOSURE */}
      <section className="py-10 md:py-12">
        <div className="container-custom max-w-3xl">
          <SectionHeading eyebrow="The case" title="Why US market exposure?" />
          <div className="text-sm text-slate-600 leading-relaxed space-y-3">
            <p>
              The US is the deepest, most liquid equity market on earth, and over the long run the S&amp;P 500 has
              returned roughly <span className="font-semibold text-slate-800">10% per annum</span> (before inflation, with
              dividends reinvested — past performance is not a guide to the future). It is also where the world&apos;s defining
              technology companies list.
            </p>
            <p>
              A single S&amp;P 500 ETF gives you a stake in <span className="font-semibold text-slate-800">Apple, Microsoft,
              Nvidia, Alphabet, Amazon and Meta</span> — the cluster of mega-caps that has driven much of the index&apos;s
              return and that simply isn&apos;t available on the ASX at anything like the same scale. Deeper liquidity also
              means tighter spreads and lower trading friction.
            </p>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 not-prose">
              <p className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">The flip side: concentration risk</p>
              <p className="text-xs text-slate-600 leading-relaxed">
                That same strength is a risk. The top 10 holdings now make up roughly{" "}
                <span className="font-semibold text-slate-800">35% of the S&amp;P 500</span>, heavily skewed toward a handful
                of tech names. &quot;Buying the index&quot; is more concentrated than it used to be — a NASDAQ 100 fund (QQQ / NDQ)
                amplifies that further still.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CURRENCY */}
      <section className="py-10 md:py-12 bg-slate-50 border-y border-slate-200">
        <div className="container-custom max-w-3xl">
          <SectionHeading eyebrow="Currency" title="Hedged vs unhedged — the AUD/USD question" />
          <div className="text-sm text-slate-600 leading-relaxed space-y-3">
            <p>
              Almost all US ETF exposure for Australians is <span className="font-semibold text-slate-800">unhedged</span>:
              the fund holds USD-denominated shares, so your AUD return moves with both the share price and the AUD/USD
              exchange rate. When the AUD falls, your unhedged US holdings are worth more in AUD; when the AUD rises, they
              are worth less.
            </p>
            <p>
              Currency-<span className="font-semibold text-slate-800">hedged</span> versions exist — for example{" "}
              <span className="font-mono font-bold">IHVV</span> (iShares S&amp;P 500 AUD Hedged) — which strip out the AUD/USD
              swing so your return reflects the index alone, at a slightly higher MER.
            </p>
            <div className="grid sm:grid-cols-2 gap-4 not-prose">
              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <p className="text-xs font-bold text-slate-700 mb-1">When to consider hedging</p>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Shorter horizons, or if you specifically expect the AUD to strengthen and want a &quot;pure&quot; equity return
                  without the currency overlay.
                </p>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <p className="text-xs font-bold text-slate-700 mb-1">Why most stay unhedged</p>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Unhedged USD exposure is a natural diversifier: the AUD tends to fall when global markets are stressed,
                  cushioning your portfolio in AUD terms — and hedging carries an ongoing cost.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TAX TREATMENT */}
      <section className="py-10 md:py-12">
        <div className="container-custom max-w-3xl">
          <SectionHeading eyebrow="Tax" title="How US ETF distributions are taxed in Australia" />
          <div className="text-sm text-slate-600 leading-relaxed space-y-3">
            <p>
              US companies don&apos;t pay Australian company tax, so there are{" "}
              <span className="font-semibold text-slate-800">no franking credits</span> on US ETF distributions — they are
              unfranked foreign income. What differs between the two structures is who handles the US withholding tax and
              how it&apos;s reported.
            </p>
            <div className="grid md:grid-cols-2 gap-4 not-prose">
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <p className="text-xs font-bold text-red-700 mb-1">US-domiciled (VOO, QQQ, VTS)</p>
                <p className="text-xs text-slate-600 leading-relaxed">
                  A 15% US withholding tax is deducted at source (provided your W-8BEN is lodged — otherwise 30%). It is
                  reported to you on a <span className="font-mono">1042-S</span>, and you generally claim it back as a{" "}
                  <span className="font-semibold">Foreign Income Tax Offset (FITO)</span> on your Australian return.
                </p>
              </div>
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                <p className="text-xs font-bold text-emerald-700 mb-1">Australian-domiciled (IVV, NDQ)</p>
                <p className="text-xs text-slate-600 leading-relaxed">
                  The fund handles US withholding internally and passes the foreign income and FITO entitlement to you on
                  a single <span className="font-semibold">AMMA statement</span>. No W-8BEN, no 1042-S — the simplicity
                  advantage of going ASX-domiciled.
                </p>
              </div>
            </div>
            <p className="text-xs text-slate-500">
              This is general information, not tax advice — confirm your own position with a registered tax agent. See
              also our{" "}
              <Link href="/global-investing/tax/us-estate-tax" className="underline underline-offset-2 hover:text-slate-800">
                US estate tax guide
              </Link>
              .
            </p>
          </div>
        </div>
      </section>

      {/* HOW TO BUY */}
      <section className="py-10 md:py-12 bg-slate-50 border-y border-slate-200">
        <div className="container-custom max-w-3xl">
          <SectionHeading eyebrow="Getting started" title="How to buy US ETFs from Australia" />
          <div className="grid md:grid-cols-2 gap-5">
            <div className="bg-white border border-emerald-200 rounded-2xl p-5">
              <p className="text-xs font-bold text-emerald-700 uppercase tracking-wide mb-2">ASX-domiciled (IVV, NDQ, IJH)</p>
              <p className="text-sm text-slate-700 leading-relaxed mb-3">
                Buy on the ASX through any Australian broker — <span className="font-semibold">CommSec, Stake, Pearler or
                SelfWealth</span>. You trade in AUD, brokerage is typically a few dollars a trade, and there&apos;s no FX
                conversion to manage.
              </p>
              <p className="text-xs text-slate-500">Best for most retail investors who want simplicity and no estate-tax exposure.</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-5">
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">US-domiciled (VOO, QQQ, VTI)</p>
              <p className="text-sm text-slate-700 leading-relaxed mb-3">
                Buy on US exchanges through <span className="font-semibold">Interactive Brokers</span> or Stake&apos;s US
                market. You&apos;ll convert AUD to USD (watch the FX spread), lodge a W-8BEN, and receive a 1042-S each year.
              </p>
              <p className="text-xs text-slate-500">
                Best for cost-focused investors comfortable with the paperwork.{" "}
                <Link href="/global-investing/guides/ibkr-australia-setup" className="underline underline-offset-2 hover:text-slate-800">
                  IBKR setup guide →
                </Link>
              </p>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-4">
            The cost comparison isn&apos;t just MER: a US broker adds an FX conversion cost (often 0.1–0.7% each way) on top of
            brokerage. For modest, regular investing, the all-in cost of the ASX route is frequently lower than chasing a
            0.01% MER saving offshore.
          </p>
        </div>
      </section>

      {/* MER / LONG-TERM COST */}
      <section className="py-10 md:py-12">
        <div className="container-custom max-w-3xl">
          <SectionHeading
            eyebrow="Cost"
            title="MER and the long-term cost of US ETFs"
            sub="Illustrative fees on a flat $100K balance held for 30 years (fee drag only, ignoring compounding on the fee itself and any market growth). Figures are indicative."
          />
          <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <table className="w-full text-left text-sm" aria-label="MER and 30-year fee cost comparison for US ETFs on a $100K balance">
              <thead className="bg-slate-100 text-slate-600">
                <tr>
                  <th scope="col" className="px-4 py-3 font-bold">Ticker</th>
                  <th scope="col" className="px-4 py-3 font-bold">Domicile</th>
                  <th scope="col" className="px-4 py-3 font-bold">MER</th>
                  <th scope="col" className="px-4 py-3 font-bold">Fee / year</th>
                  <th scope="col" className="px-4 py-3 font-bold">30-year fees</th>
                  <th scope="col" className="px-4 py-3 font-bold">Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {MER_ROWS.map((row) => (
                  <tr key={row.ticker} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono font-black text-slate-900">{row.ticker}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">{row.domicile}</td>
                    <td className="px-4 py-3 font-bold text-slate-900">{row.mer}</td>
                    <td className="px-4 py-3 text-slate-700">{row.annual}</td>
                    <td className="px-4 py-3 text-slate-700">{row.thirtyYear}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{row.flag}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed mt-4">
            Over decades the gap between VOO (0.03%) and IVV (0.04%) is real but small — about{" "}
            <span className="font-semibold text-slate-800">$10 per year per $100K</span>. The gap to NDQ (0.22%) is far
            larger. The point to hold onto: chasing the very lowest MER (VOO, or VTS on the ASX) means taking on US
            estate-tax exposure to save a fraction of a basis point. For most investors that&apos;s a poor trade.
          </p>
        </div>
      </section>

      {/* BUILDING A US ALLOCATION */}
      <section className="py-10 md:py-12 bg-slate-50 border-y border-slate-200">
        <div className="container-custom max-w-3xl">
          <SectionHeading eyebrow="Portfolio" title="Building a US allocation without doubling up" />
          <div className="text-sm text-slate-600 leading-relaxed space-y-3">
            <p>
              The most common mistake is treating a US ETF as new diversification when you already own a global fund.{" "}
              <span className="font-semibold text-slate-800">VGS is roughly 70% US by weight</span>, because the US dominates
              developed-market capitalisation. If you hold VGS (or a similar all-world fund), you already have heavy US
              exposure — stacking a large IVV position on top simply concentrates you further in the same mega-caps.
            </p>
            <p>
              Think of a dedicated US or NASDAQ holding as a <span className="font-semibold text-slate-800">deliberate
              tilt</span>, not a core. A dedicated S&amp;P 500 or NASDAQ position makes sense when you want to{" "}
              <span className="font-semibold text-slate-800">overweight</span> the US relative to a global benchmark, or
              control the US slice precisely (for example pairing a US ETF with an ex-US fund). If your goal is simply
              broad global exposure, a single world fund often does the job already.
            </p>
            <div className="bg-white border border-slate-200 rounded-xl p-4 not-prose">
              <p className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">Quick check before you buy</p>
              <p className="text-xs text-slate-600 leading-relaxed">
                Already hold VGS, IWLD or VDHG? Look through to your effective US weight first. A US tilt on top is a
                choice to be <span className="font-semibold">more</span> US-concentrated — make sure that&apos;s what you
                intend.{" "}
                <Link href="/global-investing/etfs/global" className="underline underline-offset-2 hover:text-slate-800">
                  Compare global ETFs →
                </Link>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-10 md:py-12">
        <div className="container-custom max-w-2xl">
          <SectionHeading eyebrow="FAQ" title="US ETF questions, answered" />
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

      {/* Related links */}
      <section className="py-8 bg-slate-50 border-t border-slate-200">
        <div className="container-custom">
          <div className="flex flex-wrap gap-3">
            <Link href="/global-investing/etfs/global" className="text-xs bg-white border border-slate-200 px-3 py-2 rounded-lg hover:border-amber-300 text-slate-700 transition-colors">International ETFs →</Link>
            <Link href="/global-investing/tax/us-estate-tax" className="text-xs bg-white border border-slate-200 px-3 py-2 rounded-lg hover:border-amber-300 text-slate-700 transition-colors">US estate tax →</Link>
            <Link href="/global-investing/guides/ibkr-australia-setup" className="text-xs bg-white border border-slate-200 px-3 py-2 rounded-lg hover:border-amber-300 text-slate-700 transition-colors">IBKR Australia setup →</Link>
            <Link href="/global-investing" className="text-xs bg-white border border-slate-200 px-3 py-2 rounded-lg hover:border-amber-300 text-slate-700 transition-colors">Global investing hub →</Link>
          </div>
        </div>
      </section>

      <section className="py-6 bg-slate-100 border-t border-slate-200">
        <div className="container-custom max-w-3xl">
          <p className="text-xs text-slate-500 leading-relaxed">
            {GENERAL_ADVICE_WARNING} ETF data, MERs and tax figures are approximate and change over time — verify current
            details with the issuer&apos;s PDS and a registered tax agent before investing. US estate-tax thresholds and rates
            are subject to change.
          </p>
        </div>
      </section>
    </div>
  );
}
