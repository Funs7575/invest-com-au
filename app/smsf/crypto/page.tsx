import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, absoluteUrl, UPDATED_LABEL } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";
import HubAdvisorCTA from "@/components/HubAdvisorCTA";
import { createClient } from "@/lib/supabase/server";
import { getAffiliateLink, AFFILIATE_REL, renderStars } from "@/lib/tracking";
import type { Broker } from "@/lib/types";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `Crypto in Your SMSF: ATO Rules, Tax & Compliance ${CURRENT_YEAR} | Invest.com.au`,
  description:
    "SMSF crypto: hold Bitcoin legally if you pass the sole purpose test. 15% tax in accumulation, 0% in pension phase. Compliance requirements.",
  alternates: { canonical: `${SITE_URL}/smsf/crypto` },
  openGraph: {
    title: `Crypto in Your SMSF: ATO Rules, Tax & Compliance ${CURRENT_YEAR}`,
    description:
      "ATO compliance rules, tax treatment, custody requirements, and record-keeping for cryptocurrency held inside an SMSF.",
    url: `${SITE_URL}/smsf/crypto`,
    type: "website",
    images: [{ url: `/api/og?title=${encodeURIComponent("Crypto in Your SMSF — ATO Rules")}&sub=${encodeURIComponent("Bitcoin · Tax · Custody · " + CURRENT_YEAR)}`, width: 1200, height: 630 }],
  },
};



const FAQ_ITEMS = [
  {
    q: "Can my SMSF invest in cryptocurrency legally?",
    a: "Yes. The ATO has confirmed that cryptocurrency is an allowable SMSF investment — it is treated as a CGT asset under TR 2014/25. However, your trust deed must permit digital assets, you must document why crypto fits your fund's investment strategy, the assets must be held separately from personal holdings, and the investment must pass the sole purpose test (maintained solely to provide retirement benefits). Buying crypto purely for personal enjoyment or use would breach superannuation law.",
  },
  {
    q: "What tax rate does my SMSF pay on crypto gains?",
    a: "In accumulation phase, capital gains are taxed at 15%. If the SMSF held the asset for more than 12 months, a one-third discount applies, reducing the effective rate to 10%. In pension phase (once a member has commenced an account-based pension), both income and capital gains on assets supporting the pension are taxed at 0%. Staking rewards and DeFi income are treated as ordinary income taxed at 15% in accumulation phase.",
  },
  {
    q: "Can I transfer my personal crypto into my SMSF?",
    a: "No. This is explicitly prohibited under the in-house asset rules and the requirement that SMSF assets not be acquired from members or related parties. You cannot transfer Bitcoin or any other crypto you personally own into your SMSF — the fund must purchase the assets fresh on an exchange or through a broker, in the trustee's name, using SMSF funds. Attempting an in-specie transfer of crypto would likely constitute a breach reportable by your auditor to the ATO.",
  },
  {
    q: "How does crypto affect the SMSF annual audit?",
    a: "Your ASIC-approved SMSF auditor must verify every asset including crypto holdings. For each crypto asset, the auditor typically requires: evidence of ownership (wallet addresses, exchange account statements in the trustee's name), a 30 June market valuation in AUD, complete transaction records for the year, and confirmation that the holdings are entirely separated from any personal accounts. Using software like Koinly or CryptoTaxCalculator for the SMSF account makes audit evidence significantly easier to produce. Missing records are detectable because the ATO receives client data directly from Australian exchanges.",
  },
  {
    q: "How much crypto can my SMSF hold?",
    a: "There is no hard legislative percentage cap, but concentration risk is a real compliance concern. Most SMSF advisers suggest limiting crypto to 5–20% of fund assets and documenting the rationale in the written investment strategy. If crypto represents 80%+ of the fund, auditors and the ATO may question whether the investment strategy adequately addresses diversification and liquidity (the ability to meet member benefit payment obligations). The in-house asset 5% limit applies to related-party loans and leases — not to crypto itself — but a highly concentrated crypto fund would face scrutiny under the investment strategy rules.",
  },
];

export default async function SmsfCryptoPage() {
  const supabase = await createClient();
  const { data: cryptoExchanges } = await supabase
    .from("brokers")
    .select("id, name, slug, color, affiliate_url, rating, tagline, cta_text, benefit_cta")
    .eq("platform_type", "crypto_exchange")
    .eq("status", "active")
    .order("rating", { ascending: false })
    .limit(3);

  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "SMSF", url: absoluteUrl("/smsf") },
    { name: "Crypto in Your SMSF", url: absoluteUrl("/smsf/crypto") },
  ]);

  const faqLd = faqJsonLd(FAQ_ITEMS);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      {faqLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      )}

      <div className="bg-white min-h-screen">

        {/* ── Hero ── */}
        <section className="bg-slate-900 text-white py-10 md:py-16">
          <div className="container-custom">
            <nav className="flex items-center gap-1.5 text-xs text-slate-400 mb-5" aria-label="Breadcrumb">
              <Link href="/" className="hover:text-white transition-colors">Home</Link>
              <span className="text-slate-600">/</span>
              <Link href="/smsf" className="hover:text-white transition-colors">SMSF</Link>
              <span className="text-slate-600">/</span>
              <span className="text-white font-medium">Crypto in Your SMSF</span>
            </nav>
            <p className="text-xs font-semibold text-amber-400 uppercase tracking-widest mb-3">{UPDATED_LABEL}</p>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight mb-4 max-w-3xl">
              Crypto in Your SMSF: ATO Rules, Tax &amp; Compliance {CURRENT_YEAR}
            </h1>
            <p className="text-base md:text-lg text-slate-300 leading-relaxed max-w-3xl mb-6">
              SMSFs can legally hold Bitcoin, Ethereum, and other cryptocurrencies — but the ATO has strict requirements.
              You need a documented investment strategy, a custody solution that is completely separated from your personal
              accounts, and you must pass the sole purpose test. Get the structure right, and you access tax rates as low
              as 15% in accumulation phase or 0% in pension phase.
            </p>
            <div className="flex flex-wrap gap-3">
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-900/60 border border-emerald-700 px-4 py-1.5 text-xs font-semibold text-emerald-300">
                ATO-confirmed allowable investment
              </div>
              <div className="inline-flex items-center gap-2 rounded-full bg-amber-900/50 border border-amber-700 px-4 py-1.5 text-xs font-semibold text-amber-300">
                15% tax in accumulation / 0% in pension
              </div>
              <div className="inline-flex items-center gap-2 rounded-full bg-slate-700/60 border border-slate-600 px-4 py-1.5 text-xs font-semibold text-slate-300">
                Strict custody &amp; record-keeping rules
              </div>
            </div>
          </div>
        </section>

        {/* ── Tax advantage summary ── */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-5xl">
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 md:p-8">
              <h2 className="text-xl font-extrabold text-amber-900 mb-2">The tax advantage in plain numbers</h2>
              <p className="text-sm text-amber-800 mb-5">
                The tax differential is the primary reason investors hold crypto inside an SMSF rather than personally.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="rounded-xl bg-white border border-amber-200 p-5">
                  <p className="text-xs uppercase tracking-wider font-extrabold text-slate-500 mb-1">Personal holding</p>
                  <p className="text-3xl font-extrabold text-slate-900">Up to 47%</p>
                  <p className="text-xs text-slate-600 mt-1.5">Capital gains at top marginal rate (minus 50% CGT discount if held 12+ months, so 23.5% effective at top rate)</p>
                </div>
                <div className="rounded-xl bg-white border border-amber-200 p-5">
                  <p className="text-xs uppercase tracking-wider font-extrabold text-slate-500 mb-1">SMSF — accumulation</p>
                  <p className="text-3xl font-extrabold text-slate-900">15% / 7.5%</p>
                  <p className="text-xs text-slate-600 mt-1.5">15% on short-term gains; 7.5% effective after 12-month CGT discount (one-third of 15%)</p>
                </div>
                <div className="rounded-xl bg-white border border-emerald-200 bg-emerald-50 p-5">
                  <p className="text-xs uppercase tracking-wider font-extrabold text-slate-500 mb-1">SMSF — pension phase</p>
                  <p className="text-3xl font-extrabold text-emerald-700">0%</p>
                  <p className="text-xs text-slate-600 mt-1.5">No tax on income or capital gains on assets supporting a pension account</p>
                </div>
              </div>
              <p className="text-xs text-amber-700 mt-4">
                Staking rewards and DeFi income are taxed as ordinary income at 15% in accumulation phase (not capital gains). General advice only — see your tax adviser.
              </p>
            </div>
          </div>
        </section>

        {/* ── Is crypto legal in an SMSF? ── */}
        <section className="py-12 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-5xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-4">Is crypto a legal SMSF investment?</h2>
            <div className="prose prose-slate max-w-none text-sm md:text-base leading-relaxed space-y-4">
              <p>
                Yes. The ATO has confirmed that cryptocurrency is an allowable SMSF investment, classified as a
                capital gains tax (CGT) asset under Tax Ruling TR 2014/25 and subsequent ATO guidance. The same
                15% concessional tax rate that applies to other SMSF investments applies to crypto gains in accumulation
                phase, and the same 0% rate applies in pension phase.
              </p>
              <p>
                Legality does not mean unrestricted. The investment must comply with all the usual superannuation law
                requirements: the fund&apos;s trust deed must permit digital assets, the investment must be genuine
                (i.e. made for retirement purposes, not personal use), and the sole purpose test must be satisfied at all
                times. The ATO is actively data-matching — Australian crypto exchanges are required to provide client
                data to the ATO, so gaps in an SMSF&apos;s crypto records are detectable.
              </p>
            </div>
          </div>
        </section>

        {/* ── Sole purpose test ── */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-5xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-4">Sole purpose test</h2>
            <p className="text-sm md:text-base text-slate-600 leading-relaxed mb-6">
              Under section 62 of the <em>Superannuation Industry (Supervision) Act 1993</em>, an SMSF must be
              maintained solely for the purpose of providing retirement benefits to members (or death benefits to their
              dependants). Every investment decision — including crypto — must be consistent with this purpose.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
                <h3 className="font-extrabold text-emerald-900 mb-3 text-base">Compliant crypto investments</h3>
                <ul className="space-y-2 text-sm text-slate-800">
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-600 font-bold mt-0.5">&#10003;</span>
                    <span>Bitcoin, Ethereum, and other cryptocurrencies held purely as investment assets</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-600 font-bold mt-0.5">&#10003;</span>
                    <span>Staking to earn yield on holdings (income taxed at 15%)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-600 font-bold mt-0.5">&#10003;</span>
                    <span>Holding in a separately titled wallet or exchange account in trustee name &ldquo;as trustee for [Fund Name]&rdquo;</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-600 font-bold mt-0.5">&#10003;</span>
                    <span>Documenting the investment rationale in a written investment strategy</span>
                  </li>
                </ul>
              </div>
              <div className="rounded-xl border border-red-200 bg-red-50 p-5">
                <h3 className="font-extrabold text-red-900 mb-3 text-base">Sole purpose test breaches</h3>
                <ul className="space-y-2 text-sm text-slate-800">
                  <li className="flex items-start gap-2">
                    <span className="text-red-600 font-bold mt-0.5">&#10007;</span>
                    <span>Using SMSF crypto to pay for personal goods or services (personal use asset)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-600 font-bold mt-0.5">&#10007;</span>
                    <span>Commingling SMSF and personal crypto in the same wallet or exchange account</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-600 font-bold mt-0.5">&#10007;</span>
                    <span>Acquiring crypto from a member or related party (in-house asset rules)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-600 font-bold mt-0.5">&#10007;</span>
                    <span>Holding in a wallet the member controls personally (not clearly in the trustee&apos;s name)</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ── ATO guidance and data matching ── */}
        <section className="py-12 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-5xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-4">ATO guidance and data matching</h2>
            <div className="space-y-4 text-sm md:text-base text-slate-700 leading-relaxed">
              <p>
                The ATO classifies cryptocurrency as a CGT asset under TR 2014/25. When an SMSF sells crypto, the
                proceeds are calculated in Australian dollars at the time of disposal, using the market price on a
                reputable exchange. The same rules that apply to an individual&apos;s crypto gains apply inside the
                SMSF — except the tax rates are significantly lower.
              </p>
              <p>
                Since 2019, the ATO has required Australian crypto exchanges to report client data including names,
                addresses, bank account details, and transaction histories. The ATO cross-references this data against
                tax returns and SMSF annual returns. An SMSF that holds crypto but has incomplete records or omits
                transactions from its annual return is likely to attract ATO scrutiny.
              </p>
            </div>
            <div className="mt-6 rounded-xl border border-blue-200 bg-blue-50 p-5">
              <p className="text-sm font-extrabold text-blue-900 mb-1">ATO data-matching in practice</p>
              <p className="text-sm text-blue-800">
                Australian exchanges including Coinbase, Swyftx, and Independent Reserve provide the ATO with client
                transaction data. If your SMSF has an account on any of these exchanges, the ATO already has a record
                of your trades. Complete records in your annual audit are essential — missing transactions are not
                invisible.
              </p>
            </div>
          </div>
        </section>

        {/* ── Investment strategy requirements ── */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-5xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-4">Investment strategy requirements</h2>
            <p className="text-sm md:text-base text-slate-600 leading-relaxed mb-6">
              Every SMSF trustee is required by law to have a written investment strategy that considers risk and return,
              diversification, liquidity, and the ability to meet member benefit obligations. Before buying crypto,
              trustees must update their strategy document to explicitly address digital assets.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 space-y-3">
                <h3 className="font-extrabold text-slate-900 text-base">What the strategy must address</h3>
                <ul className="space-y-2 text-sm text-slate-700">
                  <li className="flex items-start gap-2">
                    <span className="text-amber-600 font-bold">&#8226;</span>
                    <span><strong>Risk and return:</strong> why the expected return from crypto aligns with the fund&apos;s investment objectives, given its high volatility</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-600 font-bold">&#8226;</span>
                    <span><strong>Diversification:</strong> how crypto fits alongside other asset classes; concentration percentage targets and maximum allocation</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-600 font-bold">&#8226;</span>
                    <span><strong>Liquidity:</strong> crypto trades 24/7 so liquidating is feasible, but extreme market conditions can widen spreads significantly</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-600 font-bold">&#8226;</span>
                    <span><strong>Benefit payments:</strong> the fund must be able to pay member benefits as they fall due — a heavily crypto-weighted fund with imminent pensions must plan for this</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-600 font-bold">&#8226;</span>
                    <span><strong>Insurance:</strong> whether members need life or disability cover, and how crypto holdings affect the fund&apos;s capacity to fund that cover</span>
                  </li>
                </ul>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 space-y-3">
                <h3 className="font-extrabold text-slate-900 text-base">Review and documentation obligations</h3>
                <ul className="space-y-2 text-sm text-slate-700">
                  <li className="flex items-start gap-2">
                    <span className="text-amber-600 font-bold">&#8226;</span>
                    <span>The strategy must be reviewed regularly — at least annually, and whenever the fund&apos;s circumstances change materially (e.g. a large crypto position forms)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-600 font-bold">&#8226;</span>
                    <span>Each review must be documented — date, trustees who participated, any changes made</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-600 font-bold">&#8226;</span>
                    <span>An auditor who finds no evidence of strategy reviews will issue a qualification — and may report the breach to the ATO</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-600 font-bold">&#8226;</span>
                    <span>The trust deed must also be checked — older deeds may not permit digital assets, requiring a deed update before purchasing</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ── In-house asset rule ── */}
        <section className="py-12 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-5xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-4">In-house asset rule and related parties</h2>
            <p className="text-sm md:text-base text-slate-600 leading-relaxed mb-5">
              The in-house asset rules under Part 8 of the SIS Act prohibit an SMSF from acquiring assets from members
              or related parties, and limit related-party investments to 5% of the fund. For crypto, the critical
              implication is straightforward:
            </p>
            <div className="rounded-xl border border-red-200 bg-red-50 p-6">
              <p className="font-extrabold text-red-900 text-base mb-2">You cannot transfer your personal crypto into your SMSF.</p>
              <p className="text-sm text-red-800 leading-relaxed">
                In-specie transfers of crypto from a member or related party to an SMSF are prohibited. The SMSF must
                purchase all crypto assets fresh, on an exchange or through a broker, using SMSF funds. This is different
                from listed shares (which members can transfer in at market value) — crypto does not qualify for the
                listed securities exemption.
              </p>
            </div>
            <p className="text-sm text-slate-600 mt-4">
              The 5% in-house asset limit applies to loans to, and leases with, related parties — not to crypto holdings
              in general. However, if your SMSF were to provide crypto to a related party (e.g. lend crypto to a company
              you own), that arrangement would likely be captured by the in-house asset rules.
            </p>
          </div>
        </section>

        {/* ── Custody solutions ── */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-5xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-4">Custody: keeping SMSF crypto separate</h2>
            <p className="text-sm md:text-base text-slate-600 leading-relaxed mb-6">
              The ATO and SMSF auditors require that SMSF crypto assets are clearly separated from members&apos; personal
              holdings. The account or wallet must be titled in the trustee&apos;s name &ldquo;as trustee for [Fund Name]&rdquo;.
              Commingling SMSF and personal crypto in the same account is a reportable breach.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 space-y-2">
                <p className="font-extrabold text-slate-900 text-sm">Exchange account in trustee name</p>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Open a dedicated account on a crypto exchange in the trustee&apos;s name (e.g. &ldquo;Jane Smith &amp; John Smith as trustees for Smith Family Super Fund&rdquo;).
                  The exchange must support corporate trustee or individual trustee onboarding. Most major Australian
                  exchanges now have SMSF-specific account types.
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 space-y-2">
                <p className="font-extrabold text-slate-900 text-sm">Hardware wallet in trustee name</p>
                <p className="text-xs text-slate-600 leading-relaxed">
                  A hardware wallet (Ledger, Trezor) is permitted for cold storage, provided the wallet is clearly
                  documented as belonging to the SMSF, the private keys are recorded and secured, and the wallet
                  address is included in the annual audit evidence. Keeping the keys in your personal name with no
                  documentation linking them to the SMSF will fail audit.
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 space-y-2">
                <p className="font-extrabold text-slate-900 text-sm">Institutional custody providers</p>
                <p className="text-xs text-slate-600 leading-relaxed">
                  For larger SMSF crypto positions, institutional custody providers (such as those offering segregated
                  custody with SMSF-specific reporting) provide cleaner audit evidence and may carry insurance against
                  loss. These services typically have minimum investment thresholds. They are not an ATO requirement —
                  but they simplify the audit process.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Tax treatment in detail ── */}
        <section className="py-12 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-5xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-4">Tax treatment in detail</h2>
            <div className="space-y-5">
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <h3 className="font-extrabold text-slate-900 text-base mb-2">Capital gains</h3>
                <p className="text-sm text-slate-700 leading-relaxed">
                  When the SMSF sells crypto, any gain is a capital gain. In accumulation phase, the gain is taxed at
                  15%. If the asset was held for more than 12 months, a one-third CGT discount applies — reducing the
                  effective rate to 7.5%. In pension phase, capital gains attributable to assets supporting a pension
                  are taxed at 0%. Capital losses can be offset against capital gains in the same or future years
                  within the SMSF.
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <h3 className="font-extrabold text-slate-900 text-base mb-2">Staking rewards</h3>
                <p className="text-sm text-slate-700 leading-relaxed">
                  Staking rewards are treated by the ATO as ordinary income at the time they are received, not as
                  capital gains. The income is included in the SMSF&apos;s assessable income and taxed at 15% in
                  accumulation phase (0% in pension phase for eligible assets). The cost base of staked tokens for
                  future CGT purposes is the market value at the time they were received as income.
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <h3 className="font-extrabold text-slate-900 text-base mb-2">DeFi and other crypto income</h3>
                <p className="text-sm text-slate-700 leading-relaxed">
                  Income from decentralised finance activities — including liquidity pool fees, yield farming returns,
                  and lending interest — is treated as ordinary income by the ATO and taxed at 15% in accumulation
                  phase. The ATO&apos;s position on the tax treatment of more complex DeFi transactions (wrapping,
                  bridging, liquidity pool entry and exit) continues to evolve. SMSF trustees engaging heavily in DeFi
                  should obtain specialist tax advice.
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <h3 className="font-extrabold text-slate-900 text-base mb-2">Cost base and valuation</h3>
                <p className="text-sm text-slate-700 leading-relaxed">
                  The cost base of each crypto asset includes the purchase price in AUD plus acquisition costs (exchange
                  fees, brokerage). When calculating a capital gain on disposal, the SMSF must use the AUD value at the
                  time of disposal. For the annual audit, the ATO requires assets to be valued at market value as at
                  30 June each year, using the closing price from a reputable exchange.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Record-keeping ── */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-5xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-4">Record-keeping obligations</h2>
            <p className="text-sm md:text-base text-slate-600 leading-relaxed mb-6">
              SMSF trustees must maintain records of every crypto transaction. Because the ATO receives exchange data
              directly, gaps in records are detectable and will be flagged in an audit.
            </p>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 mb-5">
              <h3 className="font-extrabold text-slate-900 text-sm mb-3">Required records for each transaction</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-slate-700">
                <div className="flex items-start gap-2">
                  <span className="text-amber-600 font-bold">&#8226;</span>
                  <span>Date of the transaction</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-amber-600 font-bold">&#8226;</span>
                  <span>AUD value of the crypto at date of transaction</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-amber-600 font-bold">&#8226;</span>
                  <span>Counterparty or exchange used</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-amber-600 font-bold">&#8226;</span>
                  <span>Transaction ID or hash (for on-chain transactions)</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-amber-600 font-bold">&#8226;</span>
                  <span>Fees paid in AUD and/or crypto</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-amber-600 font-bold">&#8226;</span>
                  <span>Purpose (purchase, sale, staking reward, DeFi income)</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-amber-600 font-bold">&#8226;</span>
                  <span>30 June market valuations for all holdings</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-amber-600 font-bold">&#8226;</span>
                  <span>Wallet addresses and exchange account statements</span>
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-5">
              <p className="font-extrabold text-blue-900 text-sm mb-1">Crypto tax software for SMSFs</p>
              <p className="text-sm text-blue-800 leading-relaxed">
                Most SMSF accountants recommend dedicated crypto tax software to produce the transaction reports,
                cost-base calculations, and 30 June valuations that auditors require. Koinly and CryptoTaxCalculator
                both support SMSF-specific reporting and can export in formats compatible with most SMSF accounting
                platforms. The SMSF must have its own account in the software — do not import personal transactions
                into the SMSF account.
              </p>
            </div>
          </div>
        </section>

        {/* ── Annual audit ── */}
        <section className="py-12 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-5xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-4">The annual audit and crypto</h2>
            <p className="text-sm md:text-base text-slate-600 leading-relaxed mb-6">
              Every SMSF must be independently audited each year by an ASIC-approved auditor with an SMSF Auditor
              Number (SAN). For SMSFs holding crypto, the audit involves additional verification steps that can increase
              time and cost if records are incomplete.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
              <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
                <h3 className="font-extrabold text-slate-900 text-sm">What the auditor verifies</h3>
                <ul className="space-y-2 text-sm text-slate-700">
                  <li className="flex items-start gap-2">
                    <span className="text-slate-500 font-bold">&#8226;</span>
                    <span>Ownership evidence — wallet addresses or exchange statements in the trustee&apos;s name</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-slate-500 font-bold">&#8226;</span>
                    <span>30 June market valuations in AUD for all crypto holdings</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-slate-500 font-bold">&#8226;</span>
                    <span>Complete transaction records for the financial year</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-slate-500 font-bold">&#8226;</span>
                    <span>Separation between SMSF and personal crypto accounts</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-slate-500 font-bold">&#8226;</span>
                    <span>Compliance with investment strategy (actual holdings consistent with documented allocation)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-slate-500 font-bold">&#8226;</span>
                    <span>No related-party acquisition of crypto assets</span>
                  </li>
                </ul>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
                <h3 className="font-extrabold text-slate-900 text-sm">What triggers an audit qualification</h3>
                <ul className="space-y-2 text-sm text-slate-700">
                  <li className="flex items-start gap-2">
                    <span className="text-red-400 font-bold">&#8226;</span>
                    <span>Missing transactions or gaps in the transaction history</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-400 font-bold">&#8226;</span>
                    <span>No evidence of 30 June valuations (market price from exchange records required)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-400 font-bold">&#8226;</span>
                    <span>Commingled wallets or exchange accounts with personal funds</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-400 font-bold">&#8226;</span>
                    <span>Investment strategy does not mention crypto despite crypto holdings</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-400 font-bold">&#8226;</span>
                    <span>Evidence of crypto being acquired from a related party</span>
                  </li>
                </ul>
              </div>
            </div>
            <p className="text-xs text-slate-500">
              A qualified audit is reported to the ATO via the SMSF Annual Return and can trigger an ATO review. For
              SMSF auditors who specialise in digital assets, see{" "}
              <Link href="/smsf/auditors" className="text-amber-700 hover:underline font-semibold">our SMSF auditor directory</Link>.
            </p>
          </div>
        </section>

        {/* ── Concentration risk ── */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-5xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-4">Concentration risk and allocation limits</h2>
            <p className="text-sm md:text-base text-slate-600 leading-relaxed mb-5">
              There is no legislative maximum on the percentage of an SMSF that can be held in crypto. However,
              concentration risk is a genuine compliance concern — and a practical one.
            </p>
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 mb-5">
              <p className="font-extrabold text-amber-900 text-sm mb-2">Typical adviser guidance on crypto allocation</p>
              <p className="text-sm text-amber-800 leading-relaxed">
                Most SMSF specialists suggest limiting crypto to 5–20% of total fund assets. An allocation within this
                range is defensible under a documented investment strategy that acknowledges the asset&apos;s volatility,
                its role as a diversifier, and the fund&apos;s ability to meet benefit payment obligations. An SMSF
                with 80%+ in crypto would face close scrutiny from an auditor and potentially the ATO on whether the
                investment strategy requirements and sole purpose test are met. This is general guidance — the
                appropriate allocation depends on each fund&apos;s circumstances.
              </p>
            </div>
            <div className="space-y-3 text-sm text-slate-700">
              <p>
                <strong>Liquidity and benefit payments:</strong> Crypto trades 24/7 and is highly liquid in normal
                market conditions — but prices can fall sharply and rapidly. An SMSF approaching pension phase must
                ensure it can still pay member benefits even in a significant crypto drawdown. A fund that cannot
                pay benefits because its crypto has dropped 70% may be in breach of trustee obligations.
              </p>
              <p>
                <strong>Annual return timing:</strong> The SMSF lodges an annual return based on 30 June valuations.
                Crypto&apos;s price at 30 June is the valuation that matters for tax — not its peak or trough during
                the year. This creates both risk (a high 30 June price means more tax on unrealised gains if sold in
                the next year) and planning opportunities.
              </p>
            </div>
          </div>
        </section>

        {/* ── Step-by-step ── */}
        <section className="py-12 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-5xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-4">Step-by-step: adding crypto to your SMSF</h2>
            <ol className="space-y-4">
              <li className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-500 text-slate-900 font-extrabold text-sm flex items-center justify-center">1</div>
                <div className="flex-1 pt-0.5">
                  <p className="font-extrabold text-slate-900 text-sm">Check and update the trust deed</p>
                  <p className="text-sm text-slate-600 leading-relaxed mt-0.5">
                    Confirm your SMSF trust deed explicitly permits digital assets or cryptocurrency. Many older deeds
                    do not. If yours does not, engage your SMSF administrator or lawyer to update the deed before
                    proceeding.
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-500 text-slate-900 font-extrabold text-sm flex items-center justify-center">2</div>
                <div className="flex-1 pt-0.5">
                  <p className="font-extrabold text-slate-900 text-sm">Update the written investment strategy</p>
                  <p className="text-sm text-slate-600 leading-relaxed mt-0.5">
                    Amend your investment strategy to address crypto as an asset class — including your rationale,
                    target allocation range, and how it fits the fund&apos;s risk/return objectives, diversification
                    requirements, and liquidity needs.
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-500 text-slate-900 font-extrabold text-sm flex items-center justify-center">3</div>
                <div className="flex-1 pt-0.5">
                  <p className="font-extrabold text-slate-900 text-sm">Open a dedicated exchange account in the trustee&apos;s name</p>
                  <p className="text-sm text-slate-600 leading-relaxed mt-0.5">
                    Create a new account on a crypto exchange under the SMSF trustee&apos;s name (e.g.
                    &ldquo;Jane Smith as trustee for Smith Family Superannuation Fund&rdquo;). Do not use a personal
                    account or add the SMSF to an existing account.
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-500 text-slate-900 font-extrabold text-sm flex items-center justify-center">4</div>
                <div className="flex-1 pt-0.5">
                  <p className="font-extrabold text-slate-900 text-sm">Transfer SMSF funds to the exchange</p>
                  <p className="text-sm text-slate-600 leading-relaxed mt-0.5">
                    Transfer cash from the SMSF&apos;s bank account to the exchange account. Confirm the bank transfer
                    reference includes the SMSF name to maintain a clear audit trail.
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-500 text-slate-900 font-extrabold text-sm flex items-center justify-center">5</div>
                <div className="flex-1 pt-0.5">
                  <p className="font-extrabold text-slate-900 text-sm">Purchase crypto and maintain records</p>
                  <p className="text-sm text-slate-600 leading-relaxed mt-0.5">
                    Purchase the chosen cryptocurrency. Record the date, amount, AUD price, exchange, and fees
                    immediately. Set up crypto tax software (Koinly or CryptoTaxCalculator) for the SMSF account at
                    this point.
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-500 text-slate-900 font-extrabold text-sm flex items-center justify-center">6</div>
                <div className="flex-1 pt-0.5">
                  <p className="font-extrabold text-slate-900 text-sm">Record 30 June valuations annually</p>
                  <p className="text-sm text-slate-600 leading-relaxed mt-0.5">
                    At 30 June each year, record the AUD market value of all crypto holdings from the exchange. This
                    is required for the annual return and the audit.
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-500 text-slate-900 font-extrabold text-sm flex items-center justify-center">7</div>
                <div className="flex-1 pt-0.5">
                  <p className="font-extrabold text-slate-900 text-sm">Provide complete records at annual audit</p>
                  <p className="text-sm text-slate-600 leading-relaxed mt-0.5">
                    Give your auditor the exchange statements, wallet addresses, transaction history export from your
                    crypto tax software, and the 30 June valuations. A complete package avoids audit qualifications.
                  </p>
                </div>
              </li>
            </ol>
          </div>
        </section>

        {/* ── Exchange mini-strip from DB ── */}
        {cryptoExchanges && cryptoExchanges.length > 0 && (
          <section className="py-12 bg-white border-t border-slate-200">
            <div className="container-custom max-w-5xl">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-4">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Crypto Exchanges</p>
                  <h2 className="text-lg font-bold text-slate-900">SMSF-eligible crypto exchanges</h2>
                  <p className="text-sm text-slate-500 mt-1">
                    Ensure the exchange supports SMSF account onboarding and can provide transaction reports in the
                    format your auditor requires.
                  </p>
                </div>
                <div className="grid sm:grid-cols-3 gap-3">
                  {cryptoExchanges.map((b) => (
                    <div key={b.slug} className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col gap-3">
                      <div>
                        <p className="font-bold text-slate-900 text-sm">{b.name}</p>
                        <p className="text-xs"><span className="text-amber-600">{renderStars(Number(b.rating ?? 0))}</span> <span className="font-semibold text-slate-600">{Number(b.rating ?? 0).toFixed(1)}</span></p>
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">{b.tagline}</p>
                      </div>
                      <div className="mt-auto">
                        <a
                          href={getAffiliateLink(b as Broker)}
                          rel={AFFILIATE_REL}
                          target="_blank"
                          className="block text-center w-full px-3 py-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold text-xs rounded-lg transition-colors"
                        >
                          {b.cta_text ?? "Learn More →"}
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-slate-500">
                  Compare all exchanges at{" "}
                  <Link href="/compare?category=crypto" className="text-amber-700 hover:underline font-semibold">
                    our crypto exchange comparison
                  </Link>.
                </p>
              </div>
            </div>
          </section>
        )}

        {/* ── FAQ ── */}
        <section className="py-12 bg-slate-50 border-t border-slate-200">
          <div className="container-custom max-w-3xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-6">Frequently asked questions</h2>
            <div className="space-y-3">
              {FAQ_ITEMS.map((item) => (
                <details
                  key={item.q}
                  className="group rounded-xl border border-slate-200 bg-white overflow-hidden"
                >
                  <summary className="flex items-center justify-between gap-4 cursor-pointer px-5 py-4 font-extrabold text-slate-900 text-sm select-none list-none [&::-webkit-details-marker]:hidden">
                    {item.q}
                    <span className="flex-shrink-0 text-slate-400 group-open:rotate-45 transition-transform duration-200 text-xl leading-none">+</span>
                  </summary>
                  <div className="px-5 pb-5">
                    <p className="text-sm text-slate-600 leading-relaxed">{item.a}</p>
                  </div>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ── General advice warning ── */}
        <section className="py-8 bg-white border-t border-slate-200">
          <div className="container-custom max-w-3xl">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-xs text-slate-500 leading-relaxed">{GENERAL_ADVICE_WARNING}</p>
            </div>
          </div>
        </section>

        <HubAdvisorCTA
          heading="Get SMSF advice on crypto compliance"
          subheading="SMSF crypto holdings must meet ATO's sole-purpose test, SMSF investment strategy, and valuation rules. An SMSF specialist can review your fund's structure before your next audit."
          intent={{ need: "smsf", context: ["smsf_crypto", "smsf_compliance"] }}
          source="smsf_crypto"
          ctaLabel="Find an SMSF specialist"
          className="py-12 bg-amber-50 border-t border-amber-200"
        />

        {/* ── Related links ── */}
        <section className="py-10 bg-white border-t border-slate-200">
          <div className="container-custom max-w-4xl">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Related guides</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <Link
                href="/smsf/investment-strategy"
                className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 transition-colors font-bold text-slate-900"
              >
                SMSF investment strategy guide &rarr;
              </Link>
              <Link
                href="/smsf/property"
                className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 transition-colors font-bold text-slate-900"
              >
                Property in your SMSF &rarr;
              </Link>
              <Link
                href="/smsf/auditors"
                className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 transition-colors font-bold text-slate-900"
              >
                Find an SMSF auditor &rarr;
              </Link>
            </div>
          </div>
        </section>

      </div>
    </>
  );
}
