import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, absoluteUrl } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";

const FAQS = [
  {
    q: "Who can receive my super death benefit?",
    a: "Super death benefits can be paid to: (1) Your legal personal representative (your estate/executor), who distributes according to your will. (2) Tax-law dependants: your spouse (including de facto), your children (of any age), any person in an interdependency relationship with you, and any person who was financially dependent on you at the date of death. If no valid nomination exists and there are no eligible dependants, the fund exercises trustee discretion — which may result in an outcome different from what you would have chosen.",
  },
  {
    q: "What is the difference between a binding death benefit nomination (BDBN) and a non-binding nomination?",
    a: "A binding nomination legally directs the trustee to pay the benefit to your nominated beneficiaries — the trustee cannot override it (if it is valid). A non-binding nomination is merely a guide: the trustee considers your wishes but can exercise discretion and pay someone else. Most Australians have non-binding nominations, which gives significant power to the fund trustee. For certainty — especially in blended families, estranged relatives, or complex estates — a binding nomination is strongly recommended.",
  },
  {
    q: "How long does a binding death benefit nomination last?",
    a: "Most BDBNs under the Superannuation Industry (Supervision) Regulations expire every 3 years and must be renewed in writing, or they lapse and become non-binding. Some funds (particularly SMSFs and certain industry funds with deed provisions for non-lapsing BDBNs) can have permanent (non-lapsing) BDBNs that do not expire. Check your fund's trust deed and PDS to understand whether your nomination lapses. A lapsed BDBN is one of the most common, costly estate planning errors in Australia.",
  },
  {
    q: "How is a super death benefit taxed?",
    a: "Tax treatment depends on who receives it. Death benefit dependants (spouse, children under 18, financial dependants) receive the entire benefit tax-free. Non-dependants (adult children, friends, other family members) pay 15% tax plus 2% Medicare Levy on the taxable component (the element taxed inside the fund — i.e., the concessional contributions and earnings). The tax-free component (from after-tax contributions) is always tax-free to all recipients. For large balances, the tax on the taxable component paid by an adult child can be substantial — estate planning strategies can shift assets to avoid this.",
  },
  {
    q: "Can I direct my super to my estate and have it distributed through my will?",
    a: "Yes. You can nominate your Legal Personal Representative (LPR) as the recipient of your super death benefit. The benefit is then paid into your estate and distributed according to your will, subject to estate duties. This allows your will to direct super to adult children, charities, or other non-dependants. However, estate assets are exposed to creditor claims and Family Provision Act challenges (by family members who may claim a greater share). Paying directly to a dependant as a super beneficiary (not via estate) protects the payment from these claims.",
  },
  {
    q: "What happens to super in an SMSF on a member's death?",
    a: "In an SMSF, the trust deed governs the death benefit rules. Members should have binding death benefit nominations in place, or the remaining trustees exercise discretion. A key SMSF risk: if you are the sole member and sole trustee director, the fund cannot continue without a trustee after death. Using a corporate trustee (where you are the sole director) partially mitigates this, as the company continues until wound up. Legal personal representatives or executors can step in as temporary trustees to manage the fund after death. The fund must pay the death benefit within a reasonable time (generally 6–12 months).",
  },
];

export const revalidate = 3600;

export const metadata: Metadata = {
  title: `Super Death Benefits & Binding Nominations Australia (${CURRENT_YEAR})`,
  description:
    "How super death benefits work in Australia. Binding vs non-binding nominations, tax on death benefit payments, who can receive your super, and estate planning strategies.",
  alternates: { canonical: `${SITE_URL}/super/death-benefit` },
  openGraph: {
    title: `Super Death Benefits & Binding Nominations Australia (${CURRENT_YEAR})`,
    description: "Who gets your super, how it is taxed, binding vs non-binding nominations, and estate planning traps.",
    url: `${SITE_URL}/super/death-benefit`,
  },
};

export default function SuperDeathBenefitPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Super", url: absoluteUrl("/super") },
    { name: "Death Benefits", url: absoluteUrl("/super/death-benefit") },
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
              <Link href="/super" className="hover:text-white">Super</Link>
              <span className="text-slate-600">/</span>
              <span className="text-white font-medium">Death Benefits</span>
            </nav>
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className="text-xs font-semibold bg-amber-500 text-slate-900 px-3 py-1 rounded-full">Updated {CURRENT_YEAR}</span>
              <span className="text-xs font-semibold bg-slate-600 text-white px-3 py-1 rounded-full">Estate Planning Critical</span>
            </div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight mb-3 max-w-3xl">
              Super Death Benefits &amp; Binding Nominations
            </h1>
            <p className="text-base md:text-lg text-slate-300 leading-relaxed max-w-3xl">
              Super does not automatically form part of your estate and is not distributed through your will unless you nominate your estate as the recipient. Without a current, valid binding nomination, your fund trustee decides where the money goes.
            </p>
          </div>
        </section>

        {/* Key Stats */}
        <section className="bg-white py-8 border-b border-slate-100">
          <div className="container-custom">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { v: "3 years", l: "BDBN expiry (most funds)", sub: "Must be renewed in writing" },
                { v: "Tax-free", l: "To death benefit dependants", sub: "Spouse, children under 18" },
                { v: "17%", l: "Tax on non-dependant receipt", sub: "15% + 2% Medicare on taxable component" },
                { v: "Trustee", l: "Without valid nomination", sub: "Exercises discretion — not your will" },
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

        {/* Nomination types */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-6">Types of death benefit nominations</h2>
            <div className="space-y-4">
              {[
                {
                  title: "Binding death benefit nomination (BDBN)",
                  badge: "Recommended",
                  badgeColor: "bg-green-100 text-green-700",
                  body: "A legally binding instruction to the trustee specifying who receives your super and in what proportions on your death. If valid, the trustee must follow the nomination and cannot exercise discretion. Most BDBNs lapse after 3 years unless the fund deed allows non-lapsing BDBNs. To remain effective: complete the correct form from your fund (not a will, not verbal), have it witnessed by two adults who are not beneficiaries, and renew it before it expires. Review after major life events: marriage, divorce, having children, death of a nominated beneficiary.",
                },
                {
                  title: "Non-lapsing binding nomination",
                  badge: "SMSFs + some funds",
                  badgeColor: "bg-blue-100 text-blue-700",
                  body: "Some super funds (particularly SMSFs and select retail funds with amended trust deeds) allow non-lapsing BDBNs that do not expire every 3 years. These provide greater certainty without the risk of forgetting to renew. However, they must still be updated if your circumstances change. Check your fund's trust deed — if it does not specifically allow non-lapsing nominations, your BDBN will lapse at the standard 3-year mark.",
                },
                {
                  title: "Non-binding (preferred) nomination",
                  badge: "Trustee has discretion",
                  badgeColor: "bg-amber-100 text-amber-700",
                  body: "A non-binding nomination records your wishes but does not legally bind the trustee. The trustee considers your nomination as a guide, but can pay someone else if they decide that is more appropriate (e.g., if your nominated beneficiary has died, or if there are competing claims). Most Australians have only non-binding nominations and do not realise the trustee can override them. Non-binding nominations are better than no nomination at all, but offer no certainty.",
                },
                {
                  title: "No nomination (reversionary pension only)",
                  badge: "Risky",
                  badgeColor: "bg-red-100 text-red-700",
                  body: "Without any nomination, the fund trustee has full discretion to pay the benefit to any eligible person or your estate. In blended families, estranged relatives, or complex personal situations, this can lead to outcomes you did not intend and legal challenges. If you are already receiving an account-based pension, you may be able to set a 'reversionary pension' — where your pension continues to pay a nominated beneficiary (typically a spouse) automatically on your death, avoiding the death benefit payment process entirely.",
                },
              ].map((item) => (
                <div key={item.title} className="rounded-xl border border-slate-200 bg-white p-5">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h3 className="font-extrabold text-slate-900">{item.title}</h3>
                    <span className={`shrink-0 text-xs font-semibold px-2 py-1 rounded-full ${item.badgeColor}`}>{item.badge}</span>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Tax table */}
        <section className="py-10 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-6">Tax on super death benefit payments</h2>
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left p-4 font-bold text-slate-700">Recipient</th>
                    <th className="text-right p-4 font-bold text-slate-700">Tax-free component</th>
                    <th className="text-right p-4 font-bold text-slate-700">Taxable component</th>
                    <th className="text-right p-4 font-bold text-slate-700">Net outcome</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[
                    {
                      recipient: "Spouse (including de facto)",
                      taxFree: "Tax-free",
                      taxable: "Tax-free",
                      net: "100% tax-free",
                    },
                    {
                      recipient: "Child under 18",
                      taxFree: "Tax-free",
                      taxable: "Tax-free",
                      net: "100% tax-free",
                    },
                    {
                      recipient: "Child 18+ (financial dependant)",
                      taxFree: "Tax-free",
                      taxable: "Tax-free (if dependant)",
                      net: "100% tax-free if dependant",
                    },
                    {
                      recipient: "Adult child (non-dependant)",
                      taxFree: "Tax-free",
                      taxable: "15% + 2% Medicare",
                      net: "17% on taxable component",
                    },
                    {
                      recipient: "Estate → dependants",
                      taxFree: "Tax-free",
                      taxable: "Tax-free",
                      net: "100% tax-free",
                    },
                    {
                      recipient: "Estate → non-dependants",
                      taxFree: "Tax-free",
                      taxable: "15% + 2% Medicare",
                      net: "17% on taxable component",
                    },
                  ].map((row) => (
                    <tr key={row.recipient} className="hover:bg-slate-50">
                      <td className="p-4 text-slate-700 font-medium">{row.recipient}</td>
                      <td className="p-4 text-right text-green-700">{row.taxFree}</td>
                      <td className="p-4 text-right text-slate-600">{row.taxable}</td>
                      <td className="p-4 text-right font-bold text-slate-900">{row.net}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-slate-500 mt-3">Tax-free component = after-tax (non-concessional) contributions. Taxable component = concessional contributions + earnings. Most Australians have a significant taxable component. Tax figures are current for 2025-26.</p>
          </div>
        </section>

        {/* Action checklist */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-6">Death benefit action checklist</h2>
            <div className="space-y-2">
              {[
                "Check whether your fund has a current, valid BDBN on file — log in to your member portal or call your fund",
                "Review the expiry date of your BDBN — if it lapses, it becomes non-binding",
                "Confirm the nomination is consistent with your will (they can and often should differ)",
                "Review beneficiaries after major life events: marriage, divorce, death of a nominated beneficiary, having children",
                "Consider whether your SMSF deed permits non-lapsing nominations — if not, set a calendar reminder to renew",
                "If you have an SMSF, ensure there is a plan for the fund to continue after your death (corporate trustee, successor director provisions)",
                "If you have adult non-dependant children as beneficiaries, discuss strategies to reduce the 17% tax on the taxable component with a financial planner",
                "For complex families (blended, estranged children, dependant relatives), consider a testamentary trust to manage the estate component",
              ].map((item, i) => (
                <div key={i} className="flex gap-3 bg-slate-50 rounded-lg border border-slate-200 p-4 text-sm text-slate-700">
                  <span className="flex-shrink-0 w-5 h-5 rounded border-2 border-slate-300 bg-white" />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQs */}
        <section className="py-12 bg-slate-50 border-t border-slate-200">
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

        {/* Compliance + nav */}
        <section className="py-10 bg-slate-50 border-t border-slate-200">
          <div className="container-custom max-w-4xl">
            <p className="text-xs text-slate-500 mb-6 leading-relaxed">{GENERAL_ADVICE_WARNING}</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <Link href="/super" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">Super hub →</Link>
              <Link href="/super/insurance" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">Super insurance guide →</Link>
              <Link href="/advisors/estate-planners" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">Find an estate planner →</Link>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
