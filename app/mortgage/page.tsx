import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, UPDATED_LABEL } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `Home Loans & Mortgages Australia (${CURRENT_YEAR}) | invest.com.au`,
  description: `Compare Australian home loan types, understand LVR, LMI, offset accounts, and redraw. Find a mortgage broker, use our repayment calculator, and read the essential guides. ${UPDATED_LABEL}.`,
  openGraph: {
    title: `Home Loans & Mortgages Australia (${CURRENT_YEAR})`,
    description: "Variable vs fixed, offset accounts, LVR, LMI — the essential guide for Australian home buyers and investors.",
    url: `${SITE_URL}/mortgage`,
    images: [{ url: `/api/og?title=${encodeURIComponent("Home Loans Australia")}&sub=${encodeURIComponent("Variable · Fixed · Offset · LVR · LMI · " + CURRENT_YEAR)}`, width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: `${SITE_URL}/mortgage` },
};

const FAQS = [
  {
    q: "What is the difference between a variable and fixed rate home loan?",
    a: "A variable rate loan moves with the lender's standard variable rate, which typically tracks the RBA cash rate (with a margin). Repayments change when rates change. Benefits: offset accounts, redraw, extra repayments, and the ability to refinance at any time without break costs. A fixed rate loan locks your interest rate for a term (usually 1–5 years), giving payment certainty. Downside: most fixed loans restrict extra repayments, don't allow full offset accounts, and charge break costs if you exit the fixed term early.",
  },
  {
    q: "What is LVR and why does it matter?",
    a: "Loan to Value Ratio (LVR) is the loan amount as a percentage of the property's value. LVR = loan ÷ property value × 100. A $500k loan on an $800k property = 62.5% LVR. LVR determines your interest rate (higher LVR = higher risk premium), whether you need Lenders Mortgage Insurance (LMI), and access to certain loan products. Most lenders require LMI for LVR above 80%. Some lenders offer 'no LMI' options for certain professions (doctors, lawyers, accountants) at up to 90% LVR.",
  },
  {
    q: "What is Lenders Mortgage Insurance (LMI)?",
    a: "LMI is a one-off insurance premium charged by lenders when LVR exceeds 80%. It protects the LENDER (not you) if you default and the property sale doesn't cover the loan. LMI costs vary by LVR and loan size — typically 0.5%–3.5% of the loan amount. It can be added to the loan (capitalised) or paid upfront. LMI is NOT the same as mortgage protection insurance, which covers your repayments if you become unable to work.",
  },
  {
    q: "How does an offset account work?",
    a: "An offset account is a transaction account linked to your mortgage. The balance in the account offsets your loan balance for interest calculation purposes. For example: $500k mortgage, $50k in offset = interest calculated on $450k. You only pay interest on the net balance. Offset accounts are usually available on variable rate loans. A 100% offset means the full offset balance reduces the interest calculation. They are especially valuable in high-rate environments — the effective after-tax return on an offset balance equals your mortgage rate (unbeatable for cash).",
  },
  {
    q: "Should I use a mortgage broker or go directly to a bank?",
    a: "Mortgage brokers can access multiple lenders (30–50+) and compare on your behalf, often finding better rates than going direct — especially for non-standard situations (self-employed, complex income, investment properties). Brokers are paid by lenders (upfront commission ~0.65% of loan and trailing 0.15% p.a.), which may create conflicts of interest, but the Best Interests Duty (BID) obligation introduced in 2021 requires brokers to act in your best interests. For straightforward borrowers with an existing banking relationship, going direct may be equally fine. Brokers add most value for first home buyers, investors with complex structures, and anyone who has been rejected by their bank.",
  },
];

const LOAN_TYPES = [
  { type: "Variable rate (P&I)", pros: "Offset account, redraw, extra repayments, no break costs", cons: "Repayments change with rate moves", bestFor: "Owner-occupiers who want flexibility" },
  { type: "Fixed rate (P&I)", pros: "Payment certainty, budgeting, hedge against rate rises", cons: "Break costs, limited extra repayments, no full offset", bestFor: "Rate-rise risk aversion; known holding period" },
  { type: "Split loan", pros: "Partial certainty + partial flexibility", cons: "More complex admin; break costs on the fixed portion", bestFor: "Wanting both stability and some offset benefit" },
  { type: "Interest-only (IO)", pros: "Lower repayments during IO period; tax deductibility for investors", cons: "Loan balance doesn't reduce; higher rate; serviceability impact", bestFor: "Investment properties; bridging finance" },
  { type: "Construction loan", pros: "Drawdowns as construction stages complete; interest on drawn amount only", cons: "Progress inspections; higher admin; often switches to standard P&I after", bestFor: "Building a new home or major renovation" },
  { type: "Bridging loan", pros: "Finance gap between buying new and selling old", cons: "Higher rate; short-term only (6–12 months typically)", bestFor: "Buyers who want to buy before selling" },
];

export default function MortgagePage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: SITE_URL },
    { name: "Home Loans" },
  ]);
  const faqLd = faqJsonLd(FAQS.map(f => ({ q: f.q, a: f.a })));

  return (
    <div className="bg-white min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />

      {/* Hero */}
      <section className="border-b border-slate-100 py-8 md:py-12">
        <div className="container-custom max-w-4xl">
          <nav aria-label="Breadcrumb" className="text-xs text-slate-500 mb-5 flex items-center gap-1.5 flex-wrap">
            <Link href="/" className="hover:text-slate-900">Home</Link>
            <span>/</span>
            <span className="text-slate-900 font-medium">Home Loans</span>
          </nav>
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-4 leading-tight">
            Home loans &amp; mortgages — the Australian guide
          </h1>
          <p className="text-lg text-slate-600 leading-relaxed mb-3">
            Variable vs fixed, offset accounts, LVR, LMI, and how to find the right loan for
            your situation. Use our calculator to estimate repayments and find an accredited
            mortgage broker for personalised advice.
          </p>
          <div className="flex flex-wrap gap-3 mt-4">
            <Link href="/mortgage-calculator" className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-amber-500 text-slate-900 text-sm font-semibold rounded-lg hover:bg-amber-600 transition-colors">
              Repayment calculator →
            </Link>
            <Link href="/find-advisor?type=mortgage" className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-slate-900 text-white text-sm font-semibold rounded-lg hover:bg-slate-800 transition-colors">
              Find a mortgage broker
            </Link>
          </div>
          <p className="text-xs text-slate-400 mt-4">{UPDATED_LABEL} · General information only · Not credit advice</p>
        </div>
      </section>

      {/* Loan types table */}
      <section className="py-10 border-b border-slate-100">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-5">Home loan types at a glance</h2>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm" aria-label="Home loan types — pros, cons and best use for each">
              <thead>
                <tr className="bg-slate-900">
                  <th scope="col" className="text-left px-4 py-3 text-xs font-bold text-white uppercase tracking-wide">Loan type</th>
                  <th scope="col" className="text-left px-4 py-3 text-xs font-bold text-white uppercase tracking-wide">Pros</th>
                  <th scope="col" className="text-left px-4 py-3 text-xs font-bold text-white uppercase tracking-wide">Cons</th>
                  <th scope="col" className="text-left px-4 py-3 text-xs font-bold text-white uppercase tracking-wide">Best for</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {LOAN_TYPES.map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-semibold text-slate-900 whitespace-nowrap">{row.type}</td>
                    <td className="px-4 py-3 text-xs text-slate-600 leading-relaxed">{row.pros}</td>
                    <td className="px-4 py-3 text-xs text-slate-600 leading-relaxed">{row.cons}</td>
                    <td className="px-4 py-3 text-xs text-slate-600 leading-relaxed">{row.bestFor}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Key concepts */}
      <section className="py-10 border-b border-slate-100 bg-slate-50">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-5">Key concepts</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              { label: "Comparison rate", body: "A rate that includes interest plus most fees, expressed as an annual percentage. Required by law to be shown alongside the advertised rate. A more honest measure of true cost — a loan with 1% fee and low rate may have a higher comparison rate than a no-fee loan." },
              { label: "Serviceability buffer", body: "APRA requires lenders to assess your ability to repay at the contract rate plus 3% (as at 2024). This means if you apply for a 6% loan, the bank stress-tests your repayments at 9%. The buffer reduces the maximum loan amount you can borrow." },
              { label: "Offset account vs redraw", body: "Offset: a separate linked transaction account. Your balance reduces interest immediately, and you can transact freely. Redraw: extra repayments stored inside the loan itself. Access to redraw is at lender discretion and may be restricted; withdrawn amounts add back to your loan balance." },
              { label: "Principal & interest vs interest-only", body: "P&I repayments reduce your loan balance each month. IO repayments only cover interest — your balance stays flat. IO is common for investment properties (maximises deductibility) but increases total interest paid and may result in repayment shock when the IO period ends." },
            ].map(item => (
              <div key={item.label} className="bg-white rounded-xl border border-slate-200 p-4">
                <p className="text-sm font-extrabold text-slate-900 mb-1.5">{item.label}</p>
                <p className="text-sm text-slate-600 leading-relaxed">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-10 border-b border-slate-100">
        <div className="container-custom max-w-3xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-6">Frequently asked questions</h2>
          <div className="space-y-4">
            {FAQS.map((faq, i) => (
              <details key={i} className="group border border-slate-200 rounded-xl p-4">
                <summary className="cursor-pointer list-none font-bold text-slate-900 flex items-start justify-between gap-3">
                  {faq.q}
                  <span className="shrink-0 text-slate-400 group-open:rotate-180 transition-transform text-lg leading-none" aria-hidden="true">▾</span>
                </summary>
                <p className="mt-3 text-sm text-slate-600 leading-relaxed">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Tools CTA */}
      <section className="py-10 border-b border-slate-100 bg-amber-50">
        <div className="container-custom max-w-4xl">
          <h2 className="text-xl font-extrabold text-slate-900 mb-4">Tools &amp; calculators</h2>
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              { href: "/mortgage-calculator", label: "Repayment calculator", desc: "Monthly repayments across P&I, IO, variable, and fixed rate scenarios" },
              { href: "/property-yield-calculator", label: "Property yield calculator", desc: "Gross and net rental yield for investment property analysis" },
              { href: "/negative-gearing", label: "Negative gearing guide", desc: "How investment property losses offset other income in Australia" },
            ].map(tool => (
              <Link key={tool.href} href={tool.href} className="block bg-white border border-amber-200 rounded-xl p-4 hover:border-amber-400 hover:shadow-sm transition-all group">
                <p className="text-sm font-bold text-slate-900 group-hover:text-amber-700 transition-colors mb-1">{tool.label}</p>
                <p className="text-xs text-slate-500 leading-relaxed">{tool.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Related */}
      <section className="py-8 border-b border-slate-100">
        <div className="container-custom max-w-4xl">
          <h2 className="text-xl font-extrabold text-slate-900 mb-4">Related guides</h2>
          <div className="flex flex-wrap gap-3">
            {[
              { href: "/property", label: "Property investing hub" },
              { href: "/find-advisor?type=mortgage", label: "Find a mortgage broker" },
              { href: "/negative-gearing", label: "Negative gearing" },
              { href: "/smsf", label: "SMSF property" },
            ].map(link => (
              <Link key={link.href} href={link.href} className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-full text-sm font-semibold text-slate-700 hover:border-amber-300 hover:text-amber-700 transition-colors">
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Compliance */}
      <section className="py-8 bg-slate-50">
        <div className="container-custom max-w-4xl">
          <p className="text-[11px] text-slate-500 leading-relaxed">
            <strong>General advice warning.</strong> {GENERAL_ADVICE_WARNING} This page is general information about home loans and mortgages. It is not credit advice and does not constitute credit assistance under the National Consumer Credit Protection Act 2009. For personalised credit advice, consult an Australian Credit Licence (ACL) holder — use our{" "}
            <Link href="/find-advisor?type=mortgage" className="underline hover:text-slate-800">mortgage broker finder</Link>.
          </p>
        </div>
      </section>
    </div>
  );
}
