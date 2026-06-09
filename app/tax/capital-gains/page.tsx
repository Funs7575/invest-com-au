import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, UPDATED_LABEL, absoluteUrl } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";
import SectionHeading from "@/components/SectionHeading";
import AdvisorPrompt from "@/components/AdvisorPrompt";
import { createClient } from "@/lib/supabase/server";
import { getAffiliateLink, AFFILIATE_REL, renderStars } from "@/lib/tracking";
import type { Broker } from "@/lib/types";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `Capital Gains Tax Australia (${CURRENT_YEAR}) — Complete CGT Guide for Investors`,
  description: `How CGT works in Australia: 50% discount, cost base, capital losses, worked examples, shares, property, crypto, and tax strategies. ${UPDATED_LABEL}.`,
  openGraph: {
    title: `Capital Gains Tax Australia (${CURRENT_YEAR}) — Complete CGT Guide`,
    description: "CGT explained for Australian investors: 50% discount, cost base, capital losses, shares, property, and crypto.",
    url: absoluteUrl("/tax/capital-gains"),
    images: [{ url: `/api/og?title=${encodeURIComponent("Capital Gains Tax Australia")}&sub=${encodeURIComponent("50% Discount · Cost Base · Capital Losses · " + CURRENT_YEAR)}`, width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: absoluteUrl("/tax/capital-gains") },
};

const CGT_RATES = [
  { income: "$0 – $18,200", marginalRate: "0%", cgtLess12m: "0%", cgtMore12m: "0%" },
  { income: "$18,201 – $45,000", marginalRate: "19%", cgtLess12m: "19%", cgtMore12m: "9.5%" },
  { income: "$45,001 – $135,000", marginalRate: "32.5%", cgtLess12m: "32.5%", cgtMore12m: "16.25%" },
  { income: "$135,001 – $190,000", marginalRate: "37%", cgtLess12m: "37%", cgtMore12m: "18.5%" },
  { income: "$190,001+", marginalRate: "45%", cgtLess12m: "45%", cgtMore12m: "22.5%" },
];

const COST_BASE_ELEMENTS = [
  {
    number: "1",
    label: "Original purchase price",
    detail: "The amount you paid for the asset — cash, instalment price, or market value if acquired via gift or inheritance.",
  },
  {
    number: "2",
    label: "Incidental acquisition costs",
    detail: "Brokerage on the buy, stamp duty (for property), conveyancing fees, legal fees, and valuation costs paid at purchase.",
  },
  {
    number: "3",
    label: "Costs to improve the asset",
    detail: "Capital improvements only — e.g. a new kitchen in an investment property. Not deductible repairs, which are already claimed as tax deductions.",
  },
  {
    number: "4",
    label: "Costs to hold the asset",
    detail: "Non-deductible holding costs: for most shares this is zero (interest on margin loans is deductible, so it reduces the cost base instead). Relevant for some unlisted assets.",
  },
  {
    number: "5",
    label: "Incidental disposal costs",
    detail: "Brokerage on the sale, agent commissions (for property), legal fees at settlement, and any advertising costs to sell.",
  },
];

const WORKED_EXAMPLES = [
  {
    title: "Example 1 — VAS ETF held 18 months (37% MTR)",
    steps: [
      "Bought 500 units of VAS at $85 each = $42,500 cost base (including $9.95 brokerage)",
      "Sold 18 months later at $115 per unit = $57,491 proceeds (after $9 brokerage)",
      "Gross capital gain = $57,491 − $42,500 = $14,991",
      "50% CGT discount applies (held > 12 months): assessable gain = $7,496",
      "Tax at 37% MTR: $7,496 × 37% = $2,773",
      "Effective CGT rate on the full $14,991 gain = 18.5%",
    ],
    highlight: "Holding for just 6 extra months to pass the 12-month mark halved the tax bill.",
  },
  {
    title: "Example 2 — Shares held < 12 months (45% MTR)",
    steps: [
      "Bought tech shares for $40,000 in August 2025",
      "Sold in February 2026 (6 months later) for $60,000",
      "Capital gain = $20,000",
      "No 50% discount — held less than 12 months",
      "Full $20,000 added to assessable income",
      "Tax at 45% MTR: $20,000 × 45% = $9,000",
    ],
    highlight: "Waiting until August 2026 would have reduced assessable gain to $10,000, saving $4,500 in tax.",
  },
  {
    title: "Example 3 — $30K gain with carried-forward capital loss",
    steps: [
      "Realised capital gain from selling investment property: $30,000",
      "Carried-forward capital loss from prior year: $10,000",
      "Net capital gain after applying loss: $30,000 − $10,000 = $20,000",
      "50% CGT discount applies (property held > 12 months): assessable gain = $10,000",
      "Tax at 32.5% MTR: $10,000 × 32.5% = $3,250",
      "The $10K carried-forward loss saved $1,625 in additional tax",
    ],
    highlight: "Capital losses must be applied before the 50% discount, maximising their value.",
  },
];

const PROPERTY_RULES = [
  {
    rule: "Main Residence Exemption (PPOR)",
    detail: "Your principal place of residence is fully exempt from CGT while it is your main home. No CGT applies when you sell, regardless of the gain size. You can only claim one main residence at a time.",
  },
  {
    rule: "6-Year Absence Rule",
    detail: "If you move out of your PPOR and rent it, you can treat it as your main residence for up to 6 continuous years. During this period, CGT does not accrue (providing you do not treat another property as your main residence). This rule resets each time you move back in.",
  },
  {
    rule: "Partial Exemption",
    detail: "If a property was your main residence for only part of your ownership period, or was used partly to produce income (e.g. renting out a room), you receive a partial exemption. The taxable portion is calculated using the proportion of time and/or floor area used for income purposes.",
  },
  {
    rule: "Cost Base for Property",
    detail: "Includes purchase price, stamp duty, conveyancing and legal fees, agent commissions on sale, capital improvement costs, and non-deductible holding costs. Interest on the mortgage is generally deductible and therefore NOT added to the cost base.",
  },
];

const SECTIONS = [
  {
    id: "what-is-cgt",
    heading: "What is Capital Gains Tax?",
    body: `Capital Gains Tax (CGT) in Australia is not a separate tax — it is part of your income tax. When you sell a capital asset at a profit, that gain is added to your assessable income for the financial year and taxed at your marginal income tax rate. There is no fixed "CGT rate" — the rate depends on your total taxable income.

The basic formula:
Capital Gain = Proceeds received − Cost Base

If you held the asset for more than 12 months, apply the 50% CGT discount:
Assessable Gain = Capital Gain × 50%

The 2025–26 marginal rates range from 0% (below the tax-free threshold) to 45% (income above $190,000). The Medicare Levy (2%) applies on top. For assets held over 12 months, the effective CGT rate for a top-bracket taxpayer is 22.5% (45% × 50%) plus the levy — significantly lower than ordinary income tax.`,
  },
  {
    id: "cgt-events",
    heading: "CGT events — what triggers tax",
    body: `A CGT event occurs when you dispose of a capital asset. The ATO defines over 50 types of CGT events; the most common for individual investors are:

Shares and ETFs: CGT applies when you sell. The acquisition date for shares is the trade date (not settlement). Dividends and distributions are ordinary income and do not trigger CGT on the shares themselves.

Investment property: CGT arises when the property is sold. Your main residence (PPOR) is generally exempt — see the property section below.

Cryptocurrency: The ATO treats crypto as a CGT asset. Every disposal is a CGT event — including selling for AUD, swapping one crypto for another, spending crypto on goods, and gifting crypto. Crypto-to-crypto swaps are taxable events even if you never touched AUD.

Business assets: When you sell a business or business asset, CGT applies. There are small business CGT concessions (15-year exemption, 50% active asset reduction, retirement exemption, and rollover relief) that can significantly reduce or eliminate CGT for eligible small business owners.

Collectibles and personal use assets: Paintings, jewellery, rare coins, and similar items acquired for $500 or more are CGT assets. Personal use assets (boats, furniture) acquired for $10,000 or more may also give rise to CGT on disposal.`,
  },
  {
    id: "50-percent-discount",
    heading: "The 50% CGT discount",
    body: `The 50% CGT discount is one of the most powerful tax benefits available to Australian investors. If you hold a capital asset for more than 12 consecutive months before disposing of it, only 50% of your net capital gain is included in your assessable income.

Who qualifies for the discount:
- Individual investors: yes, 50% discount
- Trusts: yes, 50% discount (passed through to individual beneficiaries)
- Self-managed super funds (SMSFs): yes, but only a one-third discount (effectively paying 15% × 2/3 = 10% on gains)
- Companies: no discount at all — the full capital gain is taxed at the 30% (or 25% for base rate entities) corporate tax rate

Who does NOT get the discount:
- Any entity that held the asset for less than 12 months
- Companies regardless of holding period
- Non-residents (they lose the discount for most asset types under 2012 changes)

The 12-month clock starts on the date of acquisition (the trade date for shares, the contract date for property in most cases). It does not include the disposal date itself.

Practical impact: A 45% marginal rate taxpayer with a $100,000 capital gain will pay $45,000 in tax if held less than 12 months, versus $22,500 if held more than 12 months. The discount effectively halves the maximum CGT rate from 45% to 22.5%.`,
  },
  {
    id: "capital-losses",
    heading: "Capital losses — offsetting and carrying forward",
    body: `A capital loss arises when you sell a capital asset for less than its cost base. Capital losses have strict rules that differ from ordinary tax deductions:

Capital losses can ONLY offset capital gains — not ordinary income. You cannot use a capital loss to reduce your salary, wages, interest income, dividends, or rental income. This is a fundamental rule with no exceptions for individuals.

Order of application:
1. Apply current-year capital losses against current-year capital gains
2. If losses exceed gains, the excess is carried forward to the next financial year
3. Carried-forward losses must be applied against gains in future years before the 50% CGT discount is applied
4. Losses carried forward indefinitely — they never expire

The ordering rule is important: because losses are applied before the 50% discount, each dollar of capital loss offsets a dollar of gain before the discount reduces the assessable amount. In practice, this means a $10,000 capital loss offsets $10,000 of gain even though, after the discount, the gain would only have added $5,000 to assessable income.

Tax-loss harvesting: Selling underperforming assets before 30 June to realise losses that offset your current-year gains is a legitimate tax minimisation strategy. The ATO has wash sale rules — selling and immediately repurchasing the same asset to crystallise a loss — which can be challenged if the dominant purpose is obtaining a tax benefit. Most advisors recommend a 30+ day gap before reacquiring the same asset.`,
  },
  {
    id: "crypto-cgt",
    heading: "CGT on cryptocurrency",
    body: `The ATO treats all cryptocurrency as a CGT asset — Bitcoin, Ethereum, altcoins, stablecoins, and NFTs. There is no "currency" exemption for crypto in Australia.

Every one of these is a taxable CGT event:
- Selling crypto for AUD
- Swapping one crypto for another (crypto-to-crypto swaps ARE taxable — you are deemed to have sold the first crypto at its AUD value at the time of swap)
- Spending crypto on goods or services
- Gifting crypto to another person
- Moving crypto to a new wallet you do not own

What is NOT a CGT event:
- Buying crypto with AUD (this is an acquisition)
- Transferring between wallets you own (same beneficial owner)

The 50% CGT discount applies to crypto held for more than 12 months, same as shares. The "swap trap": if you hold Bitcoin for 11 months and swap it for Ethereum, you dispose of Bitcoin (triggering CGT) and your 12-month clock for Ethereum resets from the swap date.

Staking rewards, mining income, and DeFi yields are generally treated as ordinary income at the time received (not CGT), taxed at your full marginal rate. The value at receipt becomes the cost base for future CGT purposes. For detailed crypto tax treatment, see the crypto tax guide at /tax/crypto.`,
  },
  {
    id: "cgt-free",
    heading: "CGT-free investments and exemptions",
    body: `Not all investment gains trigger CGT. Key exemptions and CGT-free structures:

Superannuation: Contributions to super go in pre-tax (concessional) or post-tax (non-concessional) — neither is a CGT event. Inside the super fund, investment gains are taxed at 15% (accumulation phase) with a one-third discount for assets held over 12 months, giving an effective 10% rate. In pension phase (account-based pension), fund earnings including capital gains are completely tax-free.

Main residence exemption: The sale of your PPOR is fully exempt from CGT while it is your main home. See the property section for the 6-year absence rule.

Pre-CGT assets: Assets acquired before 20 September 1985 are exempt from CGT entirely. These "pre-CGT assets" are rare but relevant for inherited assets from older estates.${/* // dated-ok — CGT inception date, fixed by statute (never changes) */ ""}

Collectibles and personal use assets under threshold: Collectibles acquired for less than $500 and personal use assets acquired for less than $10,000 are generally exempt.

Small business CGT concessions: Business owners who meet the maximum net asset value test ($6 million) or small business turnover test ($2 million) may access the 15-year exemption, 50% active asset reduction, retirement exemption, or rollover concessions to reduce or eliminate CGT on business asset sales.

Bonds held to maturity: Government bonds and some corporate bonds that are held to maturity and redeemed at face value generally do not create a CGT event because there is no "gain" — the redemption at face value equals the cost base.`,
  },
  {
    id: "cgt-death",
    heading: "CGT and death — inherited assets",
    body: `Australia does not have an inheritance tax or estate duty. When an asset passes to a beneficiary on death, there is generally no deemed disposal — the deceased is not treated as having sold the asset at death, so no CGT crystallises at that moment.

How inherited assets work:
The beneficiary inherits the asset with the deceased's cost base (the original acquisition cost, adjusted for any improvements). This "inherited cost base" then applies when the beneficiary eventually sells the asset.

Date of acquisition for the 50% discount:
If the deceased held the asset for more than 12 months, the beneficiary is treated as having held the asset for more than 12 months from day one. This means the 50% discount is immediately available to the beneficiary — they do not need to wait another 12 months after inheriting.

Pre-CGT assets inherited:
If the asset was acquired by the deceased before 20 September 1985 (a "pre-CGT asset"), it retains its pre-CGT status for the beneficiary in most cases, meaning no CGT when the beneficiary sells.${/* // dated-ok — CGT inception date, fixed by statute (never changes) */ ""}

Foreign beneficiaries:
Non-resident beneficiaries who inherit Australian taxable property may trigger different rules. CGT can apply on inherited Australian real property even for non-residents.

Executors and the estate:
During estate administration, the executor holds assets as trustee. Most transfers from the deceased estate to a beneficiary are not taxable events — tax is deferred to when the beneficiary eventually sells.

Record keeping note: Obtain the original cost base documentation (purchase records, contracts) for inherited assets as soon as possible after the estate is settled. These records may be many decades old and difficult to reconstruct later.`,
  },
  {
    id: "record-keeping",
    heading: "Record keeping requirements",
    body: `The ATO requires you to keep records of all CGT assets for 5 years from the date you lodge your tax return for the year of disposal. For assets held a long time, this means records going back to the original acquisition date may need to be kept for decades.

What records to keep:
- For shares: contract notes or broker confirmations for every purchase and sale, showing date, quantity, price, and brokerage
- For property: contracts of sale, settlement statements, proof of stamp duty paid, invoices for capital improvements, agent commission statements on sale
- For crypto: transaction histories from exchanges and wallets showing date, amount, AUD value at time of transaction, and fees paid
- For any asset: records of any non-deductible ownership costs that form part of the cost base

Why record keeping matters:
If the ATO audits your return and you cannot substantiate your cost base, the ATO may assess CGT based on a lower cost base or zero cost base — meaning you pay tax on the full proceeds. Investors who cannot produce brokerage statements from 10 years ago often face this problem.

Broker annual tax statements:
Most Australian brokers (CommSec, Stake, SelfWealth, Pearler) issue annual tax statements that summarise all disposals, total proceeds, and gains. These are a starting point but do not substitute for original contract notes for cost base verification.

For detailed guidance on what records to keep across all investment types, see /tax/record-keeping.`,
  },
  {
    id: "tax-minimisation",
    heading: "Tax minimisation strategies",
    body: `Several legitimate strategies can reduce your CGT bill. None involve hiding income — all are explicitly permitted under Australian tax law.

1. Harvest losses before 30 June
Review your portfolio each May–June. If you have realised capital gains for the year and unrealised losses in other positions, consider selling the losing positions to realise capital losses that offset your gains. The ATO's wash sale rules mean you should wait 30+ days before reacquiring the same asset. For deeper guidance, see /invest/tax-loss-harvesting.

2. Hold assets for more than 12 months
Simply timing your disposal to cross the 12-month threshold halves the assessable gain. For a $50,000 gain at 37% MTR, this saves $9,250. Avoid selling major positions just before the 12-month anniversary.

3. Time disposal for a low-income year
Capital gains are added to your assessable income in the year of disposal. If you know your income will be lower next year (career break, parental leave, retirement, voluntary redundancy), deferring a large disposal can push it into a lower tax bracket.

4. Pre-30-June strategy for the disposal year
If you are selling before 30 June, consider whether the gain could be partially offset by losses. If you are selling after 1 July, you have a full year to plan. The financial year boundary is the critical timing lever.

5. Use super contributions
Salary sacrificing into super reduces your taxable income. While it does not directly reduce CGT, it can lower your marginal rate for the year in which you realise a capital gain, reducing the tax on the assessed portion.

6. Discount stacking with carried-forward losses
If you have carried-forward capital losses, they are applied to gains before the 50% discount is applied. For large portfolios with accumulated losses, this can be very powerful — $100,000 in carried-forward losses can eliminate $100,000 of gain before any discount is calculated.

7. Invest via super (for long-term investors)
Assets held inside an SMSF or industry fund pay 10% effective CGT on long-term gains (15% tax × two-thirds, because SMSFs get a one-third discount on assets held > 12 months). If you are in a high marginal rate bracket, the tax differential between holding inside super versus personally is significant for long holding periods.`,
  },
];

const FAQS = [
  {
    q: "Is CGT a separate tax in Australia?",
    a: "No. CGT is not a separate tax — it is part of your income tax. When you make a capital gain, that gain is added to your assessable income for the year and taxed at your marginal income tax rate. There is no fixed CGT rate. The rate depends on your total taxable income and whether the 50% discount applies.",
  },
  {
    q: "When do I have to pay CGT in Australia?",
    // dated-ok — ATO statutory deadlines (31 Oct = standard, 28 Feb = tax-agent extension); fixed by legislation
    a: "CGT is not paid at the time of sale. It is included in your income tax assessment for the financial year you sold the asset. If you sell shares in March 2026, the gain is in your 2025-26 tax return, due 31 October 2026 (or 28 February 2027 with a tax agent). PAYG instalments may increase if the ATO assesses you as having significant capital gains income.",
  },
  {
    q: "Can I use capital losses to reduce my salary or wages?",
    a: "No. Capital losses can only offset capital gains — not ordinary income such as salary, wages, interest, dividends, or rent. If your capital losses exceed your capital gains in a year, the excess is carried forward to future financial years. Carried-forward losses never expire and can be used in any future year when you have capital gains to offset.",
  },
  {
    q: "Does the 50% CGT discount apply to companies?",
    a: "No. Companies do not receive the 50% CGT discount regardless of how long the asset was held. The full capital gain is taxed at the company tax rate (30%, or 25% for base rate entities with turnover under $50 million). Self-managed super funds receive a one-third discount on assets held more than 12 months, giving an effective 10% CGT rate. Only individuals and trusts receive the full 50% discount.",
  },
  {
    q: "Are crypto-to-crypto swaps taxable in Australia?",
    a: "Yes. The ATO treats a swap of one cryptocurrency for another as a disposal of the first asset. You are deemed to have sold the original crypto at its AUD value at the time of the swap, triggering a CGT event. The second crypto is acquired at that AUD value, which becomes your new cost base. This applies even if you never converted to AUD — the taxable event is the disposal of the first asset.",
  },
  {
    q: "What assets are CGT-free in Australia?",
    a: "Your principal place of residence (PPOR) is generally fully CGT-exempt on sale. Other CGT-free situations include: assets acquired before 20 September 1985 (pre-CGT assets); collectibles acquired for under $500; personal use assets acquired for under $10,000; some small business CGT concessions (15-year exemption, retirement exemption); compensation for personal injury; and investment earnings inside a superannuation fund in pension phase.", // dated-ok — CGT inception date, fixed by statute (never changes)
  },
];

export default async function CapitalGainsTaxPage() {
  const supabase = await createClient();
  const { data: brokerRows } = await supabase
    .from("brokers")
    .select("id, name, slug, color, logo_url, rating, asx_fee, asx_fee_value, cta_text, benefit_cta, tagline, affiliate_url, status, platform_type, created_at, updated_at, chess_sponsored, smsf_support, is_crypto, deal, editors_pick")
    .eq("status", "active")
    .eq("platform_type", "share_broker")
    .not("asx_fee_value", "is", null)
    .order("asx_fee_value", { ascending: true })
    .limit(3);
  const brokers: Broker[] = brokerRows ?? [];

  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: SITE_URL },
    { name: "Tax Strategy", url: `${SITE_URL}/tax` },
    { name: "Capital Gains Tax" },
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
            <Link href="/tax" className="hover:text-slate-900">Tax Strategy</Link>
            <span>/</span>
            <span className="text-slate-900 font-medium">Capital Gains Tax</span>
          </nav>
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 border border-slate-200 rounded-full text-xs font-semibold text-slate-600 mb-4">
              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full" />
              CGT Guide &middot; {UPDATED_LABEL}
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold leading-[1.1] mb-3 tracking-tight text-slate-900">
              Capital Gains Tax Australia{" "}
              <span className="text-amber-600">({CURRENT_YEAR})</span>
            </h1>
            <p className="text-sm md:text-base text-slate-600 leading-relaxed">
              CGT is part of income tax in Australia — no separate rate. This guide covers the 50% discount,
              cost base, capital losses, worked examples, property and crypto rules, and legitimate
              strategies to reduce your CGT bill.
            </p>
          </div>
        </div>
      </section>

      {/* Key stats callouts */}
      <section className="py-8 bg-slate-50 border-b border-slate-200">
        <div className="container-custom">
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl border border-amber-200 p-5">
              <p className="text-xs font-bold text-amber-800 uppercase tracking-wide mb-1">CGT Discount</p>
              <p className="text-xl font-black text-amber-700">50%</p>
              <p className="text-xs text-slate-600 mt-1">Individuals who hold an asset 12+ months get a 50% reduction on their net capital gain before tax</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">Max Effective CGT Rate</p>
              <p className="text-xl font-black text-slate-900">22.5%</p>
              <p className="text-xs text-slate-600 mt-1">Top marginal rate (45%) after 50% discount — applies to assets held 12+ months by individuals</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">Capital Losses</p>
              <p className="text-xl font-black text-slate-900">Indefinite</p>
              <p className="text-xs text-slate-600 mt-1">Unused capital losses carry forward to offset future gains — they never expire under Australian tax law</p>
            </div>
          </div>
        </div>
      </section>

      {/* CGT rates table */}
      <section className="py-8 bg-white">
        <div className="container-custom">
          <SectionHeading eyebrow="CGT Rates" title="Effective CGT Rates by Tax Bracket" sub="How the 50% CGT discount affects your effective capital gains tax rate (FY2025–26, excluding 2% Medicare Levy)." />
          <div className="mt-6 overflow-x-auto max-w-3xl">
            <table className="w-full text-sm border-collapse" aria-label="Effective CGT rates by income bracket">
              <thead>
                <tr className="bg-slate-800 text-white">
                  <th scope="col" className="text-left py-3 px-4 text-xs font-bold">Taxable Income</th>
                  <th scope="col" className="text-center py-3 px-4 text-xs font-bold">Marginal Rate</th>
                  <th scope="col" className="text-center py-3 px-4 text-xs font-bold">CGT Rate (&lt;12 months)</th>
                  <th scope="col" className="text-center py-3 px-4 text-xs font-bold">CGT Rate (12+ months)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {CGT_RATES.map((row) => (
                  <tr key={row.income} className="bg-white hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 text-xs font-mono text-slate-700">{row.income}</td>
                    <td className="py-3 px-4 text-center text-xs font-bold text-slate-900">{row.marginalRate}</td>
                    <td className="py-3 px-4 text-center text-xs font-semibold text-red-700">{row.cgtLess12m}</td>
                    <td className="py-3 px-4 text-center text-xs font-semibold text-green-700">{row.cgtMore12m}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-xs text-slate-400 mt-2">Excludes 2% Medicare Levy. FY2025–26 rates. Verify current rates at ato.gov.au.</p>
          </div>
        </div>
      </section>

      {/* Worked examples */}
      <section className="py-10 md:py-12 bg-amber-50 border-y border-amber-100">
        <div className="container-custom max-w-3xl">
          <SectionHeading eyebrow="Worked Examples" title="CGT Calculations Step by Step" sub="Three examples showing how CGT is calculated in practice — with the discount, without the discount, and with a carried-forward capital loss." />
          <div className="mt-8 space-y-6">
            {WORKED_EXAMPLES.map((ex) => (
              <div key={ex.title} className="bg-white rounded-2xl border border-amber-200 p-6">
                <h3 className="text-sm font-extrabold text-slate-900 mb-4">{ex.title}</h3>
                <ol className="space-y-2">
                  {ex.steps.map((step, i) => (
                    <li key={i} className="flex gap-3 text-sm text-slate-700">
                      <span className="shrink-0 w-5 h-5 rounded-full bg-amber-100 border border-amber-300 flex items-center justify-center text-xs font-bold text-amber-800">{i + 1}</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
                <div className="mt-4 px-4 py-3 bg-amber-50 rounded-xl border border-amber-200">
                  <p className="text-xs font-semibold text-amber-800">{ex.highlight}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Cost base section */}
      <section className="py-10 md:py-12 bg-white">
        <div className="container-custom max-w-3xl">
          <SectionHeading eyebrow="Cost Base" title="The 5 Elements of Your CGT Cost Base" sub="Getting the cost base right reduces your CGT. Underclaiming legitimate costs means paying more tax than you owe." />
          <div className="mt-8 space-y-4">
            {COST_BASE_ELEMENTS.map((el) => (
              <div key={el.number} className="flex gap-4 p-5 bg-slate-50 rounded-2xl border border-slate-200">
                <span className="shrink-0 w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center text-sm font-extrabold">{el.number}</span>
                <div>
                  <p className="text-sm font-bold text-slate-900 mb-1">{el.label}</p>
                  <p className="text-xs text-slate-600 leading-relaxed">{el.detail}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5 p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <p className="text-xs font-semibold text-blue-900 mb-1">What is NOT included in the cost base</p>
            <p className="text-xs text-blue-800 leading-relaxed">
              Costs you have already claimed as a tax deduction (e.g. interest on an investment loan, property management fees) cannot also increase your cost base. GST you claimed back as an input tax credit is also excluded. Double-claiming is not permitted.
            </p>
          </div>
        </div>
      </section>

      {/* Property section */}
      <section className="py-10 md:py-12 bg-slate-50 border-y border-slate-200">
        <div className="container-custom max-w-3xl">
          <SectionHeading eyebrow="Property" title="CGT on Investment Property" sub="Main residence exemption, the 6-year absence rule, and partial exemptions for mixed-use properties." />
          <div className="mt-8 space-y-4">
            {PROPERTY_RULES.map((item) => (
              <div key={item.rule} className="bg-white rounded-2xl border border-slate-200 p-5">
                <p className="text-sm font-bold text-slate-900 mb-2">{item.rule}</p>
                <p className="text-xs text-slate-600 leading-relaxed">{item.detail}</p>
              </div>
            ))}
          </div>
          <div className="mt-5 p-4 bg-slate-100 border border-slate-200 rounded-xl">
            <p className="text-xs font-semibold text-slate-800 mb-1">Partial exemption example</p>
            <p className="text-xs text-slate-600 leading-relaxed">
              You own a property for 10 years. For the first 5 years it is your PPOR (exempt). You move out and rent it for 5 years (not exempt — exceeds the 6-year absence rule if you also own another PPOR). On sale, 50% of the gain (5 of 10 years as a rental) is subject to CGT. The 50% CGT discount still applies if held over 12 months, applied to the taxable portion only.
            </p>
          </div>
        </div>
      </section>

      {/* Main content guide sections */}
      <section className="py-10 md:py-12 bg-white">
        <div className="container-custom max-w-3xl">
          <SectionHeading eyebrow="Complete Guide" title="Capital Gains Tax — Full Explanation" />
          <div className="mt-8 space-y-10">
            {SECTIONS.map((sec) => (
              <div key={sec.id} id={sec.id}>
                <h2 className="text-lg font-extrabold text-slate-900 mb-3">{sec.heading}</h2>
                <div className="text-sm text-slate-600 leading-relaxed space-y-3">
                  {sec.body.split("\n\n").map((para, i) => (
                    <p key={i} className="whitespace-pre-line break-words">{para}</p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Related guides */}
      <section className="py-8 bg-slate-50 border-y border-slate-200">
        <div className="container-custom max-w-3xl">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-4">Related Guides</p>
          <div className="grid sm:grid-cols-3 gap-3">
            <Link href="/tax/crypto" className="block bg-white rounded-xl border border-slate-200 hover:border-amber-300 p-4 transition-colors group">
              <p className="text-xs font-bold text-slate-800 group-hover:text-amber-700 transition-colors">Crypto Tax Australia</p>
              <p className="text-xs text-slate-500 mt-1">Every crypto swap is a CGT event. ATO rules explained.</p>
            </Link>
            <Link href="/invest/tax-loss-harvesting" className="block bg-white rounded-xl border border-slate-200 hover:border-amber-300 p-4 transition-colors group">
              <p className="text-xs font-bold text-slate-800 group-hover:text-amber-700 transition-colors">Tax-Loss Harvesting</p>
              <p className="text-xs text-slate-500 mt-1">How to offset gains by selling losing positions before 30 June.</p>
            </Link>
            <Link href="/tax/record-keeping" className="block bg-white rounded-xl border border-slate-200 hover:border-amber-300 p-4 transition-colors group">
              <p className="text-xs font-bold text-slate-800 group-hover:text-amber-700 transition-colors">Record Keeping</p>
              <p className="text-xs text-slate-500 mt-1">What CGT records to keep and for how long.</p>
            </Link>
          </div>
        </div>
      </section>

      {/* FAQs */}
      <section className="py-10 md:py-12">
        <div className="container-custom max-w-2xl">
          <SectionHeading eyebrow="FAQ" title="Capital Gains Tax Questions Answered" />
          <div className="mt-6 divide-y divide-slate-200">
            {FAQS.map((faq) => (
              <details key={faq.q} className="py-4 group">
                <summary className="text-sm font-semibold text-slate-900 cursor-pointer list-none flex items-center justify-between gap-2">
                  {faq.q}
                  <span className="text-slate-400 group-open:rotate-180 transition-transform shrink-0" aria-hidden="true">&#9662;</span>
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
          <h2 className="text-xl font-extrabold mb-3">Get CGT advice from a specialist</h2>
          <p className="text-sm text-slate-300 mb-6">
            An investment tax specialist can identify CGT minimisation strategies specific to your portfolio — especially useful before 30 June or when selling a major asset.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/advisors/tax-agents" className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm rounded-xl transition-colors">
              Find a Tax Agent &#8594;
            </Link>
            <Link href="/tax" className="px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold text-sm rounded-xl transition-colors">
              Tax Strategy Hub &#8594;
            </Link>
          </div>
        </div>
      </section>

      {/* Broker comparison */}
      {brokers.length > 0 && (
        <section className="py-10 bg-white border-t border-slate-200">
          <div className="container-custom max-w-3xl">
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-4">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Compare Brokers</p>
                <h2 className="text-lg font-bold text-slate-900">Low-cost brokers for tax-efficient investing</h2>
                <p className="text-sm text-slate-500 mt-1">Lower brokerage reduces your cost base and improves after-tax returns. Compare Australia&#39;s cheapest share brokers.</p>
              </div>
              <div className="grid sm:grid-cols-3 gap-3">
                {brokers.map((b) => (
                  <div key={b.slug} className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col gap-3">
                    <div>
                      <p className="font-bold text-slate-900 text-sm">{b.name}</p>
                      <p className="text-xs"><span className="text-amber-600" aria-hidden="true">{renderStars(Number(b.rating))}</span> <span className="font-semibold text-slate-600" aria-label={`${(Number(b.rating) || 0).toFixed(1)} out of 5 stars`}>{(Number(b.rating) || 0).toFixed(1)}</span></p>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">{b.tagline}</p>
                    </div>
                    <div className="mt-auto">
                      <p className="text-xs font-semibold text-slate-700 mb-2">{b.benefit_cta ?? b.cta_text ?? "Open Account"}</p>
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

      {/* AdvisorPrompt */}
      <section className="py-10 bg-slate-50 border-t border-slate-200">
        <div className="container-custom max-w-3xl">
          <h2 className="text-lg font-bold text-slate-900 mb-4">CGT calculation getting complex?</h2>
          <AdvisorPrompt type="tax_agent" />
        </div>
      </section>

      {/* Compliance footer */}
      <section className="py-6 bg-slate-100 border-t border-slate-200">
        <div className="container-custom max-w-3xl">
          <p className="text-xs text-slate-500 leading-relaxed">
            {GENERAL_ADVICE_WARNING} Tax information is general in nature and does not constitute personal tax advice. CGT rules, marginal rates, and ATO guidance change regularly — verify current rates and rules at ato.gov.au or consult a registered tax agent for advice specific to your circumstances.
          </p>
        </div>
      </section>
    </div>
  );
}
