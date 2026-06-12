import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, absoluteUrl } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import Icon from "@/components/Icon";
import HubAdvisorCTA from "@/components/HubAdvisorCTA";

const IGP_FAQS = [
  {
    q: "What is the Industry Growth Program (IGP)?",
    a: `The Industry Growth Program (IGP) is an Australian Government grant program administered by the Department of Industry, Science and Resources. It provides matched funding for small and medium enterprises (SMEs) to commercialise products, processes, and services in Future Made in Australia priority sectors — including clean energy, critical minerals processing, advanced manufacturing, and food security. There are two streams: Stream 1 ($50K–$250K, TRL 3–6) for early-stage validation and prototyping, and Stream 2 ($100K–$5M, TRL 4–9) for manufacturing scale-up and first-of-kind commercial deployment.`,
  },
  {
    q: "Who is eligible for the Industry Growth Program?",
    a: "Eligible applicants are Australian SMEs (small and medium-sized enterprises) that: (1) are legally incorporated in Australia; (2) are commercialising a product, process, or service in a Future Made in Australia priority sector; (3) can provide matched funding equal to the grant amount; and (4) have not previously received an IGP grant for the same project. Large companies, universities, and research organisations are not eligible as lead applicants (though they can be project partners). You must also complete a mandatory advisory engagement with a Department of Industry advisor before submitting a full application.",
  },
  {
    q: "What is the advisory step and is it mandatory?",
    a: "Yes — the advisory engagement is mandatory. Before submitting a full IGP application, you must complete a free advisory engagement with a designated Department of Industry advisor. The advisor produces a written commercial readiness report that forms part of your application. Cold applications submitted without a current advisory report will not be assessed. The advisory step alone takes 4–8 weeks, so factor this into your timeline. You can request an advisory engagement via business.gov.au.",
  },
  {
    q: "How much of the IGP funding pool is still available?",
    a: `The IGP was allocated $287M under the ${CURRENT_YEAR} budget. Approximately 90% of the pool is projected to be committed by June 2026 based on current application rates. Once the pool is exhausted, no new awards can be made until a successor program is announced. Given the 4–8 week advisory step and the 4–6 month total application timeline, businesses interested in the IGP should begin the advisory process immediately to maximise their chances of accessing remaining funds.`,
  },
];

const igpFaqLd = faqJsonLd(IGP_FAQS);

export const revalidate = 3600;

export const metadata: Metadata = {
  title: `Industry Growth Program ${CURRENT_YEAR}: Up to $5M for Australian SMEs | Invest.com.au`,
  description:
    "IGP funds commercialisation in Future Made in Australia sectors. Two streams ($50K–$5M), advisory-first process, and a closing pool — full playbook.",
  alternates: { canonical: `${SITE_URL}/grants/industry-growth-program` },
  openGraph: {
    title: `Industry Growth Program ${CURRENT_YEAR}: Up to $5M for Australian SMEs`,
    description: "Two streams. Advisory-first. ~90% of funding projected committed by June 2026.",
    url: `${SITE_URL}/grants/industry-growth-program`,
    type: "website",
    images: [{ url: `/api/og?title=${encodeURIComponent("Industry Growth Program Australia")}&sub=${encodeURIComponent("Up to $5M · SME Manufacturing · Advisory-First · " + CURRENT_YEAR)}`, width: 1200, height: 630 }],
  },
};

export default function IgpPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Grants", url: absoluteUrl("/grants") },
    { name: "Industry Growth Program", url: absoluteUrl("/grants/industry-growth-program") },
  ]);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(igpFaqLd) }} />

      <div className="bg-white min-h-screen">
        <section className="bg-slate-900 text-white py-10 md:py-14">
          <div className="container-custom">
            <nav className="flex items-center gap-1.5 text-xs text-slate-500 mb-5" aria-label="Breadcrumb">
              <Link href="/" className="hover:text-white">Home</Link>
              <span className="text-slate-600">/</span>
              <Link href="/grants" className="hover:text-white">Grants</Link>
              <span className="text-slate-600">/</span>
              <span className="text-white font-medium">Industry Growth Program</span>
            </nav>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight mb-3 max-w-3xl">
              Industry Growth Program: Up to $5M for Australian SMEs
            </h1>
            <p className="text-base md:text-lg text-slate-300 leading-relaxed max-w-3xl">
              Federal commercialisation grant for SMEs in Future Made in Australia priority sectors. Matched funding from $50K (early-stage) to $5M (scale-up).
            </p>
          </div>
        </section>

        {/* Urgent banner */}
        <section className="py-4 bg-amber-50 border-b border-amber-200">
          <div className="container-custom max-w-5xl flex items-start gap-3">
            <Icon name="alert-triangle" size={20} className="text-amber-700 mt-0.5 shrink-0" />
            <p className="text-sm text-amber-900 leading-relaxed">
              <strong>Closing window.</strong> ~90% of the $287M funding pool is projected committed by June 2026. The advisory step alone takes 4–8 weeks — apply now or wait for a successor program.
            </p>
          </div>
        </section>

        {/* Streams */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-5xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-6">Two funding streams</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-6">
                <p className="text-xs uppercase tracking-wider font-extrabold text-amber-600 mb-2">Stream 1</p>
                <h3 className="text-xl font-extrabold text-slate-900 mb-2">Early-Stage Commercialisation</h3>
                <p className="text-3xl font-extrabold text-slate-900 mb-3">$50K – $250K</p>
                <p className="text-sm text-slate-700 leading-relaxed">Matched funding for projects at TRL 3–6. Validation, prototyping and de-risking the core technology before scale-up.</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-6">
                <p className="text-xs uppercase tracking-wider font-extrabold text-amber-600 mb-2">Stream 2</p>
                <h3 className="text-xl font-extrabold text-slate-900 mb-2">Commercialisation &amp; Growth</h3>
                <p className="text-3xl font-extrabold text-slate-900 mb-3">$100K – $5M</p>
                <p className="text-sm text-slate-700 leading-relaxed">Matched funding for projects at TRL 4–9. Pilot plants, manufacturing scale-up, first-of-kind commercial deployment.</p>
              </div>
            </div>
          </div>
        </section>

        {/* How to apply */}
        <section className="py-12 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-5xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-6">How to apply — the two-step process</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { step: "1", title: "Free advisory engagement", body: "A Department of Industry advisor produces a written advisory report on commercial readiness. The advisory step alone takes 4–8 weeks. Cold applications without a current report will not be assessed." },
                { step: "2", title: "Full grant application", body: "After the advisory report is delivered, you submit the full application against the priority sectors and matched-funding requirements. Plan for a 4–6 month total timeline." },
              ].map((s) => (
                <div key={s.step} className="bg-white border border-slate-200 rounded-xl p-5">
                  <div className="w-10 h-10 rounded-full bg-amber-500 text-slate-900 flex items-center justify-center font-extrabold mb-3">{s.step}</div>
                  <h3 className="font-extrabold text-slate-900 mb-2">{s.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{s.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Lead form */}
        <HubAdvisorCTA
          heading="Get help with your IGP application"
          subheading="At Stream 2 dollar values, the difference between a self-written and a professionally-supported application is significant."
          intent={{ need: "tax", context: ["tax_optimization"] }}
          source="grants_igp"
          ctaLabel="Get matched with a grants specialist"
          extraFields={[{ name: "company", label: "Company name" }, { name: "stream", label: "Target stream (1 or 2)" }]}
          className="py-12 bg-white"
        />

        {/* FAQ accordion */}
        <section className="py-12 bg-white border-t border-slate-200">
          <div className="container-custom max-w-5xl">
            <h2 className="text-xl font-bold text-slate-900 mb-4">Common questions</h2>
            <div className="divide-y divide-slate-100">
              {IGP_FAQS.map(({ q, a }) => (
                <details key={q} className="group py-3">
                  <summary className="flex items-center justify-between cursor-pointer list-none text-slate-800 font-medium text-sm leading-snug gap-4">
                    {q}
                    <svg
                      className="w-4 h-4 shrink-0 text-slate-500 group-open:rotate-180 transition-transform"
                      aria-hidden="true"
                      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </summary>
                  <p className="mt-2 text-sm text-slate-600 leading-relaxed">{a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Cross-links */}
        <section className="py-10 bg-slate-50 border-t border-slate-200">
          <div className="container-custom max-w-4xl">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <Link href="/grants" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">All grants →</Link>
              <Link href="/grants/rd-tax-incentive" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">R&amp;D Tax Incentive →</Link>
              <Link href="/article/industry-growth-program-guide" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">Read the deep-dive →</Link>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
