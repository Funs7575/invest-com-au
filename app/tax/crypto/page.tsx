import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, UPDATED_LABEL } from "@/lib/seo";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";
import SectionHeading from "@/components/SectionHeading";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `Crypto Tax Australia (${CURRENT_YEAR}) — ATO Rules for Bitcoin & Digital Assets`,
  description: `How the ATO taxes crypto in Australia: CGT events, the 50% discount for long-term holdings, DeFi and staking income, cost base tracking, and reporting requirements. ${UPDATED_LABEL}.`,
  openGraph: {
    title: `Crypto Tax Australia (${CURRENT_YEAR}) — ATO Rules Explained`,
    description: "Every crypto disposal is a CGT event. How the ATO taxes Bitcoin, Ethereum, DeFi, staking, and NFTs — complete guide.",
    url: `${SITE_URL}/tax/crypto`,
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: `${SITE_URL}/tax/crypto` },
};

const SECTIONS = [
  {
    heading: "ATO position on crypto — taxed as assets, not currency",
    body: `The Australian Taxation Office (ATO) treats cryptocurrency as a capital asset for tax purposes — not as a foreign currency, not as cash, and not as a personal use item for most investors. This has significant implications for how gains, losses, and income are taxed.

**The ATO's core position:**
Crypto assets are treated as property, similar to shares. When you dispose of crypto, Capital Gains Tax (CGT) applies. When you receive crypto as income (from mining, staking, airdrops, or DeFi), it's ordinary income at the time received.

**What counts as a CGT asset:**
Bitcoin, Ethereum, and all other cryptocurrencies are CGT assets. So are non-fungible tokens (NFTs), utility tokens, governance tokens, and stablecoins. The technical nature of the token doesn't change the tax treatment.

**The "personal use" exception:**
The ATO allows an exception for "personal use assets" — crypto acquired and used solely for personal purchases (e.g., using Bitcoin to buy a product online). If you buy crypto and use it within a short period for a personal transaction, it may be exempt from CGT. However, the ATO scrutinises these claims closely, and the exemption generally doesn't apply to investors who hold crypto primarily for profit or investment.

**The ATO's data matching program:**
The ATO collects transaction data directly from Australian crypto exchanges (Coinbase, Independent Reserve, CoinJar, Swyftx, and others). Every time you buy or sell crypto on an Australian exchange, the ATO receives a data feed. The ATO also has international data sharing arrangements. Assuming crypto transactions are untraceable or undetectable is a significant compliance risk.`,
  },
  {
    heading: "CGT events for crypto — what triggers tax",
    body: `A CGT event occurs every time you "dispose" of a crypto asset. The ATO's definition of disposal is broad — it covers far more than simply selling for Australian dollars.

**Every one of these is a taxable CGT event:**

**1. Selling crypto for AUD:** The most obvious disposal. Calculate gain or loss: sale proceeds minus cost base (purchase price plus costs).

**2. Trading one crypto for another:** Swapping Bitcoin for Ethereum is a disposal of Bitcoin. You're treated as having sold Bitcoin at its AUD value at the time of the swap, and acquired Ethereum at that same value (which becomes your new cost base). Even if you never touched AUD, you have a realised capital gain or loss on the Bitcoin.

**3. Spending crypto on goods or services:** Using crypto to pay for anything — a coffee, software, a holiday — is a disposal. Calculate the gain or loss based on the AUD value at the time of spending versus your cost base.

**4. Gifting crypto:** Giving crypto to someone else is treated as a disposal at the market value at the time of gifting. The recipient acquires the crypto at that market value (their cost base).

**5. Wrapping and bridging:** Converting ETH to WETH (wrapped ETH) or bridging tokens between blockchains may trigger CGT events depending on whether the original token is technically "disposed of." The ATO has provided limited guidance on this — professional advice is recommended for complex DeFi activity.

**6. NFT minting and sales:** Creating an NFT may have tax implications depending on whether it's a business activity. Selling an NFT you created is likely ordinary income (not CGT). Buying and selling NFTs as investments is subject to CGT.

**What is NOT a CGT event:**
- Transferring crypto between wallets you own (same owner)
- Buying crypto with AUD (this is an acquisition, not a disposal)`,
  },
  {
    heading: "The 50% CGT discount for long-term crypto holders",
    body: `The 50% CGT discount available for shares and property also applies to cryptocurrency. If you hold a crypto asset for more than 12 months before disposing of it, only 50% of the net capital gain is included in your assessable income.

**This is significant for long-term Bitcoin and Ethereum holders.**

**Example:**
You bought 1 Bitcoin for $25,000 in January 2024. You sell in March 2026 for $90,000.
- Capital gain: $90,000 − $25,000 = $65,000
- Held 26+ months: 50% discount applies
- Assessable gain: $32,500
- At 37% marginal rate: CGT = $12,025

Without the 50% discount (if sold before 12 months):
- Assessable gain: $65,000
- At 37% marginal rate: CGT = $24,050

The 12-month threshold saves $12,025 in this example.

**The swap trap:**
Many crypto investors lose their 12-month holding period by swapping tokens. If you hold Bitcoin for 10 months and swap it for Ethereum, you've disposed of Bitcoin (triggering CGT) and acquired Ethereum with a new acquisition date. The 12-month clock for the new Ethereum position starts at the swap date — not the original Bitcoin purchase date.

**Staggered CGT:** If you've been dollar-cost averaging into crypto and have multiple purchase tranches, each purchase has its own acquisition date and 12-month threshold. You may have some parcels qualifying for the discount and others not.`,
  },
  {
    heading: "DeFi, staking, and mining — ordinary income rules",
    body: `Activity that generates crypto rewards — staking, liquidity provision, yield farming, mining, and airdrops — is generally treated as ordinary income by the ATO, not capital gains. This is a critical distinction because ordinary income is taxed at your full marginal rate, with no CGT discount.

**Staking rewards:**
When you receive staking rewards (proof-of-stake validation, liquid staking like stETH, or exchange staking), the ATO treats the value of the reward at the time you receive it as ordinary income. It's similar to receiving interest on a bank deposit.

The staking reward then has a cost base equal to the value at which it was included in your income. When you eventually sell the reward, CGT applies on any gain from that cost base.

Example:
- Receive 0.1 ETH staking reward when ETH = $4,000 AUD
- Income: $400 (included in tax return year received)
- Cost base of 0.1 ETH = $400
- If you sell 18 months later when ETH = $6,000: capital gain = $600 − $400 = $200 (50% discount applies)

**Liquidity mining and yield farming:**
Rewards from providing liquidity on DeFi protocols (like Uniswap, Curve, or Aave) are treated as ordinary income at the time received. The underlying assets in the liquidity pool also create complex CGT events when you enter and exit positions.

**Mining income:**
If you mine cryptocurrency as a business activity, rewards are ordinary business income. If you mine as a hobby, the ATO may still treat rewards as ordinary income — the line between hobby and business mining is fact-specific.

**Airdrops:**
Generally treated as ordinary income at the time received, based on market value. If the airdropped token has no established market value at receipt, some uncertainty exists around timing — the ATO has indicated the income arises when the token can be traded.`,
  },
  {
    heading: "Cost base tracking — the hardest part of crypto tax",
    body: `Accurate cost base tracking is the most challenging aspect of crypto tax compliance — and where most mistakes are made. Without reliable records, it's impossible to correctly calculate your capital gains or losses.

**The core challenge:**
Crypto investors often have hundreds or thousands of transactions across multiple exchanges, wallets, and chains. Each buy, sell, swap, fee payment, and income receipt needs to be recorded with a timestamp and AUD value at the time of the event.

**Cost base includes:**
- Purchase price in AUD at time of acquisition
- Exchange fees and transaction fees paid in AUD or crypto (crypto fees need to be converted to AUD at the time paid)
- Network gas fees for on-chain transactions

**Cost identification methods:**
The ATO allows several methods for identifying which parcels of an asset you're disposing of:

**FIFO (First In, First Out):** The earliest-purchased parcels are considered sold first. This is the default and most common method.

**LIFO (Last In, First Out):** The most recently purchased parcels are sold first. Can produce different results — some years more tax-efficient, some less.

**Minimisation:** Identify the specific parcel that minimises your gain (typically the one with the highest cost base) — allowed in limited circumstances.

**You must apply one method consistently** — switching methods to get the best outcome each year is not permitted.

**Crypto tax software:**
Tools like Koinly, CoinTracker, CryptoTaxCalculator (Australian-based), and TaxBit help automate cost base tracking. They connect to exchanges via API, import transaction history, apply CGT calculations, and produce ATO-compatible tax reports. For anyone with significant crypto activity, this software is essentially essential — manual calculation is error-prone and time-consuming.`,
  },
  {
    heading: "Reporting requirements and the ATO's enforcement approach",
    body: `The ATO takes crypto compliance seriously and has been actively pursuing under-reporting since 2018. Understanding your reporting obligations — and the ATO's detection capabilities — is essential.

**What you must report:**
- Capital gains and losses from all crypto disposals in the relevant financial year
- All crypto income received (staking, mining, DeFi yields, airdrops) in the year received
- Foreign exchange gains if applicable

**Where to report:**
Capital gains are reported in the Capital Gains section of your individual tax return. Crypto income (staking, mining) is reported as Other Income. Your tax software or accountant can assist with categorisation.

**The ATO's data matching:**
Since 2018, the ATO has operated a Cryptocurrency Data Matching Program. It collects transaction records from Australian exchanges, which are legally required to provide customer identity and transaction data. The ATO cross-references this with tax returns. If you have exchange transactions but no crypto income reported on your return, expect contact from the ATO.

**International exchanges and offshore wallets:**
The ATO participates in the OECD's Crypto-Asset Reporting Framework (CARF), which standardises information sharing between tax authorities globally. The ATO also uses blockchain analytics (Chainalysis and similar tools) to trace on-chain activity from known exchange addresses.

**Penalties for non-compliance:**
Failure to report crypto gains can result in: amended assessments plus interest (currently 9–10% per annum on unpaid tax), penalties ranging from 25–75% of the tax shortfall (depending on whether non-reporting was careless or deliberate), and in extreme cases, prosecution for tax fraud.

**Voluntary disclosure:**
The ATO's voluntary disclosure program allows taxpayers to come forward before an audit begins to receive reduced penalties. If you haven't reported crypto correctly in prior years, a voluntary disclosure is significantly better than waiting to be caught.`,
  },
];

const FAQS = [
  {
    question: "Do I pay tax on crypto in Australia?",
    answer: "Yes. The ATO treats cryptocurrency as a capital asset, not currency. Every disposal (selling, trading, spending, gifting) triggers a CGT event. Income from staking, mining, and DeFi yields is treated as ordinary income in the year received. You must report all crypto transactions in your annual tax return. The ATO data-matches Australian exchange transactions, so unreported crypto activity is detectable.",
  },
  {
    question: "What if I just hold crypto and never sell?",
    answer: "Simply holding crypto does not trigger any tax event. CGT only applies when you dispose of the asset. Staking income is taxable when received (ordinary income), but capital gains only arise on disposal. If you bought Bitcoin and have held it without selling, swapping, or spending, you have no reportable CGT events — though you should still track your cost base carefully for when you do eventually dispose.",
  },
  {
    question: "Is transferring crypto between my own wallets taxable?",
    answer: "No — transferring between wallets you control (same owner) is not a CGT event. However, any fees paid in crypto for the transfer (e.g., ETH gas fees) may be a disposal of that small amount of crypto, creating a minor CGT event. Keep records of all wallet addresses you control to demonstrate ownership continuity. Moving crypto to an exchange wallet you own is fine; sending to someone else's wallet is a disposal (potentially a gift).",
  },
  {
    question: "How far back can the ATO audit my crypto?",
    answer: "The standard amendment period for income tax assessments is 2 years for individuals with simple affairs, and 4 years for most investors. For cases involving fraud or evasion, there is no time limit — the ATO can go back indefinitely. The ATO's Cryptocurrency Data Matching Program has historical data from Australian exchanges going back to 2015 onwards. If you haven't correctly reported crypto in prior years, voluntary disclosure is the safest path.",
  },
  {
    question: "Can I claim crypto losses to offset other income?",
    answer: "Crypto losses are capital losses — they can offset capital gains (including from shares, property, and other crypto), but they cannot directly offset ordinary income like salary or wages. If your crypto losses exceed your capital gains in a year, the excess carries forward to future years indefinitely. Crypto capital losses are valuable if you have other capital gains to offset — they can significantly reduce CGT in the year you realise gains from other investments.",
  },
];

export default function CryptoTaxPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: SITE_URL },
    { name: "Tax", url: `${SITE_URL}/tax` },
    { name: "Crypto Tax" },
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
            <Link href="/tax" className="hover:text-slate-200">Tax</Link>
            <span>/</span>
            <span className="text-slate-300">Crypto Tax</span>
          </nav>
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/20 border border-amber-500/30 rounded-full text-xs font-semibold text-amber-300 mb-4">
              <span className="w-1.5 h-1.5 bg-amber-400 rounded-full" />
              Crypto Tax · {UPDATED_LABEL}
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold leading-[1.1] mb-3 tracking-tight">
              Crypto Tax Australia{" "}
              <span className="text-amber-400">({CURRENT_YEAR})</span>
              {" "}— ATO Rules for Bitcoin &amp; Digital Assets
            </h1>
            <p className="text-sm md:text-base text-slate-300 leading-relaxed">
              Every crypto swap, sale, and spend is a CGT event. The ATO data-matches exchange records.
              We explain every taxable event, the 50% discount, DeFi income rules, and how to stay compliant.
            </p>
          </div>
        </div>
      </section>

      {/* Callouts */}
      <section className="py-8 bg-slate-50 border-b border-slate-200">
        <div className="container-custom">
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl border border-amber-200 p-5">
              <p className="text-xs font-bold text-amber-800 uppercase tracking-wide mb-1">Every Disposal</p>
              <p className="text-xl font-black text-amber-700">CGT Event</p>
              <p className="text-xs text-slate-600 mt-1">Selling, swapping, spending, or gifting crypto all trigger CGT events — not just selling for AUD</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">DeFi / Staking</p>
              <p className="text-xl font-black text-slate-900">Ordinary Income</p>
              <p className="text-xs text-slate-600 mt-1">Staking rewards, mining income, and DeFi yields are ordinary income at the time received</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">ATO Enforcement</p>
              <p className="text-xl font-black text-slate-900">Data Matching</p>
              <p className="text-xs text-slate-600 mt-1">The ATO collects data directly from Australian crypto exchanges and uses blockchain analytics</p>
            </div>
          </div>
        </div>
      </section>

      {/* Content Sections */}
      <section className="py-10 md:py-12 bg-slate-50">
        <div className="container-custom max-w-3xl">
          <SectionHeading eyebrow="Crypto Tax Guide" title="ATO Crypto Tax Rules Explained" />
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
          <SectionHeading eyebrow="FAQ" title="Crypto Tax Questions" />
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
          <h2 className="text-xl font-extrabold mb-3">Get your crypto tax right</h2>
          <p className="text-sm text-slate-300 mb-6">A crypto tax specialist can reconcile your transaction history, identify all CGT events, and prepare your tax return correctly — including prior year amendments if needed.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/best/crypto-tax-advisors" className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm rounded-xl transition-colors">
              Find a Crypto Tax Advisor →
            </Link>
            <Link href="/tax" className="px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold text-sm rounded-xl transition-colors">
              All Tax Guides →
            </Link>
          </div>
        </div>
      </section>

      <section className="py-6 bg-slate-100 border-t border-slate-200">
        <div className="container-custom max-w-3xl">
          <p className="text-xs text-slate-500 leading-relaxed">{GENERAL_ADVICE_WARNING} Crypto tax rules are complex and evolving. The ATO regularly updates its guidance on digital assets. Verify current rules at ato.gov.au/crypto and consult a registered tax agent for advice specific to your circumstances.</p>
        </div>
      </section>
    </div>
  );
}
