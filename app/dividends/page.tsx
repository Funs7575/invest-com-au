import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, absoluteUrl } from "@/lib/seo";
import Icon from "@/components/Icon";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: `Dividend Investing Australia ${CURRENT_YEAR}: Franking Credits, Stocks & ETFs | Invest.com.au`,
  description:
    "Australia's franking system makes dividend investing structurally different. High-yield ASX stocks, dividend ETFs, franking-credit calculator and the SMSF crossover.",
  alternates: { canonical: `${SITE_URL}/dividends` },
  openGraph: {
    title: `Dividend Investing Australia ${CURRENT_YEAR}`,
    description: "Franking credits, ASX high-yield stocks, dividend ETFs and the SMSF crossover.",
    url: `${SITE_URL}/dividends`,
    type: "website",
  },
};

export default function DividendsHubPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Dividends", url: absoluteUrl("/dividends") },
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
              <span className="text-white font-medium">Dividends</span>
            </nav>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight mb-3 max-w-3xl">
              Dividend Investing in Australia: Franking Credits, High-Yield Stocks &amp; ETFs
            </h1>
            <p className="text-base md:text-lg text-slate-300 leading-relaxed max-w-3xl mb-6">
              Australia&rsquo;s franking system makes dividend investing structurally different — and uniquely powerful inside super and SMSF wrappers. Here&rsquo;s how to use it.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-4xl">
              {[
                { v: "~4.2%", l: "ASX avg yield", sub: "much higher than US/UK index" },
                { v: "42.86%", l: "Franking add-on", sub: "for fully-franked dividends" },
                { v: "1.1M", l: "SMSFs", sub: "claim full franking refunds in pension phase" },
                { v: "DRP", l: "Reinvestment", sub: "available at most ASX payers" },
              ].map((s) => (
                <div key={s.l} className="bg-white/10 border border-white/10 rounded-lg px-3 py-2.5">
                  <dt className="text-[10px] font-bold uppercase text-slate-400 tracking-wide">{s.l}</dt>
                  <dd className="text-xl md:text-2xl font-extrabold text-white mt-0.5">{s.v}</dd>
                  <p className="text-[10px] text-slate-400 mt-0.5">{s.sub}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-12 bg-white">
          <div className="container-custom max-w-6xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-2">Four entry points</h2>
            <p className="text-sm text-slate-600 mb-6">Pick the path that matches your portfolio stage.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { title: "ASX High-Yield Stocks", desc: "WDS, the major banks, BHP, Telstra and more — with franking analysis.", href: "/article/high-dividend-asx-stocks-2026" },
                { title: "Dividend ETFs", desc: "VHY, A200, HVST, IHD compared on yield, fees and methodology.", href: "/article/best-dividend-etfs-australia" },
                { title: "Franking Credits Explained", desc: "How the offset works, who benefits most, who doesn't.", href: "/dividends/franking-credits" },
                { title: "Franking Calculator", desc: "Enter dividend amount, franking %, your tax rate. See the after-tax outcome.", href: "/dividends/calculator" },
              ].map((c) => (
                <Link key={c.href} href={c.href} className="group rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 p-5 transition-colors">
                  <h3 className="font-extrabold text-slate-900 group-hover:text-amber-700 mb-2">{c.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{c.desc}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="py-12 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-4xl">
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
              <h2 className="text-xl md:text-2xl font-extrabold text-amber-900 mb-2 flex items-center gap-2">
                <Icon name="lightbulb" size={20} className="text-amber-700" />
                The SMSF franking crossover
              </h2>
              <p className="text-sm text-amber-900 leading-relaxed">
                SMSF trustees in pension phase receive full franking-credit refunds as cash — even when the fund pays zero tax. A $1,000 fully-franked dividend yields $1,428.57 of cash to a pension-phase SMSF. This is one of the most powerful single tax outcomes available to Australian retail investors, and it&rsquo;s why dividend-heavy ASX equity allocations are a structural choice in pension-phase SMSFs.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link href="/smsf" className="text-sm font-bold text-amber-800 hover:underline">SMSF hub →</Link>
                <span className="text-amber-300">•</span>
                <Link href="/advisors/smsf-accountants" className="text-sm font-bold text-amber-800 hover:underline">SMSF accountants →</Link>
              </div>
            </div>
          </div>
        </section>

        <section className="py-12 bg-white">
          <div className="container-custom max-w-4xl text-center">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-3">Start collecting dividends</h2>
            <p className="text-sm text-slate-600 mb-6 max-w-2xl mx-auto">Compare low-cost share-trading platforms — CHESS-sponsored holdings give the cleanest tax outcomes for direct dividend collection.</p>
            <Link href="/compare" className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-extrabold text-sm md:text-base px-6 py-3 rounded-lg transition-colors">
              Compare share platforms <Icon name="arrow-right" size={16} />
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}
