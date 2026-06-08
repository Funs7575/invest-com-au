import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, UPDATED_LABEL } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";
import HubAdvisorCTA from "@/components/HubAdvisorCTA";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `Home Care Packages Australia — Levels, Costs & Wait Times (${CURRENT_YEAR}) | invest.com.au`,
  description: `Complete guide to Australian Home Care Packages: Levels 1–4, government subsidy amounts, income-tested fees, approved providers, CHSP, wait times, and how to register with My Aged Care. ${UPDATED_LABEL}.`,
  openGraph: {
    title: `Home Care Packages Australia (${CURRENT_YEAR}) — Levels, Costs & Wait Times`,
    description: "Home Care Packages Levels 1–4: government subsidy, income-tested fees, wait times, CHSP, and how to register with My Aged Care.",
    url: `${SITE_URL}/aged-care/home-care-packages`,
    images: [{ url: `/api/og?title=${encodeURIComponent("Home Care Packages Australia")}&sub=${encodeURIComponent("Level 1-4 · Subsidy · Wait Times · " + CURRENT_YEAR)}`, width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: `${SITE_URL}/aged-care/home-care-packages` },
};

const PACKAGE_LEVELS = [
  {
    level: "Level 1",
    needs: "Basic care needs",
    subsidy: "$10,271/year",
    basicDailyFee: "$12.56/day",
    services: "Light tasks: shopping, meal preparation, housework, social support",
    waitTime: "3–6 months typically",
  },
  {
    level: "Level 2",
    needs: "Low-level care needs",
    subsidy: "$18,063/year",
    basicDailyFee: "$12.56/day",
    services: "Personal care, medication assistance, transport, basic nursing",
    waitTime: "6–12 months typically",
  },
  {
    level: "Level 3",
    needs: "Intermediate care needs",
    subsidy: "$39,310/year",
    basicDailyFee: "$12.56/day",
    services: "Frequent personal care, wound dressings, complex medication, allied health",
    waitTime: "12–24 months typically",
  },
  {
    level: "Level 4",
    needs: "High-level care needs",
    subsidy: "$59,593/year",
    basicDailyFee: "$12.56/day",
    services: "Intensive nursing, dementia care, behaviour management, complex wound care",
    waitTime: "18–36+ months typically",
  },
];

const PROCESS_STEPS = [
  { step: "Register", detail: "Call My Aged Care (1800 200 422) or register online at myagedcare.gov.au to start the process" },
  { step: "Assessment", detail: "A Regional Assessment Service (RAS) assessor visits your home — free service assessing your care needs" },
  { step: "Approval letter", detail: "Services Australia issues an approval letter specifying your assigned package level" },
  { step: "Wait for package", detail: "Enter the national queue — wait time depends on level and your location. Check the current queue dashboard at myagedcare.gov.au" },
  { step: "Choose provider", detail: "When a package becomes available, you select an approved Home Care Package provider from the National Register" },
  { step: "Care agreement", detail: "Sign a Home Care Agreement with your chosen provider; services begin on agreed start date" },
];

const FAQS = [
  {
    q: "What is the difference between CHSP and a Home Care Package?",
    a: "The Commonwealth Home Support Programme (CHSP) provides entry-level basic services for older Australians who need some help at home — a few hours per week of cleaning, transport, or meals on wheels. CHSP services are government-funded at a fixed level with a small client contribution ($5–$15 per service). Home Care Packages (HCP) are for people with more complex needs — they provide a pooled budget (Level 1–4) that can be directed to personalised services via an approved provider. If you need regular nursing, personal care, or allied health, you need an HCP. For basic help with chores, CHSP may be sufficient and doesn't require the same assessment process.",
  },
  {
    q: "How are Home Care Package funds managed?",
    a: "The government pays the subsidy directly to your approved Home Care Package provider. The provider is required to manage the package funds on your behalf under a Consumer Directed Care (CDC) model — you direct how the funds are spent within eligible services. Providers must provide monthly statements showing the subsidy received, fees charged, and remaining package balance. Providers charge an administration/management fee (typically 15–35% of the subsidy), which reduces the funds available for direct services. Comparing provider fees is important — the same Level 3 package can deliver very different levels of service depending on the provider&apos;s management fee.",
  },
  {
    q: "Can I use Home Care Package funds to pay family carers?",
    a: "Generally no — Home Care Package rules do not allow funds to be used to pay family members or close friends to provide care (unless they are employed as a formal carer through a registered home care service). The reason: Home Care Packages are designed to provide independent, regulated care services, not to supplement family carers&apos; income. You can use package funds to provide formal respite for your family carer (e.g. hire a professional carer so your family member gets a break). Some packages allow funding for informal carer training, which can be valuable.",
  },
  {
    q: "What happens if I use all my Home Care Package funds before the year ends?",
    a: "Home Care Package funds are not &apos;use it or lose it&apos; per se — unspent funds accumulate and carry over. However, if you exceed your package budget, you must either increase your income-tested fee contribution (if you can afford to) or reduce services. Providers must notify you before the package is exhausted. If your care needs have increased beyond your current level, you can request a re-assessment for a higher package level through My Aged Care. Wait times for higher-level packages can be substantial — proactive re-assessment when needs change is important.",
  },
];

export default function HomeCarePkgsPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: SITE_URL },
    { name: "Aged Care", url: `${SITE_URL}/aged-care` },
    { name: "Home Care Packages" },
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
            <span className="text-slate-900 font-medium">Home Care Packages</span>
          </nav>
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-4">
            Home Care Packages Australia: Levels 1–4 explained
          </h1>
          <p className="text-lg text-slate-600 leading-relaxed mb-3">
            Home Care Packages fund care services for older Australians living at home. Four levels
            ($10k–$60k/year subsidy) for different care complexity. Wait times can be 12–36 months at
            higher levels — register with My Aged Care early.
          </p>
          <p className="text-xs text-slate-400">{UPDATED_LABEL} · 2024–25 subsidy rates · General information only</p>
        </div>
      </section>

      {/* Package levels */}
      <section className="py-10 border-b border-slate-100">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-5">Home Care Package levels (2024–25)</h2>
          <div className="space-y-4">
            {PACKAGE_LEVELS.map((pkg, i) => (
              <div key={i} className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="bg-slate-900 px-5 py-3 flex items-center justify-between">
                  <p className="text-sm font-bold text-white">{pkg.level} — {pkg.needs}</p>
                  <p className="text-xs font-mono text-amber-300">{pkg.subsidy}</p>
                </div>
                <div className="p-5 grid sm:grid-cols-3 gap-4 bg-white">
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Services covered</p>
                    <p className="text-sm text-slate-700 leading-relaxed">{pkg.services}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Basic daily fee</p>
                    <p className="text-sm text-slate-700">{pkg.basicDailyFee}</p>
                  </div>
                  <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    <p className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-1">Typical wait</p>
                    <p className="text-xs text-amber-800">{pkg.waitTime}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-400 mt-2">Wait times are national estimates — vary significantly by region and level. Check current queue at health.gov.au/resources/publications/home-care-packages-waitlist-data.</p>
        </div>
      </section>

      {/* Application process */}
      <section className="py-10 border-b border-slate-100 bg-slate-50">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-5">How to apply for a Home Care Package</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {PROCESS_STEPS.map((item, i) => (
              <div key={i} className="flex gap-3 bg-white rounded-xl border border-slate-200 p-4">
                <div className="w-8 h-8 rounded-full bg-amber-500 text-slate-900 font-extrabold text-sm flex items-center justify-center shrink-0">{i + 1}</div>
                <div>
                  <p className="font-bold text-slate-900 mb-0.5">{item.step}</p>
                  <p className="text-sm text-slate-600 leading-relaxed">{item.detail}</p>
                </div>
              </div>
            ))}
          </div>
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
        heading="Get help navigating home care packages"
        subheading="HCP wait times, fee structures, and supplement eligibility are complex. An aged care specialist can advise on maximising your package and planning your care transition."
        intent={{ need: "aged_care", context: ["home_care", "aged_care_planning"] }}
        source="aged_care_home_care_packages"
        ctaLabel="Find an aged care financial specialist"
        className="py-12 bg-amber-50 border-t border-amber-200"
      />

      {/* Related */}
      <section className="py-8 border-b border-slate-100">
        <div className="container-custom max-w-4xl">
          <h2 className="text-xl font-extrabold text-slate-900 mb-4">Related guides</h2>
          <div className="flex flex-wrap gap-3">
            {[
              { href: "/aged-care/home-vs-residential", label: "Home care vs residential" },
              { href: "/aged-care/costs", label: "Full aged care costs" },
              { href: "/aged-care/centrelink", label: "Centrelink assessment" },
              { href: "/aged-care/means-test", label: "Aged care means test" },
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
            <strong>General advice warning.</strong> {GENERAL_ADVICE_WARNING} Home Care Package subsidy rates, fee rules, and wait times change regularly. Always verify at myagedcare.gov.au and health.gov.au. This page is general information only; it is not financial or aged care advice. For personalised guidance, contact an aged care financial adviser or an ACAT/RAS assessor through My Aged Care.
          </p>
        </div>
      </section>
    </div>
  );
}
