import type { Metadata } from "next";
import Link from "next/link";
import { SITE_URL, CURRENT_YEAR, UPDATED_LABEL, breadcrumbJsonLd } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `Self-Managed Super Funds (SMSF) Guide (${CURRENT_YEAR}) — Costs, Rules & Setup`,
  description:
    "Comprehensive guide to SMSFs in Australia. Learn about setup costs, trustee obligations, what you can invest in, LRBA borrowing, and whether an SMSF suits your situation.",
  alternates: { canonical: `${SITE_URL}/smsf` },
  openGraph: {
    title: `Self-Managed Super Funds (SMSF) Guide (${CURRENT_YEAR})`,
    description:
      "Trustee-controlled super: costs, rules, investment options, and how to set up an SMSF in Australia.",
    url: `${SITE_URL}/smsf`,
  },
};

const FAQ_ITEMS = [
  {
    q: "How much super do I need to set up an SMSF?",
    a: "The ATO does not set a minimum balance, but the ATO's own Trustee Declaration notes that costs can make SMSFs uneconomical at lower balances. Most SMSF professionals cite $200,000–$250,000 as the threshold where annual costs (typically $3,000–$8,000/year all-in) become proportionally reasonable compared to industry or retail super. Below $200K, the fixed cost drag on net returns is significant.",
  },
  {
    q: "Can I manage my own SMSF without an accountant?",
    a: "You can act as your own administrator for day-to-day record-keeping, but an SMSF must be audited annually by an independent, ASIC-registered auditor (holding a valid SMSF Auditor Number). You must also lodge an SMSF Annual Return with the ATO each year. Many trustees use a specialist SMSF accountant or administrator to handle the annual return, financial statements, and audit coordination — mistakes can attract ATO penalties.",
  },
  {
    q: "Can an SMSF buy residential property?",
    a: "Yes, an SMSF can purchase residential property, but strict rules apply. The property must satisfy the sole purpose test (held for retirement benefit only), must be purchased at market value, cannot be acquired from a related party, and cannot be resided in or rented to members or relatives of members. Commercial property has different — and in some respects more flexible — rules. Borrowing to buy property inside an SMSF (LRBA) adds another layer of complexity and regulation.",
  },
  {
    q: "What are the annual costs of running an SMSF?",
    a: "Typical all-in annual costs range from $3,000 to $8,000+. This includes: accounting and tax return preparation ($1,500–$3,500), independent audit ($300–$800 for straightforward funds, more for complex), ASIC supervisory levy (~$518/year as of 2025), and software if you use a platform like Class or BGL ($500–$2,000/year). Property SMSFs and those with borrowing structures will sit at the higher end.",
  },
  {
    q: "What happens to my SMSF when I retire?",
    a: "When a member meets a condition of release (e.g., reaching preservation age and retiring, or turning 65), they can begin drawing a pension from the fund. The fund can move to pension phase for that member — assets backing the pension become tax-exempt for earnings. The SMSF can continue to operate and other members can still be in accumulation phase. On a member's death, assets are distributed per their binding death benefit nomination (BDBN) or, if none exists, at trustee discretion, which is why keeping BDBNs current is critical.",
  },
];

const faqLd = faqJsonLd(FAQ_ITEMS);

const breadcrumbLd = breadcrumbJsonLd([
  { name: "Home", url: SITE_URL },
  { name: "SMSF", url: `${SITE_URL}/smsf` },
]);

const TOPIC_CARDS = [
  {
    title: "SMSF Setup",
    description: "Trust deed, ATO registration, TFN/ABN, and rollover. What the process looks like step by step.",
    href: "/smsf/setup",
  },
  {
    title: "SMSF Property",
    description: "Commercial and residential property inside super — rules, arm's-length requirements, and pitfalls.",
    href: "/smsf/property",
  },
  {
    title: "SMSF Borrowing (LRBA)",
    description: "How limited recourse borrowing works, bare trust structures, and lender requirements.",
    href: "/smsf/borrowing",
  },
  {
    title: "SMSF Crypto",
    description: "Investing in cryptocurrency via an SMSF: sole purpose test, valuation, and record-keeping.",
    href: "/smsf/crypto",
  },
  {
    title: "SMSF Wind-Up",
    description: "When and how to close an SMSF, tax implications, and rolling proceeds into another fund.",
    href: "/smsf/wind-up",
  },
  {
    title: "Investment Strategy",
    description: "What a compliant written investment strategy must cover and how to review it annually.",
    href: "/smsf/investment-strategy",
  },
  {
    title: "SMSF Insurance",
    description: "Trustee obligations to consider life, TPD and income protection inside the fund.",
    href: "/smsf/insurance",
  },
  {
    title: "SMSF Audits",
    description: "Annual audit requirements, what auditors check, and how to find a registered SMSF auditor.",
    href: "/smsf/auditors",
  },
];

export default function SmsfPage() {
  return (
    <>
      {/* Structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      {faqLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
        />
      )}

      {/* Breadcrumb */}
      <nav
        aria-label="Breadcrumb"
        className="border-b border-slate-200 bg-white"
      >
        <div className="container-custom max-w-6xl py-3">
          <ol className="flex items-center gap-1.5 text-xs text-slate-500">
            <li>
              <Link href="/" className="hover:text-slate-800 transition-colors">
                Home
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li className="font-semibold text-slate-800">SMSF</li>
          </ol>
        </div>
      </nav>

      {/* Hero */}
      <header className="bg-white border-b border-slate-200 py-12 md:py-16">
        <div className="container-custom max-w-4xl">
          <p className="text-xs font-semibold text-amber-600 uppercase tracking-widest mb-3">
            {UPDATED_LABEL}
          </p>
          <h1 className="text-3xl md:text-5xl font-extrabold text-slate-900 leading-tight mb-5">
            Self-Managed Super Funds (SMSF)
          </h1>
          <p className="text-lg md:text-xl text-slate-600 leading-relaxed mb-6 max-w-3xl">
            An SMSF is a private superannuation trust that you control as trustee. You choose the investments, manage compliance, and take direct responsibility for the fund — in exchange for greater flexibility over what you hold and how the fund is structured.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/smsf/setup"
              className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold text-sm px-5 py-2.5 rounded-lg transition-colors"
            >
              How to set up an SMSF
            </Link>
            <Link
              href="/smsf/auditors"
              className="inline-flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-900 font-bold text-sm px-5 py-2.5 rounded-lg border border-slate-300 transition-colors"
            >
              Find an SMSF auditor
            </Link>
          </div>
        </div>
      </header>

      {/* What is an SMSF */}
      <section className="py-12 bg-slate-50">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-5">
            What is an SMSF?
          </h2>
          <div className="prose prose-slate max-w-none text-slate-700 space-y-4">
            <p>
              A self-managed super fund is a superannuation fund with up to six members where all members are also trustees (or directors of a corporate trustee). Unlike industry or retail funds where an external trustee manages pooled assets, SMSF trustees bear full legal responsibility for compliance with the <em>Superannuation Industry (Supervision) Act 1993</em> (SIS Act) and ATO regulations.
            </p>
            <p>
              The ATO is the regulator for SMSFs — distinct from APRA, which supervises industry and retail super funds. Every year the fund must lodge an SMSF Annual Return, be independently audited, and pay the supervisory levy.
            </p>
            <p>
              The appeal of an SMSF is control: you can invest directly in listed shares, ETFs, commercial property (including your own business premises), physical gold, term deposits, and more — assets that most retail super menus do not offer. The trade-off is time, cost, and personal liability for compliance failures.
            </p>
          </div>

          <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <p className="text-2xl font-extrabold text-amber-600 mb-1">Up to 6</p>
              <p className="text-sm text-slate-600">members per SMSF (increased from 4 in 2021)</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <p className="text-2xl font-extrabold text-amber-600 mb-1">~620,000</p>
              <p className="text-sm text-slate-600">SMSFs registered in Australia (ATO 2024 data)</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <p className="text-2xl font-extrabold text-amber-600 mb-1">$200K+</p>
              <p className="text-sm text-slate-600">commonly cited minimum for cost-effectiveness</p>
            </div>
          </div>
        </div>
      </section>

      {/* Costs table */}
      <section className="py-12 bg-white border-t border-slate-200">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-3">
            SMSF costs
          </h2>
          <p className="text-slate-600 mb-6">
            The ATO does not mandate a minimum balance, but fixed costs make SMSFs less competitive below roughly $200,000. Here are the typical cost categories:
          </p>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left font-bold text-slate-800 px-4 py-3">Cost item</th>
                  <th className="text-left font-bold text-slate-800 px-4 py-3">Typical range</th>
                  <th className="text-left font-bold text-slate-800 px-4 py-3 hidden sm:table-cell">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="px-4 py-3 font-medium text-slate-800">Setup (one-off)</td>
                  <td className="px-4 py-3 text-slate-700">$2,000 – $5,000</td>
                  <td className="px-4 py-3 text-slate-600 hidden sm:table-cell">Trust deed, ATO registration, corporate trustee (if used), advice</td>
                </tr>
                <tr className="bg-slate-50/50">
                  <td className="px-4 py-3 font-medium text-slate-800">Accounting & tax return</td>
                  <td className="px-4 py-3 text-slate-700">$1,500 – $3,500/yr</td>
                  <td className="px-4 py-3 text-slate-600 hidden sm:table-cell">Annual financial statements, tax return, BAS if applicable</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium text-slate-800">Annual audit</td>
                  <td className="px-4 py-3 text-slate-700">$300 – $1,500/yr</td>
                  <td className="px-4 py-3 text-slate-600 hidden sm:table-cell">Mandatory ASIC-registered auditor; more for complex/property funds</td>
                </tr>
                <tr className="bg-slate-50/50">
                  <td className="px-4 py-3 font-medium text-slate-800">ATO supervisory levy</td>
                  <td className="px-4 py-3 text-slate-700">~$518/yr</td>
                  <td className="px-4 py-3 text-slate-600 hidden sm:table-cell">Set by ATO; paid via the annual return lodgement</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium text-slate-800">Administration software</td>
                  <td className="px-4 py-3 text-slate-700">$500 – $2,000/yr</td>
                  <td className="px-4 py-3 text-slate-600 hidden sm:table-cell">Class Super, BGL Simple Fund 360, or similar platforms</td>
                </tr>
                <tr className="bg-slate-50/50">
                  <td className="px-4 py-3 font-medium text-slate-800 border-t border-slate-200">Total (ongoing, approximate)</td>
                  <td className="px-4 py-3 font-bold text-slate-900 border-t border-slate-200">$3,000 – $8,000/yr</td>
                  <td className="px-4 py-3 text-slate-600 hidden sm:table-cell border-t border-slate-200">Higher for property, borrowing, or pension-phase funds</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-xs text-slate-500">
            Costs vary significantly by provider, fund complexity, and whether you use a financial adviser. These are indicative ranges only.
          </p>
        </div>
      </section>

      {/* SMSF vs industry fund table */}
      <section className="py-12 bg-slate-50 border-t border-slate-200">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-3">
            SMSF vs industry / retail fund
          </h2>
          <p className="text-slate-600 mb-6">
            There is no universal winner — the right answer depends entirely on your balance, investment goals, and willingness to take on trustee responsibilities.
          </p>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left font-bold text-slate-800 px-4 py-3 w-1/3">Factor</th>
                  <th className="text-left font-bold text-amber-700 px-4 py-3">SMSF</th>
                  <th className="text-left font-bold text-slate-600 px-4 py-3">Industry / retail fund</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="px-4 py-3 font-medium text-slate-700">Investment control</td>
                  <td className="px-4 py-3 text-slate-700">Full — you choose every asset</td>
                  <td className="px-4 py-3 text-slate-600">Pre-set menus; some offer direct shares</td>
                </tr>
                <tr className="bg-white">
                  <td className="px-4 py-3 font-medium text-slate-700">Cost at $500K</td>
                  <td className="px-4 py-3 text-slate-700">~0.6–1.5% p.a. (fixed-cost advantage)</td>
                  <td className="px-4 py-3 text-slate-600">~0.3–0.9% p.a. (no fixed floor)</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium text-slate-700">Cost at $100K</td>
                  <td className="px-4 py-3 text-slate-700">~3–8% p.a. (cost drag is high)</td>
                  <td className="px-4 py-3 text-slate-600">~0.3–0.9% p.a.</td>
                </tr>
                <tr className="bg-white">
                  <td className="px-4 py-3 font-medium text-slate-700">Investment options</td>
                  <td className="px-4 py-3 text-slate-700">Shares, ETFs, property, gold, crypto, LRBAs</td>
                  <td className="px-4 py-3 text-slate-600">Diversified options; limited direct assets</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium text-slate-700">Insurance</td>
                  <td className="px-4 py-3 text-slate-700">Must source separately; can be more expensive</td>
                  <td className="px-4 py-3 text-slate-600">Group cover often cheap and auto-provided</td>
                </tr>
                <tr className="bg-white">
                  <td className="px-4 py-3 font-medium text-slate-700">Time commitment</td>
                  <td className="px-4 py-3 text-slate-700">Significant — trustee meetings, records, strategy</td>
                  <td className="px-4 py-3 text-slate-600">Minimal — set and forget</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium text-slate-700">Compliance burden</td>
                  <td className="px-4 py-3 text-slate-700">Heavy — you are personally liable for breaches</td>
                  <td className="px-4 py-3 text-slate-600">Handled by professional trustee</td>
                </tr>
                <tr className="bg-white">
                  <td className="px-4 py-3 font-medium text-slate-700">Performance (median)</td>
                  <td className="px-4 py-3 text-slate-700">Varies widely by trustee skill and strategy</td>
                  <td className="px-4 py-3 text-slate-600">Varies; top industry funds historically competitive</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Who SMSFs suit */}
      <section className="py-12 bg-white border-t border-slate-200">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-5">
            Who SMSFs typically suit
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              {
                heading: "Business owners",
                body: "You can purchase your business premises (commercial property) inside the SMSF and lease it back to your business at market rent — a legitimate and tax-effective strategy unavailable through retail super.",
              },
              {
                heading: "Higher balance investors",
                body: "With $300,000+ in super, the fixed cost of running an SMSF becomes proportionally smaller, and the performance advantage of lower fees and direct control can compound meaningfully over time.",
              },
              {
                heading: "Direct investment strategy",
                body: "Investors who want to hold individual ASX shares, physical gold, specific ETFs, or alternative assets that standard super menus don't offer often find an SMSF the only workable structure.",
              },
              {
                heading: "Estate planning and family funds",
                body: "SMSFs allow tailored binding death benefit nominations, blended-family arrangements, and control over how benefits flow on death — important for those with complex estate planning needs.",
              },
            ].map(({ heading, body }) => (
              <div
                key={heading}
                className="flex gap-4 p-5 bg-amber-50 border border-amber-100 rounded-xl"
              >
                <div className="w-2 rounded-full bg-amber-400 shrink-0 mt-1 self-stretch" />
                <div>
                  <h3 className="font-bold text-slate-900 mb-1">{heading}</h3>
                  <p className="text-sm text-slate-700 leading-relaxed">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What an SMSF can invest in */}
      <section className="py-12 bg-slate-50 border-t border-slate-200">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-5">
            What an SMSF can invest in
          </h2>
          <p className="text-slate-600 mb-6">
            All investments must satisfy the <strong>sole purpose test</strong> — the fund must be maintained for the sole purpose of providing retirement benefits. The investment strategy must also document how each asset class fits the fund&apos;s risk profile and member circumstances.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { asset: "ASX-listed shares", note: "Direct ownership; no wash-sale restrictions unique to SMSF" },
              { asset: "ETFs and LICs", note: "Broad market, sector, or thematic exposure on ASX" },
              { asset: "Managed funds", note: "Wholesale access sometimes available at larger balances" },
              { asset: "Term deposits", note: "Straightforward; bank deposits held in fund's name" },
              { asset: "Commercial property", note: "Can include your own business premises (arm's-length lease)" },
              { asset: "Residential property", note: "Allowed, but cannot be leased to members or relatives" },
              { asset: "Physical gold & precious metals", note: "Must be stored with approved custodian; not at home" },
              { asset: "Cryptocurrency", note: "Allowed; must meet sole purpose test and valuation rules" },
              { asset: "International shares", note: "Direct or via CHESS-sponsored foreign securities" },
              { asset: "Unlisted investments", note: "Unlisted trusts, private company shares (with limits)" },
            ].map(({ asset, note }) => (
              <div
                key={asset}
                className="flex items-start gap-3 p-4 bg-white border border-slate-200 rounded-lg"
              >
                <span className="mt-0.5 w-4 h-4 rounded-full bg-green-100 border border-green-300 flex items-center justify-center shrink-0 text-green-700 text-xs font-bold">
                  ✓
                </span>
                <div>
                  <p className="font-semibold text-slate-800 text-sm">{asset}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{note}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What an SMSF CANNOT do */}
      <section className="py-12 bg-white border-t border-slate-200">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-3">
            What an SMSF cannot do
          </h2>
          <p className="text-slate-600 mb-6">
            These are hard prohibitions under the SIS Act. Breaches can result in the fund being made non-complying (taxed at 45%), civil penalties, or criminal charges for trustees.
          </p>
          <div className="space-y-3">
            {[
              {
                rule: "In-house asset limit",
                detail: "No more than 5% of the fund's total assets can be in-house assets (loans to, or investments in, related parties). Exceeding this triggers mandatory rectification.",
              },
              {
                rule: "Lending to members",
                detail: "An SMSF cannot lend money or provide financial accommodation to a member or any relative of a member — ever. This includes direct loans, credit facilities, or guarantees.",
              },
              {
                rule: "Acquiring assets from members",
                detail: "The fund cannot purchase assets from members or associates, with limited exceptions: listed securities bought at market price, and business real property acquired at market value.",
              },
              {
                rule: "Using assets for personal benefit",
                detail: "Fund assets (art, collectibles, vehicles, holiday homes) cannot be used by members or relatives while they are in the fund. Storage and insurance rules for collectibles are strict.",
              },
              {
                rule: "Early release of benefits",
                detail: "Benefits can only be paid when a condition of release is met. Releasing benefits early (e.g., to pay personal debts) is a serious offence with significant penalties.",
              },
            ].map(({ rule, detail }) => (
              <div
                key={rule}
                className="flex items-start gap-3 p-4 bg-red-50 border border-red-100 rounded-lg"
              >
                <span className="mt-0.5 w-4 h-4 rounded-full bg-red-100 border border-red-300 flex items-center justify-center shrink-0 text-red-700 text-xs font-bold">
                  ✗
                </span>
                <div>
                  <p className="font-semibold text-slate-800 text-sm">{rule}</p>
                  <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trustee responsibilities */}
      <section className="py-12 bg-slate-50 border-t border-slate-200">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-5">
            Trustee responsibilities
          </h2>
          <p className="text-slate-600 mb-6">
            Every SMSF member is also a trustee and bears personal legal liability. The key obligations:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              {
                heading: "Sole purpose test",
                body: "Every decision — investments, expenses, insurance — must be made solely to provide retirement benefits to members. Personal or commercial benefit to trustees is prohibited.",
              },
              {
                heading: "Written investment strategy",
                body: "The fund must have a documented investment strategy reviewed regularly. It must consider risk, return, liquidity, diversification, and the insurance needs of members.",
              },
              {
                heading: "Annual audit",
                body: "An independent ASIC-registered auditor must audit the fund's financials and compliance annually before the SMSF Annual Return is lodged with the ATO.",
              },
              {
                heading: "SMSF Annual Return",
                body: "The ARA is due 31 October each year (or later if lodged via a tax agent). It covers income tax, regulatory obligations, member contributions, and the supervisory levy.",
              },
              {
                heading: "Contribution rules",
                body: "Trustees must ensure contributions do not exceed caps — concessional ($30K in 2025–26) and non-concessional ($120K). Excess contributions attract penalty tax.",
              },
              {
                heading: "Separation of assets",
                body: "Fund assets must be kept strictly separate from the personal assets of members and trustees. Commingling assets is one of the most common compliance breaches.",
              },
              {
                heading: "Benefit payment rules",
                body: "Benefits may only be paid when a condition of release is met. For pension-phase members, minimum drawdown requirements apply each year.",
              },
              {
                heading: "Death benefit nominations",
                body: "Trustees should maintain current binding death benefit nominations (BDBNs) to ensure proceeds flow to intended beneficiaries. Non-binding nominations give trustees discretion.",
              },
            ].map(({ heading, body }) => (
              <div
                key={heading}
                className="bg-white border border-slate-200 rounded-xl p-5"
              >
                <h3 className="font-bold text-slate-900 text-sm mb-1.5">{heading}</h3>
                <p className="text-xs text-slate-600 leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Setting up an SMSF */}
      <section className="py-12 bg-white border-t border-slate-200">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-3">
            Setting up an SMSF
          </h2>
          <p className="text-slate-600 mb-8">
            Typical timeline: <strong>4–8 weeks</strong> from engagement to first investment. Most people use a licensed SMSF administrator or accountant to manage the process.
          </p>
          <ol className="space-y-4">
            {[
              {
                step: "1",
                heading: "Establish a trust deed",
                body: "The trust deed is the governing document. It must be prepared by a legal practitioner and comply with SIS Act requirements. A corporate trustee (Pty Ltd company) is generally preferable to individual trustees for continuity and liability reasons.",
              },
              {
                step: "2",
                heading: "Register with the ATO",
                body: "Apply for an ABN and TFN for the fund via the Australian Business Register. The ATO will then register the SMSF and issue a unique SMSF identifier.",
              },
              {
                step: "3",
                heading: "Open a bank account",
                body: "Open a dedicated bank account in the fund's name. All contributions, income, and expenses must flow through this account — never your personal account.",
              },
              {
                step: "4",
                heading: "Roll over existing super",
                body: "Request a rollover from your existing super fund(s) to the SMSF. Most funds now process rollovers via the ATO's SuperStream system within a few business days.",
              },
              {
                step: "5",
                heading: "Document an investment strategy",
                body: "Before investing, the trustees must document a written investment strategy that considers risk, return, liquidity, diversification, and member insurance needs.",
              },
              {
                step: "6",
                heading: "Begin investing",
                body: "Open a brokerage account, property purchase, or other investment account in the fund's name and begin executing the investment strategy.",
              },
            ].map(({ step, heading, body }) => (
              <li
                key={step}
                className="flex gap-4 p-5 border border-slate-200 rounded-xl"
              >
                <span className="w-8 h-8 rounded-full bg-amber-500 text-slate-900 font-extrabold text-sm flex items-center justify-center shrink-0 mt-0.5">
                  {step}
                </span>
                <div>
                  <h3 className="font-bold text-slate-900 mb-1">{heading}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{body}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="mt-6 flex">
            <Link
              href="/smsf/setup"
              className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm px-5 py-2.5 rounded-lg transition-colors"
            >
              Full SMSF setup guide
            </Link>
          </div>
        </div>
      </section>

      {/* LRBA */}
      <section className="py-12 bg-slate-50 border-t border-slate-200">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-3">
            Borrowing inside an SMSF (LRBA)
          </h2>
          <div className="prose prose-slate max-w-none text-slate-700 space-y-4">
            <p>
              A <strong>Limited Recourse Borrowing Arrangement (LRBA)</strong> allows an SMSF to borrow money to purchase a single acquirable asset (most commonly real property or listed securities). The borrowing is &quot;limited recourse&quot; because the lender&apos;s claim in the event of default is limited to the asset held in the bare trust — other fund assets are protected.
            </p>
            <p>
              The structure requires a <strong>bare trust</strong> (holding trust) to be established as the legal owner of the asset during the loan term. The SMSF is the beneficial owner and makes the loan repayments. Once the loan is repaid, the asset is transferred to the fund.
            </p>
            <p>
              Key rules: the asset must be a single asset (or identical collection of assets), it cannot be improved using borrowed money beyond &quot;repairs and maintenance,&quot; and the loan must meet safe-harbour conditions (interest rates, LVR limits, and loan terms set by the ATO) to avoid being treated as a related-party non-arm&apos;s-length income (NALI) event.
            </p>
          </div>
          <div className="mt-6 flex">
            <Link
              href="/smsf/borrowing"
              className="inline-flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-900 font-bold text-sm px-5 py-2.5 rounded-lg border border-slate-300 transition-colors"
            >
              Full LRBA guide
            </Link>
          </div>
        </div>
      </section>

      {/* Winding up */}
      <section className="py-12 bg-white border-t border-slate-200">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-3">
            Winding up and succession
          </h2>
          <div className="prose prose-slate max-w-none text-slate-700 space-y-4 mb-6">
            <p>
              An SMSF does not have to be wound up when members retire. Many funds transition to <strong>pension phase</strong> — where assets backing account-based pensions are exempt from earnings tax — and continue operating indefinitely.
            </p>
            <p>
              Winding up is appropriate when: the fund drops below the cost-effective balance threshold, all members wish to consolidate into a public-offer fund, or trustees no longer wish to manage the compliance obligations. The wind-up process involves selling all assets (or transferring them in-specie if permitted), paying any tax owing, and rolling proceeds into another complying super fund or paying lump-sum benefits if conditions of release are met.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl">
              <h3 className="font-bold text-slate-900 mb-2 text-sm">Binding Death Benefit Nominations (BDBN)</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                A BDBN directs the trustee to pay death benefits to specified dependants or legal personal representative. Without a valid BDBN, trustees exercise discretion — which can cause disputes in blended families. Many SMSF trust deeds require BDBNs to be renewed every three years; check yours.
              </p>
            </div>
            <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl">
              <h3 className="font-bold text-slate-900 mb-2 text-sm">Pension phase transition</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Members who meet a condition of release can draw an account-based pension from the fund. Assets backing the pension are fully earnings-tax exempt (up to the Transfer Balance Cap, currently $1.9M). The fund can simultaneously have members in both accumulation and pension phase.
              </p>
            </div>
          </div>
          <div className="mt-6 flex">
            <Link
              href="/smsf/wind-up"
              className="inline-flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-900 font-bold text-sm px-5 py-2.5 rounded-lg border border-slate-300 transition-colors"
            >
              SMSF wind-up guide
            </Link>
          </div>
        </div>
      </section>

      {/* Topic card grid */}
      <section className="py-12 bg-slate-50 border-t border-slate-200">
        <div className="container-custom max-w-6xl">
          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-2">
            Explore SMSF topics
          </h2>
          <p className="text-slate-600 mb-7">
            Deep-dives into the decisions and rules that matter most to SMSF trustees.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {TOPIC_CARDS.map((card) => (
              <Link
                key={card.href}
                href={card.href}
                className="group flex flex-col gap-2 p-5 bg-white border border-slate-200 rounded-xl hover:border-amber-300 hover:shadow-sm transition-all"
              >
                <h3 className="font-bold text-slate-900 text-sm group-hover:text-amber-700 transition-colors">
                  {card.title}
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed flex-1">{card.description}</p>
                <span className="text-xs font-bold text-amber-600 group-hover:underline">
                  Read guide &rarr;
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-12 bg-white border-t border-slate-200">
        <div className="container-custom max-w-3xl">
          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-7">
            Frequently asked questions
          </h2>
          <div className="space-y-3">
            {FAQ_ITEMS.map((item) => (
              <details
                key={item.q}
                className="group border border-slate-200 rounded-xl overflow-hidden"
              >
                <summary className="flex items-center justify-between gap-4 px-5 py-4 cursor-pointer select-none bg-white hover:bg-slate-50 transition-colors list-none">
                  <span className="font-semibold text-slate-800 text-sm leading-snug">
                    {item.q}
                  </span>
                  <span className="shrink-0 w-5 h-5 rounded-full border border-slate-300 flex items-center justify-center text-slate-500 text-xs font-bold group-open:rotate-45 transition-transform">
                    +
                  </span>
                </summary>
                <div className="px-5 pb-5 pt-3 bg-slate-50 text-sm text-slate-600 leading-relaxed border-t border-slate-100">
                  {item.a}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* General advice warning */}
      <section className="py-8 bg-slate-50 border-t border-slate-200">
        <div className="container-custom max-w-4xl">
          <p className="text-xs text-slate-500 leading-relaxed">{GENERAL_ADVICE_WARNING}</p>
        </div>
      </section>
    </>
  );
}
