import type { Metadata } from "next";
import Link from "next/link";
import { absoluteUrl, breadcrumbJsonLd, CURRENT_YEAR } from "@/lib/seo";
import { AFSL_STATUS_DISCLOSURE } from "@/lib/compliance";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `What do financial advisors charge? Fee transparency — Invest.com.au ${CURRENT_YEAR}`,
  description:
    "Breakdown of typical Australian financial advisor, mortgage broker, and accountant fees. Understand what you'll pay before you book.",
  alternates: { canonical: absoluteUrl("/pricing") },
  openGraph: {
    title: "Financial Advisor Fee Transparency",
    description:
      "Typical fee ranges for financial planners, mortgage brokers, accountants and more. No hidden costs.",
    url: absoluteUrl("/pricing"),
  },
};

const breadcrumb = breadcrumbJsonLd([
  { name: "Home", url: absoluteUrl("/") },
  { name: "Advisor fee transparency" },
]);

interface FeeRow {
  service: string;
  typical: string;
  notes: string;
}

const FEE_TABLES: {
  category: string;
  emoji: string;
  description: string;
  href: string;
  rows: FeeRow[];
}[] = [
  {
    category: "Financial Planners",
    emoji: "🧑‍💼",
    description:
      "Licensed under AFSL to provide personal financial advice. ASIC RG 175 requires a Statement of Advice (SoA) for personal advice.",
    href: "/find/financial-advisor",
    rows: [
      {
        service: "Initial consultation",
        typical: "Free – $500",
        notes: "Many offer a free 30-min discovery call before engagement.",
      },
      {
        service: "Statement of Advice (SoA)",
        typical: "$2,500 – $6,000",
        notes:
          "Comprehensive document required for personal advice. Complexity drives cost.",
      },
      {
        service: "Ongoing advice fee (annual)",
        typical: "$3,500 – $12,000",
        notes:
          "Flat fee model increasingly common; some charge 0.5–1% of assets under advice.",
      },
      {
        service: "SMSF advice",
        typical: "$5,000 – $15,000 pa",
        notes: "Includes trustee compliance, investment strategy, and annual audit facilitation.",
      },
    ],
  },
  {
    category: "Mortgage Brokers",
    emoji: "🏠",
    description:
      "Accredited under ASIC's credit licensing regime (ACL). Upfront commission paid by the lender — no out-of-pocket cost to you in most cases.",
    href: "/find/mortgage-broker",
    rows: [
      {
        service: "Standard home loan",
        typical: "Free to you",
        notes:
          "Broker receives ~0.65% upfront + ~0.15% trail commission from the lender. Disclosed in the Credit Guide.",
      },
      {
        service: "Commercial / complex loans",
        typical: "$0 – $3,000",
        notes: "Some brokers charge a fee for commercial or non-conforming transactions.",
      },
      {
        service: "Refinance",
        typical: "Free to you",
        notes: "Same commission model. Lender clawback applies if you exit < 12–24 months.",
      },
    ],
  },
  {
    category: "Tax Accountants",
    emoji: "🧾",
    description:
      "Registered Tax Agents (RTA) — authorised by the Tax Practitioners Board (TPB) to prepare and lodge returns.",
    href: "/find/tax-accountant",
    rows: [
      {
        service: "Simple individual return",
        typical: "$150 – $400",
        notes: "PAYG income, one investment property, ETF dividends.",
      },
      {
        service: "Complex individual return",
        typical: "$500 – $1,500",
        notes: "Crypto, multiple investment properties, shares with CGT, foreign income.",
      },
      {
        service: "Company / trust tax return",
        typical: "$1,500 – $5,000",
        notes: "Depends on entity complexity and number of transactions.",
      },
      {
        service: "SMSF audit + return",
        typical: "$2,000 – $4,500 pa",
        notes: "Mandatory annual audit + ATO return. Separate to any advice fees.",
      },
    ],
  },
  {
    category: "Buyer's Agents",
    emoji: "🔑",
    description:
      "Licensed real estate agents acting exclusively for the buyer. Fees are paid by the buyer, not the selling agent.",
    href: "/find/buyers-agent",
    rows: [
      {
        service: "Full search + acquisition",
        typical: "1.5% – 3% of purchase price",
        notes: "Includes shortlisting, due diligence, negotiation, and auction bidding.",
      },
      {
        service: "Negotiation only",
        typical: "$3,000 – $8,000 flat",
        notes: "You identify the property; they negotiate and bid at auction.",
      },
      {
        service: "Portfolio review",
        typical: "$500 – $2,000",
        notes: "Assessment of your current portfolio and acquisition strategy.",
      },
    ],
  },
  {
    category: "SMSF Specialists",
    emoji: "💼",
    description:
      "SMSF specialists combine advice, administration, and audit. Often bundled with ongoing advisory arrangements.",
    href: "/find/smsf-specialist",
    rows: [
      {
        service: "SMSF setup",
        typical: "$1,500 – $3,000",
        notes: "Trust deed, ATO registration, bank account setup, investment strategy.",
      },
      {
        service: "Annual administration",
        typical: "$2,500 – $5,000 pa",
        notes: "Accounting, member statements, tax return, audit co-ordination.",
      },
      {
        service: "LRBA setup (borrowing)",
        typical: "$3,000 – $8,000",
        notes: "Limited recourse borrowing arrangement for SMSF property purchase.",
      },
    ],
  },
];

export default function PricingPage() {
  return (
    <main className="bg-white min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />

      {/* Hero */}
      <section className="bg-gradient-to-r from-slate-700 to-slate-900 text-white py-12 md:py-16">
        <div className="container-custom">
          <nav aria-label="Breadcrumb" className="text-xs text-slate-400 mb-3">
            <Link href="/" className="hover:text-white">
              Home
            </Link>{" "}
            / Advisor fee transparency
          </nav>
          <h1 className="text-2xl md:text-3xl font-bold mb-3">
            What do Australian financial advisors charge?
          </h1>
          <p className="text-slate-300 max-w-2xl">
            Typical fee ranges for financial planners, mortgage brokers, accountants, buyer&rsquo;s agents
            and SMSF specialists — so you know what to expect before you book a consultation.
          </p>
        </div>
      </section>

      {/* Why we publish this */}
      <section className="bg-slate-50 border-b border-slate-200 py-6">
        <div className="container-custom">
          <div className="flex gap-3 items-start max-w-3xl">
            <span className="text-2xl">💡</span>
            <div>
              <h2 className="font-semibold text-slate-900 mb-1">Why we publish fee ranges</h2>
              <p className="text-sm text-slate-600">
                Fee transparency is rare in financial services. Hidden commissions and opaque pricing
                make it hard for consumers to compare value. We publish indicative ranges so you can
                have informed conversations with advisors — and recognise if a quote is out of line.
                <Link href="/how-we-earn" className="ml-1 text-blue-600 hover:underline">
                  How we earn money →
                </Link>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Fee tables */}
      <section className="container-custom py-10">
        <div className="space-y-10">
          {FEE_TABLES.map((table) => (
            <div key={table.category} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="flex items-start justify-between gap-4 p-5 border-b border-slate-100">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    {table.emoji} {table.category}
                  </h2>
                  <p className="text-sm text-slate-600 mt-0.5 max-w-lg">{table.description}</p>
                </div>
                <Link
                  href={table.href}
                  className="shrink-0 text-xs font-medium text-blue-600 hover:underline whitespace-nowrap"
                >
                  Find one →
                </Link>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm" aria-label={`${table.category} pricing`}>
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th scope="col" className="text-left py-2 px-5 font-medium text-slate-600 w-48">Service</th>
                      <th scope="col" className="text-left py-2 px-3 font-medium text-slate-600 w-36">Typical cost</th>
                      <th scope="col" className="text-left py-2 px-3 font-medium text-slate-600">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {table.rows.map((row) => (
                      <tr key={row.service} className="border-b border-slate-100 last:border-0">
                        <td className="py-3 px-5 font-medium text-slate-800">{row.service}</td>
                        <td className="py-3 px-3 text-emerald-700 font-semibold whitespace-nowrap">
                          {row.typical}
                        </td>
                        <td className="py-3 px-3 text-slate-600">{row.notes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* How to negotiate */}
      <section className="bg-slate-50 border-y border-slate-200 py-10">
        <div className="container-custom max-w-3xl">
          <h2 className="text-xl font-semibold text-slate-900 mb-6">
            Tips for negotiating fees
          </h2>
          <div className="space-y-4">
            {[
              {
                title: "Ask for a fixed fee upfront",
                body: "Percentage-of-assets fees compound over time. For larger portfolios, a flat annual fee is almost always cheaper. Ask specifically: 'Do you offer a fixed fee alternative?'",
              },
              {
                title: "Clarify what the SoA fee includes",
                body: "Some advisors quote SoA fees as a one-time cost; others roll it into the first year of ongoing fees. Get both the SoA cost and the annual ongoing fee in writing before signing.",
              },
              {
                title: "Compare at least 2–3 quotes",
                body: "Fees vary widely even within the same service type. Use our advisor directory to shortlist and request quotes from multiple providers before committing.",
              },
              {
                title: "Check for trail commissions",
                body: "Mortgage brokers and some insurance advisors earn trailing commissions. These are disclosed in the Credit Guide or Financial Services Guide (FSG) — ask for it before the first meeting.",
              },
              {
                title: "Ask about grandfathered commissions",
                body: "Post-Royal Commission reforms banned new grandfathered commissions, but some older investment structures still carry them. Ask your advisor whether any product recommendations are commission-bearing.",
              },
            ].map(({ title, body }) => (
              <div key={title} className="bg-white rounded-lg border border-slate-200 p-4">
                <h3 className="font-semibold text-slate-900 text-sm mb-1">{title}</h3>
                <p className="text-sm text-slate-700">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container-custom py-10 text-center">
        <h2 className="text-xl font-semibold text-slate-900 mb-3">Ready to find an advisor?</h2>
        <p className="text-slate-600 mb-6 max-w-md mx-auto">
          Browse verified advisors by service type, speciality, and location. Free to search — no
          referral fee, no obligation.
        </p>
        <Link
          href="/find-advisor"
          className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-xl"
        >
          Find an advisor
        </Link>
      </section>

      <div className="container-custom pb-8">
        <p className="text-xs text-slate-500 border-t border-slate-200 pt-4">
          Fee ranges are indicative only based on industry surveys and publicly disclosed fee
          schedules. Actual fees depend on the complexity of your situation and the individual
          advisor&rsquo;s pricing model. Always obtain and compare Statements of Advice and Financial
          Services Guides before engaging. {AFSL_STATUS_DISCLOSURE}
        </p>
      </div>
    </main>
  );
}
