import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, UPDATED_LABEL, absoluteUrl } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `Estate Planning & Tax in Australia (${CURRENT_YEAR}) — CGT, Super & Testamentary Trusts`,
  description: `Australian estate planning and tax: CGT at death, super death benefits, testamentary trusts, and no inheritance tax. ${UPDATED_LABEL}.`,
  openGraph: {
    title: `Estate Planning & Tax Australia (${CURRENT_YEAR})`,
    description:
      "CGT at death, super death benefits tax, testamentary trusts for minors, and the estate vs non-estate asset distinction explained.",
    url: `${SITE_URL}/tax/estate-planning`,
    images: [{ url: `/api/og?title=${encodeURIComponent("Estate Planning & Tax Australia")}&sub=${encodeURIComponent("CGT at Death · Super Death Benefits · Testamentary Trusts · " + CURRENT_YEAR)}`, width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: `${SITE_URL}/tax/estate-planning` },
};

const FAQS = [
  {
    q: "Is there inheritance tax or death duty in Australia?",
    a: "No. Australia has no inheritance tax (abolished in 1979) and no death duty. Beneficiaries receive assets tax-free from an estate perspective. However, CGT is deferred (not waived) on most assets — beneficiaries inherit the cost base.",
  },
  {
    q: "Does CGT apply when someone dies?",
    a: "CGT is deferred, not extinguished. When the beneficiary eventually sells the asset, they inherit the original cost base and acquisition date. However, main residence property sold within 2 years of death is generally CGT-free. Pre-CGT assets (acquired before 20 September 1985) remain exempt.",
  },
  {
    q: "Does super go through the estate?",
    a: "Not automatically. Super passes according to your Binding Death Benefit Nomination (BDBN), not your Will. If no valid BDBN exists, the trustee decides where it goes. Adult children receiving super face a 17% tax on the taxable component. A BDBN directing super through your estate — then into a testamentary trust — can be a tax-efficient solution for complex estates.",
  },
  {
    q: "What is a testamentary trust?",
    a: "A trust created by a Will that only comes into effect on death. Key advantage: minor beneficiaries (under 18) are taxed at adult marginal rates instead of penalty rates (up to 47%). This can save significant tax where children are to inherit income-producing assets. The trust must be expressly provided for in the Will.",
  },
  {
    q: "How can I minimise estate taxes for my children?",
    a: "Key strategies include: (1) Direct super to estate via BDBN and into a testamentary trust; (2) Gift assets to low-income beneficiaries while alive (CGT event, but may be at low rate); (3) Joint ownership for spousal assets (automatic transfer, defers CGT); (4) Testamentary trust for minor or financially vulnerable beneficiaries. Professional advice is essential as the right strategy depends on your asset mix.",
  },
  {
    q: "How often should I update my estate plan?",
    a: "Review after major life events: marriage (new Will required — marriage revokes prior Wills in most states), divorce (revokes gifts to ex-spouse but not the Will itself), births, deaths in the family, major asset acquisitions, changes in business structures. Also check BDBN expiry — most lapse after 3 years.",
  },
];

const CGT_ROWS = [
  {
    asset: "Pre-CGT assets (acquired before 20/9/1985)",
    outcome: "Still exempt from CGT — no tax on death",
    highlight: false,
  },
  {
    asset: "Post-CGT assets passing to spouse/partner",
    outcome: "CGT deferred — spouse inherits cost base. No tax until spouse sells.",
    highlight: false,
  },
  {
    asset: "Post-CGT assets passing to other beneficiaries",
    outcome: "CGT deferred — beneficiary inherits cost base and acquisition date.",
    highlight: false,
  },
  {
    asset: "Asset sold by executor before distribution",
    outcome: "Estate pays CGT — 50% discount if trustee held 12+ months.",
    highlight: true,
  },
  {
    asset: "Main residence",
    outcome: "CGT-free under the 2-year administration rule if sold within 2 years of death.",
    highlight: false,
  },
  {
    asset: "Foreign property",
    outcome: "CGT applies — no deferral for non-Australian assets in some cases.",
    highlight: true,
  },
];

const CHECKLIST_ITEMS = [
  "Up-to-date Will reviewed by solicitor",
  "Binding Death Benefit Nomination in super (check expiry — most lapse after 3 years)",
  "Insurance nomination current",
  "Enduring Power of Attorney (financial)",
  "Enduring Guardian (medical decisions)",
  "Joint vs sole ownership reviewed for property",
  "Digital assets documented (crypto, passwords)",
  "Testamentary trust considered for large estates (>$500k) with minor or financially vulnerable beneficiaries",
];

export default function EstatePlanningTaxPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Tax", url: absoluteUrl("/tax") },
    { name: "Estate Planning", url: absoluteUrl("/tax/estate-planning") },
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
              <Link href="/tax" className="hover:text-white">Tax</Link>
              <span className="text-slate-600">/</span>
              <span className="text-white font-medium">Estate Planning</span>
            </nav>
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className="text-xs font-semibold bg-amber-500 text-slate-900 px-3 py-1 rounded-full">
                {UPDATED_LABEL}
              </span>
              <span className="text-xs font-semibold bg-slate-700 text-slate-200 px-3 py-1 rounded-full">
                No Inheritance Tax in Australia
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight mb-3 max-w-3xl">
              Estate Planning &amp; Tax in Australia
            </h1>
            <p className="text-base md:text-lg text-slate-300 leading-relaxed max-w-3xl">
              Australia has no inheritance tax — but CGT, super death benefits, and testamentary trusts
              mean the tax implications of estate planning are significant and often misunderstood.
            </p>
          </div>
        </section>

        {/* Key Stats */}
        <section className="bg-white py-8 border-b border-slate-100">
          <div className="container-custom">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                {
                  v: "$0",
                  l: "Inheritance tax / death duty",
                  sub: "Abolished in Australia in 1979",
                },
                {
                  v: "Deferred",
                  l: "CGT on most assets at death",
                  sub: "Not wiped — beneficiary inherits cost base",
                },
                {
                  v: "Not estate",
                  l: "Super is non-estate by default",
                  sub: "Directed by BDBN, not your Will",
                },
                {
                  v: "Adult rates",
                  l: "Testamentary trust: minors taxed",
                  sub: "Saves up to 47% penalty rate for under-18s",
                },
              ].map((s) => (
                <div key={s.l} className="rounded-xl bg-slate-50 border border-slate-200 p-4">
                  <div className="text-2xl font-extrabold text-slate-900">{s.v}</div>
                  <div className="text-xs font-bold text-slate-700 mt-0.5">{s.l}</div>
                  <div className="text-xs text-slate-500">{s.sub}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Estate vs Non-Estate Assets */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-2">
              Estate vs non-estate assets
            </h2>
            <p className="text-sm text-slate-600 mb-6 leading-relaxed">
              The most important distinction in Australian estate planning: not everything you own
              passes through your Will.
            </p>
            <div className="grid md:grid-cols-2 gap-4 mb-6">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
                <h3 className="font-extrabold text-emerald-900 mb-3">Estate assets (governed by Will)</h3>
                <ul className="space-y-1.5 text-sm text-emerald-800">
                  {[
                    "Bank accounts (sole name)",
                    "Shares and managed funds (sole name)",
                    "Investment and residential property (sole name)",
                    "Personal effects, vehicles, collectables",
                    "Business interests (sole trader, partnership shares)",
                  ].map((item) => (
                    <li key={item} className="flex gap-2">
                      <span className="flex-shrink-0 text-emerald-600">&#10003;</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
                <h3 className="font-extrabold text-amber-900 mb-3">Non-estate assets (NOT governed by Will)</h3>
                <ul className="space-y-1.5 text-sm text-amber-800">
                  {(
                    [
                      "Jointly-held property — passes to surviving owner automatically",
                      "Superannuation — directed by Binding Death Benefit Nomination",
                      "Life insurance — directed by policy nomination",
                      "Joint bank accounts — passes to joint account holder",
                    ] as const
                  ).map((item) => (
                    <li key={item} className="flex gap-2">
                      <span className="flex-shrink-0 text-amber-600">!</span>
                      <span>{item}</span>
                    </li>
                  ))}
                  <li className="flex gap-2">
                    <span className="flex-shrink-0 text-amber-600">!</span>
                    <span>Assets held in a trust — trustee&apos;s discretion applies</span>
                  </li>
                </ul>
              </div>
            </div>
            <div className="rounded-xl border border-slate-300 bg-slate-100 p-4">
              <p className="text-sm font-semibold text-slate-900">
                Key takeaway: For most Australians, superannuation is their largest single asset —
                and it is not covered by the Will. A valid, current Binding Death Benefit Nomination
                is essential.
              </p>
            </div>
          </div>
        </section>

        {/* CGT at Death */}
        <section className="py-10 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-2">
              CGT at death — how it works
            </h2>
            <p className="text-sm text-slate-600 mb-6 leading-relaxed">
              Death is not a CGT event for most Australian assets. Instead, CGT is deferred: the
              beneficiary inherits the cost base and acquisition date of the deceased. Tax only arises
              when the beneficiary eventually sells.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse" aria-label="CGT outcomes by asset type on death">
                <thead>
                  <tr className="bg-slate-800 text-white">
                    <th scope="col" className="text-left py-3 px-4 text-xs font-bold w-1/2">Asset type</th>
                    <th scope="col" className="text-left py-3 px-4 text-xs font-bold w-1/2">CGT outcome on death</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {CGT_ROWS.map((row) => (
                    <tr
                      key={row.asset}
                      className={row.highlight ? "bg-amber-50" : "bg-white hover:bg-slate-50 transition-colors"}
                    >
                      <td className="py-3 px-4 text-xs font-semibold text-slate-800">{row.asset}</td>
                      <td className="py-3 px-4 text-xs text-slate-600">{row.outcome}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-xs text-slate-500 mt-2">
                General information only. Verify current rules at ato.gov.au or with a specialist
                tax adviser.
              </p>
            </div>
          </div>
        </section>

        {/* Super and Death Tax */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-4">
              Super and death benefits tax
            </h2>
            <div className="rounded-xl border border-amber-300 bg-amber-50 p-5 mb-6">
              <p className="text-sm font-semibold text-amber-900">
                Super is generally not part of your estate. It is directed by your Binding Death
                Benefit Nomination (BDBN) — not your Will. If your BDBN has lapsed or does not
                exist, the super fund trustee decides where it goes.
              </p>
            </div>
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <h3 className="font-extrabold text-slate-900 mb-3">Tax on super death benefits by recipient</h3>
                <div className="grid sm:grid-cols-3 gap-3">
                  {[
                    {
                      who: "Spouse, children under 18, financial dependants, interdependents",
                      tax: "Tax-free",
                      color: "emerald",
                    },
                    {
                      who: "Adult non-dependants (e.g. adult children)",
                      tax: "17% on the taxable component (15% tax + 2% Medicare)",
                      color: "amber",
                    },
                    {
                      who: "Non-dependants receiving untaxed element (rare — some govt funds)",
                      tax: "32% on untaxed element",
                      color: "red",
                    },
                  ].map((item) => (
                    <div
                      key={item.who}
                      className={`rounded-lg border p-4 ${
                        item.color === "emerald"
                          ? "border-emerald-200 bg-emerald-50"
                          : item.color === "amber"
                            ? "border-amber-200 bg-amber-50"
                            : "border-red-200 bg-red-50"
                      }`}
                    >
                      <p
                        className={`text-xs font-bold mb-1 ${
                          item.color === "emerald"
                            ? "text-emerald-800"
                            : item.color === "amber"
                              ? "text-amber-800"
                              : "text-red-800"
                        }`}
                      >
                        {item.tax}
                      </p>
                      <p
                        className={`text-xs leading-relaxed ${
                          item.color === "emerald"
                            ? "text-emerald-700"
                            : item.color === "amber"
                              ? "text-amber-700"
                              : "text-red-700"
                        }`}
                      >
                        {item.who}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <h3 className="font-extrabold text-slate-900 mb-2">
                  Super + testamentary trust strategy
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed mb-3">
                  A key estate planning technique for families with adult children: direct super to
                  your estate via BDBN, then distribute through a testamentary trust. The super death
                  benefit paid into the estate can then be managed within the trust, potentially
                  allowing income-splitting and adult tax rates for minor grandchildren.
                </p>
                <p className="text-sm text-slate-600 leading-relaxed">
                  This strategy requires specialist advice and careful BDBN drafting. See{" "}
                  <Link href="/super/death-benefit" className="text-amber-700 hover:text-amber-600 underline font-medium">
                    super death benefits explained
                  </Link>{" "}
                  for detailed treatment.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Testamentary Trusts */}
        <section className="py-10 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-2">
              Testamentary trusts
            </h2>
            <p className="text-sm text-slate-600 mb-6 leading-relaxed">
              A testamentary trust is created within a Will and only comes into effect on death. The
              primary tax advantage is that minor beneficiaries (under 18) receive income at adult
              marginal rates — avoiding the penalty tax rates that otherwise apply to minors.
            </p>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
                <h3 className="font-extrabold text-emerald-900 mb-3">Advantages</h3>
                <ul className="space-y-2 text-sm text-emerald-800">
                  {[
                    "Minors taxed at adult rates (avoids up to 47% penalty rate on unearned income)",
                    "Income-splitting flexibility across multiple beneficiaries",
                    "Asset protection for beneficiaries (creditors, relationship breakdown)",
                    "Can hold income-producing assets for decades",
                    "Tax-free threshold applies to minor beneficiaries",
                  ].map((item) => (
                    <li key={item} className="flex gap-2">
                      <span className="flex-shrink-0 text-emerald-600">&#10003;</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <h3 className="font-extrabold text-slate-900 mb-3">Considerations</h3>
                <ul className="space-y-2 text-sm text-slate-700">
                  {[
                    "Requires specialist will drafting ($3,000–$8,000 typically)",
                    "Trustee obligations are ongoing — annual tax returns, bookkeeping",
                    "Must be established in the Will (cannot be added after death)",
                    "Generally suited to larger estates (>$500k) with income-producing assets",
                    "Beneficiary control may be limited depending on trust deed terms",
                  ].map((item) => (
                    <li key={item} className="flex gap-2">
                      <span className="flex-shrink-0 text-slate-400">&#8594;</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Checklist */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-2">
              Estate planning checklist
            </h2>
            <p className="text-sm text-slate-600 mb-6 leading-relaxed">
              Use this checklist to identify gaps in your estate plan. Most items require professional
              legal and financial advice.
            </p>
            <div className="grid sm:grid-cols-2 gap-3">
              {CHECKLIST_ITEMS.map((item) => (
                <div
                  key={item}
                  className="flex gap-3 bg-slate-50 rounded-xl border border-slate-200 p-4 text-sm text-slate-700"
                >
                  <span className="flex-shrink-0 text-slate-400 text-base leading-5">&#9744;</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-12 bg-slate-50 border-t border-slate-200">
          <div className="container-custom max-w-3xl">
            <h2 className="text-2xl font-extrabold text-slate-900 mb-6">
              Frequently asked questions
            </h2>
            <div className="space-y-3">
              {FAQS.map((item) => (
                <details
                  key={item.q}
                  className="rounded-xl border border-slate-200 bg-white overflow-hidden"
                >
                  <summary className="flex items-center justify-between px-5 py-4 cursor-pointer font-bold text-slate-900 hover:bg-slate-50">
                    {item.q}
                  </summary>
                  <div className="px-5 pb-4 text-sm text-slate-700 leading-relaxed">{item.a}</div>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-12 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
          <div className="container-custom text-center max-w-xl">
            <h2 className="text-xl font-extrabold mb-3">
              Get estate planning advice from a specialist
            </h2>
            <p className="text-sm text-slate-300 mb-6">
              Estate planning involves legal, tax, and superannuation advice. An estate planning
              solicitor and financial adviser working together can ensure your plan is both valid
              and tax-effective.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/advisors"
                className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm rounded-xl transition-colors"
              >
                Find a Financial Adviser &#8594;
              </Link>
              <Link
                href="/tax"
                className="px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold text-sm rounded-xl transition-colors"
              >
                Tax Strategy Hub &#8594;
              </Link>
            </div>
          </div>
        </section>

        {/* Compliance */}
        <section className="py-6 bg-slate-100 border-t border-slate-200">
          <div className="container-custom max-w-4xl">
            <p className="text-xs text-slate-500 leading-relaxed">
              {GENERAL_ADVICE_WARNING} Estate planning and superannuation rules are complex and
              subject to change. Verify current rules with the ATO (ato.gov.au) or a registered
              estate planning solicitor and financial adviser.
            </p>
          </div>
        </section>
      </div>
    </>
  );
}
