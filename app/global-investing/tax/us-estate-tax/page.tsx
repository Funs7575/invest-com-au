import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, UPDATED_LABEL } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `US Estate Tax for Australian Investors (${CURRENT_YEAR}) | invest.com.au`,
  description: `The overlooked risk for Australians holding US shares directly: US federal estate tax on US-situs assets above US$60,000. How the Australia-US treaty helps, and how AU-listed ETFs eliminate the risk entirely. ${UPDATED_LABEL}.`,
  openGraph: {
    title: `US Estate Tax for Australian Investors (${CURRENT_YEAR})`,
    description: "Non-resident alien exposure, US$60k exemption, the AUS-US treaty, and how AU-listed ETFs eliminate the risk.",
    url: `${SITE_URL}/global-investing/tax/us-estate-tax`,
    images: [{ url: `/api/og?title=${encodeURIComponent("US Estate Tax — Australians")}&sub=${encodeURIComponent("The overlooked risk for direct US share investors · " + CURRENT_YEAR)}`, width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: `${SITE_URL}/global-investing/tax/us-estate-tax` },
};

const FAQS = [
  {
    q: "What is US federal estate tax?",
    a: "The US federal estate tax is a tax on the transfer of property at death. For US citizens and domiciliaries, there is a large exemption (US$13.6M in 2024). For non-resident aliens (NRAs) — including Australian investors — the exemption is only US$60,000 on US-situs assets. Rates reach 40% on amounts above the exemption. This catches many Australians who invest directly in US-listed shares through brokers like IBKR, Stake, or Tiger.",
  },
  {
    q: "What are US-situs assets for estate tax purposes?",
    a: "US-situs assets include: shares in US corporations (NYSE/NASDAQ-listed), US bonds, US real estate, and debt owed by US persons or the US government. Notably, AU-domiciled ETFs that hold US shares (like IVV or VGS listed on the ASX) are NOT US-situs assets — they are shares in an Irish or Australian trust. This is the key structural advantage of AU-listed ETFs for estate planning.",
  },
  {
    q: "Does the Australia-US Estate Tax Treaty protect me?",
    a: "Partially. The Australia-US Estate Tax Treaty (signed 1982) provides a proportional unified credit, which means Australian residents can claim a share of the US$13.6M US resident exemption proportional to the share of the estate that consists of US-situs property. In practice this substantially reduces or eliminates the estate tax exposure for most Australian investors, but: (1) it requires proper documentation and a US estate tax return, (2) treaty benefits don't apply automatically, and (3) the treaty interacts with superannuation and other Australian assets in complex ways. Consult an estate planning lawyer if you hold significant US assets.",
  },
  {
    q: "How do I eliminate US estate tax risk?",
    a: "The simplest structural solution is to hold broad US market exposure via AU-listed ETFs (IVV, VGS, IHVV) rather than direct US-listed shares. These ETFs are Irish or Australian trust structures, not US corporations, so they are not US-situs assets. An Australian estate has no US estate tax exposure from AU-listed ETFs even if the ETF holds 100% US shares.",
  },
  {
    q: "Should I be worried if I hold less than US$60,000 in US shares?",
    a: "Technically no — the non-treaty exemption for NRAs is US$60,000. If your direct US-listed holdings are below this amount, no US estate tax applies. However, the Treaty provides a proportional credit that will further protect most Australians above this threshold. The exposure is most acute for high-net-worth Australians holding millions of dollars in direct US shares without a trust or treaty structure. For casual investors in the $5k–$50k range, the practical risk is low.",
  },
];

export default function UsEstateTaxPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: SITE_URL },
    { name: "Global Investing", url: `${SITE_URL}/global-investing` },
    { name: "Tax", url: `${SITE_URL}/global-investing/tax` },
    { name: "US Estate Tax" },
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
            <span className="text-slate-900 font-medium">US Estate Tax</span>
          </nav>

          <div className="flex items-start gap-3 mb-4">
            <div className="shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-lg">⚠️</div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-red-50 border border-red-200 rounded-full text-xs font-bold text-red-700 mb-2">
                Widely missed by Australian investors
              </div>
              <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 leading-tight">
                US estate tax for Australians
              </h1>
            </div>
          </div>
          <p className="text-lg text-slate-600 leading-relaxed mb-3">
            Australians who hold US-listed shares directly (through Stake, IBKR, Tiger, or similar)
            may be exposed to US federal estate tax — even if they&apos;ve never lived in the US.
            The non-resident alien exemption is only US$60,000, with rates reaching 40%.
          </p>
          <p className="text-xs text-slate-400">{UPDATED_LABEL} · General information only · Not estate planning advice</p>
        </div>
      </section>

      {/* Risk matrix */}
      <section className="py-10 border-b border-slate-100">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-5">Exposure by investment structure</h2>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">Investment type</th>
                  <th className="text-center px-3 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">US-situs?</th>
                  <th className="text-center px-3 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">Estate tax risk</th>
                  <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">Mitigation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[
                  { type: "Direct US shares (NYSE/NASDAQ)", situs: true, risk: "high", mitigation: "Treaty credit or restructure to AU-listed ETF" },
                  { type: "AU-listed US ETFs (IVV, VGS, VTS)", situs: false, risk: "none", mitigation: "No action needed" },
                  { type: "US bonds held directly", situs: true, risk: "high", mitigation: "Hold via AU fund or eliminate above US$60k" },
                  { type: "US real estate", situs: true, risk: "high", mitigation: "Trust/LLC structure (get US estate lawyer)" },
                  { type: "AU broker holding US shares in nominee", situs: true, risk: "high", mitigation: "Same as direct — nominee doesn't help" },
                  { type: "IBKR account (US custodian)", situs: true, risk: "high", mitigation: "Treaty credit; consider IBKR UK/IE instead" },
                ].map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">{row.type}</td>
                    <td className="px-3 py-3 text-center">
                      {row.situs
                        ? <span className="text-red-600 font-bold">Yes</span>
                        : <span className="text-emerald-600 font-bold">No</span>}
                    </td>
                    <td className="px-3 py-3 text-center">
                      {row.risk === "none"
                        ? <span className="inline-block px-2 py-0.5 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full">None</span>
                        : <span className="inline-block px-2 py-0.5 bg-red-50 text-red-700 text-xs font-bold rounded-full capitalize">{row.risk}</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">{row.mitigation}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Key numbers */}
      <section className="py-10 border-b border-slate-100 bg-slate-50">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-5">Key numbers</h2>
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              { value: "US$60,000", label: "NRA exemption", detail: "Basic exemption for non-resident aliens — no treaty" },
              { value: "40%", label: "Top rate", detail: "On US-situs assets above the NRA exemption" },
              { value: "US$13.61M", label: "US citizen exemption", detail: "2024 figure (indexed) — not available to NRAs without treaty" },
            ].map(stat => (
              <div key={stat.value} className="bg-white border border-slate-200 rounded-xl p-4">
                <p className="text-2xl font-extrabold text-slate-900">{stat.value}</p>
                <p className="text-sm font-bold text-slate-700">{stat.label}</p>
                <p className="text-xs text-slate-500 mt-1">{stat.detail}</p>
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
              { href: "/global-investing/tax/cgt-on-foreign-shares", label: "CGT on foreign shares" },
              { href: "/global-investing/etfs", label: "AU-listed US ETFs (avoid US situs)" },
              { href: "/global-investing/tax", label: "Tax hub — all guides" },
              { href: "/find-advisor", label: "Find an estate planning adviser" },
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
            <strong>General advice warning.</strong> {GENERAL_ADVICE_WARNING} This page is general information about US estate tax. It is not tax or legal advice. Consult a registered estate planning lawyer and tax agent for advice specific to your situation.
          </p>
        </div>
      </section>
    </div>
  );
}
