import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, UPDATED_LABEL, absoluteUrl } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";

const FAQS = [
  {
    q: "How long does it take to wind up an SMSF?",
    a: "Typically 3–6 months for a straightforward fund with liquid assets. Complex funds with illiquid assets (property, private equity) can take 12–24 months as assets must be sold or transferred before wind-up is complete.",
  },
  {
    q: "Do I have to sell my SMSF's property to wind up?",
    a: "Not necessarily. You may be able to transfer the property in-specie (directly to yourself as an individual) rather than selling, if you meet a condition of release. This avoids realising a capital gain inside the fund. However, stamp duty will apply on the transfer in most states, and you will need specialist legal advice on the transaction.",
  },
  {
    q: "Can I just roll over to an industry fund instead of winding up?",
    a: "Yes. If you want to close your SMSF but do not need to access your super, you can roll over to an APRA-regulated fund. This triggers a wind-up of the SMSF. The process is the same: sell assets, pay liabilities, roll over the balance, final audit, notify ATO.",
  },
  {
    q: "Does the final audit cost the same as a regular annual audit?",
    a: "Generally yes. The final audit covers the period from the last audit to the date of wind-up and costs $350–$600 for most funds. Some auditors charge a premium for wind-up complexity.",
  },
  {
    q: "What if the SMSF trustee dies or loses capacity?",
    a: "This is one of the most common reasons for forced wind-up. A sole-member fund with a sole individual trustee can face a crisis when the trustee loses legal capacity. A corporate trustee avoids this — new directors can be appointed. Without a corporate trustee, the estate executor or legal guardian must manage the wind-up, which can be complex and expensive. This is the #1 reason to use a corporate trustee from the start.",
  },
  {
    q: "Can I wind up my SMSF and keep the money in cash temporarily?",
    a: "No. Once assets are sold and liabilities paid, the remaining cash must either be rolled over to another complying fund or paid as a member benefit (if a condition of release is met). You cannot leave cash in a wound-up SMSF's bank account — the account must be closed and the funds distributed to members.",
  },
];

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `Winding Up an SMSF: 8-Step Process & Costs (${CURRENT_YEAR}) | Invest.com.au`,
  description:
    "Complete guide to winding up an SMSF in Australia. 8-step process, costs ($500–$2,500), CGT timing strategy, final audit requirements, and ATO deregistration steps.",
  alternates: { canonical: `${SITE_URL}/smsf/wind-up` },
  openGraph: {
    title: `Winding Up an SMSF: 8-Step Process & Costs (${CURRENT_YEAR})`,
    description:
      "8-step wind-up process, typical costs, CGT timing strategy, and ATO deregistration requirements.",
    url: `${SITE_URL}/smsf/wind-up`,
    type: "website",
  },
};

const WIND_UP_STEPS = [
  {
    n: 1,
    title: "Trustee resolution",
    body: "Pass a formal trustee resolution to wind up the fund. Document the decision in trustee minutes. Without a documented resolution, the wind-up has no legal starting point.",
  },
  {
    n: 2,
    title: "Notify all service providers",
    body: "Inform your accountant, auditor, administrator, broker or custodian, and insurer. Give notice periods to allow time to prepare final statements and close accounts in order.",
  },
  {
    n: 3,
    title: "Sell assets",
    body: "Liquidate all investments. Consider CGT carefully — accumulation phase is 15% (10% for assets held 12+ months). If members are in pension phase, sales may be tax-free. Timing the asset sales around pension commencement can save significant tax.",
  },
  {
    n: 4,
    title: "Pay outstanding liabilities",
    body: "Settle all remaining obligations: final tax bills, accountant and auditor fees, any outstanding contributions tax. The fund must have a zero liability position before distributing member benefits.",
  },
  {
    n: 5,
    title: "Pay member benefits",
    body: "Roll over balances to an APRA-regulated fund, or pay benefits directly if a condition of release is met. You cannot distribute assets to members as a lump sum unless a condition of release applies — doing so is an illegal early access breach.",
  },
  {
    n: 6,
    title: "Prepare final financial statements",
    body: "Your accountant prepares financial statements to the date of wind-up. These cover the period from the last annual statements to the wind-up date and form the basis of the final audit.",
  },
  {
    n: 7,
    title: "Final audit",
    body: "An independent approved SMSF auditor must sign off on the final statements. This audit is mandatory — it cannot be skipped even for a wind-up. Budget $350–$600 and allow 2–4 weeks for turnaround.",
  },
  {
    n: 8,
    title: "Notify ATO",
    body: "Lodge the final annual return, pay any outstanding tax, and cancel the fund's ABN and TFN. The ATO must be notified within 28 days of the fund ceasing to exist. Leaving the ABN active keeps the fund technically open and liable for further annual returns.",
  },
];

const WIND_UP_REASONS = [
  {
    title: "Member death or loss of capacity",
    body: "A sole-member fund with an individual trustee can face a forced wind-up when the trustee passes away or loses legal capacity. This is the most common reason for unplanned wind-ups. A corporate trustee structure avoids the worst of this risk.",
  },
  {
    title: "Balance below economic threshold",
    body: "When an SMSF's balance falls below $200,000–$300,000, the fixed running costs ($3,000–$5,000 per year) consume a disproportionate share of returns. Most financial advisers recommend winding up when balance is expected to stay below this level.",
  },
  {
    title: "Permanent move overseas",
    body: "If all members and trustees become non-Australian residents, the fund ceases to be an Australian superannuation fund and loses its complying status. Winding up — or rolling over to an APRA fund before departing — is usually the right course.",
  },
  {
    title: "Trustee burnout or compliance burden",
    body: "Running an SMSF requires ongoing attention: investment decisions, annual audits, contribution tracking, ATO lodgements. When the compliance burden clearly exceeds the benefit of control, returning to an APRA-regulated fund is a legitimate and rational decision.",
  },
];

const COMMON_MISTAKES = [
  {
    title: "Distributing assets without a condition of release",
    body: "Transferring SMSF assets directly to members as a lump sum distribution — without meeting a condition of release — is not a wind-up. It is illegal early access to superannuation and carries significant ATO penalties.",
  },
  {
    title: "Forgetting the final audit",
    body: "The final audit is mandatory even for wind-up. There is no exception. An SMSF that closes without completing a final audit remains non-compliant and exposes former trustees to penalties.",
  },
  {
    title: "Skipping the trustee resolution",
    body: "A valid wind-up requires a formally documented trustee resolution. Without it, the wind-up lacks a legal starting point and the fund may be considered to still be operating.",
  },
  {
    title: "Not cancelling the ABN and TFN",
    body: "Leaving the fund's ABN and TFN active after wind-up keeps the fund technically open. The ATO will continue to expect annual returns. Cancel both within 28 days of wind-up completion.",
  },
];

export default function SmsfWindUpPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "SMSF", url: absoluteUrl("/smsf") },
    { name: "Winding Up an SMSF", url: absoluteUrl("/smsf/wind-up") },
  ]);
  const faq = faqJsonLd(FAQS);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      {faq && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faq) }} />}
      <div className="bg-white min-h-screen">

        {/* Hero */}
        <section className="bg-slate-900 text-white py-10 md:py-14">
          <div className="container-custom">
            <nav className="flex items-center gap-1.5 text-xs text-slate-400 mb-5" aria-label="Breadcrumb">
              <Link href="/" className="hover:text-white">Home</Link>
              <span className="text-slate-600">/</span>
              <Link href="/smsf" className="hover:text-white">SMSF</Link>
              <span className="text-slate-600">/</span>
              <span className="text-white font-medium">Winding Up an SMSF</span>
            </nav>
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className="text-xs font-semibold bg-amber-500 text-slate-900 px-3 py-1 rounded-full">{UPDATED_LABEL}</span>
              <span className="text-xs font-semibold bg-red-600 text-white px-3 py-1 rounded-full">Final Audit Required</span>
            </div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight mb-3 max-w-3xl">
              Winding Up an SMSF: 8-Step Process &amp; Costs
            </h1>
            <p className="text-base md:text-lg text-slate-300 leading-relaxed max-w-3xl mb-6">
              Closing an SMSF involves more than just selling assets and moving money. There are mandatory legal steps, a final independent audit, and ATO deregistration requirements — done wrong, former trustees remain liable.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-4xl">
              {[
                { v: "$500–$2,500", l: "Typical wind-up cost", sub: "Simple liquid fund" },
                { v: "Required", l: "Final audit", sub: "Cannot be skipped" },
                { v: "Legally released", l: "Member funds", sub: "Must be rolled over or released" },
                { v: "28 days", l: "ATO deregistration", sub: "After wind-up completion" },
              ].map((s) => (
                <div key={s.l} className="bg-white/10 border border-white/10 rounded-lg px-3 py-2.5">
                  <dt className="text-[10px] font-bold uppercase text-slate-400 tracking-wide">{s.l}</dt>
                  <dd className="text-lg md:text-xl font-extrabold text-white mt-0.5">{s.v}</dd>
                  <dd className="text-[10px] text-slate-400 mt-0.5">{s.sub}</dd>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* When to wind up */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-5xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-2">When to wind up your SMSF</h2>
            <p className="text-sm text-slate-600 mb-6">
              Poor investment performance alone is not a good reason to wind up — if performance is the issue, roll over to a better-performing fund. Wind-up is warranted when the fund can no longer operate effectively or compliantly.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {WIND_UP_REASONS.map((r) => (
                <div key={r.title} className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                  <h3 className="font-extrabold text-slate-900 mb-2">{r.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{r.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 8-step wind-up process */}
        <section className="py-12 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-6">The 8-step wind-up process</h2>
            <div className="space-y-4">
              {WIND_UP_STEPS.map((s) => (
                <div key={s.n} className="flex gap-4 bg-white rounded-xl border border-slate-200 p-5">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-700 text-white font-extrabold text-sm flex items-center justify-center">
                    {s.n}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 mb-1">{s.title}</h3>
                    <p className="text-sm text-slate-600 leading-relaxed">{s.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CGT timing strategy */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-4">CGT timing strategy</h2>
            <div className="rounded-xl border border-amber-300 bg-amber-50 p-6 space-y-4">
              <p className="text-sm font-bold text-amber-900 uppercase tracking-wide">Tax planning opportunity</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-lg border border-amber-200 p-4">
                  <h3 className="font-extrabold text-slate-900 mb-2 text-sm">Pension phase (0% CGT)</h3>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    If members are already in pension phase, asset sales inside the fund attract 0% CGT. Wind up after transitioning members to pension phase — not before. The CGT saving on a large fund can far exceed the cost of the wind-up itself.
                  </p>
                </div>
                <div className="bg-white rounded-lg border border-amber-200 p-4">
                  <h3 className="font-extrabold text-slate-900 mb-2 text-sm">Accumulation phase (10–15% CGT)</h3>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    If members are in accumulation phase, CGT applies at 15% (or 10% for assets held 12+ months). Time asset sales to fall in a financial year with lower fund income, or ensure the 12-month discount applies before selling.
                  </p>
                </div>
                <div className="bg-white rounded-lg border border-amber-200 p-4">
                  <h3 className="font-extrabold text-slate-900 mb-2 text-sm">In-specie transfers</h3>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    You may be able to transfer assets directly to members (in-specie) rather than selling, avoiding a CGT event inside the fund. Stamp duty will apply in most states on property transfers. Get specialist legal advice before attempting an in-specie transfer on wind-up.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Costs table */}
        <section className="py-10 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-4">Costs of winding up an SMSF</h2>
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-sm">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="px-4 py-3 text-left font-extrabold text-slate-700">Cost item</th>
                    <th className="px-4 py-3 text-right font-extrabold text-slate-700">Typical range</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[
                    { item: "Accountant / administrator", range: "$500–$1,500" },
                    { item: "Final SMSF audit", range: "$350–$600" },
                    { item: "ATO wind-up tax return fee", range: "Included in accountant fee" },
                    { item: "Brokerage on asset sales", range: "$0 (ETF) to $500+ (complex)" },
                    { item: "Rollover admin fees", range: "$0–$100 per rollover" },
                  ].map((row) => (
                    <tr key={row.item} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-slate-700">{row.item}</td>
                      <td className="px-4 py-3 text-right text-slate-600">{row.range}</td>
                    </tr>
                  ))}
                  <tr className="bg-slate-50 font-bold">
                    <td className="px-4 py-3 text-slate-900">TOTAL (simple liquid fund)</td>
                    <td className="px-4 py-3 text-right text-slate-900">$850–$2,200</td>
                  </tr>
                  <tr className="bg-amber-50 font-bold">
                    <td className="px-4 py-3 text-amber-900">TOTAL (complex / property fund)</td>
                    <td className="px-4 py-3 text-right text-amber-900">$2,000–$5,000+</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Cost estimates as at {CURRENT_YEAR}. Property funds incur additional legal fees for in-specie transfers or conveyancing. Costs vary by adviser and fund complexity.
            </p>
          </div>
        </section>

        {/* Common mistakes */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-6">Common mistakes when winding up</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {COMMON_MISTAKES.map((m) => (
                <div key={m.title} className="rounded-xl border border-red-200 bg-red-50 p-5">
                  <h3 className="font-extrabold text-red-900 mb-2">{m.title}</h3>
                  <p className="text-sm text-red-800 leading-relaxed">{m.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* SMSF vs APRA fund comparison */}
        <section className="py-12 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-5xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-6">SMSF vs returning to an APRA fund</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6">
                <h3 className="font-extrabold text-emerald-900 mb-3">Keep the SMSF when:</h3>
                <ul className="space-y-2 text-sm text-slate-800">
                  <li>Balance is $300,000 or above</li>
                  <li>You are an active investor with a specific strategy</li>
                  <li>You hold direct property or want to</li>
                  <li>Control over investments matters to you</li>
                  <li>You have time and capability for ongoing compliance</li>
                </ul>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-6">
                <h3 className="font-extrabold text-slate-900 mb-3">Return to an APRA fund when:</h3>
                <ul className="space-y-2 text-sm text-slate-800">
                  <li>Balance has fallen below $200,000</li>
                  <li>Compliance burden has become unmanageable</li>
                  <li>You are losing legal or physical capacity</li>
                  <li>You are moving overseas permanently</li>
                  <li>A set-and-forget solution better fits your life stage</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-12 bg-white border-t border-slate-200">
          <div className="container-custom max-w-3xl">
            <h2 className="text-2xl font-extrabold text-slate-900 mb-6">Frequently asked questions</h2>
            <div className="space-y-3">
              {FAQS.map((item) => (
                <details key={item.q} className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                  <summary className="flex items-center justify-between px-5 py-4 cursor-pointer font-bold text-slate-900 hover:bg-slate-50">
                    {item.q}
                  </summary>
                  <div className="px-5 pb-4 text-sm text-slate-700 leading-relaxed">{item.a}</div>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Compliance footer */}
        <section className="py-10 bg-slate-50 border-t border-slate-200">
          <div className="container-custom max-w-4xl">
            <p className="text-xs text-slate-500 mb-6 leading-relaxed">{GENERAL_ADVICE_WARNING}</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <Link href="/smsf" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">SMSF hub &rarr;</Link>
              <Link href="/smsf/setup" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">SMSF setup guide &rarr;</Link>
              <Link href="/advisors/smsf-accountants" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">Find an SMSF specialist &rarr;</Link>
            </div>
          </div>
        </section>

      </div>
    </>
  );
}
