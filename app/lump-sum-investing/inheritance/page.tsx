import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, absoluteUrl } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import HubLeadForm from "@/components/leads/HubLeadForm";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "What to Do With an Inheritance in Australia | Invest.com.au",
  description:
    "There's no inheritance tax in Australia — but there is CGT, super inheritance rules and a lot of behavioural risk. The right sequence for a sudden lump sum.",
  alternates: { canonical: `${SITE_URL}/lump-sum-investing/inheritance` },
  openGraph: {
    title: "What to Do With an Inheritance in Australia",
    description: "Three buckets, the 90-day rule and the CGT trap with inherited property.",
    url: `${SITE_URL}/lump-sum-investing/inheritance`,
    type: "website",
  },
};

const INHERITANCE_FAQS = faqJsonLd([
  {
    q: "Is there inheritance tax in Australia?",
    a: "No. Australia does not have an inheritance tax or estate duty at the federal or state level. Assets inherited under a will are received tax-free by the beneficiary. However, income earned on those assets after you receive them is taxable, and capital gains tax may apply when you later sell inherited assets such as property or shares.",
  },
  {
    q: "What taxes apply when you receive an inheritance in Australia?",
    a: "Receiving an inheritance itself is not taxable in Australia. However, three tax consequences can arise later: (1) Capital gains tax when you sell inherited assets — the cost base depends on when the deceased acquired the asset; (2) Income tax on any income the inherited assets generate after you receive them; (3) Tax on inherited superannuation if you are not a tax dependant — non-dependants may pay up to 17% (including Medicare levy) on the taxable component of a superannuation death benefit.",
  },
  {
    q: "What is the 90-day rule for inherited property in Australia?",
    a: "The 90-day rule is not a formal ATO rule — it refers to the general advice to avoid making major investment decisions within the first 90 days of receiving an inheritance. The real legal deadline to know is the two-year main-residence exemption window: if you inherit a property that was the deceased's main residence, you generally have two years to sell it and still access the main-residence CGT exemption. Selling after two years can trigger significant CGT. Always get tax advice before selling inherited property.",
  },
  {
    q: "Can I put an inheritance into superannuation?",
    a: "Yes, but only up to the annual contribution caps. For the 2025–26 year the non-concessional (after-tax) cap is $120,000, or up to $360,000 under the bring-forward rule if you are under 75 and meet the work test. Your total super balance on 30 June of the prior year determines eligibility. There is no special exemption for inheritance money — it counts as a regular non-concessional contribution.",
  },
  {
    q: "What is the best way to invest a $500,000 inheritance in Australia?",
    a: "The right approach depends on your age, existing assets, tax position and income. A common framework: first, pay off high-interest debt; second, top up your emergency cash buffer; third, get tax advice on the inheritance itself (especially if it includes property or shares); fourth, consider a concessional super contribution to reduce taxable income; fifth, invest the remainder across a diversified portfolio aligned to your goals and timeline. For a sum of this size, a fee-for-service financial planner is worth engaging before making any investment decisions.",
  },
]);

export default function InheritancePage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Lump-Sum Investing", url: absoluteUrl("/lump-sum-investing") },
    { name: "Inheritance", url: absoluteUrl("/lump-sum-investing/inheritance") },
  ]);
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(INHERITANCE_FAQS) }} />
      <div className="bg-white min-h-screen">
        <section className="bg-slate-900 text-white py-10 md:py-14">
          <div className="container-custom">
            <nav className="flex items-center gap-1.5 text-xs text-slate-400 mb-5" aria-label="Breadcrumb">
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
              Inherited residential property is the highest-friction asset in most estates. If the deceased acquired the property before 20 September 1985, your cost base is market value at date of death — and you have a two-year main-residence exemption window if the deceased lived in it as their main residence.
            </p>
            <p className="text-sm text-slate-700 leading-relaxed">
              If the deceased acquired it after 20 September 1985, your cost base is the deceased&rsquo;s original cost base plus capital improvements. Selling outside the two-year window often triggers significant CGT. A tax agent should run the numbers before any sale decision — the difference between selling in month 23 versus month 25 can be tens of thousands of dollars.
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

        <section className="py-10 bg-white border-t border-slate-200">
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
