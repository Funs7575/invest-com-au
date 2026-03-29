import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, UPDATED_LABEL } from "@/lib/seo";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";
import SectionHeading from "@/components/SectionHeading";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `Health Insurance Australia (${CURRENT_YEAR}) — Private vs Medicare Guide`,
  description: `Do you need private health insurance in Australia? MLS thresholds, Lifetime Health Cover loading, Gold/Silver/Bronze tiers, and the government rebate explained. ${UPDATED_LABEL}.`,
  openGraph: {
    title: `Health Insurance Australia (${CURRENT_YEAR}) — Do You Need It?`,
    description: "Medicare vs private health insurance in Australia: MLS, LHC loading, tiers, and the rebate explained.",
    url: `${SITE_URL}/insurance/health`,
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: `${SITE_URL}/insurance/health` },
};

const SECTIONS = [
  {
    heading: "Medicare vs private health insurance — what Medicare doesn't cover",
    body: `Medicare is Australia's universal public health system. It covers most GP visits (with bulk billing), public hospital treatment, and a range of specialist appointments. For many Australians, Medicare alone is sufficient for most healthcare needs.

However, Medicare has significant gaps:

**What Medicare doesn't cover:**
- **Private hospital rooms:** In a public hospital, you're placed in a shared ward and treated by the hospital's doctors. You don't get to choose your specialist, and wait times for elective procedures can be lengthy.
- **Dental:** Medicare covers very limited dental (some emergency dental for children under the Child Dental Benefits Schedule). Adult dental — fillings, extractions, crowns, orthodontics — is entirely out-of-pocket unless you have private extras cover.
- **Physio, chiro, and allied health:** Medicare bulk-bills limited allied health visits (up to 5 per year under a GP Management Plan), but regular physio, chiropractic, osteopathy, and podiatry are not covered.
- **Optical:** Eye tests are bulk-billed, but glasses and contact lenses are not covered at all by Medicare.
- **Ambulance:** Not covered by Medicare in most states (Queensland and Tasmania have different arrangements).
- **Elective surgery wait times:** For elective procedures — joint replacements, cataracts, investigations — public hospital wait times can be 12–24 months in some states.

Private health insurance fills these gaps — hospital cover for private room, specialist choice, and quicker access to elective surgery; extras cover for dental, optical, and allied health.`,
  },
  {
    heading: "Medicare Levy Surcharge — the tax penalty for high earners",
    body: `The Medicare Levy Surcharge (MLS) is a financial penalty designed to encourage high-income Australians to take out private hospital cover, reducing pressure on the public system.

**How the MLS works:**
If your income exceeds the MLS threshold and you don't have an appropriate level of private hospital cover, you pay an additional 1–1.5% of your taxable income as a surcharge on top of the standard 2% Medicare Levy.

**2026 MLS income thresholds and rates:**
- $93,000 or less (singles) / $186,000 or less (families): No surcharge
- $93,001 – $108,000 (singles): 1% surcharge
- $108,001 – $144,000 (singles): 1.25% surcharge
- $144,001+ (singles): 1.5% surcharge

**The MLS calculation:** A single person earning $100,000 without private hospital cover pays an extra $1,000 per year in MLS. A basic private hospital policy costs $700–$1,200 per year. At this income level, buying private hospital cover is often financially rational purely to avoid the MLS — even if you never use it.

**Important:** Only private hospital cover (not extras-only cover) satisfies the MLS requirement. The policy must have an excess of $750 or less for singles ($1,500 or less for families).

**Family threshold:** The family threshold for MLS starts at $186,000, increasing by $1,500 for each dependent child after the first.`,
  },
  {
    heading: "Lifetime Health Cover loading — why 31 matters",
    body: `Lifetime Health Cover (LHC) loading is a government mechanism that financially penalises Australians who take out private hospital cover later in life. It creates a strong incentive to get covered before your 31st birthday.

**How LHC loading works:**
For every year over 31 that you don't have private hospital cover, a 2% loading is added to your hospital insurance premium. This loading applies for 10 continuous years of cover.

**Examples:**
- Take out cover at age 31: 0% loading (base premium)
- Take out cover at age 35: 8% loading (4 years × 2%)
- Take out cover at age 40: 18% loading (9 years... but adjusted from base age 31)
- Take out cover at age 50: 38% loading
- Take out cover at age 65: maximum 70% loading

**Maximum loading:** 70% (capped), meaning your premium can be up to 70% higher than someone who took out cover at 31.

**Removing the loading:** Once you've held hospital cover continuously for 10 years, the LHC loading is removed. So if you take out cover at 40 with 18% loading, you'll pay the loading until age 50, then it drops to zero.

**Important exceptions:** People who took out hospital cover before July 1, 2000 (when LHC was introduced) received a one-off exemption. Australians who held hospital cover continuously from age 31 never attract loading.

**The bottom line:** If you're approaching 31, take out even a basic hospital cover before your birthday. The cost of loading accumulates significantly, and you can always upgrade later.`,
  },
  {
    heading: "Hospital vs Extras cover — two separate products",
    body: `Private health insurance in Australia is sold as two distinct products that can be purchased separately or together.

**Hospital cover:**
Hospital cover pays for treatment in a private hospital (or as a private patient in a public hospital). Key benefits:
- Choose your own specialist/surgeon
- Private room in hospital (if available)
- Shorter waits for elective surgery
- Cover for services listed on your policy's hospital tier

Hospital cover is what counts for Medicare Levy Surcharge purposes. It's the more significant purchase financially — major surgery or a hospital stay can cost tens of thousands of dollars out-of-pocket without it.

**Extras cover (also called ancillary or general treatment):**
Extras cover pays partial benefits for out-of-hospital treatments:
- Dental (check-ups, fillings, crowns, orthodontics — usually with annual limits)
- Optical (glasses, contact lenses, laser eye surgery)
- Physio, chiropractic, osteopathy
- Podiatry, psychology, dietetics
- Hearing aids

Extras cover typically has annual limits (e.g., $500/year dental, $250/year optical). The value depends heavily on how much you use these services. For young, healthy people, extras cover may not provide good value unless you have significant dental or optical needs.

**Combined policies:** Most insurers sell hospital and extras together as a "combined policy" — often with a discount versus buying separately. Compare the combined price against buying hospital-only (which may be all you need).`,
  },
  {
    heading: "Gold, Silver, Bronze, Basic tiers — the 2019 reforms",
    body: `In April 2019, the Australian Government introduced a standardised tier system for private hospital insurance to make it easier to compare policies across insurers. The four tiers — Gold, Silver, Bronze, and Basic — define minimum inclusions at each level.

**Basic:**
The minimum hospital cover available. Very limited — mainly covers psychiatric care, rehabilitation, and palliative care. Not suitable for anyone expecting surgery or hospitalisation beyond mental health care. May not avoid LHC loading for all services.

**Bronze:**
Covers a wider range of hospital treatments including some surgical procedures. Excludes major treatments like joint replacements, cardiac procedures, and obstetrics. A common entry-level choice for young, healthy people primarily buying to avoid the MLS.

**Silver:**
Broader coverage including many surgical procedures. Several sub-tiers exist (Silver, Silver Plus) depending on inclusions. Excludes some high-cost categories like IVF and some cardiac procedures depending on the specific policy.

**Gold:**
The most comprehensive tier. Must cover all clinical categories including joint replacements, cardiac, IVF, and all hospital treatments. Best for those planning pregnancies, approaching age 50+, or wanting complete coverage without checking what's excluded.

**Practical guidance:**
- Under 30, healthy, no family plans: Bronze or Silver to avoid MLS
- Planning pregnancy in next 2 years: Upgrade to Gold or Silver with obstetrics (typically 12-month waiting period applies)
- Over 50: Gold provides the broadest coverage for age-related conditions
- Specific condition (e.g., heart condition): Verify your specific procedure is covered, not just the tier level`,
  },
  {
    heading: "Private health insurance rebate from the government",
    body: `The Australian Government provides a rebate on private health insurance premiums — reducing the effective cost of cover for most Australians. The rebate is income-tested and varies based on age and income.

**How the rebate works:**
The rebate can be claimed in two ways:
1. As a reduced premium (the insurer reduces your premium by the rebate percentage upfront)
2. As a tax offset when you lodge your tax return

Most people choose option 1 (premium reduction), making the rebate seamless.

**2026 rebate rates (approximate — confirmed at ato.gov.au):**
The rebate percentage reduces as income increases:
- Base tier (singles under $93K): ~24.6% (under 65) to ~32.8% (65–69) to ~36.9% (70+)
- Tier 1 ($93K–$108K): ~16.4% (under 65) reducing with age tiers
- Tier 2 ($108K–$144K): ~8.2% (under 65)
- Tier 3 (over $144K): No rebate

**Example calculation:**
A 45-year-old earning $80,000 paying $2,000/year for hospital and extras cover receives approximately 24.6% rebate = $492/year reduction. Effective cost: $1,508/year.

**Claiming the rebate:**
Register your income tier with your health insurer each year. If your income changes, update your tier to avoid a clawback at tax time. If you under-claim (claim a higher rebate than you're entitled to), the ATO will recover the difference when you lodge.`,
  },
];

const FAQS = [
  {
    question: "Do I need private health insurance if I have Medicare?",
    answer: "It depends on your income, age, and healthcare needs. If you earn over $93,000 as a single (or $186,000 as a family), buying private hospital cover may be financially rational just to avoid the Medicare Levy Surcharge — the surcharge cost can exceed the insurance premium. If you're approaching 31, taking out hospital cover before your birthday avoids Lifetime Health Cover loading. For those below the MLS threshold and under 30 with no significant health needs, Medicare alone may be sufficient — but consider the dental and optical gaps.",
  },
  {
    question: "What is the waiting period for private health insurance?",
    answer: "Private health insurers apply waiting periods before you can claim benefits. Common waiting periods: 2 months for most hospital treatments; 12 months for pre-existing conditions, obstetrics, and some psychiatric care; 2 months for most extras (dental, optical). If you switch insurers, you don't re-serve waiting periods you've already completed — your waiting period history transfers. Some insurers waive or reduce waiting periods as a promotional offer for new customers.",
  },
  {
    question: "Can I avoid the Medicare Levy Surcharge with a high excess policy?",
    answer: "Yes, but your policy must have an excess of $750 or less for singles ($1,500 or less for families) to count for MLS purposes. Policies with higher excesses don't satisfy the requirement. Basic-tier hospital policies with a $750 excess are available from around $700–$900 per year for singles — often comparable to or less than the MLS penalty for those in the first income tier. Always confirm your policy qualifies with your insurer or check the ATO website.",
  },
  {
    question: "Is dental covered by Medicare?",
    answer: "Medicare covers very limited dental. The Child Dental Benefits Schedule provides up to $1,095 over 2 calendar years for eligible children aged 2–17 for basic dental services. Adults have no Medicare dental coverage except in very limited emergency situations in some public hospitals. This is a significant gap — adult Australians without private extras cover pay entirely out-of-pocket for dental care. A single crown can cost $1,500–$2,500 privately; basic extras cover with dental typically costs $300–$600/year and can offset these costs significantly.",
  },
  {
    question: "How do I compare private health insurance funds?",
    answer: "Use the government's privatehealth.gov.au comparison tool, which shows standardised information across all registered health funds. Compare: premium cost for your age and coverage level; annual limits for extras categories you use (dental, optical, physio); waiting periods; network hospitals (check your preferred hospitals are included); excess amounts; and the fund's claims paying record. Not-for-profit funds (HCF, Teachers Health, Defence Health, etc.) sometimes offer better value than for-profit funds as they return surplus to members through benefits or reduced premiums.",
  },
];

export default function HealthInsurancePage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: SITE_URL },
    { name: "Insurance", url: `${SITE_URL}/insurance` },
    { name: "Health Insurance" },
  ]);

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };

  return (
    <div className="bg-white min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      {/* Hero */}
      <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white py-10 md:py-14">
        <div className="container-custom">
          <nav className="text-xs text-slate-400 mb-5 flex items-center gap-1.5 flex-wrap">
            <Link href="/" className="hover:text-slate-200">Home</Link>
            <span>/</span>
            <Link href="/insurance" className="hover:text-slate-200">Insurance</Link>
            <span>/</span>
            <span className="text-slate-300">Health Insurance</span>
          </nav>
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-500/20 border border-green-500/30 rounded-full text-xs font-semibold text-green-300 mb-4">
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full" />
              Health Insurance · {UPDATED_LABEL}
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold leading-[1.1] mb-3 tracking-tight">
              Health Insurance Australia{" "}
              <span className="text-amber-400">({CURRENT_YEAR})</span>
              {" "}— Do You Need It?
            </h1>
            <p className="text-sm md:text-base text-slate-300 leading-relaxed">
              Medicare covers the basics — but leaves significant gaps in dental, optical, and elective surgery.
              We explain the MLS tax penalty, Lifetime Health Cover loading, and how to choose the right policy.
            </p>
          </div>
        </div>
      </section>

      {/* Callouts */}
      <section className="py-8 bg-slate-50 border-b border-slate-200">
        <div className="container-custom">
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl border border-green-200 p-5">
              <p className="text-xs font-bold text-green-800 uppercase tracking-wide mb-1">MLS Threshold (Singles)</p>
              <p className="text-xl font-black text-green-700">$93K</p>
              <p className="text-xs text-slate-600 mt-1">Singles earning over $93,000 pay 1–1.5% extra tax without private hospital cover</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">LHC Loading Age</p>
              <p className="text-xl font-black text-slate-900">Age 31</p>
              <p className="text-xs text-slate-600 mt-1">Lifetime Health Cover loading of 2% per year kicks in if you delay past your 31st birthday</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">Two Products</p>
              <p className="text-xl font-black text-slate-900">Hospital + Extras</p>
              <p className="text-xs text-slate-600 mt-1">Hospital and extras are separate products — only hospital cover counts for MLS and LHC purposes</p>
            </div>
          </div>
        </div>
      </section>

      {/* Content Sections */}
      <section className="py-10 md:py-12 bg-slate-50">
        <div className="container-custom max-w-3xl">
          <SectionHeading eyebrow="Health Insurance Guide" title="Private Health Insurance Explained" />
          <div className="mt-8 space-y-10">
            {SECTIONS.map((sec) => (
              <div key={sec.heading}>
                <h2 className="text-lg font-extrabold text-slate-900 mb-3">{sec.heading}</h2>
                <div className="text-sm text-slate-600 leading-relaxed space-y-3">
                  {sec.body.split("\n\n").map((para, i) => (
                    <p key={i} className="whitespace-pre-line">{para}</p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQs */}
      <section className="py-10 md:py-12">
        <div className="container-custom max-w-2xl">
          <SectionHeading eyebrow="FAQ" title="Health Insurance Questions" />
          <div className="mt-6 divide-y divide-slate-200">
            {FAQS.map((faq) => (
              <details key={faq.question} className="py-4 group">
                <summary className="text-sm font-semibold text-slate-900 cursor-pointer list-none flex items-center justify-between gap-2">
                  {faq.question}
                  <span className="text-slate-400 group-open:rotate-180 transition-transform shrink-0">▾</span>
                </summary>
                <p className="mt-3 text-sm text-slate-600 leading-relaxed">{faq.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-12 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
        <div className="container-custom text-center max-w-xl">
          <h2 className="text-xl font-extrabold mb-3">Find the right health insurance policy</h2>
          <p className="text-sm text-slate-300 mb-6">Compare hospital and extras policies from Australia's major health funds to find the best value for your situation.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/best/insurance-brokers" className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm rounded-xl transition-colors">
              Find an Insurance Broker →
            </Link>
            <Link href="/insurance" className="px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold text-sm rounded-xl transition-colors">
              All Insurance Guides →
            </Link>
          </div>
        </div>
      </section>

      <section className="py-6 bg-slate-100 border-t border-slate-200">
        <div className="container-custom max-w-3xl">
          <p className="text-xs text-slate-500 leading-relaxed">{GENERAL_ADVICE_WARNING} MLS thresholds and rebate percentages are reviewed annually. Verify current figures at ato.gov.au and privatehealth.gov.au before making decisions.</p>
        </div>
      </section>
    </div>
  );
}
