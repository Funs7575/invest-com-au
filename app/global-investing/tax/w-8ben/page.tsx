import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, UPDATED_LABEL, absoluteUrl } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `W-8BEN Form for Australians (${CURRENT_YEAR}): Reduce US Withholding Tax to 15%`,
  description: `The W-8BEN form reduces US dividend withholding from 30% to 15% for Australian investors. What it is, which brokers auto-submit it, and how to renew. ${UPDATED_LABEL}.`,
  openGraph: {
    title: `W-8BEN Form for Australians (${CURRENT_YEAR})`,
    description: "Reduce US withholding tax from 30% to 15%. What the W-8BEN does, which brokers handle it, and renewal rules.",
    url: `${SITE_URL}/global-investing/tax/w-8ben`,
  },
  alternates: { canonical: `${SITE_URL}/global-investing/tax/w-8ben` },
};

const FAQS = [
  {
    q: "What happens if I don't submit a W-8BEN?",
    a: "The IRS default withholding rate for non-US persons is 30% on US-source dividends and certain interest payments. Without a W-8BEN, your broker is required to withhold 30% before distributing dividends. With a valid W-8BEN, the Australia-US Double Taxation Agreement (DTA) reduces this to 15% on portfolio dividends. You cannot claim a refund for over-withheld amounts in prior tax years without filing a US tax return (Form 1040-NR), which is complex and expensive.",
  },
  {
    q: "How long is a W-8BEN valid?",
    a: "A W-8BEN is valid for the calendar year it's signed plus three more calendar years — so a form signed on any date in 2024 expires on 31 December 2027. Your broker should notify you before expiry. If the form expires, your broker reverts to 30% withholding until a new form is submitted. Most AU-friendly brokers (Stake, IBKR, CommSec International, Tiger, moomoo) prompt you to renew automatically.",
  },
  {
    q: "Does the W-8BEN apply to ASX-listed ETFs like IVV?",
    a: "No. AU-listed ETFs (IVV, NDQ, VGS) are Australian financial products issued by Australian fund managers. They are not US securities, so the W-8BEN does not apply to them. The ETF itself may hold US stocks and deal with US withholding tax internally, but as an ETF unitholder in Australia you have no personal W-8BEN obligation — you're simply a unit-holder in an ARSN-registered fund.",
  },
  {
    q: "Can I claim a Foreign Income Tax Offset for US withholding tax?",
    a: "Yes. US withholding tax at 15% (post-W-8BEN) can be claimed as a Foreign Income Tax Offset (FITO) in your Australian tax return, up to the amount of Australian tax payable on that foreign income. If your Australian marginal rate is 32.5%, and you paid 15% US withholding, your net Australian liability is ~17.5% on the dividend. The FITO prevents full double taxation but does not create a refund if Australian tax is lower than the withholding paid.",
  },
];

const BROKER_HANDLING: { broker: string; autoSubmit: string; notes: string }[] = [
  { broker: "Interactive Brokers (IBKR)", autoSubmit: "Yes — during account opening", notes: "Handled as part of account application; re-prompts on expiry" },
  { broker: "Stake", autoSubmit: "Yes — during account opening", notes: "Built into onboarding flow for US market access" },
  { broker: "Tiger Brokers (AU)", autoSubmit: "Yes — during account opening", notes: "Prompted as part of identity verification workflow" },
  { broker: "moomoo AU", autoSubmit: "Yes — during account opening", notes: "Built into global markets onboarding" },
  { broker: "CommSec International", autoSubmit: "Yes — required for US trading", notes: "Required step before any US order can be placed" },
  { broker: "CMC International", autoSubmit: "Yes — for US markets", notes: "Handled within account settings before US trading enabled" },
  { broker: "eToro", autoSubmit: "Yes — for US stocks", notes: "Platform handles withholding tax separately; W-8BEN submitted on your behalf" },
];

export default function W8BenPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Global Investing", url: absoluteUrl("/global-investing") },
    { name: "Global Investing Tax", url: absoluteUrl("/global-investing/tax") },
    { name: "W-8BEN Form" },
  ]);
  const faq = faqJsonLd(FAQS);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faq) }} />
      <div className="bg-white min-h-screen">

        {/* Hero */}
        <section className="bg-gradient-to-br from-slate-900 to-slate-800 text-white py-12 md:py-16">
          <div className="container-custom max-w-4xl">
            <nav className="flex items-center gap-1.5 text-xs text-slate-400 mb-5" aria-label="Breadcrumb">
              <Link href="/" className="hover:text-white">Home</Link>
              <span>/</span>
              <Link href="/global-investing" className="hover:text-white">Global Investing</Link>
              <span>/</span>
              <Link href="/global-investing/tax" className="hover:text-white">Tax</Link>
              <span>/</span>
              <span className="text-white">W-8BEN</span>
            </nav>
            <div className="inline-block bg-slate-700 text-slate-300 text-xs font-medium px-3 py-1 rounded-full mb-4">
              Tax Guide {CURRENT_YEAR}
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4">
              W-8BEN Form for Australian Investors
            </h1>
            <p className="text-lg text-slate-300 max-w-2xl">
              The W-8BEN confirms your Australian residency to the US IRS — cutting dividend withholding from 30% to 15% under the Australia-US Double Taxation Agreement.
            </p>
          </div>
        </section>

        {/* What it is */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl font-extrabold text-slate-900 mb-4">What the W-8BEN does</h2>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
                <div>
                  <div className="text-4xl font-extrabold text-red-600 mb-1">30%</div>
                  <div className="text-sm font-bold text-slate-700">Without W-8BEN</div>
                  <div className="text-xs text-slate-500 mt-1">IRS default for non-US persons</div>
                </div>
                <div className="flex items-center justify-center text-2xl text-slate-400 font-bold">→</div>
                <div>
                  <div className="text-4xl font-extrabold text-emerald-600 mb-1">15%</div>
                  <div className="text-sm font-bold text-slate-700">With W-8BEN</div>
                  <div className="text-xs text-slate-500 mt-1">Australia-US DTA treaty rate</div>
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-4 text-center">
                On a $10,000 dividend, that&apos;s $1,500 saved per year. {GENERAL_ADVICE_WARNING}
              </p>
            </div>
            <p className="text-sm text-slate-700 leading-relaxed mb-4">
              The W-8BEN (Certificate of Foreign Status of Beneficial Owner for United States Tax Withholding) is a US IRS form that establishes you as a non-US person eligible for reduced withholding under a tax treaty. For Australian residents, the Australia-US Double Taxation Agreement reduces the withholding rate on portfolio dividends from 30% to 15%.
            </p>
            <p className="text-sm text-slate-700 leading-relaxed">
              The form covers US-source dividends and certain interest payments from US securities held in a foreign brokerage account. It does <strong>not</strong> apply to ASX-listed ETFs (like IVV or NDQ) — those are Australian products handled by Australian fund managers.
            </p>
          </div>
        </section>

        {/* Which brokers handle it */}
        <section className="py-12 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl font-extrabold text-slate-900 mb-2">Which brokers handle W-8BEN for you</h2>
            <p className="text-sm text-slate-500 mb-6">All major AU-friendly foreign brokers collect W-8BEN as part of account setup — you don&apos;t submit it to the IRS directly.</p>
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
              <table className="w-full text-sm">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="px-4 py-3 text-left font-extrabold text-slate-700">Broker</th>
                    <th className="px-4 py-3 text-left font-extrabold text-slate-700">Auto-submit</th>
                    <th className="px-4 py-3 text-left font-extrabold text-slate-700 hidden md:table-cell">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {BROKER_HANDLING.map((row) => (
                    <tr key={row.broker} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-bold text-slate-900">{row.broker}</td>
                      <td className="px-4 py-3">
                        <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800">
                          {row.autoSubmit}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600 hidden md:table-cell text-xs">{row.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Validity and renewal */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl font-extrabold text-slate-900 mb-4">Validity and renewal</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
                <h3 className="font-extrabold text-amber-900 mb-2">How long it lasts</h3>
                <p className="text-sm text-amber-900 leading-relaxed">
                  Valid for the calendar year signed + three calendar years. A form signed in 2024 expires 31 December 2027. Your broker should prompt renewal automatically.
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                <h3 className="font-extrabold text-slate-900 mb-2">What happens if it expires</h3>
                <p className="text-sm text-slate-700 leading-relaxed">
                  Withholding reverts to 30% immediately. You can&apos;t recover over-withheld amounts from past years without filing a US tax return (Form 1040-NR) — expensive and complex.
                </p>
              </div>
            </div>
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-5">
              <h3 className="font-extrabold text-blue-900 mb-2">When you must submit a new form</h3>
              <ul className="text-sm text-blue-900 space-y-1 leading-relaxed">
                <li>• On expiry (broker will prompt you)</li>
                <li>• If you change your name, address, or tax residency country</li>
                <li>• If you become a US person (citizen, resident, or green card holder) — switch to W-9 instead</li>
                <li>• When opening a new account at a different broker</li>
              </ul>
            </div>
          </div>
        </section>

        {/* FAQs */}
        <section className="py-12 bg-slate-50 border-t border-slate-200">
          <div className="container-custom max-w-3xl">
            <h2 className="text-2xl font-extrabold text-slate-900 mb-6">Frequently asked questions</h2>
            <div className="space-y-3">
              {FAQS.map((faqItem) => (
                <details key={faqItem.q} className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                  <summary className="flex items-center justify-between px-5 py-4 cursor-pointer font-bold text-slate-900 hover:bg-slate-50">
                    {faqItem.q}
                  </summary>
                  <div className="px-5 pb-4 text-sm text-slate-700 leading-relaxed">{faqItem.a}</div>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Related links */}
        <section className="py-10 bg-white border-t border-slate-200">
          <div className="container-custom max-w-4xl">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
              <Link href="/global-investing/tax/fito" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">
                Foreign Income Tax Offset (FITO) →
              </Link>
              <Link href="/global-investing/tax/cgt-on-foreign-shares" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">
                CGT on foreign shares →
              </Link>
              <Link href="/global-investing/tax/us-estate-tax" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">
                US estate tax for Australians →
              </Link>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
