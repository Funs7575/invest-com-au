/**
 * Halal investing hub — comprehensive guide for Australian Muslim investors.
 *
 * Covers: Islamic finance principles (riba, gharar, haram sectors), Shariah
 * screening process, halal ETFs / managed funds, halal super, Islamic banking,
 * purification calculation, screening tools, Australian tax treatment, and
 * performance considerations.
 *
 * Compliance posture per CLAUDE.md: factual, comparison-driven, general
 * information only. Not a fatwa and not financial advice. Refer readers to
 * qualified Islamic finance scholars and licensed Australian advisers.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { SITE_URL, CURRENT_YEAR, UPDATED_LABEL, breadcrumbJsonLd, absoluteUrl } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";
import InvestOpportunitiesCallout from "@/components/invest/InvestOpportunitiesCallout";

export const revalidate = 86400;

const PAGE_TITLE = `Halal Investing in Australia (${CURRENT_YEAR}) — Shariah-Compliant ETFs, Super, Funds & Screening`;
const PAGE_DESC =
  "The complete guide to halal investing in Australia: Islamic finance principles (riba, gharar, haram sectors), Shariah screening ratios, halal ETFs, Crescent Wealth and Hejaz super, Islamic home finance, purification calculation, and screening apps. General information only.";

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESC,
  alternates: { canonical: `${SITE_URL}/halal-investing` },
  openGraph: {
    title: PAGE_TITLE,
    description: PAGE_DESC,
    url: `${SITE_URL}/halal-investing`,
    type: "article",
    images: [{ url: `/api/og?title=${encodeURIComponent("Halal Investing in Australia")}&sub=${encodeURIComponent("Sharia-Compliant Shares · ETFs · Screening · " + CURRENT_YEAR)}`, width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image", title: PAGE_TITLE, description: PAGE_DESC },
};

const breadcrumb = breadcrumbJsonLd([
  { name: "Home", url: SITE_URL },
  { name: "Halal Investing", url: absoluteUrl("/halal-investing") },
]);

const FAQS = [
  {
    q: "Is investing in shares halal?",
    a: "Investing in shares can be halal, but it depends on the company and how it is screened. Owning equity in a business that engages in genuine economic activity is generally permissible under Islamic finance principles — equity ownership represents profit-and-loss sharing, which is encouraged. However, shares in companies whose primary business involves haram activities (alcohol, gambling, conventional banking, tobacco, weapons, pork products, adult entertainment) are not permissible. Companies with only incidental haram revenue (typically less than 5% of total revenue) may be permissible after purification — donating that proportion of any dividend received to charity. You should also check the company passes financial ratio screens: total interest-bearing debt should generally be below 33% of market capitalisation. Use a Shariah screening app such as Islamicly, Zoya, or Musaffa to check individual ASX stocks.",
  },
  {
    q: "Are there halal ETFs available in Australia?",
    a: "Pure halal ETFs listed on the ASX are limited. The most commonly accessed Shariah-screened ETFs for Australian investors are listed overseas and accessed via international brokers: ISML (iShares MSCI World Islamic ETF, listed on the London Stock Exchange — accessible via Interactive Brokers) and HLAL (Wahed FTSE USA Shariah ETF, listed on a US exchange). There are no mainstream Shariah-specific ETFs currently listed on the ASX itself. Australian investors who want a locally-managed halal equity portfolio typically use managed funds such as Crescent Wealth or Hejaz Financial Services, which hold ASIC-regulated, Shariah-supervised portfolios without needing an international broker account.",
  },
  {
    q: "Can I have a halal superannuation fund?",
    a: "Yes. Crescent Wealth Super and Hejaz Super are APRA-regulated superannuation funds that offer Shariah-compliant investment options. Both funds screen their underlying investments against Islamic finance principles and are overseen by independent Shariah supervisory boards. You can roll your existing super balance into either fund if you are an eligible Australian resident. Before switching, compare fees, performance history, and insurance options — the same considerations apply as any super fund switch. Note that superannuation contributions and fund structures themselves comply with Australian law, and the Shariah compliance applies to how the investment pool is managed, not to the superannuation legislation.",
  },
  {
    q: "What is the difference between halal investing and ESG investing?",
    a: "Halal investing and ESG (Environmental, Social, Governance) investing share some overlapping exclusions — both typically screen out tobacco and weapons — but they use different frameworks and have different motivations. ESG investing is driven by secular ethical or sustainability criteria and may include or exclude companies based on carbon emissions, board diversity, supply-chain labour standards, and similar factors. Halal investing is driven by Islamic finance principles: the primary screens are the prohibition on riba (interest), gharar (excessive speculation), and haram sectors (alcohol, gambling, conventional banking, pork, adult entertainment). ESG funds may hold conventional banks; halal funds exclude them. Halal funds may hold mining companies that ESG funds screen out. The two approaches can be combined — some investors apply both frameworks simultaneously — but they are separate methodologies.",
  },
  {
    q: "How do I purify an investment that has minor haram income?",
    a: "If a company you own passes the primary Shariah screens but has a small proportion of revenue from incidental haram activities (typically below 5%), many scholars permit ownership with purification. The calculation is straightforward: multiply your dividend or distribution received by the haram revenue percentage, and donate that amount to charity. For example, if a company has 3% haram revenue and you receive a $500 dividend, you would donate $15 (3% of $500) to a charity of your choice. Keep a record of purification donations — some investors record these alongside their dividend statements. Purification applies to income; it does not apply to capital gains from the sale of shares. Different scholars and Shariah supervisory boards apply slightly different thresholds and methodologies, so consult a qualified Islamic finance scholar for a ruling specific to your situation.",
  },
];

const faqSchema = faqJsonLd(FAQS);

export default function HalalInvestingPage() {
  return (
    <>
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

      <main className="bg-white text-slate-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">

          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="text-sm text-slate-500 mb-6">
            <Link href="/" className="hover:text-slate-800">Home</Link>
            <span className="mx-2">/</span>
            <span className="text-slate-700">Halal Investing</span>
          </nav>

          {/* Hero */}
          <header className="mb-10">
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700 mb-3">
              Shariah-compliant investing &middot; {UPDATED_LABEL}
            </p>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mb-4">
              Halal investing in Australia
            </h1>
            <p className="text-lg text-slate-600 leading-relaxed mb-4">
              Halal investing applies Islamic finance principles to portfolio construction: avoiding
              interest (<em>riba</em>), excessive uncertainty (<em>gharar</em>), and industries
              prohibited by Shariah (<em>haram</em>). The segment is growing in Australia, with
              ASIC-regulated managed funds, APRA-regulated superannuation options, and access to
              internationally-listed Shariah-screened ETFs available to Australian residents.
            </p>
            <p className="text-slate-600 leading-relaxed">
              This guide covers the core principles, how screening works, what products are available,
              how to handle purification, and the Australian tax treatment of halal investments. It is
              general information only — not a fatwa, not financial advice, and not a Shariah
              certification.
            </p>
          </header>

          {/* 1. Core Islamic Finance Principles */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-4">Core Islamic finance principles</h2>
            <p className="text-slate-700 leading-relaxed mb-6">
              Islamic finance is governed by four main principles that shape what investments are
              permissible (<em>halal</em>) and what is prohibited (<em>haram</em>). Understanding
              these principles is essential before evaluating any specific product or screening tool.
            </p>

            <div className="overflow-x-auto mb-6">
              <table className="w-full text-sm border-collapse" aria-label="Core Islamic finance principles and their practical investing implications">
                <thead>
                  <tr className="bg-emerald-50 text-left">
                    <th scope="col" className="px-4 py-3 font-semibold text-slate-800 border border-slate-200 w-1/4">Principle</th>
                    <th scope="col" className="px-4 py-3 font-semibold text-slate-800 border border-slate-200 w-1/4">What it means</th>
                    <th scope="col" className="px-4 py-3 font-semibold text-slate-800 border border-slate-200">Practical investing implication</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="px-4 py-3 border border-slate-200 font-medium text-slate-800 align-top">
                      Riba prohibition
                    </td>
                    <td className="px-4 py-3 border border-slate-200 text-slate-700 align-top">
                      Interest is prohibited in all forms
                    </td>
                    <td className="px-4 py-3 border border-slate-200 text-slate-700 align-top">
                      Conventional bonds, bank term deposits earning interest, and debt instruments
                      are generally impermissible. Companies that earn significant interest income or
                      carry large interest-bearing debt also fail the screen.
                    </td>
                  </tr>
                  <tr className="bg-slate-50">
                    <td className="px-4 py-3 border border-slate-200 font-medium text-slate-800 align-top">
                      Gharar prohibition
                    </td>
                    <td className="px-4 py-3 border border-slate-200 text-slate-700 align-top">
                      Excessive uncertainty or speculation is prohibited
                    </td>
                    <td className="px-4 py-3 border border-slate-200 text-slate-700 align-top">
                      Standard derivatives (options, futures, CFDs), short-selling, and highly
                      speculative instruments are problematic. Standard equity investment is
                      permissible because the outcome depends on real economic activity.
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 border border-slate-200 font-medium text-slate-800 align-top">
                      Haram industry exclusions
                    </td>
                    <td className="px-4 py-3 border border-slate-200 text-slate-700 align-top">
                      Businesses in prohibited sectors are excluded
                    </td>
                    <td className="px-4 py-3 border border-slate-200 text-slate-700 align-top">
                      Sectors screened out include: alcohol, tobacco, gambling, pork products,
                      weapons and defence manufacturing, adult entertainment, conventional banking,
                      and conventional insurance. Revenue from these sectors triggers a fail.
                    </td>
                  </tr>
                  <tr className="bg-slate-50">
                    <td className="px-4 py-3 border border-slate-200 font-medium text-slate-800 align-top">
                      Profit and loss sharing
                    </td>
                    <td className="px-4 py-3 border border-slate-200 text-slate-700 align-top">
                      Investment should involve genuine economic participation
                    </td>
                    <td className="px-4 py-3 border border-slate-200 text-slate-700 align-top">
                      Equity ownership in a business is generally permissible — you share in profits
                      and bear the risk of loss. This is the basis for halal share investing.
                      Pure debt (lending money for interest) is not permissible.
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 border border-slate-200 font-medium text-slate-800 align-top">
                      Purification
                    </td>
                    <td className="px-4 py-3 border border-slate-200 text-slate-700 align-top">
                      Minor haram income can be cleansed by donating that portion to charity
                    </td>
                    <td className="px-4 py-3 border border-slate-200 text-slate-700 align-top">
                      If a permissible company has incidental haram revenue (commonly accepted
                      threshold: below 5%), investors may own the shares but must donate the
                      equivalent proportion of any income received to charity.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-xs text-slate-500 italic">
              General information only. Different scholars and Shariah supervisory boards apply
              different thresholds. Consult a qualified Islamic finance scholar for personal rulings.
            </p>
          </section>

          {/* 2. Shariah Screening Process */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-4">How Shariah screening works</h2>
            <p className="text-slate-700 leading-relaxed mb-4">
              Shariah-compliant funds and screening tools apply a two-stage process: a qualitative
              sector screen followed by quantitative financial ratio tests.
            </p>

            <h3 className="text-lg font-semibold mb-3 text-slate-800">Stage 1 — Qualitative sector screen</h3>
            <p className="text-slate-700 leading-relaxed mb-4">
              The company&apos;s primary business is assessed against prohibited sectors. A company
              whose core business is alcohol production, gambling operations, conventional banking,
              or any other haram activity fails the screen outright, regardless of its financial
              ratios. There is no partial pass at this stage.
            </p>

            <h3 className="text-lg font-semibold mb-3 text-slate-800">Stage 2 — Quantitative financial ratio tests</h3>
            <p className="text-slate-700 leading-relaxed mb-4">
              Companies that pass the sector screen are then assessed on three financial ratios. The
              thresholds below follow the AAOIFI standard, which most Australian providers reference:
            </p>
            <ul className="space-y-3 mb-4">
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center justify-center mt-0.5">1</span>
                <div>
                  <strong className="text-slate-800">Debt ratio:</strong>
                  <span className="text-slate-700"> Total interest-bearing debt must be less than 33% of the trailing 24-month average market capitalisation. Companies with high leverage from conventional borrowing fail this test.</span>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center justify-center mt-0.5">2</span>
                <div>
                  <strong className="text-slate-800">Revenue ratio (haram income):</strong>
                  <span className="text-slate-700"> Revenue from haram activities (incidental, not primary) must be less than 5% of total revenue. Income from this portion must be purified.</span>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center justify-center mt-0.5">3</span>
                <div>
                  <strong className="text-slate-800">Interest income ratio:</strong>
                  <span className="text-slate-700"> Non-operating interest and interest-like income must be less than 5% of total revenue. A company sitting on large cash deposits earning interest may fail this test even if its core business is permissible.</span>
                </div>
              </li>
            </ul>

            <h3 className="text-lg font-semibold mb-3 text-slate-800">Who does the screening in Australia</h3>
            <p className="text-slate-700 leading-relaxed mb-4">
              Australian Shariah-compliant fund managers typically engage an independent Shariah
              supervisory board — a panel of qualified Islamic scholars — to certify the screening
              methodology and review the portfolio. Internationally, Amanie Advisors is one of the
              most recognised certification bodies with Australian connections. Crescent Wealth and
              Hejaz Financial Services each publish their Shariah supervisory board composition on
              their websites. Individual investors can apply the screening ratios themselves using
              financial data from company annual reports, or use an app such as Islamicly, Zoya,
              or Musaffa (see the screening tools section below).
            </p>
            <p className="text-xs text-slate-500 italic">
              Different scholars apply different thresholds — a stock that passes under one board&apos;s
              methodology may not pass under another. Always verify with the specific fund&apos;s Shariah
              supervisory board.
            </p>
          </section>

          {/* 3. Halal-Compliant Investments in Australia */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-4">Halal-compliant investments available in Australia</h2>

            <h3 className="text-lg font-semibold mb-3 text-slate-800">Halal ETFs</h3>
            <p className="text-slate-700 leading-relaxed mb-4">
              Pure Shariah-screened ETFs listed on the ASX are limited. Australian investors
              typically access halal index exposure through overseas-listed products via an
              international broker:
            </p>
            <ul className="space-y-3 mb-5">
              <li className="text-slate-700">
                <strong>ISML</strong> — iShares MSCI World Islamic ETF, listed on the London Stock
                Exchange. Tracks the MSCI World Islamic Index, which applies Shariah screens to
                developed-market equities. Accessible to Australian investors via Interactive
                Brokers (IBKR) or similar international brokers.
              </li>
              <li className="text-slate-700">
                <strong>HLAL</strong> — Wahed FTSE USA Shariah ETF, listed on a US exchange.
                Tracks US equities screened by the FTSE Shariah USA Index methodology. Accessible
                via IBKR and US-market brokers.
              </li>
            </ul>
            <p className="text-slate-700 leading-relaxed mb-5">
              There are no mainstream Shariah-specific ETFs currently listed on the ASX. Investors
              wanting a locally-managed halal equity portfolio without an international broker account
              typically use Australian-regulated managed funds instead.
            </p>

            <h3 className="text-lg font-semibold mb-3 text-slate-800">Halal managed funds</h3>
            <ul className="space-y-4 mb-5">
              <li className="border border-slate-200 rounded-lg p-4">
                <strong className="text-slate-900 block mb-1">Crescent Wealth</strong>
                <p className="text-slate-700 text-sm">
                  An Australian managed investment scheme and superannuation fund regulated by ASIC
                  and APRA respectively. Investment options are screened by an independent Shariah
                  supervisory board and exclude prohibited sectors. Offers diversified and property
                  options. One of the longest-established halal investment managers in Australia.
                </p>
              </li>
              <li className="border border-slate-200 rounded-lg p-4">
                <strong className="text-slate-900 block mb-1">Hejaz Financial Services</strong>
                <p className="text-slate-700 text-sm">
                  Offers Shariah-compliant superannuation, managed investment products, and Islamic
                  home finance. ASIC-licensed. Equity portfolio is screened using AAOIFI-based
                  methodology. Also offers an ethical growth fund and a fixed-income-equivalent
                  product structured around profit-sharing rather than interest.
                </p>
              </li>
              <li className="border border-slate-200 rounded-lg p-4">
                <strong className="text-slate-900 block mb-1">MCCA (Muslim Community Co-operative Australia)</strong>
                <p className="text-slate-700 text-sm">
                  Australia&apos;s longest-running Islamic finance institution, established in 1989.
                  Primarily known for home finance (murabaha and ijarah structures) but also offers
                  investment products. A co-operative structure with a community-ownership model.
                </p>
              </li>
            </ul>

            <h3 className="text-lg font-semibold mb-3 text-slate-800">Direct ASX shares</h3>
            <p className="text-slate-700 leading-relaxed mb-4">
              Self-directed investors can apply the Shariah screening ratios to individual ASX
              companies. Sectors that tend to produce passing candidates include resources and mining
              (excluding conventional banks), technology, healthcare, and consumer staples. The
              ASX&apos;s four major banks (CBA, WBC, NAB, ANZ) fail the sector screen because
              conventional banking is a prohibited activity. Approximately 30&ndash;40% of ASX 300
              names typically pass a full sector plus ratio screen, though this varies with market
              movements affecting the debt-to-market-cap ratio.
            </p>
            <p className="text-slate-700 leading-relaxed mb-5">
              Screening individual stocks requires checking each company&apos;s annual report for
              interest-bearing debt, interest income, and any incidental haram revenue. Use a
              screening app to shortlist, then verify ratios against the company&apos;s actual
              financial statements before investing.
            </p>

            <h3 className="text-lg font-semibold mb-3 text-slate-800">Sukuk (Islamic bonds)</h3>
            <p className="text-slate-700 leading-relaxed mb-5">
              Sukuk are profit-sharing certificates that function similarly to bonds but are
              structured to avoid interest. Instead of paying a fixed coupon, a sukuk represents
              ownership in an underlying asset and pays a share of income from that asset. Retail
              access to sukuk in Australia is very limited — most sukuk are institutional or
              government instruments issued globally (Malaysia, Gulf states, and increasingly the
              UK). Some Islamic managed funds hold sukuk as a fixed-income substitute within a
              broader portfolio, which is the most practical route for Australian retail investors.
            </p>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-sm text-slate-700">
              <strong>Note on product verification:</strong> Confirm the Shariah supervisory board
              details and most recent compliance certificate on any product before investing.
              Different boards apply different methodologies and threshold levels. A product labelled
              &quot;Islamic&quot; or &quot;halal&quot; is not automatically certified to your preferred standard.
            </div>
          </section>

          {/* 4. Halal Superannuation */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-4">Halal superannuation</h2>
            <p className="text-slate-700 leading-relaxed mb-4">
              Two APRA-regulated superannuation funds offer Shariah-compliant investment options for
              Australian Muslim investors:
            </p>
            <div className="grid sm:grid-cols-2 gap-4 mb-5">
              <div className="border border-emerald-200 rounded-lg p-4 bg-emerald-50">
                <strong className="text-slate-900 block mb-2">Crescent Wealth Super</strong>
                <p className="text-slate-700 text-sm">
                  APRA-regulated, independently Shariah-supervised. Offers diversified growth,
                  balanced, and conservative options. A MySuper authorised product is available.
                  One of the few full-service halal super funds in Australia.
                </p>
              </div>
              <div className="border border-emerald-200 rounded-lg p-4 bg-emerald-50">
                <strong className="text-slate-900 block mb-2">Hejaz Super</strong>
                <p className="text-slate-700 text-sm">
                  APRA-regulated with a Shariah-compliant investment strategy. Equity holdings
                  screened to AAOIFI standards. Growing as a super alternative for Australian
                  Muslim employees looking to align retirement savings with their values.
                </p>
              </div>
            </div>
            <p className="text-slate-700 leading-relaxed mb-4">
              Before switching super funds, compare fees, historical investment performance, and
              default insurance options. The process for rolling over super is the same as switching
              to any super fund — complete a rollover request via your new fund or through the ATO
              &apos;s online services. Check whether your existing fund charges an exit fee and whether
              rolling over triggers any capital gains event within the fund.
            </p>
            <p className="text-xs text-slate-500 italic">
              Past performance is not a reliable indicator of future performance. Compare any super
              fund using a like-for-like investment option and fee basis. General information only
              — consider whether a halal super fund is appropriate for your circumstances before
              switching.
            </p>
          </section>

          {/* 5. Islamic Banking and Home Finance */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-4">Islamic banking and home finance in Australia</h2>
            <p className="text-slate-700 leading-relaxed mb-4">
              Australia has limited conventional Islamic banking infrastructure compared to Malaysia
              or the Gulf states, but halal home finance is available through two main providers.
              Both use asset-backed financing structures that avoid charging interest.
            </p>

            <h3 className="text-lg font-semibold mb-3 text-slate-800">Murabaha (cost-plus financing)</h3>
            <p className="text-slate-700 leading-relaxed mb-4">
              In a murabaha structure, the financier purchases the property on behalf of the buyer
              and then sells it to the buyer at a pre-agreed higher price, payable in instalments.
              The profit margin is agreed upfront rather than tied to an interest rate. MCCA uses a
              murabaha-based product for home purchases. The ATO accepts that the profit component
              of a Shariah-compliant home finance product qualifies for the same deductibility
              treatment as mortgage interest on an investment property — no tax penalty for choosing
              the halal structure.
            </p>

            <h3 className="text-lg font-semibold mb-3 text-slate-800">Ijarah (lease-to-own)</h3>
            <p className="text-slate-700 leading-relaxed mb-4">
              In an ijarah structure, the financier purchases the property and leases it to the
              buyer for an agreed period. Ownership transfers to the buyer at the end of the term
              (or progressively through a diminishing musharakah variant). Rental payments replace
              mortgage repayments. MCCA and Hejaz both offer ijarah-based products.
            </p>

            <p className="text-slate-700 leading-relaxed mb-4">
              Both structures are asset-backed — the financier holds title to the property during
              the financing period, which provides the security without a conventional mortgage.
              Rates are typically benchmarked against market rates to remain competitive, even though
              the legal structure avoids interest.
            </p>
            <p className="text-xs text-slate-500 italic">
              Consult your accountant and a licensed mortgage broker experienced with Islamic finance
              before committing to any home finance product. Tax treatment of specific products
              should be confirmed with your accountant.
            </p>
          </section>

          {/* 6. Purification Calculation */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-4">Purification: how to calculate and donate</h2>
            <p className="text-slate-700 leading-relaxed mb-4">
              Purification (<em>tazkiyah</em>) is the process of cleansing income received from a
              company that passes the Shariah screen overall but has a minor proportion of haram
              revenue. The calculation is straightforward:
            </p>

            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 mb-5">
              <p className="font-semibold text-slate-800 mb-2">Purification formula</p>
              <p className="text-slate-700 mb-3">
                Purification amount = Income received &times; Haram revenue percentage
              </p>
              <p className="text-sm text-slate-700 mb-1">
                <strong>Example:</strong> A company has 3% of its total revenue from incidental
                haram activities. You receive a $1,000 dividend from this company.
              </p>
              <p className="text-sm text-slate-700">
                Purification amount = $1,000 &times; 3% = <strong>$30 to donate to charity</strong>
              </p>
            </div>

            <p className="text-slate-700 leading-relaxed mb-4">
              Purification applies to income (dividends, distributions, interest if accidentally
              received). It does not apply to capital gains from selling the shares — the gain
              from price appreciation is generally considered permissible without purification,
              though some scholars disagree on edge cases.
            </p>
            <p className="text-slate-700 leading-relaxed mb-4">
              Keep a record of purification donations alongside your dividend statements. Many
              investors combine purification donations with their regular zakat calculation or
              donate to a registered Australian charity. The specific charity you donate to is
              your choice — it does not need to be an Islamic charity.
            </p>
            <p className="text-slate-700 leading-relaxed mb-4">
              Scholars differ on some details: the acceptable haram revenue threshold (some use 5%,
              others use 10%; stricter positions use lower thresholds), whether purification applies
              to unrealised gains, and how to treat complex corporate structures. A qualified Islamic
              finance scholar can provide a ruling tailored to your specific holdings.
            </p>
            <p className="text-xs text-slate-500 italic">
              Purification is a religious obligation under specific scholarly interpretations, not an
              Australian legal requirement. Consult a qualified Islamic finance scholar for rulings
              specific to your situation.
            </p>
          </section>

          {/* 7. Shariah Screening Tools */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-4">Shariah screening tools for Australian investors</h2>
            <p className="text-slate-700 leading-relaxed mb-4">
              Several apps and web platforms allow investors to check whether individual stocks pass
              Shariah screens. All of the main tools cover ASX-listed companies alongside global
              markets.
            </p>
            <ul className="space-y-4 mb-5">
              <li className="border border-slate-200 rounded-lg p-4">
                <strong className="text-slate-900 block mb-1">Islamicly</strong>
                <p className="text-slate-700 text-sm">
                  Mobile app with a large stock database. Provides a pass/fail/doubtful rating and
                  shows the underlying ratio data (debt ratio, interest income ratio, haram revenue
                  ratio). Paid subscription for full access. Covers ASX, NYSE, NASDAQ, and other
                  major exchanges.
                </p>
              </li>
              <li className="border border-slate-200 rounded-lg p-4">
                <strong className="text-slate-900 block mb-1">Zoya</strong>
                <p className="text-slate-700 text-sm">
                  Mobile app focused on US markets but with growing ASX coverage. Provides a
                  compliance score, the underlying screening ratios, and a purification calculator
                  linked to your portfolio. Free tier available with limited searches; paid
                  subscription for full features.
                </p>
              </li>
              <li className="border border-slate-200 rounded-lg p-4">
                <strong className="text-slate-900 block mb-1">Musaffa</strong>
                <p className="text-slate-700 text-sm">
                  Web-based platform covering global stocks. Shows pass/doubtful/fail status,
                  financial screening ratios, and an integrated halal portfolio tracker. Free and
                  paid tiers. Useful for investors who prefer a browser-based workflow.
                </p>
              </li>
            </ul>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-slate-700 mb-4">
              <strong>Limitations to be aware of:</strong> Screening tools rely on financial data
              from third-party providers and may have a lag of several weeks to months compared
              to the company&apos;s most recent filings. A company&apos;s ratios can change quarter to
              quarter — a stock that passed six months ago may fail today if its debt level has
              risen. Different tools may return different results for the same stock because they
              use different scholarly methodologies or data sources. Always cross-check with the
              company&apos;s actual annual report for critical investments.
            </div>
          </section>

          {/* 8. Tax Treatment */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-4">Australian tax treatment of halal investments</h2>
            <p className="text-slate-700 leading-relaxed mb-4">
              The Islamic finance structure of an investment does not change its Australian tax
              treatment. The ATO looks through the Shariah-compliant wrapper to the economic
              substance of the transaction.
            </p>
            <ul className="space-y-3 mb-5">
              <li className="text-slate-700">
                <strong>Capital gains:</strong> Gains from selling halal shares or fund units are
                treated as capital gains (CGT). The 50% CGT discount applies if you held the
                investment for more than 12 months. Cost base and proceeds are calculated in AUD.
              </li>
              <li className="text-slate-700">
                <strong>Dividends and distributions:</strong> Income from halal shares or fund
                distributions is assessable income. Franking credits on Australian-company dividends
                operate identically to conventional investments — if the company has paid Australian
                corporate tax, you receive the credit to offset your personal tax liability.
              </li>
              <li className="text-slate-700">
                <strong>Islamic home finance profit margin:</strong> The profit margin component of
                a murabaha or ijarah home finance product on an investment property is generally
                deductible in the same way mortgage interest would be, under ATO guidance on Shariah
                finance products. Get your accountant to confirm for your specific product.
              </li>
              <li className="text-slate-700">
                <strong>Sukuk:</strong> Income from sukuk is treated as investment income (similar
                to interest from bonds) for Australian tax purposes, even though it is structured as
                a profit-sharing payment. The ATO treats economic substance over form.
              </li>
              <li className="text-slate-700">
                <strong>Purification donations:</strong> Purification donations are generally not
                deductible as charitable donations under Australian tax law (they must go to a
                Deductible Gift Recipient to be deductible). However, donating to an Australian
                charity registered as a DGR achieves purification and provides a tax deduction.
              </li>
            </ul>
            <p className="text-xs text-slate-500 italic">
              Tax rules change. This is general information only. Confirm your specific
              situation with a registered tax agent or accountant.
            </p>
          </section>

          {/* 9. Performance Considerations */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-4">Performance and portfolio construction considerations</h2>
            <p className="text-slate-700 leading-relaxed mb-4">
              Applying Shariah screens to a portfolio creates meaningful sector tilts compared to
              a conventional index. Understanding these differences helps set realistic expectations.
            </p>
            <h3 className="text-lg font-semibold mb-3 text-slate-800">Sector exclusions and their effects</h3>
            <p className="text-slate-700 leading-relaxed mb-4">
              The most significant exclusion on the ASX is the financial sector. The four major
              banks (CBA, WBC, NAB, ANZ) together represent around 20&ndash;25% of the ASX 200 by
              market capitalisation. Excluding them significantly underweights Australian equities
              relative to a broad index. Similarly, conventional insurers are excluded.
              Some mining and energy companies that pass the sector screen may still fail the
              financial ratio tests if they carry high debt-to-market-cap ratios.
            </p>
            <p className="text-slate-700 leading-relaxed mb-4">
              The result is a portfolio concentrated in sectors like healthcare, technology,
              consumer discretionary, consumer staples, and resources companies that pass the screen.
              This concentration can produce better or worse returns than the broad market in any
              given year depending on sector rotation.
            </p>
            <h3 className="text-lg font-semibold mb-3 text-slate-800">Long-term performance</h3>
            <p className="text-slate-700 leading-relaxed mb-4">
              Research on global Shariah-compliant indices suggests that halal portfolios have
              historically performed comparably to conventional indices over long periods, partly
              because the bank exclusion is offset by lower leverage risk during financial crises.
              During the 2008 global financial crisis, for example, Islamic indices outperformed
              conventional indices significantly. In bull markets driven by financial stocks, the
              reverse can occur. Neither outcome is guaranteed.
            </p>
            <h3 className="text-lg font-semibold mb-3 text-slate-800">Challenges in Australia</h3>
            <ul className="space-y-2 text-slate-700 mb-4">
              <li><strong>Limited ASX-listed product range:</strong> No mainstream halal ETFs on the ASX forces investors toward international brokers or local managed funds.</li>
              <li><strong>Higher management costs:</strong> Specialised halal managed funds typically carry higher management expense ratios (MERs) than broad-market index ETFs due to smaller fund sizes and Shariah board costs. Compare total costs before investing.</li>
              <li><strong>Limited super choice:</strong> Only two APRA-regulated funds offer Shariah-compliant options. Conventional fund members switching to halal super may lose certain insurance benefits or performance history.</li>
              <li><strong>Data lag in screening tools:</strong> Financial ratio data in screening apps may not reflect the most recent financial results. Manual verification from annual reports is recommended for significant positions.</li>
              <li><strong>Growing market:</strong> The number of compliant options available to Australian investors has increased meaningfully over the past decade and continues to grow as the domestic Muslim community grows and demand increases.</li>
            </ul>
          </section>

          {/* 10. FAQ */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-6">Frequently asked questions</h2>
            <div className="space-y-3">
              {FAQS.map((faq) => (
                <details
                  key={faq.q}
                  className="border border-slate-200 rounded-lg group"
                >
                  <summary className="flex items-center justify-between px-5 py-4 cursor-pointer font-semibold text-slate-800 list-none select-none">
                    <span>{faq.q}</span>
                    <span className="ml-4 flex-shrink-0 text-slate-400 group-open:rotate-180 transition-transform text-lg">&#8964;</span>
                  </summary>
                  <div className="px-5 pb-5 text-slate-700 leading-relaxed text-sm border-t border-slate-100 pt-4">
                    {faq.a}
                  </div>
                </details>
              ))}
            </div>
          </section>

          {/* 11. Find an advisor CTA */}
          <section className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 mb-10">
            <h2 className="text-xl font-bold mb-3">Talk to a Shariah finance specialist</h2>
            <p className="text-slate-700 mb-4 text-sm leading-relaxed">
              For a personal portfolio review aligned to your understanding of Shariah compliance —
              including super-switching, Islamic home finance structuring, and tax-efficient halal
              investment vehicles — speak with a qualified Australian adviser specialising in Islamic
              finance.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/find-advisor"
                className="inline-block px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-lg text-sm"
              >
                Find an Islamic finance adviser
              </Link>
              <Link
                href="/best/share-trading"
                className="inline-block px-5 py-2.5 border border-emerald-700 text-emerald-700 hover:bg-emerald-100 font-semibold rounded-lg text-sm"
              >
                Compare brokers for halal investing
              </Link>
            </div>
          </section>

          {/* Cross-links */}
          <section className="mb-10">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">Related guides</h2>
            <div className="flex flex-wrap gap-3 text-sm">
              <Link href="/best/super" className="text-emerald-700 hover:text-emerald-900 underline underline-offset-2">
                Compare super funds
              </Link>
              <Link href="/global-investing" className="text-emerald-700 hover:text-emerald-900 underline underline-offset-2">
                Global investing from Australia
              </Link>
              <Link href="/foreign-investment/united-arab-emirates" className="text-emerald-700 hover:text-emerald-900 underline underline-offset-2">
                UAE investors in Australia
              </Link>
              <Link href="/foreign-investment/malaysia" className="text-emerald-700 hover:text-emerald-900 underline underline-offset-2">
                Malaysia investors in Australia
              </Link>
              <Link href="/smsf" className="text-emerald-700 hover:text-emerald-900 underline underline-offset-2">
                SMSF guide
              </Link>
            </div>
          </section>

          {/* Cross-link into the marketplace (Wave 6) */}
          <div className="mb-8">
            <InvestOpportunitiesCallout
              icon="trending-up"
              heading="Browse Shariah-aware investment opportunities"
              blurb="Explore managed funds and listed securities on the marketplace, then verify each provider's Shariah supervisory-board screening before investing. Filter for retail-accessible funds and income-light, asset-backed structures."
              href="/invest?kind=fund"
              ctaLabel="Browse funds & opportunities"
              secondary={{ label: "Compare halal-friendly platforms", href: "/compare" }}
            />
          </div>

          {/* General advice warning */}
          <div className="border border-amber-200 bg-amber-50 rounded-lg px-5 py-4 text-sm text-slate-700 mb-8">
            {GENERAL_ADVICE_WARNING}
          </div>

          {/* Compliance footer */}
          <footer className="text-xs text-slate-500 leading-relaxed border-t border-slate-200 pt-6">
            <p className="mb-2">
              Invest.com.au provides general information and comparison content only. We are not
              Islamic finance scholars and do not certify Shariah compliance — refer to each
              provider&apos;s Shariah supervisory board for compliance attestations. Different boards
              apply different screening thresholds; what is permissible under one scholarly ruling
              may not be under another.
            </p>
            <p>
              Consult a qualified Islamic finance scholar for religious rulings, and a licensed
              Australian financial adviser for investment decisions specific to your circumstances.
            </p>
          </footer>

        </div>
      </main>
    </>
  );
}
