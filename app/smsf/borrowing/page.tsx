import Link from "next/link";
import type { Metadata } from "next";
import {
  SITE_URL,
  CURRENT_YEAR,
  UPDATED_LABEL,
  breadcrumbJsonLd,
  absoluteUrl,
} from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";
import HubAdvisorCTA from "@/components/HubAdvisorCTA";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `SMSF Borrowing (LRBA) ${CURRENT_YEAR}: How Limited Recourse Borrowing Arrangements Work | Invest.com.au`,
  description:
    "Limited Recourse Borrowing Arrangements explained: bare trust structure, ATO safe-harbour conditions, eligible assets, active lenders, costs, and key risks for SMSF trustees.",
  alternates: { canonical: `${SITE_URL}/smsf/borrowing` },
  openGraph: {
    title: `SMSF Borrowing (LRBA) ${CURRENT_YEAR}`,
    description:
      "Bare trust structure, ATO safe-harbour rates, eligible assets, lender comparison, and the tax treatment of LRBA income inside super.",
    url: `${SITE_URL}/smsf/borrowing`,
    type: "website",
    images: [{ url: `/api/og?title=${encodeURIComponent("SMSF Borrowing (LRBA)")}&sub=${encodeURIComponent("Limited Recourse · Property · Rules · " + CURRENT_YEAR)}`, width: 1200, height: 630 }],
  },
};

const FAQS = [
  {
    q: "Can my SMSF borrow to buy a house?",
    a: "Yes, an SMSF can borrow to purchase a residential investment property using an LRBA, provided the property is an arm's-length investment. The property cannot be acquired from a related party, and no related party (including trustees and their relatives) may occupy or use the property at any time. A specialist SMSF lawyer must establish a bare trust to hold legal title during the loan term. You should seek advice from a licensed SMSF specialist adviser before proceeding.",
  },
  {
    q: "What is a bare trust in an SMSF LRBA?",
    a: "A bare trust (also called a holding trust) is a separate legal structure required for every LRBA. The bare trustee holds legal title to the asset on behalf of the SMSF, which retains the beneficial interest. The bare trust is necessary because superannuation law prohibits an SMSF from directly mortgaging its assets. Once the loan is fully repaid, the bare trustee transfers legal title to the SMSF trustee. The bare trust deed must be properly drafted and stamped — this is specialist legal work.",
  },
  {
    q: "Can I buy my business premises through my SMSF?",
    a: "Commercial or business real property (defined in the SIS Act) can be purchased by an SMSF and leased back to a related-party business, provided the lease is at market rent and on arm's-length commercial terms. This is a popular strategy for business owners because rental income is taxed at 15% (or 0% in pension phase) and the fund builds equity. The property can be purchased directly from a related party at market value — unlike residential property, which cannot be acquired from related parties at all. A licensed SMSF specialist adviser and accountant should be engaged to structure this correctly.",
  },
  {
    q: "What interest rate applies to SMSF loans?",
    a: "LRBA interest rates are set by the individual lender and are typically 1-2% above standard investment-property mortgage rates, reflecting the additional complexity and limited-recourse nature of the loan. Where the loan is from a related party rather than an arm's-length lender, the ATO requires the rate to meet safe-harbour conditions set out in PCG 2016/5 — currently benchmarked to the RBA indicator lending rate for housing. Using a rate below the safe harbour on a related-party LRBA may cause the fund's income to be classified as non-arm's-length income, triggering a 45% penalty tax rate on all income from that asset.",
  },
  {
    q: "What happens if my SMSF can't meet LRBA repayments?",
    a: "If the SMSF cannot meet loan repayments, the lender's recourse is limited to the asset held in the bare trust — they cannot access other SMSF assets. However, the bare trustee may be required to sell the asset to repay the debt. This is a serious liquidity event that can significantly damage the fund's retirement savings. To reduce this risk, SMSF trustees should maintain adequate cash reserves within the fund and model repayment obligations against expected contributions and rental income before establishing an LRBA. Seek advice from a licensed SMSF specialist adviser.",
  },
];

export default function SmsfBorrowingPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "SMSF", url: absoluteUrl("/smsf") },
    { name: "SMSF Borrowing (LRBA)", url: absoluteUrl("/smsf/borrowing") },
  ]);
  const faqLd = faqJsonLd(FAQS);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      {faqLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
        />
      )}

      <div className="bg-white min-h-screen">
        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <section className="bg-slate-900 text-white py-10 md:py-14">
          <div className="container-custom">
            <nav
              className="flex items-center gap-1.5 text-xs text-slate-400 mb-5"
              aria-label="Breadcrumb"
            >
              <Link href="/" className="hover:text-white">
                Home
              </Link>
              <span className="text-slate-600">/</span>
              <Link href="/smsf" className="hover:text-white">
                SMSF
              </Link>
              <span className="text-slate-600">/</span>
              <span className="text-white font-medium">SMSF Borrowing (LRBA)</span>
            </nav>
            <p className="text-xs font-bold text-amber-400 uppercase tracking-wide mb-3">
              {UPDATED_LABEL}
            </p>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight mb-4 max-w-3xl">
              SMSF Borrowing &amp; Limited Recourse Borrowing Arrangements ({CURRENT_YEAR})
            </h1>
            <p className="text-base md:text-lg text-slate-300 leading-relaxed max-w-3xl mb-6">
              Limited Recourse Borrowing Arrangements (LRBAs) allow an SMSF to borrow money to
              purchase a single asset — most commonly residential or commercial property and listed
              securities. The rules are complex, the lending market is specialist, and the
              consequences of getting the structure wrong are severe. This page explains how LRBAs
              work as general information only.
            </p>
            <div className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold text-sm px-5 py-3 rounded-lg">
              <Link href="/advisors/smsf-specialists">
                Find a licensed SMSF specialist adviser &rarr;
              </Link>
            </div>
          </div>
        </section>

        {/* ── General advice warning ────────────────────────────────────── */}
        <div className="bg-amber-50 border-b border-amber-200">
          <div className="container-custom max-w-5xl py-4">
            <p className="text-xs text-amber-900 leading-relaxed">
              <strong>General information only.</strong> {GENERAL_ADVICE_WARNING}{" "}
              LRBA structuring requires a licensed SMSF specialist adviser and an SMSF-experienced
              accountant. No credit assistance is provided or implied on this page.
            </p>
          </div>
        </div>

        {/* ── How LRBAs work ───────────────────────────────────────────── */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-5xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-4">
              How Limited Recourse Borrowing Arrangements work
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed mb-6 max-w-3xl">
              An LRBA is a borrowing arrangement governed by s.67A and s.67B of the{" "}
              <em>Superannuation Industry (Supervision) Act 1993</em>. The defining feature is
              &quot;limited recourse&quot;: if the SMSF defaults, the lender can only seize the
              single asset purchased with the loan — not any other assets held in the fund. This
              protective feature requires a specific legal structure known as the bare trust.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-6">
                <h3 className="font-extrabold text-slate-900 mb-3">The bare trust structure</h3>
                <ol className="space-y-3 text-sm text-slate-700 list-decimal list-inside">
                  <li>SMSF trustee enters an LRBA with the lender.</li>
                  <li>Lender advances funds to the bare trustee (not the SMSF directly).</li>
                  <li>
                    Bare trustee holds <strong>legal title</strong> to the asset during the loan
                    period.
                  </li>
                  <li>
                    SMSF holds the <strong>beneficial interest</strong> — income, depreciation, and
                    capital gains flow to the fund.
                  </li>
                  <li>
                    SMSF services the loan from rental income, employer contributions, and member
                    contributions.
                  </li>
                  <li>
                    On <strong>full repayment</strong>, legal title transfers from the bare trustee
                    to the SMSF trustee.
                  </li>
                </ol>
              </div>

              <div className="rounded-xl bg-slate-50 border border-slate-200 p-6">
                <h3 className="font-extrabold text-slate-900 mb-3">
                  Structure at a glance (text diagram)
                </h3>
                <div className="font-mono text-xs text-slate-700 leading-relaxed space-y-1">
                  <p>LRBA Lender</p>
                  <p className="pl-4">&#x2193; loan funds</p>
                  <p>Bare Trustee (holds legal title)</p>
                  <p className="pl-4">&#x2190; beneficial interest &#x2192;</p>
                  <p>SMSF (beneficial owner)</p>
                  <p className="pl-4">&#x2193; loan repayments from</p>
                  <p className="pl-6">rent + contributions + income</p>
                  <p className="pl-4">&#x2193; on full repayment</p>
                  <p>Legal title transfers to SMSF trustee</p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-blue-200 bg-blue-50 p-5">
              <p className="text-sm text-blue-900 leading-relaxed">
                <strong>Important:</strong> the bare trust is a separate legal entity that must be
                properly established by an SMSF-experienced solicitor and stamped where required.
                Off-the-shelf templates can create serious compliance problems. The cost of getting
                this structure right upfront is far lower than the ATO penalties for getting it wrong.
              </p>
            </div>
          </div>
        </section>

        {/* ── What can be purchased ────────────────────────────────────── */}
        <section className="py-12 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-5xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-4">
              What can an SMSF borrow to purchase?
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed mb-6 max-w-3xl">
              An LRBA must purchase a &quot;single acquirable asset&quot; — a single asset or a
              collection of identical assets with the same market value. The four main categories
              are below.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <h3 className="font-extrabold text-slate-900 mb-2">
                  Residential investment property
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Must be acquired at arm&apos;s length — <strong>cannot be purchased from a related
                  party</strong> (family members, business associates, controlled entities). No
                  trustee or related party may occupy or use the property at any time. Lenders
                  typically require 30–40% deposit (60–70% LVR).
                </p>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <h3 className="font-extrabold text-slate-900 mb-2">
                  Commercial &amp; business real property
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Can be purchased from a related party at market value and leased back to a related
                  business at market rent. This is the most popular LRBA strategy for business
                  owners — rent is deductible to the business, and the fund builds equity at a
                  concessional tax rate. Lease terms must be commercial and documented in writing.
                </p>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <h3 className="font-extrabold text-slate-900 mb-2">
                  Listed shares and ETFs
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Some non-bank lenders offer instalment warrants or margin-style LRBA facilities
                  for ASX-listed securities and ETFs. The &quot;single acquirable asset&quot; rule
                  applies to shares of identical class and value. Maximum LVR is typically 70% for
                  listed securities under ATO safe-harbour guidance. Less common than property LRBAs.
                </p>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <h3 className="font-extrabold text-slate-900 mb-2">
                  Plant &amp; equipment
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Theoretically permitted where the item is a single acquirable asset (e.g., a
                  specific piece of machinery). Rare in practice — lenders are reluctant, the asset
                  must not be used by related parties, and depreciation recapture on sale adds
                  complexity. Seek specialist advice before pursuing this.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── ATO safe-harbour conditions ───────────────────────────────── */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-5xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-2">
              ATO safe-harbour conditions
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed mb-6 max-w-3xl">
              The ATO issued Practical Compliance Guideline PCG 2016/5 (updated periodically) setting
              out safe-harbour terms for related-party LRBAs. If your LRBA is from an external lender
              at commercial terms, the safe harbour is less critical — but the parameters below
              represent the ATO&apos;s benchmark for what arm&apos;s-length LRBA terms look like in
              {" "}{CURRENT_YEAR}.
            </p>
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-sm" aria-label="ATO LRBA safe-harbour conditions for real property and listed securities">
                <thead className="bg-slate-100">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-left font-extrabold text-slate-700">Condition</th>
                    <th scope="col" className="px-4 py-3 text-left font-extrabold text-slate-700">
                      Real property
                    </th>
                    <th scope="col" className="px-4 py-3 text-left font-extrabold text-slate-700">
                      Listed securities
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  <tr>
                    <td className="px-4 py-3 font-bold text-slate-800">Maximum LVR</td>
                    <td className="px-4 py-3 text-slate-700">80%</td>
                    <td className="px-4 py-3 text-slate-700">70%</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-bold text-slate-800">Interest rate benchmark</td>
                    <td className="px-4 py-3 text-slate-700">
                      RBA indicator rate for housing (published quarterly)
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      RBA indicator rate for housing + 2%
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-bold text-slate-800">Maximum loan term</td>
                    <td className="px-4 py-3 text-slate-700">15 years</td>
                    <td className="px-4 py-3 text-slate-700">7 years</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-bold text-slate-800">Repayment structure</td>
                    <td className="px-4 py-3 text-slate-700">
                      Principal &amp; interest, or interest-only up to 5 years then P&amp;I
                    </td>
                    <td className="px-4 py-3 text-slate-700">Principal &amp; interest</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-bold text-slate-800">Security</td>
                    <td className="px-4 py-3 text-slate-700">
                      Mortgage over the bare trust asset only (limited recourse)
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      Charge over bare trust asset only
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-bold text-slate-800">Written loan agreement</td>
                    <td className="px-4 py-3 text-slate-700">Required</td>
                    <td className="px-4 py-3 text-slate-700">Required</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-xs text-slate-500 mt-3 leading-relaxed max-w-3xl">
              The safe-harbour parameters above are a general summary. The ATO updates PCG 2016/5
              periodically — always check the current version on ato.gov.au and obtain advice from
              a licensed SMSF specialist adviser before entering any LRBA, particularly a
              related-party loan.
            </p>
          </div>
        </section>

        {/* ── LRBA lenders ─────────────────────────────────────────────── */}
        <section className="py-12 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-5xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-4">
              LRBA lenders in Australia ({CURRENT_YEAR})
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed mb-6 max-w-3xl">
              The major banks (ANZ, NAB, Westpac, CBA) substantially exited the SMSF lending market
              following the 2018-19 Royal Commission. The active LRBA market in {CURRENT_YEAR} is
              dominated by non-bank specialist lenders. Related-party loans from members or associated
              entities are also permitted, but must strictly comply with safe-harbour conditions.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <h3 className="font-extrabold text-slate-900 mb-2 text-sm">
                  Non-bank SMSF lenders (active)
                </h3>
                <ul className="text-sm text-slate-600 space-y-1">
                  <li>La Trobe Financial</li>
                  <li>Thinktank Commercial Property Finance</li>
                  <li>Resimac (SMSF home loans)</li>
                  <li>Liberty Financial</li>
                  <li>Pepper Money (select products)</li>
                </ul>
                <p className="text-xs text-slate-400 mt-3">
                  Lender availability changes. Verify current product availability with an SMSF
                  mortgage broker.
                </p>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <h3 className="font-extrabold text-slate-900 mb-2 text-sm">
                  Typical LRBA lending parameters
                </h3>
                <ul className="text-sm text-slate-600 space-y-2">
                  <li>
                    <strong>LVR:</strong> 60–70% residential; up to 75–80% commercial
                  </li>
                  <li>
                    <strong>Rate premium:</strong> +1.0–2.0% above standard investor rates
                  </li>
                  <li>
                    <strong>Loan term:</strong> typically 15–25 years
                  </li>
                  <li>
                    <strong>Minimum fund balance:</strong> $200K–$300K (lender varies)
                  </li>
                </ul>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <h3 className="font-extrabold text-slate-900 mb-2 text-sm">
                  Related-party loans
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  A member or associated trust/company can lend to the SMSF. The loan must be
                  documented in a written agreement and must meet ATO safe-harbour conditions in
                  full — including the benchmarked interest rate, LVR limit, repayment structure,
                  and maximum term. The ATO audits related-party LRBAs more closely than arm&apos;s
                  length loans. Independent legal advice is essential.
                </p>
              </div>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
              <p className="text-sm text-amber-900 leading-relaxed">
                <strong>Finding an SMSF LRBA lender:</strong> most SMSF trustees access the LRBA
                market through an SMSF-specialist mortgage broker who understands both the lending
                criteria and the superannuation compliance requirements. A broker can compare
                currently available products and confirm whether the proposed structure meets SIS
                Act requirements.
              </p>
            </div>
          </div>
        </section>

        {/* ── Costs and considerations ─────────────────────────────────── */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-5xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-4">
              LRBA costs and economic considerations
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed mb-6 max-w-3xl">
              LRBAs carry significant upfront and ongoing costs that must be weighed against the
              expected investment return. The net rental yield after all SMSF-specific costs must
              make economic sense — a return that is marginally positive before costs can easily
              become negative once all fees are included.
            </p>
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-sm" aria-label="LRBA costs for SMSF borrowing">
                <thead className="bg-slate-100">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-left font-extrabold text-slate-700">Cost item</th>
                    <th scope="col" className="px-4 py-3 text-left font-extrabold text-slate-700">
                      Typical range
                    </th>
                    <th scope="col" className="px-4 py-3 text-left font-extrabold text-slate-700">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  <tr>
                    <td className="px-4 py-3 font-bold text-slate-800">
                      LRBA legal &amp; bare trust setup
                    </td>
                    <td className="px-4 py-3 text-slate-700">$3,000–$8,000</td>
                    <td className="px-4 py-3 text-slate-700">
                      Varies by law firm and complexity; commercial LRBAs tend to cost more
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-bold text-slate-800">
                      Lender establishment fee
                    </td>
                    <td className="px-4 py-3 text-slate-700">$1,000–$3,000</td>
                    <td className="px-4 py-3 text-slate-700">
                      Some lenders charge application + valuation separately
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-bold text-slate-800">
                      Stamp duty (bare trust transfer)
                    </td>
                    <td className="px-4 py-3 text-slate-700">Varies by state</td>
                    <td className="px-4 py-3 text-slate-700">
                      Some states exempt the title transfer on loan repayment; confirm with your
                      SMSF lawyer
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-bold text-slate-800">
                      Interest rate premium
                    </td>
                    <td className="px-4 py-3 text-slate-700">+1.0–2.0% p.a.</td>
                    <td className="px-4 py-3 text-slate-700">
                      Above standard investor mortgage rates; significantly increases debt-servicing
                      cost
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-bold text-slate-800">
                      Annual SMSF audit premium
                    </td>
                    <td className="px-4 py-3 text-slate-700">+$300–$700 p.a.</td>
                    <td className="px-4 py-3 text-slate-700">
                      LRBA adds complexity; auditors charge more for funds with borrowings
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-bold text-slate-800">
                      Ongoing SMSF accounting
                    </td>
                    <td className="px-4 py-3 text-slate-700">$2,500–$6,000+ p.a.</td>
                    <td className="px-4 py-3 text-slate-700">
                      Bare trust adds a separate entity to account for and lodge returns
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-5">
              <p className="text-sm text-amber-900 leading-relaxed">
                <strong>Minimum recommended fund balance for an LRBA:</strong> most SMSF specialists
                recommend a minimum fund balance of{" "}
                <strong>$200,000–$300,000 before considering an LRBA</strong>. Below this threshold,
                fixed costs consume too high a proportion of the fund&apos;s assets, and the fund is
                vulnerable to cash-flow stress if rental income is interrupted. The economics improve
                materially above $500,000.
              </p>
            </div>
          </div>
        </section>

        {/* ── Restrictions on improvements ─────────────────────────────── */}
        <section className="py-12 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-5xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-4">
              Restrictions on improvements to the LRBA asset
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed mb-4 max-w-3xl">
              One of the most commonly misunderstood LRBA rules is the prohibition on using borrowed
              funds to improve the asset. The SIS Act is explicit: borrowed funds can only be used to
              acquire the asset — not to improve it.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
                <h3 className="font-extrabold text-emerald-900 mb-3">Permitted while under LRBA</h3>
                <ul className="space-y-2 text-sm text-slate-700">
                  <li>&#x2705; Repairs to maintain the asset in its existing condition</li>
                  <li>&#x2705; Routine maintenance (painting, fixing fixtures)</li>
                  <li>&#x2705; Like-for-like replacements of worn or damaged components</li>
                  <li>&#x2705; Improvements funded entirely from SMSF&apos;s own cash (not borrowed)</li>
                </ul>
              </div>
              <div className="rounded-xl border border-red-200 bg-red-50 p-5">
                <h3 className="font-extrabold text-red-900 mb-3">
                  Not permitted while under LRBA
                </h3>
                <ul className="space-y-2 text-sm text-slate-700">
                  <li>&#x274C; Renovations that change the character of the asset</li>
                  <li>&#x274C; Extensions or structural additions</li>
                  <li>&#x274C; Using a replacement loan to fund improvements</li>
                  <li>&#x274C; Adding a separate structure on the same bare trust title</li>
                </ul>
              </div>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed mt-5 max-w-3xl">
              The practical implication is: <strong>buy LRBA assets in good condition</strong>, or
              plan renovations for after the loan is repaid and title has transferred to the SMSF.
              Using loan funds for improvements (even indirectly) can invalidate the LRBA and expose
              the fund to compliance penalties.
            </p>
          </div>
        </section>

        {/* ── Tax treatment ─────────────────────────────────────────────── */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-5xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-4">
              Tax treatment of LRBA income inside super
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed mb-6 max-w-3xl">
              One of the key attractions of property inside super is the concessional tax environment.
              The rates below apply provided the LRBA complies fully with SIS Act requirements and
              the ATO&apos;s safe-harbour conditions. Non-arm&apos;s-length income (NALI) rules can
              apply a 45% tax rate if the arrangement is not at arm&apos;s length.
            </p>
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-sm" aria-label="Tax treatment of LRBA income in accumulation and pension phase">
                <thead className="bg-slate-100">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-left font-extrabold text-slate-700">
                      Tax item
                    </th>
                    <th scope="col" className="px-4 py-3 text-left font-extrabold text-slate-700">
                      Accumulation phase
                    </th>
                    <th scope="col" className="px-4 py-3 text-left font-extrabold text-slate-700">
                      Pension phase
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  <tr>
                    <td className="px-4 py-3 font-bold text-slate-800">Rental income</td>
                    <td className="px-4 py-3 text-slate-700">15%</td>
                    <td className="px-4 py-3 text-slate-700">0%</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-bold text-slate-800">
                      Interest &amp; borrowing costs
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      Deductible against rental income
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      Not deductible (no tax liability to offset)
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-bold text-slate-800">Depreciation</td>
                    <td className="px-4 py-3 text-slate-700">
                      Deductible; no carry-forward between income years as individuals do
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      Not applicable (0% tax)
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-bold text-slate-800">
                      Capital gain (held &gt; 12 months)
                    </td>
                    <td className="px-4 py-3 text-slate-700">10% (after 1/3 CGT discount)</td>
                    <td className="px-4 py-3 text-slate-700">0%</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-bold text-slate-800">
                      Capital gain (held &lt; 12 months)
                    </td>
                    <td className="px-4 py-3 text-slate-700">15%</td>
                    <td className="px-4 py-3 text-slate-700">0%</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-bold text-slate-800">
                      Non-arm&apos;s-length income (NALI)
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      45% on all fund income from that asset
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      45% on all fund income from that asset
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-xs text-slate-500 mt-3 leading-relaxed max-w-3xl">
              Tax rates above are general summaries for a complying SMSF. Your fund&apos;s effective
              tax position depends on fund-specific circumstances including whether it is in mixed
              accumulation/pension phase. Consult a registered tax agent or licensed SMSF specialist
              adviser for fund-specific tax advice.
            </p>
          </div>
        </section>

        {/* ── Exit strategy ────────────────────────────────────────────── */}
        <section className="py-12 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-5xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-4">
              Exit strategy and what happens at loan repayment
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900 mb-3">
                  On full loan repayment
                </h3>
                <ul className="space-y-3 text-sm text-slate-700">
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-600 font-bold mt-0.5">1.</span>
                    <span>
                      The bare trustee executes a transfer of legal title to the SMSF trustee. This
                      is a straightforward legal step if the bare trust deed was properly drafted.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-600 font-bold mt-0.5">2.</span>
                    <span>
                      The property becomes an unencumbered SMSF asset. It can be held as an
                      income-producing asset, sold, or transferred to a member in-specie on
                      retirement (subject to pension-phase rules).
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-600 font-bold mt-0.5">3.</span>
                    <span>
                      The bare trust is wound up. Stamp duty may apply on the title transfer in some
                      states — confirm with your SMSF lawyer before settlement.
                    </span>
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-slate-900 mb-3">
                  If the SMSF winds up before repayment
                </h3>
                <ul className="space-y-3 text-sm text-slate-700">
                  <li className="flex items-start gap-2">
                    <span className="text-amber-600 font-bold mt-0.5">&#9651;</span>
                    <span>
                      The SMSF cannot wind up while the LRBA is outstanding without either repaying
                      the loan in full or selling the bare trust asset to repay the lender.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-600 font-bold mt-0.5">&#9651;</span>
                    <span>
                      If the asset is sold, net proceeds (after debt repayment) are distributed to
                      members or rolled to APRA funds as part of the wind-up.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-600 font-bold mt-0.5">&#9651;</span>
                    <span>
                      An in-specie transfer of an encumbered LRBA asset to a member is not
                      straightforward and requires specialist advice.
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ── Key risks ────────────────────────────────────────────────── */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-5xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-4">
              Key LRBA risks trustees must understand
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="rounded-xl border border-red-200 bg-red-50 p-5">
                <h3 className="font-extrabold text-red-900 mb-2 text-sm">Illiquidity risk</h3>
                <p className="text-sm text-red-800 leading-relaxed">
                  Property cannot be partially sold. If the fund needs cash — for pension payments,
                  a member&apos;s death benefit, or a contribution refund — you cannot sell 10% of
                  a property. The only exit is a full sale.
                </p>
              </div>
              <div className="rounded-xl border border-red-200 bg-red-50 p-5">
                <h3 className="font-extrabold text-red-900 mb-2 text-sm">Cash-flow risk</h3>
                <p className="text-sm text-red-800 leading-relaxed">
                  Loan repayments must be met from the fund&apos;s income and contributions even if
                  the property is vacant. Vacancy periods, unexpected repairs, or a member stopping
                  contributions can all cause a cash-flow shortfall.
                </p>
              </div>
              <div className="rounded-xl border border-red-200 bg-red-50 p-5">
                <h3 className="font-extrabold text-red-900 mb-2 text-sm">Concentration risk</h3>
                <p className="text-sm text-red-800 leading-relaxed">
                  A single property can represent 80–90% of a small fund&apos;s assets. A fall in
                  property value or rental income affects virtually all of the fund&apos;s retirement
                  savings. Investment strategy rules require concentration to be considered and
                  documented.
                </p>
              </div>
              <div className="rounded-xl border border-red-200 bg-red-50 p-5">
                <h3 className="font-extrabold text-red-900 mb-2 text-sm">Interest rate risk</h3>
                <p className="text-sm text-red-800 leading-relaxed">
                  Most SMSF LRBA products are variable rate. A significant increase in the RBA cash
                  rate can materially increase loan repayments and reduce or eliminate the net rental
                  yield — and the fund cannot transfer this risk to a related party by lowering the
                  rate below safe harbour.
                </p>
              </div>
              <div className="rounded-xl border border-red-200 bg-red-50 p-5">
                <h3 className="font-extrabold text-red-900 mb-2 text-sm">Compliance risk</h3>
                <p className="text-sm text-red-800 leading-relaxed">
                  A breach of LRBA rules can cause the fund&apos;s income from that asset to be
                  classified as non-arm&apos;s-length income (NALI), taxed at 45%. In serious cases,
                  the ATO can make the fund non-complying — triggering a tax charge of 46.5% on the
                  fund&apos;s entire taxable income.
                </p>
              </div>
              <div className="rounded-xl border border-red-200 bg-red-50 p-5">
                <h3 className="font-extrabold text-red-900 mb-2 text-sm">
                  Improvement restriction risk
                </h3>
                <p className="text-sm text-red-800 leading-relaxed">
                  Inadvertently using loan funds — or a top-up loan — to improve the property is a
                  common compliance error. Improvements must be funded from the fund&apos;s own cash.
                  Misclassifying a capital improvement as a &quot;repair&quot; is an auditor red flag.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Step-by-step setup process ───────────────────────────────── */}
        <section className="py-12 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-5xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-6">
              Step-by-step LRBA setup process
            </h2>
            <div className="space-y-4">
              {[
                {
                  step: "1",
                  title: "SMSF established with adequate balance",
                  body: "Ensure the SMSF is properly established with a compliant trust deed and registered with the ATO. A balance of $200,000+ is recommended before proceeding — both lenders and specialist advisers will typically decline to proceed below this threshold.",
                },
                {
                  step: "2",
                  title: "Choose the asset",
                  body: "Select a property or other acquirable asset that meets SMSF investment rules: arm's-length, not from a related party (for residential), consistent with the fund's written investment strategy, and in a condition that does not require immediate capital improvement funded from borrowed money.",
                },
                {
                  step: "3",
                  title: "Engage an SMSF lawyer to establish the bare trust",
                  body: "A bare trust deed must be drafted, executed, and stamped before or at settlement. The bare trustee is typically a separate company established solely for this purpose. Do not use a generic bare trust template — SMSF LRBA deed requirements vary by state and are regularly updated following ATO guidance.",
                },
                {
                  step: "4",
                  title: "Source LRBA finance",
                  body: "Approach SMSF specialist lenders directly or through an SMSF mortgage broker. Obtain a formal loan approval in the bare trustee's name. Confirm the loan documents are SMSF-compliant — particularly the limited recourse clause — before signing.",
                },
                {
                  step: "5",
                  title: "Bare trustee executes the purchase",
                  body: "At settlement, the bare trustee takes title to the property. The contract must be in the bare trustee's name — not the SMSF trustee's name. Settlement funds come from the SMSF's cash account (deposit) and the lender (balance). The SMSF cannot contribute borrowed money.",
                },
                {
                  step: "6",
                  title: "SMSF pays all purchase-related costs from fund cash",
                  body: "Stamp duty, conveyancing, building inspection, insurance, and any other acquisition costs must be paid from the SMSF's own cash — not from borrowed funds. Ensure the fund has adequate liquidity for these costs plus an operating cash buffer.",
                },
                {
                  step: "7",
                  title: "Manage the asset within the SMSF",
                  body: "Rental income flows to the SMSF. Loan repayments are made by the SMSF from its bank account. Document all transactions, maintain the bare trust accounts separately, and ensure the annual SMSF audit covers the LRBA. Review the written investment strategy annually.",
                },
              ].map(({ step, title, body }) => (
                <div
                  key={step}
                  className="flex items-start gap-4 bg-white rounded-xl border border-slate-200 p-5"
                >
                  <div className="w-9 h-9 rounded-full bg-slate-900 text-white flex items-center justify-center font-extrabold text-sm shrink-0">
                    {step}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 mb-1">{title}</h3>
                    <p className="text-sm text-slate-600 leading-relaxed">{body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FAQ accordion ────────────────────────────────────────────── */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-3xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-6">
              Frequently asked questions about SMSF LRBAs
            </h2>
            <div className="space-y-3">
              {FAQS.map(({ q, a }) => (
                <details
                  key={q}
                  className="rounded-xl border border-slate-200 bg-slate-50 group"
                >
                  <summary className="flex items-center justify-between cursor-pointer px-5 py-4 font-bold text-slate-900 text-sm list-none select-none">
                    {q}
                    <span className="ml-4 shrink-0 text-slate-400 group-open:rotate-180 transition-transform">
                      &#x25BC;
                    </span>
                  </summary>
                  <div className="px-5 pb-5 pt-1 text-sm text-slate-700 leading-relaxed border-t border-slate-200 mt-0">
                    {a}
                  </div>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ── Seek professional advice CTA ──────────────────────────────── */}
        <section className="py-12 bg-slate-900 text-white">
          <div className="container-custom max-w-4xl text-center">
            <h2 className="text-2xl md:text-3xl font-extrabold mb-4">
              LRBA structuring requires specialist advice
            </h2>
            <p className="text-slate-300 text-sm md:text-base leading-relaxed mb-6 max-w-2xl mx-auto">
              Limited Recourse Borrowing Arrangements sit at the intersection of superannuation law,
              property law, and tax law. The ATO actively audits LRBAs — particularly related-party
              loans and funds that have improved an asset using borrowed funds. An error can result
              in NALI taxation at 45% or, in serious cases, fund non-compliance.
            </p>
            <p className="text-slate-300 text-sm leading-relaxed mb-8 max-w-2xl mx-auto">
              Before proceeding with an LRBA, engage both a{" "}
              <strong className="text-white">licensed SMSF specialist adviser</strong> (for strategy
              and compliance) and an{" "}
              <strong className="text-white">SMSF-experienced accountant</strong> (for tax and audit
              readiness). The upfront cost of proper advice is substantially less than the cost of
              remediation.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/advisors/smsf-specialists"
                className="inline-block bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold text-sm px-6 py-3 rounded-lg"
              >
                Find a licensed SMSF specialist adviser
              </Link>
              <Link
                href="/smsf"
                className="inline-block bg-slate-700 hover:bg-slate-600 text-white font-bold text-sm px-6 py-3 rounded-lg"
              >
                Back to SMSF hub
              </Link>
            </div>
          </div>
        </section>

        {/* ── Compliance footer ────────────────────────────────────────── */}
        <section className="py-8 bg-white border-t border-slate-200">
          <div className="container-custom max-w-4xl">
            <p className="text-xs text-slate-500 leading-relaxed">
              {GENERAL_ADVICE_WARNING} This page does not constitute credit assistance. LRBA
              borrowing arrangements are subject to the{" "}
              <em>Superannuation Industry (Supervision) Act 1993</em>, ATO Practical Compliance
              Guideline PCG 2016/5, and Taxation Ruling TR 2016/D4. Rules and safe-harbour
              parameters change — always verify current requirements at ato.gov.au and obtain
              advice from a licensed professional before acting. No credit assistance is provided
              or implied.
            </p>
            <p className="text-xs text-slate-400 mt-2">{UPDATED_LABEL}</p>
          </div>
        </section>

        <HubAdvisorCTA
          heading="Get advice on SMSF borrowing (LRBA)"
          subheading="Limited recourse borrowing arrangements have strict ATO rules on asset types, trust structures, and refinancing. An SMSF specialist can review your bare trust deed and loan terms before settlement."
          intent={{ need: "smsf", context: ["smsf_borrowing", "lrba", "smsf_property"] }}
          source="smsf_borrowing"
          ctaLabel="Find an SMSF borrowing specialist"
          className="py-12 bg-amber-50 border-t border-amber-200"
        />

        {/* ── Related links ────────────────────────────────────────────── */}
        <section className="py-8 bg-slate-50 border-t border-slate-200">
          <div className="container-custom max-w-4xl">
            <h2 className="text-sm font-extrabold text-slate-900 mb-4">Related SMSF guides</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
              <Link
                href="/smsf/property"
                className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-100 font-bold text-slate-900"
              >
                SMSF property investment &rarr;
              </Link>
              <Link
                href="/smsf/setup"
                className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-100 font-bold text-slate-900"
              >
                Setting up an SMSF &rarr;
              </Link>
              <Link
                href="/smsf/auditors"
                className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-100 font-bold text-slate-900"
              >
                SMSF auditors &rarr;
              </Link>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
