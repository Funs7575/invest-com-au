import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, absoluteUrl } from "@/lib/seo";
import Icon from "@/components/Icon";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Franking Credits Explained: How the Australian Dividend Tax Offset Works | Invest.com.au",
  description:
    "The definitive plain-English guide to franking credits. How grossing-up works, who benefits, the 45-day rule, and the DTA table for non-residents.",
  alternates: { canonical: `${SITE_URL}/dividends/franking-credits` },
  openGraph: {
    title: "Franking Credits Explained: How the Australian Dividend Tax Offset Works",
    description: "Plain-English mechanics, worked examples and the 45-day holding rule.",
    url: `${SITE_URL}/dividends/franking-credits`,
    type: "website",
  },
};

const DTA_RATES = [
  { country: "Singapore",      rate: "0% / 15%", note: "0% on franked, 15% withholding on unfranked portion." },
  { country: "Hong Kong",      rate: "0% / 15%", note: "Same DTA construction as Singapore." },
  { country: "Japan",          rate: "0% / 10%", note: "Reduced WHT on unfranked portion." },
  { country: "United States",  rate: "0% / 15%", note: "Standard treaty rate; 0% on franked component." },
  { country: "United Kingdom", rate: "0% / 15%", note: "Standard treaty rate; 0% on franked component." },
  { country: "China",          rate: "0% / 15%", note: "PRC residents — 0% on franked, 15% on unfranked." },
];

export default function FrankingCreditsPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Dividends", url: absoluteUrl("/dividends") },
    { name: "Franking Credits", url: absoluteUrl("/dividends/franking-credits") },
  ]);
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <div className="bg-white min-h-screen">
        <section className="bg-slate-900 text-white py-10 md:py-14">
          <div className="container-custom">
            <nav className="flex items-center gap-1.5 text-xs text-slate-400 mb-5" aria-label="Breadcrumb">
              <Link href="/" className="hover:text-white">Home</Link>
              <span className="text-slate-600">/</span>
              <Link href="/dividends" className="hover:text-white">Dividends</Link>
              <span className="text-slate-600">/</span>
              <span className="text-white font-medium">Franking Credits</span>
            </nav>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight mb-3 max-w-3xl">
              Franking Credits Explained
            </h1>
            <p className="text-base md:text-lg text-slate-300 leading-relaxed max-w-3xl">
              The plain-English guide to one of the most powerful — and most misunderstood — features of Australian investing.
            </p>
          </div>
        </section>

        <section className="py-12 bg-white">
          <div className="container-custom max-w-4xl prose-content">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-3">The mechanics, in plain English</h2>
            <p className="text-slate-700 leading-relaxed mb-3">
              Australian companies pay 30% (or 25% for base-rate entities) corporate tax on profits before paying dividends. When they pay a fully-franked dividend, they attach a franking credit equal to the corporate tax already paid.
            </p>
            <p className="text-slate-700 leading-relaxed mb-3">
              As a shareholder, you &ldquo;gross up&rdquo; the dividend by adding the franking credit, calculate tax on the grossed-up amount at your marginal rate, then subtract the franking credit as a tax offset.
            </p>
            <p className="text-slate-700 leading-relaxed">
              The net effect: dividends are taxed at the difference between your marginal rate and the corporate rate. If your marginal rate is below the corporate rate, the franking credit becomes a refund.
            </p>
          </div>
        </section>

        <section className="py-12 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-3">Worked example</h2>
            <p className="text-sm text-slate-600 mb-5">Take a $1,000 fully-franked dividend. The grossed-up amount is $1,428.57 ($1,000 + $428.57 franking credit).</p>
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
              <table className="w-full text-sm">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="px-4 py-3 text-left font-extrabold text-slate-700">Investor type</th>
                    <th className="px-4 py-3 text-right font-extrabold text-slate-700">Tax on grossed-up</th>
                    <th className="px-4 py-3 text-right font-extrabold text-slate-700">Net (after franking offset)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr><td className="px-4 py-3 font-bold">47% marginal</td><td className="px-4 py-3 text-right">$671.43</td><td className="px-4 py-3 text-right font-bold text-red-600">$242.86 net tax</td></tr>
                  <tr><td className="px-4 py-3 font-bold">19% marginal</td><td className="px-4 py-3 text-right">$271.43</td><td className="px-4 py-3 text-right font-bold text-emerald-600">$157.14 refund</td></tr>
                  <tr><td className="px-4 py-3 font-bold">SMSF (15% accumulation)</td><td className="px-4 py-3 text-right">$214.29</td><td className="px-4 py-3 text-right font-bold text-emerald-600">$214.28 refund</td></tr>
                  <tr><td className="px-4 py-3 font-bold">SMSF pension phase (0%)</td><td className="px-4 py-3 text-right">$0</td><td className="px-4 py-3 text-right font-bold text-emerald-600">$428.57 refund</td></tr>
                </tbody>
              </table>
            </div>
            <div className="mt-5 text-center">
              <Link href="/dividends/calculator" className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-extrabold text-sm px-5 py-2.5 rounded-lg">
                Try the calculator with your numbers <Icon name="arrow-right" size={14} />
              </Link>
            </div>
          </div>
        </section>

        <section className="py-12 bg-white">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-3">Who benefits — and who doesn&rsquo;t</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
                <h3 className="font-extrabold text-emerald-900 mb-3">Biggest beneficiaries</h3>
                <ul className="space-y-2 text-sm text-slate-800">
                  <li>✅ SMSFs in pension phase (0% tax)</li>
                  <li>✅ Low marginal rate retail investors (under 30%)</li>
                  <li>✅ Charities and tax-exempt entities</li>
                </ul>
              </div>
              <div className="rounded-xl border border-red-200 bg-red-50 p-5">
                <h3 className="font-extrabold text-red-900 mb-3">Don&rsquo;t benefit fully</h3>
                <ul className="space-y-2 text-sm text-slate-800">
                  <li>❌ Non-residents (offsets don&rsquo;t refund)</li>
                  <li>❌ Top-bracket marginal investors (residual tax payable)</li>
                  <li>❌ Investors who fail the 45-day holding rule</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section className="py-12 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-3">Non-residents — DTA reference</h2>
            <p className="text-sm text-slate-600 mb-5">Franking credits do not refund to non-residents. The unfranked component of a dividend is subject to withholding tax at the DTA-reduced rate.</p>
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
              <table className="w-full text-sm">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="px-4 py-3 text-left font-extrabold text-slate-700">Country</th>
                    <th className="px-4 py-3 text-left font-extrabold text-slate-700">WHT (franked / unfranked)</th>
                    <th className="px-4 py-3 text-left font-extrabold text-slate-700">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {DTA_RATES.map((r) => (
                    <tr key={r.country}>
                      <td className="px-4 py-3 font-bold text-slate-900">{r.country}</td>
                      <td className="px-4 py-3">{r.rate}</td>
                      <td className="px-4 py-3 text-slate-600">{r.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-slate-500 mt-3">Rates are indicative and assume a beneficial-owner who is a resident of the listed country. See <Link href="/foreign-investment/tax" className="text-amber-700 hover:underline font-bold">our DTA & WHT guide</Link> for the full treatment.</p>
          </div>
        </section>

        <section className="py-10 bg-white border-t border-slate-200">
          <div className="container-custom max-w-4xl">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <Link href="/dividends/calculator" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">Franking calculator →</Link>
              <Link href="/article/franking-credits-explained-australia" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">Read the full guide →</Link>
              <Link href="/tax/franking-credits" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">Tax hub: franking →</Link>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
