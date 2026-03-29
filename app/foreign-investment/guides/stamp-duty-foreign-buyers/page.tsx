import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL } from "@/lib/seo";
import { STATE_SURCHARGES } from "@/lib/firb-data";
import { FIRB_DISCLAIMER, FOREIGN_BUYER_STAMP_DUTY_WARNING } from "@/lib/compliance";
import SectionHeading from "@/components/SectionHeading";

export const metadata: Metadata = {
  title: "Foreign Buyer Stamp Duty by State (2026) — Invest.com.au",
  description:
    "Foreign buyer stamp duty surcharges for every Australian state and territory in 2026. NSW, VIC, QLD, WA, SA, TAS and ACT rates, land tax surcharges, and cost examples for $500K, $1M and $2M purchases.",
  openGraph: {
    title: "Foreign Buyer Stamp Duty by State (2026) — Australia",
    description:
      "State-by-state stamp duty surcharges for foreign property buyers in Australia. Includes land tax surcharges and real cost examples.",
    url: `${SITE_URL}/foreign-investment/guides/stamp-duty-foreign-buyers`,
    images: [
      {
        url: `/api/og?title=${encodeURIComponent("Foreign Buyer Stamp Duty by State")}&sub=${encodeURIComponent("NSW · VIC · QLD · WA · SA · All States · 2026")}`,
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: `${SITE_URL}/foreign-investment/guides/stamp-duty-foreign-buyers` },
};

export const revalidate = 86400;

// Cost examples at key property values
function calcSurcharge(percent: number, purchasePrice: number) {
  return Math.round(purchasePrice * (percent / 100));
}

const PRICE_EXAMPLES = [500_000, 750_000, 1_000_000, 1_500_000, 2_000_000];

export default function StampDutyForeignBuyersPage() {
  return (
    <div className="bg-white min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbJsonLd([
              { name: "Home", url: SITE_URL },
              { name: "Foreign Investment", url: `${SITE_URL}/foreign-investment` },
              { name: "Guides", url: `${SITE_URL}/foreign-investment/guides` },
              { name: "Foreign Buyer Stamp Duty by State" },
            ])
          ),
        }}
      />

      {/* ── Hero ── */}
      <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white py-10 md:py-14">
        <div className="container-custom">
          <nav className="text-xs text-slate-400 mb-5 flex items-center gap-1.5 flex-wrap">
            <Link href="/" className="hover:text-slate-200">Home</Link>
            <span>/</span>
            <Link href="/foreign-investment" className="hover:text-slate-200">Foreign Investment</Link>
            <span>/</span>
            <Link href="/foreign-investment/guides" className="hover:text-slate-200">Guides</Link>
            <span>/</span>
            <span className="text-slate-300">Foreign Buyer Stamp Duty by State</span>
          </nav>

          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/20 border border-amber-500/30 rounded-full text-xs font-semibold text-amber-300 mb-4">
              <span className="w-1.5 h-1.5 bg-amber-400 rounded-full" />
              Updated March 2026
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold leading-[1.1] mb-4 tracking-tight">
              Foreign Buyer Stamp Duty{" "}
              <span className="text-amber-400">by State (2026)</span>
            </h1>
            <p className="text-sm md:text-base text-slate-300 leading-relaxed mb-6">
              Every Australian state charges foreign buyers an additional stamp duty surcharge on top of standard rates.
              These surcharges range from 7% to 8% of the purchase price and apply to all foreign persons —
              regardless of visa status. This guide shows exact rates, land tax surcharges, and real cost examples.
            </p>
          </div>
        </div>
      </section>

      <div className="container-custom py-8 md:py-12 space-y-12 md:space-y-16">

        {/* ── Quick summary ── */}
        <section className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
          <h2 className="text-base font-bold text-slate-800 mb-4">Key points</h2>
          <ul className="space-y-2 text-sm text-slate-700">
            <li className="flex items-start gap-2">
              <span className="text-amber-500 font-bold mt-0.5">•</span>
              <span>All states charge <strong>7–8%</strong> surcharge on top of standard stamp duty for foreign buyers.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-500 font-bold mt-0.5">•</span>
              <span>The surcharge applies to <strong>all residential property</strong> — not just established dwellings.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-500 font-bold mt-0.5">•</span>
              <span>Most states also apply a <strong>land tax surcharge</strong> (1–4% p.a.) on foreign-owned properties.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-500 font-bold mt-0.5">•</span>
              <span>On a $1M property in NSW or VIC, the foreign buyer surcharge alone is <strong>$80,000</strong>.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-500 font-bold mt-0.5">•</span>
              <span>The Northern Territory is currently the only jurisdiction <strong>without</strong> a surcharge.</span>
            </li>
          </ul>
        </section>

        {/* ── Main surcharge table ── */}
        <section>
          <SectionHeading
            eyebrow="State Rates"
            title="Foreign buyer stamp duty surcharges — all states"
            sub="Rates current as at March 2026. Check your state revenue office for most recent rates."
          />
          <div className="overflow-x-auto">
            <table className="w-full text-sm border border-slate-200 rounded-xl overflow-hidden">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-left">
                  <th className="px-4 py-3 font-semibold text-slate-600 text-xs">State / Territory</th>
                  <th className="px-4 py-3 font-semibold text-slate-600 text-xs">Stamp Duty Surcharge</th>
                  <th className="px-4 py-3 font-semibold text-slate-600 text-xs hidden md:table-cell">Land Tax Surcharge</th>
                  <th className="px-4 py-3 font-semibold text-slate-600 text-xs hidden lg:table-cell">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {STATE_SURCHARGES.map((s) => (
                  <tr key={s.stateCode} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-medium text-slate-800">{s.state}</span>
                      <span className="ml-2 text-xs text-slate-400">{s.stateCode}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`font-bold text-lg ${s.surchargePercent > 0 ? "text-red-700" : "text-emerald-700"}`}>
                        {s.surchargePercent > 0 ? `${s.surchargePercent}%` : "0% (None)"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 hidden md:table-cell">
                      {s.landTaxSurchargePercent ? (
                        <span className="font-semibold text-orange-700">{s.landTaxSurchargePercent}% p.a.</span>
                      ) : (
                        <span className="text-slate-400">None</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 hidden lg:table-cell">{s.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Sources: State revenue offices. Rates can change — verify with{" "}
            <a href="https://www.revenue.nsw.gov.au" className="underline text-amber-600" target="_blank" rel="noopener noreferrer">Revenue NSW</a>,{" "}
            <a href="https://www.sro.vic.gov.au" className="underline text-amber-600" target="_blank" rel="noopener noreferrer">SRO Victoria</a>, or your state equivalent before transacting.
          </p>
        </section>

        {/* ── Cost examples ── */}
        <section>
          <SectionHeading
            eyebrow="Cost Examples"
            title="Foreign buyer surcharge cost examples"
            sub="Surcharge only — add standard state stamp duty on top for total stamp duty cost."
          />
          <div className="overflow-x-auto">
            <table className="w-full text-sm border border-slate-200 rounded-xl overflow-hidden">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-left">
                  <th className="px-4 py-3 font-semibold text-slate-600 text-xs">State</th>
                  <th className="px-4 py-3 font-semibold text-slate-600 text-xs">Rate</th>
                  {PRICE_EXAMPLES.map((p) => (
                    <th key={p} className="px-3 py-3 font-semibold text-slate-600 text-xs text-right hidden sm:table-cell">
                      ${(p / 1_000_000).toFixed(p < 1_000_000 ? 1 : 1)}M
                    </th>
                  ))}
                  <th className="px-3 py-3 font-semibold text-slate-600 text-xs text-right sm:hidden">$1M</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {STATE_SURCHARGES.filter((s) => s.surchargePercent > 0).map((s) => (
                  <tr key={s.stateCode} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-800">{s.state}</td>
                    <td className="px-4 py-3 font-bold text-red-700">{s.surchargePercent}%</td>
                    {PRICE_EXAMPLES.map((p) => (
                      <td key={p} className="px-3 py-3 text-right text-slate-700 tabular-nums hidden sm:table-cell">
                        ${calcSurcharge(s.surchargePercent, p).toLocaleString("en-AU")}
                      </td>
                    ))}
                    <td className="px-3 py-3 text-right font-bold text-red-700 tabular-nums sm:hidden">
                      ${calcSurcharge(s.surchargePercent, 1_000_000).toLocaleString("en-AU")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            These are <strong>surcharges only</strong>. Add standard state stamp duty (which varies by value and state) to
            get your total stamp duty bill. Use your state&apos;s stamp duty calculator for the full amount.
          </p>
        </section>

        {/* ── State-by-state detail ── */}
        <section>
          <SectionHeading
            eyebrow="State Details"
            title="State-by-state breakdown"
            sub="Surcharge rules, exemptions, and key conditions vary by state."
          />
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              {
                state: "New South Wales",
                surcharge: "8%",
                landTax: "4% p.a.",
                detail: "Foreign person surcharge applies to residential land. Land tax surcharge applies annually on 31 December land value. NSW Revenue exempts certain foreign companies in limited circumstances.",
                url: "https://www.revenue.nsw.gov.au",
              },
              {
                state: "Victoria",
                surcharge: "8%",
                landTax: "2% p.a.",
                detail: "Applies to foreign purchasers of residential property. Additional Residential Property Landtax (ARPL) surcharge applies annually. SRO has robust data-matching to identify foreign purchasers.",
                url: "https://www.sro.vic.gov.au",
              },
              {
                state: "Queensland",
                surcharge: "7%",
                landTax: "2% p.a.",
                detail: "Lower stamp duty surcharge than NSW/VIC makes Queensland relatively more attractive. Land tax surcharge applies on residential land held as at 30 June.",
                url: "https://www.qro.qld.gov.au",
              },
              {
                state: "Western Australia",
                surcharge: "7%",
                landTax: "None",
                detail: "WA does not currently charge a land tax surcharge for foreign buyers — a meaningful advantage for investors holding property long-term.",
                url: "https://www.finance.wa.gov.au",
              },
              {
                state: "South Australia",
                surcharge: "7%",
                landTax: "None",
                detail: "Lower property prices in Adelaide combined with no land tax surcharge can make SA cost-competitive for foreign buyers despite surcharge.",
                url: "https://www.revenuesa.sa.gov.au",
              },
              {
                state: "Tasmania",
                surcharge: "8%",
                landTax: "None",
                detail: "Applies to foreign buyers of residential land. Tasmania does not currently have a recurring land tax surcharge for foreigners.",
                url: "https://www.sro.tas.gov.au",
              },
              {
                state: "ACT",
                surcharge: "7%",
                landTax: "None",
                detail: "ACT charges a foreign buyer stamp duty surcharge. The ACT uses a different conveyancing fee structure (annual rates-based levy rather than stamp duty). Consult an ACT specialist.",
                url: "https://www.revenue.act.gov.au",
              },
              {
                state: "Northern Territory",
                surcharge: "0% (None)",
                landTax: "None",
                detail: "The NT is currently the only jurisdiction without a foreign buyer surcharge. However, the NT property market is small and illiquid — limited off-the-plan options for foreign buyers.",
                url: "https://ntrevenue.nt.gov.au",
              },
            ].map((s) => (
              <div key={s.state} className="border border-slate-200 rounded-xl p-5 hover:border-amber-200 transition-colors">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <h3 className="font-bold text-slate-800">{s.state}</h3>
                  <div className="text-right">
                    <span className={`text-sm font-extrabold ${s.surcharge === "0% (None)" ? "text-emerald-700" : "text-red-700"}`}>{s.surcharge}</span>
                    <p className="text-xs text-slate-400">stamp duty</p>
                  </div>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed mb-2">{s.detail}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">Land tax: <strong>{s.landTax}</strong></span>
                  <a href={s.url} className="text-xs text-amber-600 hover:text-amber-700 underline" target="_blank" rel="noopener noreferrer">Revenue office &rarr;</a>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Exemptions ── */}
        <section>
          <SectionHeading
            eyebrow="Exemptions"
            title="Are there any exemptions from the surcharge?"
            sub="Exemptions are narrow. Most foreign buyers will pay the full surcharge."
          />
          <div className="space-y-3">
            {[
              { title: "Principal place of residence (some states)", desc: "NSW and Victoria have limited exemptions where the foreign buyer is a temporary resident using the property as their primary residence. Conditions apply — consult a specialist." },
              { title: "Spouse / partner is an Australian citizen or PR", desc: "In some states, if one buyer is an Australian citizen or PR and the other is a foreign person, reduced surcharge rules may apply. Rules differ by state." },
              { title: "New Zealand citizens", desc: "NZ citizens generally have the same treatment as Australian citizens — exempt from most surcharges in most states. Verify with your state revenue office." },
              { title: "Certain trust structures", desc: "In limited circumstances, properties held through specific discretionary trust structures may avoid classification as foreign-owned. This requires specialist advice — do not attempt without a lawyer." },
            ].map((item) => (
              <div key={item.title} className="border border-amber-200 bg-amber-50/30 rounded-xl p-4">
                <h3 className="font-bold text-slate-800 text-sm mb-1.5">{item.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Related links ── */}
        <section>
          <SectionHeading eyebrow="Related Guides" title="More on foreign property investment" />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { title: "How to Buy Property in Australia as a Foreigner", href: "/foreign-investment/guides/buy-property-australia-foreigner" },
              { title: "FIRB Application: Step-by-Step Guide", href: "/foreign-investment/guides/firb-application-guide" },
              { title: "Australia's Foreign Buyer Property Ban 2025–2027", href: "/foreign-investment/guides/property-ban-2025" },
              { title: "FIRB-Eligible Listings", href: "/property/listings?firb=true" },
              { title: "Find a Buyer's Agent", href: "/property/buyer-agents" },
              { title: "Send Money to Australia", href: "/foreign-investment/send-money-australia" },
            ].map((guide) => (
              <Link key={guide.href} href={guide.href} className="group block p-4 border border-slate-200 rounded-xl hover:border-amber-300 hover:bg-amber-50/30 transition-all">
                <span className="font-semibold text-sm text-slate-800 group-hover:text-amber-700">{guide.title} &rarr;</span>
              </Link>
            ))}
          </div>
        </section>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500 leading-relaxed">{FOREIGN_BUYER_STAMP_DUTY_WARNING}</p>
        </div>
      </div>
    </div>
  );
}
