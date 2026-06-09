import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, UPDATED_LABEL } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `Foreign Income Tax Offset (FITO) — Australian Guide (${CURRENT_YEAR}) | invest.com.au`,
  description: `Claim the Foreign Income Tax Offset (FITO) to reduce Australian tax on foreign dividends, interest, and royalties. How it works. ${UPDATED_LABEL}.`,
  openGraph: {
    title: `Foreign Income Tax Offset (FITO) — Australian Guide (${CURRENT_YEAR})`,
    description: "Offset Australian tax by the foreign tax you've already paid. Worked examples and ATO return instructions.",
    url: `${SITE_URL}/global-investing/tax/fito`,
    images: [{ url: `/api/og?title=${encodeURIComponent("Foreign Income Tax Offset (FITO)")}&sub=${encodeURIComponent("Claim foreign tax credits on your ATO return · " + CURRENT_YEAR)}`, width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: `${SITE_URL}/global-investing/tax/fito` },
};

const FAQS = [
  {
    q: "What is the Foreign Income Tax Offset (FITO)?",
    a: "The FITO lets Australian residents offset their Australian tax liability by the amount of foreign tax they've already paid on the same income. The intent is to prevent double taxation — if you paid 15% US withholding on US dividends, you can claim a FITO to reduce the Australian tax on that income dollar-for-dollar. The FITO is available for most types of foreign-source income including dividends, interest, royalties, rental income, and foreign employment income.",
  },
  {
    q: "What is the FITO cap?",
    a: "The FITO is capped at the amount of Australian tax payable on the foreign income in question. You cannot use the FITO to generate a net tax refund or offset tax on Australian-source income. If your foreign tax paid exceeds the Australian tax on the same income, the excess FITO is simply lost — it cannot be carried forward. To calculate the cap, divide your Australian tax on the foreign income by your total Australian taxable income and multiply by total Australian tax.",
  },
  {
    q: "How do I claim the FITO on my tax return?",
    a: "Report foreign income at the relevant items (e.g. Item 20 for foreign employment income or dividends at your company tax items). Then claim the FITO at Item 20 (Gross Foreign Income and Foreign Income Tax Offset). Enter the total foreign tax paid in the 'Foreign income tax offset' box. Keep your foreign dividend statements and broker-issued withholding tax certificates as supporting evidence.",
  },
  {
    q: "Does the FITO apply to US withholding on dividends?",
    a: "Yes — this is the most common use case. If you've lodged a W-8BEN form, the US IRS withholds 15% on dividends from US companies under the Australia-US DTA (instead of the statutory 30%). That 15% is a creditable foreign tax and qualifies for the FITO. If you haven't lodged a W-8BEN and 30% was withheld, only the treaty rate (15%) is creditable — you can't claim the full 30%.",
  },
  {
    q: "Can I claim FITO on AU-listed ETFs that hold US shares?",
    a: "Generally no — not directly. AU-listed ETFs (like IVV domiciled in Ireland) receive dividends from their US holdings and pay any applicable withholding tax at the trust level, not the investor level. The ETF distributions you receive are characterised as Australian trust income, not foreign income. The ETF manager handles the foreign tax internally and the fund's tax position is already baked into the distribution. You don't separately claim FITO on ETF distributions.",
  },
];

const WORKED_EXAMPLE = [
  { step: "Receive US$1,000 dividend from Apple (direct holding)", detail: "US IRS withholds 15% = US$150 withholding tax. You receive US$850 net." },
  { step: "Convert to AUD", detail: "Gross AUD dividend: US$1,000 ÷ 0.65 = AU$1,538. Foreign tax paid: US$150 ÷ 0.65 = AU$231." },
  { step: "Include gross AU$1,538 in assessable income", detail: "Your marginal rate is 37%. Australian tax on this income = AU$1,538 × 37% = AU$569." },
  { step: "Claim FITO of AU$231 (foreign tax paid)", detail: "FITO cap = AU$569 (Australian tax on the foreign income). AU$231 < AU$569, so the full FITO is available." },
  { step: "Net Australian tax on this dividend", detail: "AU$569 − AU$231 = AU$338. Effective rate ≈ 22% (15% US + 22% AU top-up = ~37% combined)." },
];

export default function FitoPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: SITE_URL },
    { name: "Global Investing", url: `${SITE_URL}/global-investing` },
    { name: "Tax", url: `${SITE_URL}/global-investing/tax` },
    { name: "FITO" },
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
            <Link href="/global-investing" className="hover:text-slate-900">Global Investing</Link>
            <span>/</span>
            <Link href="/global-investing/tax" className="hover:text-slate-900">Tax</Link>
            <span>/</span>
            <span className="text-slate-900 font-medium">FITO</span>
          </nav>
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-4">
            Foreign Income Tax Offset (FITO)
          </h1>
          <p className="text-lg text-slate-600 leading-relaxed mb-3">
            If you&apos;ve paid foreign tax on dividends, interest, or other overseas income,
            the FITO lets you offset Australian tax dollar-for-dollar — so you don&apos;t pay
            tax twice on the same income.
          </p>
          <p className="text-xs text-slate-400">{UPDATED_LABEL} · General information only</p>
        </div>
      </section>

      {/* How it works */}
      <section className="py-10 border-b border-slate-100">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-5">How FITO works</h2>
          <div className="grid sm:grid-cols-3 gap-4 mb-6">
            {[
              { n: "1", title: "Pay foreign tax", body: "Foreign government withholds tax on your income (e.g. 15% US withholding on dividends from US shares with W-8BEN lodged)." },
              { n: "2", title: "Report gross income", body: "Include the gross foreign income (before withholding) in your Australian assessable income at the relevant tax return item." },
              { n: "3", title: "Claim the offset", body: "At Item 20, enter the foreign tax paid as a FITO. It reduces your Australian tax on that income, dollar for dollar, up to the FITO cap." },
            ].map(step => (
              <div key={step.n} className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <div className="w-7 h-7 rounded-full bg-amber-500 text-slate-900 flex items-center justify-center text-sm font-extrabold mb-3">{step.n}</div>
                <p className="text-sm font-extrabold text-slate-900 mb-1.5">{step.title}</p>
                <p className="text-sm text-slate-600 leading-relaxed">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Worked example */}
      <section className="py-10 border-b border-slate-100">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-5">Worked example — US dividends</h2>
          <div className="border border-slate-200 rounded-2xl overflow-hidden">
            <div className="bg-slate-900 px-5 py-3">
              <p className="text-sm font-bold text-white">Australian investor, 37% marginal rate, direct US shares, W-8BEN lodged</p>
            </div>
            <div className="divide-y divide-slate-100">
              {WORKED_EXAMPLE.map((row, i) => (
                <div key={i} className="flex gap-4 px-5 py-4">
                  <span className="shrink-0 w-6 h-6 rounded-full bg-amber-100 text-amber-700 text-xs font-bold flex items-center justify-center mt-0.5">{i + 1}</span>
                  <div>
                    <p className="text-sm font-bold text-slate-900">{row.step}</p>
                    <p className="text-sm text-slate-600 mt-0.5">{row.detail}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="bg-emerald-50 border-t border-emerald-200 px-5 py-4">
              <p className="text-sm font-bold text-emerald-900">Result: The FITO prevents double taxation. You pay ~37% combined (US + AU), not 52% (37% AU + 15% US stacked).</p>
            </div>
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

      {/* Related */}
      <section className="py-8 border-b border-slate-100">
        <div className="container-custom max-w-4xl">
          <h2 className="text-xl font-extrabold text-slate-900 mb-4">Related guides</h2>
          <div className="flex flex-wrap gap-3">
            {[
              { href: "/global-investing/tax/cgt-on-foreign-shares", label: "CGT on foreign shares" },
              { href: "/global-investing/tax/us-estate-tax", label: "US estate tax" },
              { href: "/tools/withholding-tax-calculator", label: "Withholding tax calculator" },
              { href: "/global-investing/tax", label: "All tax guides" },
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
            <strong>General advice warning.</strong> {GENERAL_ADVICE_WARNING} This page is general information about the FITO. Consult a registered tax agent (TPB) for advice on your specific situation.
          </p>
        </div>
      </section>
    </div>
  );
}
