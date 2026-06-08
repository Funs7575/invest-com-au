import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, UPDATED_LABEL } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";
import HubAdvisorCTA from "@/components/HubAdvisorCTA";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `Home Care vs Residential Aged Care — Which Is Better? (${CURRENT_YEAR}) | invest.com.au`,
  description: `Home care vs residential aged care in Australia: suitability, costs, safety triggers, family burden, timing, and transition checklist. ${UPDATED_LABEL}.`,
  openGraph: {
    title: `Home Care vs Residential Aged Care (${CURRENT_YEAR})`,
    description: "When to stay at home vs move to residential care: suitability, costs, safety triggers, family burden, and transition planning for Australian families.",
    url: `${SITE_URL}/aged-care/home-vs-residential`,
    images: [{ url: `/api/og?title=${encodeURIComponent("Home Care vs Residential Aged Care")}&sub=${encodeURIComponent("Safety · Costs · Family · Transition · " + CURRENT_YEAR)}`, width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: `${SITE_URL}/aged-care/home-vs-residential` },
};

const COMPARISON_TABLE = [
  { factor: "Maximum care level", home: "Up to Level 4 (high care) — but has limits for 24/7 supervision needs", residential: "Full-time nursing, 24/7 supervision, high complexity including dementia/behavioural" },
  { factor: "Cost (government + family)", home: "L1: ~$22k/year total; L4: ~$70k/year total with informal carer support", residential: "Total typically $35k–$90k/year including basic daily fee, means-tested fee, and accommodation" },
  { factor: "Family carer burden", home: "Significant — family often provides substantial unpaid care between paid services", residential: "Low — professional staff manage all care; family visits as desired" },
  { factor: "Independence and lifestyle", home: "High — own home, routines, familiar environment, community connections", residential: "Lower — shared facilities, set mealtimes, institutional environment (varies by facility quality)" },
  { factor: "Safety", home: "Risk of falls, medication errors, isolation — mitigated by regular service visits", residential: "High safety standards; immediate nursing response; falls risk management" },
  { factor: "Dementia / cognitive decline", home: "Manageable for mild-moderate with good support; difficult for advanced dementia", residential: "Specialised memory care units available; 24/7 supervision; secure environments" },
  { factor: "Cost of selling home", home: "Home retained — no sale required for home care", residential: "Home may be sold to fund RAD — triggers CGT, legal, financial planning" },
  { factor: "Transition reversibility", home: "Can move to residential at any time — no commitment", residential: "Generally permanent — return home is rare but possible" },
];

const TRIGGER_SIGNS = [
  "Multiple falls or near-misses at home",
  "Inability to safely manage medications without constant supervision",
  "Significant weight loss or poor nutrition (can&apos;t prepare meals or forget to eat)",
  "Family carer reaching burnout — unable to safely provide required support",
  "Advanced dementia with wandering, aggression, or severe memory impairment",
  "Incontinence requiring 24-hour management and specialised care",
  "Medical conditions requiring regular nursing (IV medications, complex wound care)",
  "Social isolation leading to significant depression or cognitive decline",
];

const FAQS = [
  {
    q: "Is staying at home always better for a person&apos;s wellbeing?",
    a: "Not necessarily. Research shows that for people with significant care needs, residential care can provide better outcomes for safety, nutrition, social engagement, and cognitive stimulation than isolated home care. The key factors are: (1) quality of the residential facility — there is enormous variation; (2) the degree of family support at home — excellent home care plus a close, supportive family can match or exceed facility-level outcomes; (3) the care recipient&apos;s own preferences. Many people say they want to stay home as long as possible, but also report improved wellbeing after moving to a high-quality residential facility with better social connection and reliability.",
  },
  {
    q: "How do I know when it&apos;s time to transition to residential care?",
    a: "The transition trigger is usually a safety event or a family carer&apos;s capacity limit, rather than a planned decision. Safety triggers include: recurring falls, medication management failures, inability to recognise familiar people or places (advanced dementia), or inability to manage personal hygiene. Family triggers include: main carer developing their own health problems, carer working full-time with insufficient support, or unsustainable 24/7 monitoring needs. Planning ahead is critical — researching facilities and securing a position before a crisis means better choice rather than accepting the first available bed under emergency conditions.",
  },
  {
    q: "What happens to my Age Pension when I move to residential aged care?",
    a: "Your Age Pension continues when you enter residential aged care, but its role changes. The basic daily fee (85% of single Age Pension) is deducted from your pension payment — effectively the Age Pension funds most of the basic daily fee automatically. Any remaining Age Pension balance is paid to you. If you have other income (super drawdown, rental income), you continue to receive that. The means-tested care fee is calculated separately. Most aged care financial planning involves optimising how income sources (Age Pension, super, investment income) are structured to minimise total fees.",
  },
  {
    q: "Can I try residential care temporarily before committing?",
    a: "Yes — respite care allows you to stay in a residential aged care facility for short periods (up to 63 days per year subsidised by the government). Respite care serves several purposes: giving home carers a break, recovering after a hospital admission, or trialling a facility before a permanent move. You pay the basic daily fee for respite; no means-tested fee or accommodation charge applies. Using respite strategically — staying at a high-quality facility for 2–3 weeks — is an excellent way to evaluate a facility and ease the transition anxiety for both the care recipient and the family.",
  },
];

export default function HomeVsResidentialPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: SITE_URL },
    { name: "Aged Care", url: `${SITE_URL}/aged-care` },
    { name: "Home vs Residential" },
  ]);
  const faqLd = faqJsonLd(FAQS.map(f => ({ q: f.q, a: f.a })));

  return (
    <div className="bg-white min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />

      {/* Hero */}
      <section className="border-b border-slate-100 py-8 md:py-12">
        <div className="container-custom max-w-4xl">
          <nav aria-label="Breadcrumb" className="text-xs text-slate-500 mb-5 flex items-center gap-1.5 flex-wrap">
            <Link href="/" className="hover:text-slate-900">Home</Link><span>/</span>
            <Link href="/aged-care" className="hover:text-slate-900">Aged Care</Link><span>/</span>
            <span className="text-slate-900 font-medium">Home vs Residential</span>
          </nav>
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-4">
            Home care vs residential aged care: which is right?
          </h1>
          <p className="text-lg text-slate-600 leading-relaxed mb-3">
            Most Australians want to stay home as long as possible. For many, that&apos;s achievable with
            the right Home Care Package. But safety risks, dementia, and carer burnout eventually
            make residential care the better option. Here&apos;s how to assess the decision honestly.
          </p>
          <p className="text-xs text-slate-400">{UPDATED_LABEL} · General information only · Not medical or financial advice</p>
        </div>
      </section>

      {/* Comparison table */}
      <section className="py-10 border-b border-slate-100">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-5">Home care vs residential: key factors</h2>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table aria-label="Home care vs residential aged care key factors" className="w-full text-sm">
              <thead>
                <tr className="bg-slate-900">
                  <th scope="col" className="text-left px-4 py-3 text-xs font-bold text-white uppercase tracking-wide">Factor</th>
                  <th scope="col" className="text-left px-3 py-3 text-xs font-bold text-white uppercase tracking-wide">Home care</th>
                  <th scope="col" className="text-left px-3 py-3 text-xs font-bold text-white uppercase tracking-wide">Residential care</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {COMPARISON_TABLE.map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-semibold text-slate-900 text-xs">{row.factor}</td>
                    <td className="px-3 py-3 text-xs text-slate-600 leading-relaxed">{row.home}</td>
                    <td className="px-3 py-3 text-xs text-slate-600 leading-relaxed">{row.residential}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Transition triggers */}
      <section className="py-8 border-b border-slate-100 bg-amber-50">
        <div className="container-custom max-w-4xl">
          <h2 className="text-xl font-extrabold text-slate-900 mb-4">Signs it may be time for residential care</h2>
          <div className="grid sm:grid-cols-2 gap-2">
            {TRIGGER_SIGNS.map((sign, i) => (
              <div key={i} className="flex items-start gap-2 bg-white rounded-lg border border-amber-200 px-3 py-2">
                <span className="text-amber-500 font-bold shrink-0 mt-0.5">⚠</span>
                <p className="text-sm text-slate-700 leading-relaxed">{sign}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-500 mt-3">These are indicators, not rules. A qualified geriatrician or ACAT assessor can provide a clinical view of care suitability.</p>
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
                  <span className="shrink-0 text-slate-400 group-open:rotate-180 transition-transform text-lg leading-none" aria-hidden="true">▾</span>
                </summary>
                <p className="mt-3 text-sm text-slate-600 leading-relaxed">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Advisor CTA */}
      <HubAdvisorCTA
        heading="Get personalised aged care planning advice"
        subheading="Choosing between home care and residential aged care involves medical, financial, and family considerations. An aged care financial specialist can model the full cost and Centrelink impact."
        intent={{ need: "aged_care", context: ["home_vs_residential", "aged_care_planning"] }}
        source="aged_care_home_vs_residential"
        ctaLabel="Find an aged care financial specialist"
        className="py-12 bg-amber-50 border-t border-amber-200"
      />

      {/* Related */}
      <section className="py-8 border-b border-slate-100">
        <div className="container-custom max-w-4xl">
          <h2 className="text-xl font-extrabold text-slate-900 mb-4">Related guides</h2>
          <div className="flex flex-wrap gap-3">
            {[
              { href: "/aged-care/home-care-packages", label: "Home Care Packages" },
              { href: "/aged-care/facilities", label: "Residential facilities" },
              { href: "/aged-care/costs", label: "Aged care costs" },
              { href: "/aged-care/centrelink", label: "Centrelink assessment" },
              { href: "/aged-care", label: "Aged care hub" },
            ].map(link => (
              <Link key={link.href} href={link.href} className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-full text-sm font-semibold text-slate-700 hover:border-amber-300 hover:text-amber-700 transition-colors">
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="py-8 bg-slate-50">
        <div className="container-custom max-w-4xl">
          <p className="text-[11px] text-slate-500 leading-relaxed">
            <strong>General advice warning.</strong> {GENERAL_ADVICE_WARNING} Aged care decisions are highly personal and involve medical, financial, and family considerations. This page is general information only — not medical, financial, or aged care planning advice. Consult a geriatrician, ACAT assessor, and a licensed aged care financial adviser for personalised guidance.
          </p>
        </div>
      </section>
    </div>
  );
}
