import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, UPDATED_LABEL } from "@/lib/seo";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";
import SectionHeading from "@/components/SectionHeading";
import HubFAQ from "@/components/HubFAQ";
import type { FaqItem } from "@/components/HubFAQ";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `Global Investing for Australians (${CURRENT_YEAR}) — US Shares, ETFs, Property, Tax`,
  description: `The complete guide for Australian residents investing globally. Compare foreign brokers (IBKR, Stake, Tiger, moomoo), AU-listed foreign exposure (IVV, VGS, IZZ), foreign property, FX providers, and the tax rules that matter (FITO, US estate tax, W-8BEN, CGT on foreign shares). ${UPDATED_LABEL}.`,
  openGraph: {
    title: `Global Investing for Australians (${CURRENT_YEAR})`,
    description: "Two tracks under one hub: direct outbound via foreign brokers, and indirect via AU-listed ETFs and LICs. Plus the tax rules that decide which way is cheaper.",
    url: `${SITE_URL}/global-investing`,
    images: [
      {
        url: `/api/og?title=${encodeURIComponent("Global Investing for Australians")}&sub=${encodeURIComponent("US Shares · ETFs · Property · FX · Tax · " + CURRENT_YEAR)}`,
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: `${SITE_URL}/global-investing` },
};

const HUB_FAQS: FaqItem[] = [
  {
    q: "Can Australian residents invest in overseas markets?",
    a: "Yes. Australian residents can invest globally through two main routes. (1) Direct: open a foreign broker account (IBKR, Stake, Tiger AU, moomoo AU, Webull AU, eToro, CommSec International, CMC International, Pearler) and buy stocks listed on NYSE/NASDAQ/LSE/HKEX/TSE/SGX/NZX directly. (2) Indirect: buy AU-listed ETFs and LICs that hold foreign shares — IVV (S&P 500), VGS (developed markets), VAE (Asia), IZZ (China), IEU (Europe), MFF/PMC (global LICs). Track A pays better per conversion to brokers; Track B is the lower-friction path for most Australians.",
  },
  {
    q: "Is it cheaper to buy US shares directly or via ASX-listed ETFs?",
    a: "It depends on your holding period, amount, and brokerage. For long-term holders, AU-listed ETFs like IVV (0.04% MER) often win after factoring FX conversion fees, foreign brokerage, custodial fees, and the W-8BEN paperwork. For active traders or specific stock exposure (e.g. you want Tesla, not the S&P 500), direct US shares are necessary. Use our /global-investing/calculators/direct-vs-asx-cost tool to compute total cost for your specific scenario, including FX (typically 0.40–0.70% spread on Stake/CommSec International, 0.002% on IBKR), brokerage, and tax friction.",
  },
  {
    q: "Do I need to fill out a W-8BEN form to buy US shares?",
    a: "Yes. The W-8BEN is a US IRS form that confirms you are a non-US resident eligible for reduced US tax rates under the Australia-US Double Tax Agreement. Without it, the IRS withholds 30% of US-source dividends; with it, the rate drops to 15%. Most AU-friendly brokers (Stake, IBKR, CommSec International, Tiger, moomoo) handle the W-8BEN inside their account-opening flow. The form is valid for three years and must be re-signed at expiry.",
  },
  {
    q: "What is US estate tax and does it apply to Australian investors?",
    a: "Yes — and most Australian investors don't know about it. The US imposes federal estate tax on US-situs assets held by non-resident aliens, with a low exemption of US$60,000 (compared to the US$13.6M exemption for US residents). If you die holding more than US$60,000 of US shares directly through a foreign broker, your estate may owe up to 40% federal estate tax on the excess. The Australia-US Estate Tax Treaty provides a unified credit that significantly mitigates this, but it's not automatic and requires proper structuring. AU-listed ETFs (like IVV) are NOT US-situs assets and avoid this exposure entirely. See /global-investing/tax/us-estate-tax for the full explainer and exposure calculator.",
  },
  {
    q: "How are gains on foreign shares taxed in Australia?",
    a: "Australian residents pay capital gains tax (CGT) on worldwide gains, including foreign shares. Cost base is calculated in AUD at the time of acquisition (using the RBA spot rate or your actual exchange rate); disposal value is calculated in AUD at the time of sale. This means FX movements affect your AUD-denominated gain even when the share price is flat. Foreign-source dividend income is also assessable. Where foreign tax has been paid (e.g. 15% US withholding), you may claim a Foreign Income Tax Offset (FITO) up to the AU tax payable on that income. See /global-investing/tax/cgt-on-foreign-shares and /global-investing/tax/fito for worked examples.",
  },
  {
    q: "Which Australian brokers are best for international shares?",
    a: "Depends on what you want. Stake offers fee-free US shares (with FX spread); Interactive Brokers (IBKR) has the lowest FX spread (~0.002%) and broadest market access (LSE, HKEX, TSE) but a steeper learning curve; Tiger AU and moomoo AU compete aggressively on signup bonuses; CommSec International is the bank-broker option with established trust; Webull and eToro fit specific niches. The custody model differs — Stake/Tiger/moomoo are custodial (held in nominee), CommSec International offers DRS (Direct Registration). See /global-investing/shares/us for the full broker comparison and /global-investing/guides/chess-vs-custodial-international for the ownership-model explainer.",
  },
  {
    q: "Should I use a hedged or unhedged international ETF?",
    a: "Most long-term Australian investors use unhedged. Over decades, currency exposure averages out and hedging costs (~0.06% p.a. on IVV vs IHVV) compound against returns. Unhedged means your AUD value rises when AUD weakens vs the foreign currency, and vice versa — this provides natural diversification against AUD-specific risk. Hedged ETFs (IHVV, HNDQ) make sense for shorter holding periods or when you want pure equity-return exposure without FX overlay. Decide based on horizon, not last quarter's FX move.",
  },
  {
    q: "What FX provider should I use for international transfers?",
    a: "For one-off broker funding, Wise typically beats banks by 1.5–2% on AUD/USD. For larger transfers (>AU$50k) OFX and WorldFirst offer better rates with dedicated dealers. For ongoing multi-currency accounts, Wise and Revolut offer card spending in foreign currencies. Bank-to-bank international transfers are usually the worst option (1.5–3% spread plus fixed fees). See /global-investing/currency/best-fx-providers for the full comparison.",
  },
];

const SUB_PILLARS = [
  {
    href: "/global-investing/shares/us",
    eyebrow: "Track A — Direct",
    label: "Buy US shares from Australia",
    description: "Compare Stake, IBKR, Tiger, moomoo, CommSec International. FX, W-8BEN, custody, total cost.",
    color: "from-blue-50 to-white",
  },
  {
    href: "/global-investing/etfs",
    eyebrow: "Track B — AU-listed",
    label: "AU-listed foreign exposure (ETFs)",
    description: "IVV, VGS, NDQ, VAE, IZZ, IEU, NDIA. Compare region exposure on the ASX with no foreign account needed.",
    color: "from-emerald-50 to-white",
  },
  {
    href: "/global-investing/lics",
    eyebrow: "Track B — AU-listed",
    label: "Global LICs",
    description: "MFF, WGB, PMC, FGG. Listed Investment Companies with global mandates trading at NTA premium/discount.",
    color: "from-emerald-50 to-white",
  },
  {
    href: "/global-investing/property",
    eyebrow: "Track A — Direct",
    label: "Foreign property",
    description: "AU residents buying in NZ, US (FL/TX), Bali, UK, Portugal. Stamp duty, financing, foreign-buyer rules.",
    color: "from-blue-50 to-white",
  },
  {
    href: "/global-investing/currency",
    eyebrow: "Track A — Direct",
    label: "FX & currency accounts",
    description: "Wise vs OFX vs WorldFirst vs Revolut vs Airwallex. Spreads, fees, and multi-currency accounts compared.",
    color: "from-blue-50 to-white",
  },
  {
    href: "/global-investing/bonds",
    eyebrow: "Track A + B",
    label: "Foreign bonds",
    description: "US Treasuries direct via IBKR, plus AU-listed global bond ETFs. Yield, currency hedging, tax treatment.",
    color: "from-violet-50 to-white",
  },
  {
    href: "/global-investing/crypto",
    eyebrow: "Track A — Direct",
    label: "Global crypto exchanges",
    description: "Binance, Kraken, Bybit from Australia vs domestic AUSTRAC-registered exchanges. KYC, tax, on-ramp.",
    color: "from-violet-50 to-white",
  },
  {
    href: "/global-investing/tax",
    eyebrow: "The moat",
    label: "Tax for global investors",
    description: "FITO, US estate tax, CGT on foreign shares, W-8BEN, DTA tables, QROPS pension transfers.",
    color: "from-amber-50 to-white",
  },
];

const TRACK_A_VS_B = [
  {
    when: "You want a specific US stock (Tesla, Nvidia, Apple)",
    use: "Track A — direct via foreign broker",
    why: "ASX-listed ETFs only give you the index, not the individual ticker.",
    cta: { href: "/global-investing/shares/us", label: "Compare US-share brokers" },
  },
  {
    when: "You want broad US/global market exposure for the long term",
    use: "Track B — AU-listed ETF",
    why: "IVV (0.04% MER) usually beats VOO direct after FX, brokerage, and W-8BEN/estate-tax friction.",
    cta: { href: "/global-investing/etfs/us", label: "Compare AU-listed US ETFs" },
  },
  {
    when: "You want emerging-markets, Asia, China, or India exposure",
    use: "Track B — AU-listed ETF",
    why: "AU-listed VAE, IZZ, NDIA, IEM avoid the friction of opening accounts on HKEX, NSE, or KRX.",
    cta: { href: "/global-investing/etfs", label: "Compare regional ETFs" },
  },
  {
    when: "You're a frequent trader",
    use: "Track A — IBKR specifically",
    why: "0.002% FX spread vs 0.40–0.70% on retail brokers compounds quickly with high turnover.",
    cta: { href: "/global-investing/guides/ibkr-australia-setup", label: "IBKR setup walkthrough" },
  },
  {
    when: "You want to avoid US estate tax exposure entirely",
    use: "Track B — AU-listed ETF",
    why: "AU-domiciled ETFs are not US-situs assets. Direct US shares >US$60k are.",
    cta: { href: "/global-investing/tax/us-estate-tax", label: "US estate tax explainer" },
  },
];

const HERO_STATS = [
  { label: "Brokers compared", value: "11+", sub: "Stake, IBKR, Tiger, moomoo, more" },
  { label: "AU-listed regions", value: "9", sub: "US, EU, UK, JP, CN, IN, EM + global" },
  { label: "Tax calculators", value: "4", sub: "FITO, US estate, FX impact, total cost" },
  { label: "Updated", value: "Monthly", sub: "Fees verified each cycle" },
];

export default function GlobalInvestingHubPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: SITE_URL },
    { name: "Global Investing" },
  ]);


  return (
    <div className="bg-white min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="relative bg-white border-b border-slate-100 overflow-hidden py-8 md:py-12">
        <div className="container-custom">
          <nav className="text-xs text-slate-600 mb-5 flex items-center gap-1.5">
            <Link href="/" className="hover:text-slate-900">Home</Link>
            <span className="text-slate-300">/</span>
            <span className="text-slate-900 font-medium">Global Investing</span>
          </nav>

          <div className="grid md:grid-cols-2 gap-10 items-start">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-full text-xs font-semibold text-slate-600 mb-4">
                <span className="w-1.5 h-1.5 bg-amber-400 rounded-full" />
                {UPDATED_LABEL} — All Tracks
              </div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold leading-[1.1] mb-3 tracking-tight text-slate-900">
                Global investing{" "}
                <span className="text-amber-500">for Australians</span>
              </h1>
              <p className="text-sm md:text-base text-slate-600 leading-relaxed mb-5">
                Two ways to put AUD into global markets — directly via a foreign broker, or via
                AU-listed ETFs and LICs that hold foreign shares for you. We compare both, plus
                the tax rules that decide which path is cheaper for your scenario.
              </p>
              <p className="text-xs text-slate-500 mb-5">Where do you want to start?</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-5">
                <Link
                  href="/global-investing/shares/us"
                  className="px-4 py-2.5 border border-slate-200 hover:bg-slate-50 hover:border-amber-300 text-slate-700 hover:text-slate-900 font-semibold rounded-xl text-xs text-left transition-colors"
                >
                  I want to buy US shares &rarr;
                </Link>
                <Link
                  href="/global-investing/etfs"
                  className="px-4 py-2.5 border border-slate-200 hover:bg-slate-50 hover:border-amber-300 text-slate-700 hover:text-slate-900 font-semibold rounded-xl text-xs text-left transition-colors"
                >
                  I want AU-listed global exposure &rarr;
                </Link>
                <Link
                  href="/global-investing/property"
                  className="px-4 py-2.5 border border-slate-200 hover:bg-slate-50 hover:border-amber-300 text-slate-700 hover:text-slate-900 font-semibold rounded-xl text-xs text-left transition-colors"
                >
                  I want to buy foreign property &rarr;
                </Link>
                <Link
                  href="/global-investing/tax"
                  className="px-4 py-2.5 border border-slate-200 hover:bg-slate-50 hover:border-amber-300 text-slate-700 hover:text-slate-900 font-semibold rounded-xl text-xs text-left transition-colors"
                >
                  I need to understand the tax &rarr;
                </Link>
              </div>
              <Link
                href="#tracks"
                className="inline-block px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold rounded-xl text-xs text-center transition-colors shadow-lg shadow-amber-500/20"
              >
                Show me Track A vs Track B &rarr;
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {HERO_STATS.map((s) => (
                <div key={s.label} className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                  <div className="text-xl md:text-2xl font-extrabold text-amber-600">{s.value}</div>
                  <div className="text-[0.65rem] font-bold text-slate-900 mt-0.5">{s.label}</div>
                  <div className="text-[0.6rem] text-slate-500 mt-0.5">{s.sub}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Two-track explainer ─────────────────────────────────────── */}
      <section id="tracks" className="bg-slate-50 border-b border-slate-100 py-10">
        <div className="container-custom">
          <SectionHeading
            eyebrow="Two tracks, one hub"
            title="Track A vs Track B — pick the right path"
            sub="Most Australians are better served by Track B (AU-listed exposure) for cost and simplicity. Track A makes sense for specific stocks, frequent trading, or markets the ASX doesn't cover."
          />
          <div className="grid md:grid-cols-2 gap-4">
            {TRACK_A_VS_B.map((row) => (
              <div key={row.when} className="bg-white border border-slate-200 rounded-2xl p-5">
                <p className="text-[0.65rem] font-bold uppercase tracking-wider text-slate-500 mb-1">If</p>
                <p className="font-semibold text-slate-900 text-sm mb-3">{row.when}</p>
                <p className="text-[0.65rem] font-bold uppercase tracking-wider text-amber-600 mb-1">Use</p>
                <p className="font-bold text-slate-900 text-sm mb-2">{row.use}</p>
                <p className="text-xs text-slate-600 leading-relaxed mb-4">{row.why}</p>
                <Link
                  href={row.cta.href}
                  className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 hover:text-amber-700"
                >
                  {row.cta.label} &rarr;
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Sub-pillar grid ─────────────────────────────────────────── */}
      <section className="bg-white border-b border-slate-100 py-10">
        <div className="container-custom">
          <SectionHeading
            eyebrow="Pillars"
            title="Where to start"
            sub="Eight sub-pillars — from direct foreign brokers to AU-listed ETFs to the tax rules that affect both."
          />
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3">
            {SUB_PILLARS.map((p) => (
              <Link
                key={p.href}
                href={p.href}
                className={`group block bg-gradient-to-br ${p.color} border border-slate-200 rounded-2xl p-5 hover:border-amber-300 hover:shadow-md transition-all`}
              >
                <p className="text-[0.65rem] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  {p.eyebrow}
                </p>
                <p className="font-bold text-slate-900 text-sm mb-2 group-hover:text-amber-700">
                  {p.label}
                </p>
                <p className="text-xs text-slate-600 leading-relaxed">{p.description}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <HubFAQ
        items={HUB_FAQS}
        heading="Common questions about investing globally from Australia"
        eyebrow="FAQ"
        className="bg-slate-50 border-b border-slate-100 py-10"
      />

      {/* ── Cross-link to inbound counterpart ───────────────────────── */}
      <section className="bg-white py-10">
        <div className="container-custom">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 max-w-4xl">
            <p className="text-[0.65rem] font-bold uppercase tracking-wider text-amber-700 mb-1">
              Going the other way?
            </p>
            <p className="font-bold text-slate-900 text-base mb-2">
              Foreign investors looking to invest in Australia
            </p>
            <p className="text-xs text-slate-600 leading-relaxed mb-3">
              If you&apos;re a non-resident, visa holder, expat or new migrant looking at the AU
              market from overseas, our inbound hub covers FIRB property rules, DASP super, DTA
              withholding tax tables, and per-country guides for 14 countries.
            </p>
            <Link
              href="/foreign-investment"
              className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 hover:text-amber-700"
            >
              See investing in Australia from overseas &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* ── Compliance footer ───────────────────────────────────────── */}
      <section className="bg-slate-50 border-t border-slate-100 py-6">
        <div className="container-custom">
          <p className="text-[0.65rem] text-slate-500 leading-relaxed max-w-4xl">
            {GENERAL_ADVICE_WARNING}
          </p>
        </div>
      </section>
    </div>
  );
}
