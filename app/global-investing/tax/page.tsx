import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, UPDATED_LABEL } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `Tax for Global Investors — Australia (${CURRENT_YEAR}) | invest.com.au`,
  description: `Complete Australian tax guide for investors holding foreign shares, ETFs, and property. CGT on foreign shares, FITO, US withholding tax, W-8BEN, double-tax treaties, US estate tax, and QROPS. ${UPDATED_LABEL}.`,
  openGraph: {
    title: `Tax for Global Investors — Australia (${CURRENT_YEAR})`,
    description: "CGT, FITO, US withholding, estate tax, and double-tax treaties for Australians investing globally.",
    url: `${SITE_URL}/global-investing/tax`,
    images: [{ url: `/api/og?title=${encodeURIComponent("Tax for Global Investors")}&sub=${encodeURIComponent("CGT · FITO · US Withholding · DTA Tables · " + CURRENT_YEAR)}`, width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: `${SITE_URL}/global-investing/tax` },
};

const SUB_GUIDES = [
  {
    href: "/global-investing/tax/cgt-on-foreign-shares",
    label: "CGT on Foreign Shares",
    description: "How capital gains tax applies to overseas shares: AUD cost base, FX movements, 50% CGT discount, and worked examples.",
    badge: "Most read",
    badgeColor: "bg-amber-100 text-amber-800",
  },
  {
    href: "/global-investing/tax/us-estate-tax",
    label: "US Estate Tax for Australians",
    description: "Non-resident alien exposure, the US$60k exemption, the Australia-US Estate Tax Treaty, and how AU-listed ETFs eliminate the risk.",
    badge: "Widely missed",
    badgeColor: "bg-red-100 text-red-800",
  },
  {
    href: "/global-investing/tax/fito",
    label: "Foreign Income Tax Offset (FITO)",
    description: "Claim a dollar-for-dollar ATO offset for foreign tax withheld — dividends, interest, and royalties. Worked examples and limits.",
    badge: null,
    badgeColor: "",
  },
  {
    href: "/tools/withholding-tax-calculator",
    label: "Withholding Tax Calculator",
    description: "Enter your gross foreign dividend, country, and income type — get the net Australian tax position after FITO.",
    badge: "Interactive tool",
    badgeColor: "bg-blue-100 text-blue-800",
  },
];

const TREATY_HIGHLIGHTS = [
  { country: "United States", dividends: "15%", interest: "10%", royalties: "5%", form: "W-8BEN", notes: "5% if ≥10% holding" },
  { country: "United Kingdom", dividends: "15%", interest: "10%", royalties: "5%", form: "UK tax residency cert", notes: "0% bank interest" },
  { country: "Japan", dividends: "10%", interest: "10%", royalties: "5%", form: "Japanese DTA form", notes: "0% if ≥10% parent" },
  { country: "Germany", dividends: "15%", interest: "10%", royalties: "10%", form: "DE residency cert", notes: "0% if ≥25% parent" },
  { country: "Singapore", dividends: "15%", interest: "10%", royalties: "10%", form: "SG tax residency cert", notes: "Max 10% royalties" },
  { country: "New Zealand", dividends: "15%", interest: "10%", royalties: "10%", form: "NZ tax residency cert", notes: "5% if ≥10% parent" },
  { country: "Canada", dividends: "15%", interest: "10%", royalties: "10%", form: "CA residency cert", notes: "5% if ≥10% parent" },
  { country: "China", dividends: "15%", interest: "10%", royalties: "10%", form: "CN residency cert", notes: "Limited MFN clause" },
];

const FAQS = [
  {
    q: "Do I pay CGT on gains from overseas shares as an Australian resident?",
    a: "Yes. Australian residents are taxed on worldwide income and capital gains. Gains on foreign shares are assessable, with the cost base and proceeds calculated in AUD using the exchange rate at acquisition and disposal dates. If you've held the shares for more than 12 months, you're eligible for the 50% CGT discount on the AUD gain. FX movements affect your AUD-denominated gain even if the share price was flat in the foreign currency.",
  },
  {
    q: "What is the Foreign Income Tax Offset (FITO) and how do I claim it?",
    a: "The FITO lets you offset Australian tax by the amount of foreign tax you've already paid on the same income — dollar for dollar. For example, if you paid 15% US withholding tax on $1,000 of dividends, you can claim a $150 FITO against your Australian tax liability on that income. The FITO is capped at the Australian tax payable on the income (you can't use it to generate a refund). Claim it at Item 20 of your tax return. Keep your dividend statements and W-8BEN confirmation as evidence.",
  },
  {
    q: "What is a double-tax treaty and which ones apply to Australians?",
    a: "Australia has double-tax treaties (DTAs) with 44+ countries. They prevent double taxation by specifying which country has primary taxing rights and setting maximum withholding-tax rates. For Australian residents investing internationally, the most important are the US, UK, Japan, Germany, Singapore, New Zealand, and Canada treaties. Without a DTA, a country like the US would withhold 30% on dividends; the Australia-US DTA reduces this to 15% — but only if you've lodged a W-8BEN form.",
  },
  {
    q: "What is US estate tax and should I be worried as an Australian investor?",
    a: "Yes — this is one of the most overlooked tax risks for Australians buying US shares directly. The US imposes federal estate tax on US-situs assets (US-listed shares, US bonds, US property) held by non-resident aliens at death, with a very low exemption of US$60,000. Rates reach 40%. The Australia-US Estate Tax Treaty provides a proportional unified credit that substantially reduces the exposure, but structuring matters — speak to an estate planning adviser if you hold >US$60k in direct US shares. The simple fix: AU-listed ETFs like IVV are not US-situs assets.",
  },
  {
    q: "Do I need to report foreign income on my Australian tax return?",
    a: "Yes. Report all foreign income at the relevant items: foreign employment income, foreign pension income, dividends from foreign companies, foreign interest, and capital gains from foreign assets. Attach foreign dividend statements, withholding tax certificates, and broker transaction summaries. ATO has data-matching agreements with the US IRS and several other tax authorities, so foreign income is increasingly visible to the ATO.",
  },
];

export default function GlobalInvestingTaxPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: SITE_URL },
    { name: "Global Investing", url: `${SITE_URL}/global-investing` },
    { name: "Tax" },
  ]);
  const faqLd = faqJsonLd(FAQS.map(f => ({ q: f.q, a: f.a })));

  return (
    <div className="bg-white min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />

      {/* Hero */}
      <section className="border-b border-slate-100 py-8 md:py-12">
        <div className="container-custom">
          <nav className="text-xs text-slate-500 mb-5 flex items-center gap-1.5">
            <Link href="/" className="hover:text-slate-900">Home</Link>
            <span>/</span>
            <Link href="/global-investing" className="hover:text-slate-900">Global Investing</Link>
            <span>/</span>
            <span className="text-slate-900 font-medium">Tax</span>
          </nav>

          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-50 border border-amber-200 rounded-full text-xs font-semibold text-amber-800 mb-4">
              The moat — ATO + IRS rules
            </div>
            <h1 className="text-3xl md:text-5xl font-extrabold text-slate-900 mb-4 leading-tight">
              Tax for global investors<br className="hidden md:block" />
              <span className="text-amber-600"> — the complete AU guide</span>
            </h1>
            <p className="text-lg text-slate-600 leading-relaxed mb-6">
              CGT on foreign shares, FITO credits, US withholding tax, double-tax treaties,
              US estate tax, and W-8BEN — everything Australian residents need to know when
              investing internationally. Factual guides, worked examples, and calculators.
            </p>
            <p className="text-xs text-slate-400">{UPDATED_LABEL} · For Australian tax residents only</p>
          </div>
        </div>
      </section>

      {/* Deep-dive guides */}
      <section className="py-10 border-b border-slate-100">
        <div className="container-custom">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-6">Deep-dive guides</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {SUB_GUIDES.map(guide => (
              <Link
                key={guide.href}
                href={guide.href}
                className="group bg-white border border-slate-200 hover:border-amber-300 rounded-2xl p-5 transition-colors"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h3 className="text-base font-extrabold text-slate-900 group-hover:text-amber-700 transition-colors">
                    {guide.label}
                  </h3>
                  {guide.badge && (
                    <span className={`shrink-0 text-[0.6rem] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${guide.badgeColor}`}>
                      {guide.badge}
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-600 leading-relaxed mb-3">{guide.description}</p>
                <span className="text-xs font-bold text-amber-600 group-hover:underline">Read guide →</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* DTA quick-reference table */}
      <section className="py-10 border-b border-slate-100">
        <div className="container-custom">
          <div className="flex items-start justify-between gap-4 mb-5">
            <div>
              <h2 className="text-2xl font-extrabold text-slate-900">Double-tax treaty quick reference</h2>
              <p className="text-sm text-slate-500 mt-1">Withholding rates for Australian residents under each DTA. Full dataset via <Link href="/api/v1/tax/treaties" className="text-amber-600 hover:underline font-medium">Data API</Link>.</p>
            </div>
          </div>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">Country</th>
                  <th className="text-center px-3 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">Dividends</th>
                  <th className="text-center px-3 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">Interest</th>
                  <th className="text-center px-3 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">Royalties</th>
                  <th className="text-left px-3 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">Key form</th>
                  <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {TREATY_HIGHLIGHTS.map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-semibold text-slate-900">{row.country}</td>
                    <td className="px-3 py-3 text-center">
                      <span className="inline-block px-2 py-0.5 bg-blue-50 text-blue-700 text-xs font-bold rounded">{row.dividends}</span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className="inline-block px-2 py-0.5 bg-slate-50 text-slate-600 text-xs font-bold rounded">{row.interest}</span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className="inline-block px-2 py-0.5 bg-slate-50 text-slate-600 text-xs font-bold rounded">{row.royalties}</span>
                    </td>
                    <td className="px-3 py-3 text-xs text-slate-500">{row.form}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{row.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">Rates are indicative DTA rates. Statutory rates (no treaty) are typically 30%. Always confirm with your registered tax agent.</p>
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

      {/* Compliance */}
      <section className="py-8 bg-slate-50 border-t border-slate-200">
        <div className="container-custom max-w-4xl">
          <p className="text-[11px] text-slate-500 leading-relaxed">
            <strong>General advice warning.</strong> {GENERAL_ADVICE_WARNING} This page contains general information about Australian tax rules for international investors. It is not tax advice. Consult a registered tax agent (TPB) for advice specific to your situation.
          </p>
        </div>
      </section>
    </div>
  );
}
