import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, UPDATED_LABEL } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `CGT on Foreign Shares — Australian Guide (${CURRENT_YEAR}) | invest.com.au`,
  description: `How capital gains tax works on overseas shares for Australian residents. AUD cost base, FX impact, 50% CGT discount, worked examples, and reporting on your ATO tax return. ${UPDATED_LABEL}.`,
  openGraph: {
    title: `CGT on Foreign Shares — Australian Guide (${CURRENT_YEAR})`,
    description: "AUD cost base, FX movements, 50% discount, and worked examples for Australian residents selling foreign shares.",
    url: `${SITE_URL}/global-investing/tax/cgt-on-foreign-shares`,
    images: [{ url: `/api/og?title=${encodeURIComponent("CGT on Foreign Shares")}&sub=${encodeURIComponent("AUD Cost Base · FX Impact · 50% Discount · " + CURRENT_YEAR)}`, width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: `${SITE_URL}/global-investing/tax/cgt-on-foreign-shares` },
};

const WORKED_EXAMPLES = [
  {
    title: "Example 1 — Simple US share purchase and sale",
    steps: [
      "Buy 100 Apple shares at US$150 on 1 Feb 2024. AUD/USD rate: 0.65 → AUD cost base = 100 × (150 / 0.65) = AU$23,077",
      "Sell 100 shares at US$200 on 15 Mar 2025. AUD/USD rate: 0.62 → AUD proceeds = 100 × (200 / 0.62) = AU$32,258",
      "Capital gain (AUD) = $32,258 − $23,077 = $9,181",
      "Held > 12 months → 50% CGT discount applies → Assessable gain = $4,591",
      "If marginal tax rate is 37%: tax = $1,698. File at Item 18 (Capital Gains) on your return.",
    ],
    note: "Even though Apple stock only rose 33% in USD terms, the AUD gain is larger because AUD/USD fell (AUD weakened). FX movements are part of your AUD gain.",
  },
  {
    title: "Example 2 — FX loss offsets share gain",
    steps: [
      "Buy 50 Microsoft shares at US$300 on 1 Jun 2023. AUD/USD rate: 0.66 → cost base = AU$22,727",
      "Sell at US$400 on 1 Sep 2024. AUD/USD rate: 0.68 → proceeds = AU$29,412",
      "Capital gain = $29,412 − $22,727 = $6,685",
      "Held > 12 months → 50% discount → Assessable = $3,343",
      "AUD strengthened (0.66 → 0.68), partially offsetting the USD gain.",
    ],
    note: "There is no separate FX gain/loss calculation — it's all captured in the AUD cost base and proceeds.",
  },
];

const FAQS = [
  {
    q: "How do I calculate the AUD cost base for foreign shares?",
    a: "Use the AUD/foreign-currency exchange rate at the date of acquisition, multiplied by the number of shares and the price per share in the foreign currency. Use the RBA spot rate or your actual transaction rate (from your broker confirmation). Include brokerage, foreign taxes paid on acquisition, and any other incidental acquisition costs.",
  },
  {
    q: "Do I get the 50% CGT discount on foreign shares?",
    a: "Yes, provided you held the shares for more than 12 months as an Australian tax resident. The 50% discount applies to assets acquired after 21 September 1999 and held for at least 12 months. Foreign shares qualify under the same rules as Australian shares.",
  },
  {
    q: "How does foreign exchange movement affect my CGT?",
    a: "FX movements are fully baked into the CGT calculation via the AUD cost base and proceeds. There is no separate FX gain or loss calculation. If AUD weakened between your buy and sell dates, your AUD gain will be larger than the foreign-currency gain. If AUD strengthened, your AUD gain will be smaller — even if the share price rose. You can't separately claim FX losses against other income.",
  },
  {
    q: "What records do I need to keep?",
    a: "Keep broker trade confirmations (purchase and sale), showing the number of shares, price, currency, date, and brokerage. Record the exchange rate used (ideally the RBA spot rate or broker-provided rate at settlement). Also keep records of any foreign tax paid (withholding tax) to support your FITO claim. ATO recommends keeping records for 5 years after the gain is assessed.",
  },
  {
    q: "I reinvested dividends — do I have a separate cost base for those shares?",
    a: "Yes. Each parcel acquired through a dividend reinvestment plan (DRP) has its own cost base, calculated at the share price on the date the shares were issued. Maintain separate records for each DRP acquisition. When you sell, match against the relevant parcels (using the 'first in, first out' or 'specific identification' method per your tax return instructions).",
  },
];

export default function CgtForeignSharesPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: SITE_URL },
    { name: "Global Investing", url: `${SITE_URL}/global-investing` },
    { name: "Tax", url: `${SITE_URL}/global-investing/tax` },
    { name: "CGT on Foreign Shares" },
  ]);
  const faqLd = faqJsonLd(FAQS.map(f => ({ q: f.q, a: f.a })));

  return (
    <div className="bg-white min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />

      {/* Hero */}
      <section className="border-b border-slate-100 py-8 md:py-12">
        <div className="container-custom max-w-4xl">
          <nav className="text-xs text-slate-500 mb-5 flex items-center gap-1.5 flex-wrap">
            <Link href="/" className="hover:text-slate-900">Home</Link>
            <span>/</span>
            <Link href="/global-investing" className="hover:text-slate-900">Global Investing</Link>
            <span>/</span>
            <Link href="/global-investing/tax" className="hover:text-slate-900">Tax</Link>
            <span>/</span>
            <span className="text-slate-900 font-medium">CGT on Foreign Shares</span>
          </nav>
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-4">
            CGT on foreign shares — the Australian guide
          </h1>
          <p className="text-lg text-slate-600 leading-relaxed mb-3">
            Australian residents pay capital gains tax on worldwide assets, including foreign shares.
            The key difference from Australian shares: everything is calculated in AUD, so foreign-exchange
            movements are part of your taxable gain — even if the share price was flat.
          </p>
          <p className="text-xs text-slate-400">{UPDATED_LABEL} — General information only</p>
        </div>
      </section>

      {/* Core rules */}
      <section className="py-10 border-b border-slate-100">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-5">The core rules</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              { label: "AUD cost base", body: "Your cost base is the AUD value of what you paid — shares × price in the foreign currency ÷ AUD/foreign rate at acquisition. Include brokerage in the cost base." },
              { label: "AUD proceeds", body: "On disposal, calculate proceeds in AUD using the exchange rate on the day of sale. FX movements between buy and sell are part of the gain — not a separate item." },
              { label: "50% CGT discount", body: "If you held the foreign shares as an Australian tax resident for more than 12 months, you qualify for the 50% CGT discount — the same as for ASX shares." },
              { label: "Foreign tax credit (FITO)", body: "Foreign withholding tax paid on dividends can be offset against Australian tax via the Foreign Income Tax Offset. See our FITO guide." },
            ].map(item => (
              <div key={item.label} className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                <p className="text-sm font-extrabold text-slate-900 mb-1.5">{item.label}</p>
                <p className="text-sm text-slate-600 leading-relaxed">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Worked examples */}
      <section className="py-10 border-b border-slate-100">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-5">Worked examples</h2>
          <div className="space-y-6">
            {WORKED_EXAMPLES.map((ex, i) => (
              <div key={i} className="border border-slate-200 rounded-2xl overflow-hidden">
                <div className="bg-slate-900 px-5 py-3">
                  <p className="text-sm font-bold text-white">{ex.title}</p>
                </div>
                <div className="p-5">
                  <ol className="space-y-2">
                    {ex.steps.map((step, j) => (
                      <li key={j} className="flex gap-3 text-sm text-slate-700 leading-relaxed">
                        <span className="shrink-0 w-5 h-5 rounded-full bg-amber-100 text-amber-700 text-xs font-bold flex items-center justify-center mt-0.5">{j + 1}</span>
                        {step}
                      </li>
                    ))}
                  </ol>
                  <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
                    <p className="text-xs text-amber-800 leading-relaxed"><strong>Key takeaway:</strong> {ex.note}</p>
                  </div>
                </div>
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
                  <span className="shrink-0 text-slate-400 group-open:rotate-180 transition-transform text-lg leading-none">▾</span>
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
              { href: "/global-investing/tax/fito", label: "Foreign Income Tax Offset (FITO)" },
              { href: "/global-investing/tax/us-estate-tax", label: "US Estate Tax for Australians" },
              { href: "/global-investing/tax", label: "Tax hub — all guides" },
              { href: "/cgt-calculator", label: "CGT calculator" },
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
            <strong>General advice warning.</strong> {GENERAL_ADVICE_WARNING} This page contains general information about capital gains tax. It is not tax advice. Consult a registered tax agent (TPB) for advice specific to your situation.
          </p>
        </div>
      </section>
    </div>
  );
}
