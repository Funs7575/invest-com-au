import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, absoluteUrl, CURRENT_YEAR } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import HubLeadForm from "@/components/leads/HubLeadForm";

const FAQS = [
  {
    q: "Is there inheritance tax in Australia?",
    a: "No. Australia abolished federal estate and inheritance tax in 1979. There is no tax when you receive an inheritance — no duty, no death tax. However, the assets you inherit may trigger capital gains tax (CGT) when you later sell them. The key distinction: inheriting is tax-free; selling the inherited asset later may not be.",
  },
  {
    q: "What cost base do I use for inherited shares?",
    a: "It depends when the deceased acquired the shares. (1) Pre-CGT assets (acquired before 20 September 1985): your cost base is the market value at date of death. (2) Post-CGT assets (acquired on or after 20 September 1985): you inherit the deceased's original cost base, including capital improvements and indexation up to 1999. This means you may inherit a large unrealised gain. Get the transaction records from the estate executor before any sale decision.",  // dated-ok
  },
  {
    q: "How is inherited superannuation taxed?",
    a: "Super does not form part of the estate unless specifically directed by a binding death benefit nomination. It's paid directly to nominated beneficiaries. Tax depends on who receives it: (1) Tax-dependants (spouse, minor children, financial dependants): receive super tax-free. (2) Non-dependants (adult children, siblings): pay tax on the 'taxable component' — typically 15% + 2% Medicare levy (17% total), or 10% + 2% if any taxed element is involved. The 'tax-free component' (after-tax contributions) always passes through tax-free to any beneficiary.",
  },
  {
    q: "What is the two-year CGT exemption on inherited property?",
    a: "If you inherit a residential property that was the deceased's main residence, you have a two-year window from the date of death to sell the property CGT-free (subject to certain conditions). This is called the 'main residence exemption for deceased estates'. After two years, CGT applies from the date of death, not the original acquisition date. Don't let this window slip — an executor should flag the two-year deadline immediately. The exemption can apply even if the deceased didn't live in the property at death (if it was their main residence at some earlier point).",
  },
];

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "What to Do With an Inheritance in Australia | Invest.com.au",
  description:
    "No inheritance tax in Australia — but there is CGT, super inheritance rules and behavioural risk. The right sequence for investing a sudden lump sum.",
  alternates: { canonical: `${SITE_URL}/lump-sum-investing/inheritance` },
  openGraph: {
    title: "What to Do With an Inheritance in Australia",
    description: "Three buckets, the 90-day rule and the CGT trap with inherited property.",
    url: `${SITE_URL}/lump-sum-investing/inheritance`,
    type: "website",
    images: [{ url: `/api/og?title=${encodeURIComponent("Investing an Inheritance Australia")}&sub=${encodeURIComponent("Lump Sum Strategy · CGT · Super · " + CURRENT_YEAR)}`, width: 1200, height: 630 }],
  },
};

export default function InheritancePage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Lump-Sum Investing", url: absoluteUrl("/lump-sum-investing") },
    { name: "Inheritance", url: absoluteUrl("/lump-sum-investing/inheritance") },
  ]);
  const faq = faqJsonLd(FAQS);
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      {faq && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faq) }} />}
      <div className="bg-white min-h-screen">
        <section className="bg-slate-900 text-white py-10 md:py-14">
          <div className="container-custom">
            <nav className="flex items-center gap-1.5 text-xs text-slate-500 mb-5" aria-label="Breadcrumb">
              <Link href="/" className="hover:text-white">Home</Link>
              <span className="text-slate-600">/</span>
              <Link href="/lump-sum-investing" className="hover:text-white">Lump-Sum Investing</Link>
              <span className="text-slate-600">/</span>
              <span className="text-white font-medium">Inheritance</span>
            </nav>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight mb-3 max-w-3xl">
              What to Do With an Inheritance in Australia
            </h1>
            <p className="text-base md:text-lg text-slate-300 leading-relaxed max-w-3xl">
              Australia has no inheritance tax — but receiving a lump sum still has tax consequences. Three buckets, three sets of rules.
            </p>
          </div>
        </section>

        <section className="py-12 bg-white">
          <div className="container-custom max-w-5xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-3">The three-bucket framework</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { title: "Cash inherited under will", body: "Tax-free in your hands. Income earned on it from the moment you receive it is taxable." },
                { title: "Inherited assets (shares, property, crypto)", body: "Tax-free to receive. CGT applies on subsequent sale. Cost base depends on whether the deceased acquired pre/post 20 Sept 1985." },
                { title: "Inherited super", body: "Paid outside the estate. Tax depends on whether you're a tax-dependant; non-dependants may pay tax on the taxable component." },
              ].map((b) => (
                <div key={b.title} className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                  <h3 className="font-extrabold text-slate-900 mb-2">{b.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{b.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-12 bg-amber-50 border-y border-amber-200">
          <div className="container-custom max-w-4xl">
            <h2 className="text-xl md:text-2xl font-extrabold text-amber-900 mb-3">The first 90 days</h2>
            <p className="text-sm text-amber-900 leading-relaxed">
              <strong>Don&rsquo;t invest yet.</strong> The single most common inheritance mistake is rushing the money into the market within 30 days, often into whatever the deceased was holding. Park the inheritance in a high-interest savings account or term deposit while you sort the actual sequence: estate paperwork finalised, tax advice on cost base, your own super and insurance reviewed, mortgage and emergency reserves checked. Then build an investment plan that fits <em>your</em> goals — not the deceased&rsquo;s.
            </p>
          </div>
        </section>

        <section className="py-12 bg-white">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-3">The CGT trap with inherited property</h2>
            <p className="text-sm text-slate-700 leading-relaxed mb-3">
              Inherited residential property is the highest-friction asset in most estates. If the deceased acquired the property before 20 September 1985, your cost base is market value at date of death — and you have a two-year main-residence exemption window if the deceased lived in it as their main residence.  {/* // dated-ok */}
            </p>
            <p className="text-sm text-slate-700 leading-relaxed">
              If the deceased acquired it after 20 September 1985, your cost base is the deceased&rsquo;s original cost base plus capital improvements. Selling outside the two-year window often triggers significant CGT. A tax agent should run the numbers before any sale decision — the difference between selling in month 23 versus month 25 can be tens of thousands of dollars.  {/* // dated-ok */}
            </p>
          </div>
        </section>

        <section className="py-12 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-4xl space-y-6">
            <HubLeadForm
              heading="Find a financial planner"
              subheading="The right planner sequences the inheritance into your overall plan — including super, insurance and existing investments."
              intent={{ need: "estate", context: ["estate_planning"] }}
              source="lump_sum_inheritance_planner"
              ctaLabel="Find a financial planner"
            />
            <HubLeadForm
              heading="Find a tax agent for inheritance CGT"
              subheading="Cost base calculation, two-year window timing and inherited-super tax classification."
              intent={{ need: "tax", context: ["tax_optimization"] }}
              source="lump_sum_inheritance_tax"
              ctaLabel="Find a tax agent"
            />
          </div>
        </section>

        {/* FAQs */}
        <section className="py-12 bg-white border-t border-slate-200">
          <div className="container-custom max-w-3xl">
            <h2 className="text-2xl font-extrabold text-slate-900 mb-6">Frequently asked questions</h2>
            <div className="space-y-3">
              {FAQS.map((faqItem) => (
                <details key={faqItem.q} className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                  <summary className="flex items-center justify-between px-5 py-4 cursor-pointer font-bold text-slate-900 hover:bg-slate-50">
                    {faqItem.q}
                  </summary>
                  <div className="px-5 pb-4 text-sm text-slate-700 leading-relaxed">{faqItem.a}</div>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="py-10 bg-slate-50 border-t border-slate-200">
          <div className="container-custom max-w-4xl">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <Link href="/lump-sum-investing" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">All lump-sum guides →</Link>
              <Link href="/article/what-to-do-with-inheritance-australia" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">Deep-dive guide →</Link>
              <Link href="/lump-sum-investing/calculator" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">Project the growth →</Link>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
