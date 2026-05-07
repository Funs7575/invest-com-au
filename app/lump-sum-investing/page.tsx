import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, absoluteUrl } from "@/lib/seo";
import Icon from "@/components/Icon";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: `What to Do With a Lump Sum in Australia ${CURRENT_YEAR}: Investment Guide | Invest.com.au`,
  description:
    "Suddenly receiving $50K–$500K? Whether redundancy, inheritance or property sale — here's the right sequence to handle it without rushing.",
  alternates: { canonical: `${SITE_URL}/lump-sum-investing` },
  openGraph: {
    title: `What to Do With a Lump Sum in Australia ${CURRENT_YEAR}`,
    description: "The right sequence — universal first steps, then the long-term plan.",
    url: `${SITE_URL}/lump-sum-investing`,
    type: "website",
  },
};

export default function LumpSumHubPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Lump-Sum Investing", url: absoluteUrl("/lump-sum-investing") },
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
              <span className="text-white font-medium">Lump-Sum Investing</span>
            </nav>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight mb-3 max-w-3xl">
              What to Do With a Lump Sum in Australia: Investment Guide
            </h1>
            <p className="text-base md:text-lg text-slate-300 leading-relaxed max-w-3xl">
              Suddenly receiving $50,000–$500,000 is overwhelming. Whether it&rsquo;s redundancy, inheritance or property-sale proceeds — here&rsquo;s exactly what to do, in what order.
            </p>
          </div>
        </section>

        {/* Scenarios */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-5xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-2">Pick your scenario</h2>
            <p className="text-sm text-slate-600 mb-6">Each lump sum has its own tax window and risks. Start with the right one.</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { title: "Redundancy payout", desc: "Tax-free thresholds, super contribution windows and the buffer-first rule.", href: "/lump-sum-investing/redundancy", icon: "user-x" },
                { title: "Inheritance", desc: "No inheritance tax — but CGT, super inheritance rules and the 90-day rule.", href: "/lump-sum-investing/inheritance", icon: "gift" },
                { title: "Property sale proceeds", desc: "What to do with $200K+ after settlement — projection calculator.", href: "/lump-sum-investing/calculator", icon: "home" },
              ].map((c) => (
                <Link key={c.href} href={c.href} className="group rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 p-5 transition-colors">
                  <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center mb-3"><Icon name={c.icon} size={20} className="text-amber-700" /></div>
                  <h3 className="font-extrabold text-slate-900 group-hover:text-amber-700 mb-1.5">{c.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{c.desc}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Universal first steps */}
        <section className="py-12 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-5xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-2">Universal first steps</h2>
            <p className="text-sm text-slate-600 mb-6">Regardless of source, do these before investing.</p>
            <ol className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                { n: 1, title: "Don't rush", body: "Park in a high-interest savings account.", link: "/compare?category=savings", linkLabel: "Compare savings →" },
                { n: 2, title: "Talk to a financial planner", body: "Before any investment decision.", link: "/advisors/financial-planners", linkLabel: "Find a planner →" },
                { n: 3, title: "Consider super contributions", body: "$30K concessional / $120K non-concessional caps. Carry-forward may apply if TSB < $500K.", link: "/super/contributions", linkLabel: "Super contributions →" },
                { n: 4, title: "Understand your tax position", body: "Year-end timing materially changes the outcome — talk to a tax agent before 30 June.", link: "/advisors/tax-agents", linkLabel: "Find a tax agent →" },
              ].map((s) => (
                <li key={s.n} className="rounded-xl border border-slate-200 bg-white p-5">
                  <div className="w-9 h-9 rounded-full bg-amber-500 text-slate-900 flex items-center justify-center font-extrabold mb-3">{s.n}</div>
                  <h3 className="font-extrabold text-slate-900 mb-1">{s.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed mb-2">{s.body}</p>
                  <Link href={s.link} className="text-sm font-bold text-amber-600 hover:underline">{s.linkLabel}</Link>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* After advice */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-5xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-2">Investment options (after advice)</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {[
                { label: "Shares & ETFs", href: "/compare" },
                { label: "Property", href: "/property" },
                { label: "SMSF boost", href: "/smsf" },
                { label: "Term deposits", href: "/compare?category=term-deposits" },
                { label: "Managed funds", href: "/invest/funds" },
              ].map((c) => (
                <Link key={c.href} href={c.href} className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm font-bold text-slate-900 hover:bg-amber-50 hover:border-amber-300 transition-colors text-center">
                  {c.label}
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="py-10 bg-slate-50 border-t border-slate-200">
          <div className="container-custom max-w-4xl text-center">
            <Link href="/lump-sum-investing/calculator" className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-extrabold text-sm md:text-base px-6 py-3 rounded-lg transition-colors">
              Project your lump sum&rsquo;s growth <Icon name="arrow-right" size={16} />
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}
