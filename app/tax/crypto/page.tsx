import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, UPDATED_LABEL } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";
import SectionHeading from "@/components/SectionHeading";
import AdvisorPrompt from "@/components/AdvisorPrompt";
import { createClient } from "@/lib/supabase/server";
import { getAffiliateLink, AFFILIATE_REL, renderStars } from "@/lib/tracking";
import type { Broker } from "@/lib/types";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `Crypto Tax Australia (${CURRENT_YEAR}) — ATO Rules for Bitcoin, DeFi & Digital Assets`,
  description: `ATO crypto tax: every disposal is a CGT event, staking rewards are income, DeFi, NFTs, exchange collapses, and record-keeping. ${UPDATED_LABEL}.`,
  openGraph: {
    title: `Crypto Tax Australia (${CURRENT_YEAR}) — ATO Rules Explained`,
    description:
      "Every crypto swap, sale, and spend is a CGT event. How the ATO taxes Bitcoin, Ethereum, DeFi, staking, NFTs, and exchange collapses — complete ATO-aligned guide.",
    url: `${SITE_URL}/tax/crypto`,
    images: [{ url: `/api/og?title=${encodeURIComponent("Crypto Tax Australia — ATO Rules")}&sub=${encodeURIComponent("Bitcoin · DeFi · Staking · " + CURRENT_YEAR)}`, width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: `${SITE_URL}/tax/crypto` },
};

// ─── DeFi complexity table data ──────────────────────────────────────────────

const DEFI_ROWS = [
  {
    activity: "Lending (Aave, Compound)",
    treatment: "Ordinary income",
    taxableEvent: "When interest/rewards received",
    notes: "Market value at receipt = income; new cost base established",
  },
  {
    activity: "Liquidity pools (Uniswap, Curve)",
    treatment: "Income + CGT",
    taxableEvent: "Rewards on receipt; CGT on exit",
    notes: "Entering/exiting pool may be a CGT disposal; rewards are income",
  },
  {
    activity: "Yield farming",
    treatment: "Generally ordinary income",
    taxableEvent: "When farming rewards received",
    notes: "Complex — whittle-down rule may reduce cost base of deposited assets",
  },
  {
    activity: "Wrapped tokens (e.g. WETH)",
    treatment: "Potentially CGT disposal",
    taxableEvent: "At point of wrapping",
    notes: "ATO guidance limited; professional advice recommended",
  },
  {
    activity: "Staking rewards",
    treatment: "Ordinary income",
    taxableEvent: "When rewards received (ATO 2023 guidance)",
    notes: "Later sale of rewards = CGT event from new cost base",
  },
  {
    activity: "Airdrops",
    treatment: "Ordinary income",
    taxableEvent: "When tradeable (if no prior market value)",
    notes: "Market value at receipt; nil cost base if valued at zero on receipt",
  },
];

// ─── FAQ data ─────────────────────────────────────────────────────────────────

const FAQS = [
  {
    q: "Is cryptocurrency taxable in Australia?",
    a: "Yes. The ATO treats all cryptocurrency — Bitcoin, Ethereum, stablecoins, NFTs, DeFi tokens — as CGT assets, not currency. Every disposal (selling for AUD, trading one crypto for another, spending, or gifting) triggers a capital gains tax event. Income from staking, mining, DeFi yields, and airdrops is ordinary income taxed at your marginal rate in the year received. You must report all crypto activity in your annual tax return. The ATO receives data directly from Australian exchanges and participates in the OECD&apos;s global Crypto-Asset Reporting Framework.",
  },
  {
    q: "How do I calculate capital gains on crypto?",
    a: "Capital gain = proceeds minus cost base. Proceeds is the AUD value of what you received (or the market value of what you disposed of). Cost base includes the original purchase price plus acquisition costs (exchange fees, gas fees). If you held the crypto for more than 12 months, you can apply the 50% CGT discount — only half the gain is added to your taxable income. You must use a consistent cost identification method (FIFO, LIFO, or specific identification) across all transactions and all financial years.",
  },
  {
    q: "Are staking rewards taxed in Australia?",
    a: "Yes — under updated ATO guidance from 2023, staking rewards are ordinary income at the market value on the day you receive them. This applies to proof-of-stake validation rewards, liquid staking tokens (e.g. stETH), and exchange staking programs. The reward amount is included in your assessable income for the financial year you received it, at your marginal income tax rate. When you later sell the staking rewards, that sale is a separate CGT event from the cost base established at receipt — the 50% discount applies if you held the rewards for 12+ months before selling.",
  },
  {
    q: "What records do I need to keep for crypto tax?",
    a: "The ATO requires: the date and time of every transaction; the AUD value at the time of each transaction; the counterparty (wallet address or exchange); the exchange or platform used; and all fees paid. For DeFi, you also need records of smart contract interactions, liquidity pool positions, and reward distributions. Records must be kept for at least 5 years. Crypto tax software such as Koinly, CoinTracker, or CryptoTaxCalculator (Australian-based) can connect to exchanges via API and automate this — manual tracking across hundreds of transactions is error-prone.",
  },
  {
    q: "Can I claim a loss if my crypto exchange collapsed?",
    a: "Possibly — but it depends on the circumstances. Under ATO TD 2023/1 (the FTX guidance), if an exchange owes you crypto and becomes insolvent, you may have a debt that is a bad debt once it is formally unrecoverable. A CGT event may crystallise when it becomes clear the debt will not be repaid — usually when liquidators make that determination. You cannot simply claim a loss because an exchange froze withdrawals. Seek professional advice: the timing of loss recognition, whether it is a capital loss or bad debt, and the documentation required are all fact-specific. Do not amend prior year returns without a tax agent reviewing the position.",
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function CryptoTaxPage() {
  const supabase = await createClient();
  const { data: exchangeRows } = await supabase
    .from("brokers")
    .select(
      "id, name, slug, color, logo_url, rating, cta_text, benefit_cta, tagline, affiliate_url, status, platform_type, created_at, updated_at, chess_sponsored, smsf_support, is_crypto, deal, editors_pick"
    )
    .eq("status", "active")
    .eq("platform_type", "crypto_exchange")
    .order("rating", { ascending: false })
    .limit(3);
  const exchanges: Broker[] = exchangeRows ?? [];

  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: SITE_URL },
    { name: "Tax", url: `${SITE_URL}/tax` },
    { name: "Crypto Tax Australia" },
  ]);

  const faqSchema = faqJsonLd(FAQS);

  return (
    <div className="bg-white min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      {faqSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
      )}

      {/* Hero */}
      <section className="relative bg-white border-b border-slate-100 overflow-hidden py-8 md:py-12">
        <div className="container-custom">
          <nav aria-label="Breadcrumb" className="text-xs text-slate-500 mb-5 flex items-center gap-1.5 flex-wrap">
            <Link href="/" className="hover:text-slate-900">Home</Link>
            <span>/</span>
            <Link href="/tax" className="hover:text-slate-900">Tax</Link>
            <span>/</span>
            <span className="text-slate-900 font-medium">Crypto Tax Australia</span>
          </nav>
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 border border-slate-200 rounded-full text-xs font-semibold text-slate-600 mb-4">
              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full" />
              Crypto Tax · {UPDATED_LABEL}
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold leading-[1.1] mb-3 tracking-tight text-slate-900">
              Crypto Tax Australia{" "}
              <span className="text-amber-600">({CURRENT_YEAR})</span>
              {" "}— ATO Rules for Bitcoin &amp; Digital Assets
            </h1>
            <p className="text-sm md:text-base text-slate-600 leading-relaxed mb-4">
              The ATO treats crypto as a CGT asset, not currency. Every disposal — including swaps,
              spending, and gifting — is a taxable event. Staking rewards and DeFi income are taxed
              as ordinary income when received. This guide covers every ATO position as of the
              2024&ndash;25 year.
            </p>
          </div>
        </div>
      </section>

      {/* Key fact callouts */}
      <section className="py-8 bg-slate-50 border-b border-slate-200">
        <div className="container-custom">
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl border border-amber-200 p-5">
              <p className="text-xs font-bold text-amber-800 uppercase tracking-wide mb-1">
                Every Disposal
              </p>
              <p className="text-xl font-black text-amber-700">CGT Event</p>
              <p className="text-xs text-slate-600 mt-1">
                Selling, swapping, spending, or gifting crypto all trigger CGT — not just cashing
                out to AUD
              </p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">
                Staking / DeFi Income
              </p>
              <p className="text-xl font-black text-slate-900">Ordinary Income</p>
              <p className="text-xs text-slate-600 mt-1">
                Staking rewards, DeFi yields, and airdrops are taxed at your full marginal rate when
                received
              </p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">
                ATO Enforcement
              </p>
              <p className="text-xl font-black text-slate-900">Data Matching</p>
              <p className="text-xs text-slate-600 mt-1">
                Australian exchanges must report to the ATO; on-chain activity is traced via
                blockchain analytics
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ATO position */}
      <section className="py-10 md:py-12 bg-white">
        <div className="container-custom max-w-3xl">
          <SectionHeading
            eyebrow="ATO Position"
            title="Crypto is a CGT asset — not currency"
          />
          <div className="mt-6 space-y-4 text-sm text-slate-600 leading-relaxed">
            <p>
              The Australian Taxation Office treats all cryptocurrency as a <strong>capital
              gains tax (CGT) asset</strong> — the same legal category as shares and investment
              property. It is not foreign currency, not cash, and not exempt from tax merely
              because transactions occur on a blockchain.
            </p>
            <p>
              This classification applies to Bitcoin, Ethereum, all altcoins, stablecoins
              (including USDT and USDC), governance tokens, utility tokens, and
              non-fungible tokens (NFTs). The underlying technology or intended purpose of
              the token does not change the tax treatment.
            </p>
            <p>
              The practical consequence: <strong>every time you dispose of a crypto asset, a
              CGT event occurs</strong>. You calculate your gain or loss at that moment, in
              Australian dollars. The 50% CGT discount applies if you held the asset for
              more than 12 months.
            </p>
            <p>
              When you <em>receive</em> crypto — from staking, mining, DeFi protocols,
              airdrops, or as payment for services — that receipt is <strong>ordinary income</strong>,
              not a capital gain. It is taxed at your marginal income tax rate in the year you
              receive it, with no CGT discount available. The value at receipt then becomes your
              cost base for any future CGT calculation when you eventually dispose of it.
            </p>
          </div>
        </div>
      </section>

      {/* Taxable disposals */}
      <section className="py-10 md:py-12 bg-slate-50 border-t border-slate-100">
        <div className="container-custom max-w-3xl">
          <SectionHeading
            eyebrow="CGT Events"
            title="What counts as a taxable disposal"
          />
          <div className="mt-6 space-y-5 text-sm text-slate-600 leading-relaxed">
            <p>
              The ATO&apos;s definition of &ldquo;disposal&rdquo; is deliberately broad. Any transfer
              of ownership — or any event that effectively ends your economic interest in the asset
              — triggers CGT.
            </p>
            <div className="grid sm:grid-cols-2 gap-4 mt-2">
              {[
                {
                  label: "Selling for AUD",
                  detail:
                    "The clearest disposal. Proceeds = AUD received. Gain = proceeds minus cost base.",
                },
                {
                  label: "Trading crypto for crypto",
                  detail:
                    "Swapping BTC for ETH = two events: dispose BTC at its AUD value at swap time (CGT), acquire ETH at that same AUD value (new cost base). No AUD ever touches your account — but you have a realised gain or loss on the BTC.",
                },
                {
                  label: "Spending crypto on goods/services",
                  detail:
                    "Using crypto to pay for anything is a disposal at market value at time of payment. Calculate gain vs. cost base on the crypto spent.",
                },
                {
                  label: "Gifting crypto",
                  detail:
                    "Gifting is treated as a disposal at market value on the gift date. The recipient acquires at that value (their cost base). You may have a capital gain even though you received nothing.",
                },
                {
                  label: "Losing private key access",
                  detail:
                    "Generally NOT deductible unless you can conclusively prove the crypto is permanently and irrecoverably lost or stolen. Mere loss of keys without evidence is not sufficient for the ATO.",
                },
                {
                  label: "Wallet-to-wallet (same owner)",
                  detail:
                    "Moving crypto between wallets you control is NOT a CGT event. Keep records of all wallet addresses to prove ownership. Gas fees paid to transfer may be minor CGT events.",
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="bg-white border border-slate-200 rounded-xl p-4"
                >
                  <p className="font-bold text-slate-900 text-xs mb-1">{item.label}</p>
                  <p className="text-xs text-slate-500 leading-relaxed">{item.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CGT calculation */}
      <section className="py-10 md:py-12 bg-white border-t border-slate-100">
        <div className="container-custom max-w-3xl">
          <SectionHeading
            eyebrow="Calculation"
            title="CGT calculation: cost base, discount, and identification methods"
          />
          <div className="mt-6 space-y-4 text-sm text-slate-600 leading-relaxed">
            <p>
              <strong>The formula:</strong> Capital gain = Proceeds &minus; Cost base. If held
              more than 12 months: assessable gain = capital gain &times; 50% (the CGT
              discount).
            </p>
            <p>
              <strong>Cost base components</strong> include: the purchase price in AUD at
              acquisition; brokerage or exchange fees paid at purchase; gas fees paid for
              on-chain transactions (converted to AUD at the time paid); and any other
              incidental costs of acquisition. Fees paid in crypto are themselves small CGT
              events — they must be tracked.
            </p>
            <p>
              <strong>Worked example — 50% discount in practice:</strong> You buy 1 BTC
              for $40,000 (including fees) in January 2024. You sell in March 2026 for
              $95,000. Capital gain = $55,000. Held 26 months &rarr; 50% discount: assessable
              gain = $27,500. At a 37% marginal rate, tax = $10,175. Without the discount
              (sold within 12 months), tax would be $20,350.
            </p>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 mt-2">
              <p className="text-xs font-bold text-slate-800 mb-3 uppercase tracking-wide">
                Cost identification methods — choose one and apply consistently
              </p>
              <div className="space-y-2">
                <div className="flex gap-3">
                  <span className="font-bold text-slate-900 text-xs w-36 shrink-0">FIFO (First In, First Out)</span>
                  <span className="text-xs text-slate-600">Earliest-purchased parcels are treated as sold first. ATO default and most common. Favours long-held positions for the 12-month discount.</span>
                </div>
                <div className="flex gap-3">
                  <span className="font-bold text-slate-900 text-xs w-36 shrink-0">LIFO (Last In, First Out)</span>
                  <span className="text-xs text-slate-600">Most recently purchased parcels sold first. Can produce different results — sometimes more tax-efficient, sometimes less.</span>
                </div>
                <div className="flex gap-3">
                  <span className="font-bold text-slate-900 text-xs w-36 shrink-0">Specific identification</span>
                  <span className="text-xs text-slate-600">Identify exactly which parcel you are selling. Requires clear records linking the disposal to a specific acquisition. Cannot be used opportunistically to minimise tax each year.</span>
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-3">
                Switching methods year to year to obtain the best outcome is not permitted.
                Apply the same method consistently across all years and all assets.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Staking and DeFi income */}
      <section className="py-10 md:py-12 bg-slate-50 border-t border-slate-100">
        <div className="container-custom max-w-3xl">
          <SectionHeading
            eyebrow="Staking & DeFi"
            title="Staking rewards and DeFi income — ordinary income rules"
          />
          <div className="mt-6 space-y-4 text-sm text-slate-600 leading-relaxed">
            <p>
              Updated ATO guidance released in 2023 confirmed that <strong>staking rewards are
              ordinary income</strong> at the market value on the date you receive them. This
              applies to proof-of-stake block rewards, liquid staking protocols (e.g., stETH,
              rETH), and exchange-based staking products.
            </p>
            <p>
              The staking reward is reported as &ldquo;other income&rdquo; in your tax return
              (item 24) for the financial year of receipt. It is taxed at your full marginal
              rate. When you later sell those rewards, a separate CGT event arises — and the
              cost base for that CGT event is the market value you already included as income.
              The 50% CGT discount applies if you hold the rewards for 12+ months before selling.
            </p>
            <p>
              <strong>DeFi lending interest</strong> (from protocols like Aave or Compound) is
              also ordinary income when received. <strong>Yield farming</strong> rewards are
              generally income, though the whittle-down rule may reduce the cost base of assets
              deposited into farming contracts — increasing any eventual CGT on those underlying
              assets. These interactions are complex: crypto tax software or a specialist
              accountant is recommended for active DeFi users.
            </p>
          </div>
        </div>
      </section>

      {/* NFTs */}
      <section className="py-10 md:py-12 bg-white border-t border-slate-100">
        <div className="container-custom max-w-3xl">
          <SectionHeading eyebrow="NFTs" title="NFT tax treatment" />
          <div className="mt-6 space-y-4 text-sm text-slate-600 leading-relaxed">
            <p>
              NFTs are CGT assets subject to the same rules as other cryptocurrency. Buying and
              selling NFTs as investments triggers CGT on disposal, with the 50% discount
              available after 12 months.
            </p>
            <p>
              <strong>NFTs you created:</strong> If you mint and sell an NFT, the ATO&apos;s
              position is that this is more akin to selling an asset you manufactured than
              investing — the proceeds are likely <strong>ordinary income</strong> (business
              income or hobby income), not a capital gain. The business vs. hobby distinction
              depends on facts: frequency, commerciality, scale, and intention. Royalty income
              from secondary sales is also ordinary income.
            </p>
            <p>
              <strong>Collectables threshold:</strong> Personal use assets and collectables
              acquired for under $10,000 may be exempt from CGT. The ATO&apos;s collectables
              threshold was set when NFT prices were negligible. For NFTs purchased at
              significant values, the exemption is unlikely to apply. The ATO has indicated
              it is scrutinising NFT activity closely.
            </p>
          </div>
        </div>
      </section>

      {/* Exchange collapses */}
      <section className="py-10 md:py-12 bg-slate-50 border-t border-slate-100">
        <div className="container-custom max-w-3xl">
          <SectionHeading
            eyebrow="Exchange Collapses"
            title="FTX and exchange insolvency — ATO TD 2023/1"
          />
          <div className="mt-6 space-y-4 text-sm text-slate-600 leading-relaxed">
            <p>
              When FTX collapsed in November 2022, the ATO released Technical Decision
              TD 2023/1 to address how affected investors should treat their losses.
              The ruling applies to any exchange insolvency or collapse scenario.
            </p>
            <p>
              <strong>The ATO&apos;s position:</strong> If an exchange owes you crypto and
              it collapses, you may have a <em>debt</em> owed to you (the exchange&apos;s
              obligation to return your assets). That debt may become a <strong>bad debt</strong>
              once it is formally irrecoverable — typically when liquidators confirm the
              shortfall. At that point a CGT event may crystallise, potentially allowing a
              capital loss.
            </p>
            <p>
              You cannot simply declare a loss because an exchange freezes withdrawals. The
              timing of loss recognition, whether it is treated as a capital loss or a bad
              debt deduction, and the documentation required (proof of funds on exchange,
              liquidator communications) are all fact-specific. <strong>Do not amend prior
              year returns without professional advice</strong> — getting the timing wrong
              creates its own compliance risks.
            </p>
          </div>
        </div>
      </section>

      {/* Personal use exemption */}
      <section className="py-10 md:py-12 bg-white border-t border-slate-100">
        <div className="container-custom max-w-3xl">
          <SectionHeading
            eyebrow="Exemptions"
            title="Personal use asset exemption — narrow and heavily scrutinised"
          />
          <div className="mt-6 space-y-4 text-sm text-slate-600 leading-relaxed">
            <p>
              The ATO allows an exemption for <strong>personal use assets</strong>: crypto
              acquired and used solely for purchasing goods or services for personal
              consumption. If the cost base of the crypto was under $10,000 and it was used
              within a short time of acquisition for a personal purchase, the gain may be
              exempt from CGT.
            </p>
            <p>
              In practice, this exemption is extremely narrow. The ATO actively scrutinises
              personal use claims and has stated that crypto held primarily as an investment
              — even if occasionally spent — does not qualify. If you bought Bitcoin with any
              intention of holding it for profit, any eventual CGT applies regardless of what
              you ultimately spent it on.
            </p>
            <p>
              The exemption is designed for someone who, for example, bought $200 in Bitcoin
              specifically to make a single online purchase that week. It does not apply to
              investors who happened to spend some of their holdings.
            </p>
          </div>
        </div>
      </section>

      {/* Record-keeping */}
      <section className="py-10 md:py-12 bg-slate-50 border-t border-slate-100">
        <div className="container-custom max-w-3xl">
          <SectionHeading
            eyebrow="Record-Keeping"
            title="What records you must keep — and how the ATO checks"
          />
          <div className="mt-6 space-y-4 text-sm text-slate-600 leading-relaxed">
            <p>
              The ATO requires you to keep records of every transaction for at least five years
              from when you lodge the relevant return. Required data for each transaction:
            </p>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li>Date and time of the transaction</li>
              <li>AUD value at the time of the transaction (not current value)</li>
              <li>The counterparty (wallet address, exchange, or name if known)</li>
              <li>The exchange or platform used</li>
              <li>All fees paid (in AUD or converted from crypto at the time)</li>
              <li>Type of transaction (buy, sell, swap, staking receipt, airdrop, etc.)</li>
            </ul>
            <p>
              <strong>ATO data matching:</strong> Since 2018, the ATO&apos;s Cryptocurrency
              Data Matching Program has collected identity and transaction records from
              Australian crypto exchanges. Swyftx, CoinJar, Independent Reserve, Coinbase
              Australia, and others must report. The ATO cross-references this with tax
              returns. If you have exchange activity but no crypto income declared, expect
              an ATO enquiry.
            </p>
            <p>
              <strong>International and on-chain tracing:</strong> Australia participates in
              the OECD&apos;s Crypto-Asset Reporting Framework (CARF), which enables
              cross-border exchange of exchange data. The ATO also uses blockchain analytics
              tools (Chainalysis and similar) to trace on-chain flows from known exchange
              deposit addresses.
            </p>
            <p>
              <strong>Crypto tax software:</strong> For anyone with significant activity,
              tools like Koinly, CoinTracker, and CryptoTaxCalculator (Australian-based)
              connect to exchanges and wallets via API, apply CGT calculations, and produce
              ATO-compatible tax reports. Manual calculation across hundreds of transactions
              on multiple chains is error-prone and time-consuming.
            </p>
          </div>
        </div>
      </section>

      {/* Tax return reporting */}
      <section className="py-10 md:py-12 bg-white border-t border-slate-100">
        <div className="container-custom max-w-3xl">
          <SectionHeading
            eyebrow="Tax Return"
            title="Reporting crypto in your tax return"
          />
          <div className="mt-6 space-y-4 text-sm text-slate-600 leading-relaxed">
            <p>
              Crypto gains and losses are reported in the <strong>Capital gains</strong> section
              of your individual tax return, which feeds into the CGT schedule. If you have
              significant activity, you&apos;ll complete a full CGT schedule.
            </p>
            <p>
              Crypto income (staking rewards, mining income, DeFi yields, airdrops) is reported
              at <strong>item 24 — Other income</strong> in your individual return, for the
              financial year you received it.
            </p>
            <p>
              ATO myTax includes a dedicated crypto section from the 2024&ndash;25 income year.
              For taxpayers using Australian exchanges that participate in data matching,
              some pre-fill may be available — but pre-fill is rarely complete for active
              traders or DeFi users. Always verify pre-filled data against your own records.
            </p>
            <p>
              <strong>Common audit triggers</strong> include: large unreported gains from
              known Australian exchanges, a mismatch between declared income and lifestyle
              indicators, failure to declare DeFi or staking income, and transactions
              inconsistent with prior years&apos; returns.
            </p>
          </div>
        </div>
      </section>

      {/* Legal strategies */}
      <section className="py-10 md:py-12 bg-slate-50 border-t border-slate-100">
        <div className="container-custom max-w-3xl">
          <SectionHeading
            eyebrow="Tax Planning"
            title="Legal strategies for minimising crypto CGT"
          />
          <div className="mt-6 space-y-4 text-sm text-slate-600 leading-relaxed">
            <p>
              These are legal tax minimisation strategies, not tax avoidance. None of them
              involve misreporting or exploiting loopholes — they use the structure of the
              tax law as intended.
            </p>
            <div className="space-y-3">
              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <p className="font-bold text-slate-900 text-xs mb-1">
                  Hold for 12 months — CGT discount timing
                </p>
                <p className="text-xs text-slate-500 leading-relaxed">
                  If you&apos;re approaching the 12-month mark on a profitable position, delaying
                  the disposal past that date halves the assessable gain for individual investors.
                  The value of this is largest for high-income earners. Be cautious of market
                  risk in timing decisions.
                </p>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <p className="font-bold text-slate-900 text-xs mb-1">
                  Tax-loss harvesting before 30 June
                </p>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Review your portfolio in May&ndash;June. Selling positions that are sitting at
                  a loss realises capital losses that offset your realised gains, reducing your
                  CGT bill for the year. Capital losses carried forward never expire. Wash sale
                  rules apply — repurchasing the same asset immediately may be challenged by
                  the ATO if the sole purpose was to generate a loss.
                </p>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <p className="font-bold text-slate-900 text-xs mb-1">
                  SMSF holding of crypto — 15% tax on gains
                </p>
                <p className="text-xs text-slate-500 leading-relaxed">
                  A self-managed superannuation fund (SMSF) that holds crypto in the
                  accumulation phase pays 15% tax on income and concessional CGT (10% after
                  12 months with a one-third discount). In pension phase, tax can be zero.
                  SMSFs must comply with the sole purpose test, investment strategy documentation,
                  and ATO SMSF crypto guidelines. Seek SMSF-specialist advice before using
                  a fund to hold crypto.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* DeFi complexity table */}
      <section className="py-10 md:py-12 bg-white border-t border-slate-100">
        <div className="container-custom max-w-3xl">
          <SectionHeading
            eyebrow="DeFi Tax"
            title="DeFi activity — income or CGT, and when the taxable event occurs"
          />
          <p className="text-sm text-slate-500 mt-2 mb-6">
            DeFi creates some of the most complex crypto tax scenarios. The table below
            summarises the ATO&apos;s general position on common activities — individual
            circumstances vary and professional advice is recommended for active DeFi users.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse" aria-label="DeFi activity tax treatment and taxable events">
              <thead>
                <tr className="bg-slate-800 text-white">
                  <th scope="col" className="text-left py-3 px-4 font-bold">Activity</th>
                  <th scope="col" className="text-left py-3 px-4 font-bold">Tax Treatment</th>
                  <th scope="col" className="text-left py-3 px-4 font-bold">Taxable Event</th>
                  <th scope="col" className="text-left py-3 px-4 font-bold">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {DEFI_ROWS.map((row) => (
                  <tr key={row.activity} className="bg-white hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-semibold text-slate-800">{row.activity}</td>
                    <td className="py-3 px-4 text-slate-700">{row.treatment}</td>
                    <td className="py-3 px-4 text-slate-600">{row.taxableEvent}</td>
                    <td className="py-3 px-4 text-slate-500">{row.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-xs text-slate-400 mt-2">
              Based on ATO guidance current to {CURRENT_YEAR}. Verify at ato.gov.au/crypto.
            </p>
          </div>
        </div>
      </section>

      {/* FAQs */}
      <section className="py-10 md:py-12 bg-slate-50 border-t border-slate-100">
        <div className="container-custom max-w-2xl">
          <SectionHeading eyebrow="FAQ" title="Crypto Tax Questions Answered" />
          <div className="mt-6 divide-y divide-slate-200">
            {FAQS.map((faq) => (
              <details key={faq.q} className="py-4 group">
                <summary className="text-sm font-semibold text-slate-900 cursor-pointer list-none flex items-center justify-between gap-2">
                  {faq.q}
                  <span className="text-slate-400 group-open:rotate-180 transition-transform shrink-0" aria-hidden="true">
                    ▾
                  </span>
                </summary>
                <p className="mt-3 text-sm text-slate-600 leading-relaxed">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-12 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
        <div className="container-custom text-center max-w-xl">
          <h2 className="text-xl font-extrabold mb-3">Get your crypto tax right</h2>
          <p className="text-sm text-slate-300 mb-6">
            A crypto tax specialist can reconcile your transaction history across exchanges and
            wallets, identify all CGT events including DeFi and staking, and prepare your tax
            return correctly — including prior year amendments if needed.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/best/crypto-tax-advisors"
              className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm rounded-xl transition-colors"
            >
              Find a Crypto Tax Advisor &rarr;
            </Link>
            <Link
              href="/tax"
              className="px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold text-sm rounded-xl transition-colors"
            >
              All Tax Guides &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* Exchange comparison */}
      {exchanges.length > 0 && (
        <section className="py-10 bg-white border-t border-slate-200">
          <div className="container-custom max-w-3xl">
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-4">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                  COMPARE EXCHANGES
                </p>
                <h2 className="text-lg font-bold text-slate-900">
                  ATO-compliant crypto exchanges for Australian investors
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  Choose an exchange that provides downloadable transaction history and
                  tax-reporting integrations for your record-keeping obligations.
                </p>
              </div>
              <div className="grid sm:grid-cols-3 gap-3">
                {exchanges.map((b) => (
                  <div
                    key={b.slug}
                    className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col gap-3"
                  >
                    <div>
                      <p className="font-bold text-slate-900 text-sm">{b.name}</p>
                      <p className="text-xs"><span className="text-amber-600" aria-hidden="true">{renderStars(Number(b.rating))}</span> <span className="font-semibold text-slate-600" aria-label={`${(Number(b.rating) || 0).toFixed(1)} out of 5 stars`}>{(Number(b.rating) || 0).toFixed(1)}</span></p>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">{b.tagline}</p>
                    </div>
                    <div className="mt-auto">
                      <p className="text-xs font-semibold text-slate-700 mb-2">
                        {b.benefit_cta ?? b.cta_text ?? "Open Account"}
                      </p>
                      <a
                        href={getAffiliateLink(b)}
                        rel={AFFILIATE_REL}
                        target="_blank"
                        className="block text-center w-full px-3 py-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold text-xs rounded-lg transition-colors"
                      >
                        {b.cta_text ?? "Open Account →"}
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Advisor prompt */}
      <section className="py-10 bg-slate-50 border-t border-slate-200">
        <div className="container-custom max-w-3xl">
          <h2 className="text-lg font-bold text-slate-900 mb-4">
            Crypto tax getting complicated?
          </h2>
          <AdvisorPrompt type="tax_agent" />
        </div>
      </section>

      {/* Compliance disclaimer */}
      <section className="py-6 bg-slate-100 border-t border-slate-200">
        <div className="container-custom max-w-3xl">
          <p className="text-xs text-slate-500 leading-relaxed">
            {GENERAL_ADVICE_WARNING} Crypto tax rules are complex and evolving. The ATO
            regularly updates its guidance on digital assets, DeFi, NFTs, and exchange
            collapses. Information on this page reflects ATO guidance current to {CURRENT_YEAR}{" "}
            but may not reflect subsequent changes. Verify current rules at ato.gov.au/crypto
            and consult a registered tax agent for advice specific to your circumstances.
          </p>
        </div>
      </section>
    </div>
  );
}
