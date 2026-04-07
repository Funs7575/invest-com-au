import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, UPDATED_LABEL } from "@/lib/seo";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";
import SectionHeading from "@/components/SectionHeading";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `Trauma Insurance Australia (${CURRENT_YEAR}) — Critical Illness Cover Guide`,
  description: `Complete guide to trauma insurance (critical illness cover) in Australia: what conditions are covered, how much you need, costs, and how it differs from life insurance and TPD. ${UPDATED_LABEL}.`,
  openGraph: {
    title: `Trauma Insurance Australia (${CURRENT_YEAR}) — Critical Illness Cover`,
    description: "Everything about trauma insurance in Australia — covered conditions, costs, and whether you need it alongside life insurance and income protection.",
    url: `${SITE_URL}/insurance/trauma`,
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: `${SITE_URL}/insurance/trauma` },
};

const COVERED_CONDITIONS = [
  { category: "Cancer", conditions: "Most invasive cancers (not early-stage or non-invasive in most policies)", common: true },
  { category: "Heart Attack", conditions: "Myocardial infarction meeting specified severity criteria", common: true },
  { category: "Stroke", conditions: "Neurological deficit lasting 24+ hours in most policies", common: true },
  { category: "Coronary Bypass Surgery", conditions: "Surgery to correct blockage or narrowing of coronary arteries", common: true },
  { category: "Kidney Failure", conditions: "Chronic, irreversible failure of both kidneys requiring dialysis or transplant", common: true },
  { category: "Major Organ Transplant", conditions: "Heart, lung, liver, kidney, or pancreas transplant", common: true },
  { category: "Blindness", conditions: "Permanent, irreversible loss of sight in both eyes", common: false },
  { category: "Deafness", conditions: "Permanent, irreversible loss of hearing in both ears", common: false },
  { category: "Paraplegia / Quadriplegia", conditions: "Permanent paralysis of limbs", common: false },
  { category: "Severe Burns", conditions: "Burns covering specified percentage of body surface area", common: false },
  { category: "Alzheimer's Disease", conditions: "Confirmed diagnosis resulting in significant functional impairment", common: false },
  { category: "Parkinson's Disease", conditions: "Confirmed, unequivocal diagnosis with permanent symptoms", common: false },
];

const SECTIONS = [
  {
    heading: "What is trauma insurance and how does it work?",
    body: `Trauma insurance (also called critical illness cover or living insurance) pays a lump sum if you're diagnosed with a specified serious medical condition. Unlike income protection — which pays a monthly benefit when you can't work — trauma insurance pays regardless of whether you can work or not.

The defining feature of trauma insurance is that it pays on diagnosis of a covered condition, not on inability to work. A cancer patient who continues working part-time through chemotherapy cannot claim income protection (they're earning income) and cannot claim TPD (they're not permanently disabled) — but they can claim trauma insurance.

**How the money is typically used:**
- Repaying mortgage or other debts to reduce financial pressure during recovery
- Funding expensive experimental or private medical treatment not covered by Medicare or private health insurance
- Allowing a spouse or partner to stop working to provide care
- Modifying home or vehicle for recovery needs
- Funding rehabilitation, physiotherapy, and ongoing care
- Creating financial breathing room to recover without financial stress accelerating health problems

**The psychological value:**
Research on cancer recovery outcomes consistently shows that financial stress during serious illness negatively affects recovery. A trauma insurance payout removes the financial anxiety from a health crisis — allowing you to focus on recovery rather than bills.

**Who should consider trauma insurance:**
Trauma insurance is particularly valuable for:
- Dual-income households where either partner's income is essential
- Self-employed people without employer sick leave or income continuity
- People with a family history of cancer, heart disease, or stroke
- Parents of young children who want to ensure financial security during serious illness
- Professionals whose income would collapse without them working (e.g. business owners)`,
  },
  {
    heading: "Trauma insurance vs life insurance vs TPD vs income protection",
    body: `Many Australians confuse trauma insurance with their other personal insurance — and the overlapping names don't help. Here's how each product works and what it covers:

**Life insurance** pays your beneficiaries a lump sum when you die. It does nothing for you while you're alive. Critical for protecting your family after your death.

**TPD insurance** pays you a lump sum if you become permanently and totally disabled — unable to work ever again. It does not pay for partial disability, serious illness that you recover from, or cancer where you survive and could return to work.

**Income protection** pays 70% of your income monthly while you are unable to work. It doesn't pay if you're working through illness, and stops when you return to work or when your benefit period ends.

**Trauma insurance** pays a lump sum upon diagnosis of a specified serious condition — regardless of whether you can still work, and regardless of whether you recover.

**The critical gap trauma fills:**
Consider a 45-year-old who is diagnosed with early-stage breast cancer. She undergoes surgery and 6 months of chemotherapy, then makes a full recovery and returns to work.
- Life insurance: no payout — she didn't die
- TPD: no payout — she eventually returned to work
- Income protection: pays 70% of her income for the period she can't work (valuable but limited)
- Trauma insurance: pays a lump sum on cancer diagnosis — immediately, without waiting

The lump sum can pay off the mortgage, fund private treatment, allow her partner to stop working to be supportive, and eliminate financial pressure during the most stressful months of her life.

**Do you need all four?**
Most financial advisers prioritise: 1) income protection, 2) life insurance (if you have dependants), 3) TPD, 4) trauma insurance. Trauma is often treated as an 'if budget allows' addition to a comprehensive insurance plan — but for people with family history of cancer or heart disease, it's a first-tier priority.`,
  },
  {
    heading: "What trauma insurance does NOT cover — the fine print",
    body: `Understanding the exclusions and definitional requirements in trauma insurance is essential before you buy.

**Common exclusions and limitations:**

**Survival period:** Most trauma policies require you to survive for 14-30 days after the diagnosis. If you are diagnosed with cancer and die within 14 days, the trauma policy typically does not pay — the life insurance would instead. This is standard across the industry.

**Severity thresholds:** Not all diagnoses of a covered condition automatically trigger a claim. Many policies require the condition to reach a specified severity:
- Heart attack: must cause documented cardiac enzyme elevation and ECG changes — minor cardiac events may not qualify
- Cancer: most policies exclude early-stage, non-invasive cancers, ductal carcinoma in situ (DCIS), early-stage prostate cancer, and skin cancers other than melanoma
- Stroke: must cause neurological deficit lasting at least 24 hours in many policies

**Pre-existing conditions:** Conditions you had before taking out the policy are typically excluded or subject to loadings. Health underwriting at application determines what pre-existing conditions are excluded.

**Definition variations between insurers:** Trauma definitions vary significantly between insurers. The same diagnosis might trigger a claim with one insurer and be denied by another. This is why using an insurance broker to select a policy with quality definitions — not just the cheapest premium — is critical.

**Trauma reinsurance:** Some policies offer 'buy-back' options that allow you to reinstate the life insurance component after a trauma claim. This is worth paying for if you can afford it.

**Our recommendation:** When comparing trauma policies, ask for the Product Disclosure Statement (PDS) and look specifically at the definitions for cancer, heart attack, and stroke — the three most common claims. Don't choose purely on premium.`,
  },
  {
    heading: "How much trauma insurance do you need?",
    body: `Unlike life insurance (which is often calculated as 10x income) or income protection (which replaces your income), trauma insurance serves a specific purpose: providing financial buffer during serious illness recovery.

**A practical calculation:**
1. **Mortgage payoff amount:** The biggest use of a trauma payout is often eliminating mortgage stress. Consider: if you were diagnosed with cancer tomorrow, how much would it change your situation to have no mortgage repayments?

2. **Private treatment costs:** Experimental cancer treatments, private oncologists, and specialists not fully covered by private health insurance can cost $50,000-$200,000+. The PBS covers many cancer drugs — but not all, and not always the latest targeted therapies.

3. **Income replacement gap:** If income protection covers 70% of your income, the 30% gap plus lifestyle costs during recovery adds up. For 6-12 months of recovery, this can be $30,000-$80,000 depending on income.

4. **Family support costs:** A partner who stops working to support you during recovery represents lost income. For 6 months on an average salary, this is $40,000-$60,000.

**Typical recommendation:**
Most insurance advisers suggest trauma cover of 6-12 months of gross income, or the mortgage balance — whichever is higher. For a 40-year-old earning $120,000 with a $500,000 mortgage, $500,000-$750,000 in trauma cover is a reasonable target. The actual right amount depends on your specific situation.

**Partial trauma cover:**
Some insurers offer 'partial trauma' or 'severity-based' payments — paying 25% of the sum insured for less severe diagnoses (e.g. early-stage cancer before invasive treatment). This allows lower premiums while still providing some benefit for less severe events.`,
  },
];

const COSTS_TABLE = [
  { profile: "35-year-old female, non-smoker, $250K cover", monthlyPremium: "$55–$90/month" },
  { profile: "35-year-old male, non-smoker, $250K cover", monthlyPremium: "$70–$110/month" },
  { profile: "40-year-old female, non-smoker, $500K cover", monthlyPremium: "$150–$230/month" },
  { profile: "40-year-old male, non-smoker, $500K cover", monthlyPremium: "$180–$280/month" },
  { profile: "45-year-old, smoker, $250K cover", monthlyPremium: "$200–$350/month" },
];

const FAQS = [
  {
    question: "Is trauma insurance worth it?",
    answer: "Trauma insurance is worth considering if: you have a family history of cancer, heart disease, or stroke; you're self-employed without employer sick leave; you have a mortgage and dependants; or you couldn't maintain your lifestyle on income protection payments alone. The statistics support its value — 1 in 2 Australians will be diagnosed with cancer in their lifetime, and heart disease is the leading cause of death. Trauma insurance provides a meaningful financial buffer during the most stressful health events. Whether it's worth the premium depends on your personal circumstances and budget.",
  },
  {
    question: "Can I hold trauma insurance inside super?",
    answer: "No. Since 2014, the ATO has restricted super funds to only holding insurance that is aligned with standard superannuation conditions of release (death, TPD, terminal illness, retirement). Because trauma insurance pays on diagnosis of a condition (not a super condition of release), it cannot be held inside super. All trauma insurance must be held outside super, with premiums paid from after-tax income.",
  },
  {
    question: "Are trauma insurance premiums tax-deductible?",
    answer: "No. Trauma insurance premiums are not tax-deductible for individuals — unlike income protection premiums held outside super, which are tax-deductible. This means trauma insurance has a higher after-tax cost than income protection. This is one reason income protection is generally prioritised as the more cost-effective first insurance priority for most working Australians.",
  },
  {
    question: "Is a trauma payout taxed?",
    answer: "Generally, trauma insurance payouts are received tax-free as a lump sum. There is no income tax on trauma insurance benefits paid to individuals holding policies outside super. This tax-free treatment makes the effective value of a trauma payout higher than the face value — a $300,000 trauma payout is received in full, unlike income protection payments which are taxed as income.",
  },
  {
    question: "Does private health insurance replace the need for trauma insurance?",
    answer: "No — they're complementary, not interchangeable. Private health insurance covers hospital costs and some treatment costs. Trauma insurance provides cash to cover: the income you lose during recovery, the private or experimental treatments private health insurance doesn't cover, the lifestyle costs of recovery, and the option to pay off debt to reduce financial pressure. Even with excellent private health insurance, a serious illness diagnosis creates significant financial impacts beyond medical bills that trauma insurance addresses.",
  },
  {
    question: "What is stepped vs level premiums for trauma insurance?",
    answer: "Stepped premiums start cheaper and increase with age each year (sometimes significantly after 50). Level premiums are higher initially but relatively stable over time. For trauma insurance, which is typically held until age 65 or until mortgage payoff, level premiums often save money for people who take out cover in their late 30s or 40s. The crossover point (where level becomes cheaper than stepped in cumulative premiums paid) is typically around age 45-50. Discuss with an insurance adviser which structure suits your plan.",
  },
];

export default function TraumaInsurancePage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: SITE_URL },
    { name: "Insurance", url: `${SITE_URL}/insurance` },
    { name: "Trauma Insurance" },
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
      <section className="relative bg-white border-b border-slate-100 overflow-hidden py-8 md:py-12">
        <div className="container-custom">
          <nav className="text-xs text-slate-500 mb-5 flex items-center gap-1.5 flex-wrap">
            <Link href="/" className="hover:text-slate-900">Home</Link>
            <span>/</span>
            <Link href="/insurance" className="hover:text-slate-900">Insurance</Link>
            <span>/</span>
            <span className="text-slate-900 font-medium">Trauma Insurance</span>
          </nav>
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 border border-slate-200 rounded-full text-xs font-semibold text-slate-600 mb-4">
              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full" />
              Critical Illness Cover · {UPDATED_LABEL}
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold leading-[1.1] mb-3 tracking-tight text-slate-900">
              Trauma Insurance Australia{" "}
              <span className="text-amber-600">({CURRENT_YEAR})</span>
            </h1>
            <p className="text-sm md:text-base text-slate-600 leading-relaxed max-w-2xl">
              Trauma insurance pays a lump sum if you&apos;re diagnosed with cancer, heart attack, stroke, or 60+
              other serious conditions — regardless of whether you can still work. Independent guide to critical
              illness cover in Australia.
            </p>
            <div className="flex flex-wrap gap-3 mt-5">
              <Link href="/quiz" className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold rounded-lg transition-colors">
                Find an Insurance Adviser →
              </Link>
              <Link href="/insurance" className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg transition-colors border border-slate-200">
                ← All Insurance Types
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Callouts */}
      <section className="py-8 bg-slate-50 border-b border-slate-200">
        <div className="container-custom">
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl border border-rose-200 p-5">
              <p className="text-xs font-bold text-rose-700 uppercase tracking-wide mb-1">Cancer Lifetime Risk</p>
              <p className="text-xl font-black text-rose-700">1 in 2</p>
              <p className="text-xs text-slate-600 mt-1">Half of all Australians will be diagnosed with cancer in their lifetime. Trauma insurance pays on diagnosis.</p>
            </div>
            <div className="bg-white rounded-2xl border border-amber-200 p-5">
              <p className="text-xs font-bold text-amber-800 uppercase tracking-wide mb-1">Conditions Covered</p>
              <p className="text-xl font-black text-amber-700">60+</p>
              <p className="text-xs text-slate-600 mt-1">Most trauma policies cover 60 or more specified serious conditions. Cancer, heart attack, and stroke are the most common claims.</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">Tax on Payout</p>
              <p className="text-xl font-black text-slate-900">Tax-free</p>
              <p className="text-xs text-slate-600 mt-1">Trauma insurance payouts to individuals are generally received completely tax-free as a lump sum.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Covered Conditions */}
      <section className="py-10 md:py-12">
        <div className="container-custom">
          <SectionHeading
            eyebrow="Covered Conditions"
            title="What Trauma Insurance Covers"
            sub="Most trauma policies cover 60+ conditions. These are the most common — always check your specific policy PDS."
          />
          <div className="mt-6 grid sm:grid-cols-2 gap-3">
            {COVERED_CONDITIONS.map((c) => (
              <div key={c.category} className={`flex items-start gap-3 p-4 rounded-xl border ${c.common ? "bg-white border-slate-200" : "bg-slate-50 border-slate-100"}`}>
                <span className={`mt-0.5 shrink-0 text-sm ${c.common ? "text-green-500" : "text-slate-400"}`}>
                  {c.common ? "✓" : "○"}
                </span>
                <div>
                  <p className="text-xs font-bold text-slate-900">{c.category}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{c.conditions}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-400 mt-4">✓ = very commonly covered · ○ = covered in most but check definitions carefully. Always read the PDS.</p>
        </div>
      </section>

      {/* Premium Cost Table */}
      <section className="py-10 bg-slate-50">
        <div className="container-custom">
          <SectionHeading
            eyebrow="Premium Guide"
            title="Indicative Trauma Insurance Costs"
            sub="Premiums vary by age, sex, smoker status, and cover amount. These are indicative ranges — get personalised quotes."
          />
          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-slate-800 text-white">
                  <th className="text-left py-3 px-4 text-xs font-bold">Profile</th>
                  <th className="text-center py-3 px-4 text-xs font-bold">Indicative Monthly Premium</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {COSTS_TABLE.map((row) => (
                  <tr key={row.profile} className="bg-white hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 text-xs text-slate-700">{row.profile}</td>
                    <td className="py-3 px-4 text-xs font-bold text-slate-900 text-center">{row.monthlyPremium}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-xs text-slate-400 mt-2">Indicative only. Actual premiums depend on health history and individual underwriting. Trauma premiums are not tax-deductible.</p>
          </div>
        </div>
      </section>

      {/* Editorial Sections */}
      <section className="py-10 md:py-12">
        <div className="container-custom max-w-3xl">
          <SectionHeading eyebrow="Trauma Insurance Guide" title="Everything You Need to Know" />
          <div className="mt-8 space-y-10">
            {SECTIONS.map((sec) => (
              <div key={sec.heading}>
                <h2 className="text-lg font-extrabold text-slate-900 mb-3">{sec.heading}</h2>
                <div className="prose prose-sm max-w-none text-slate-600 leading-relaxed">
                  {sec.body.split("\n\n").map((para, i) => (
                    <p key={i} className="mb-3 last:mb-0 whitespace-pre-line">{para}</p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQs */}
      <section className="py-10 md:py-12 bg-slate-50">
        <div className="container-custom max-w-2xl">
          <SectionHeading eyebrow="FAQ" title="Trauma Insurance Questions Answered" />
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

      {/* Related Insurance */}
      <section className="py-10 border-t border-slate-200">
        <div className="container-custom">
          <SectionHeading eyebrow="Related Insurance" title="Other Types of Personal Insurance" />
          <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { title: "Life Insurance", href: "/insurance/life", icon: "🛡️", desc: "Lump sum for your family" },
              { title: "Income Protection", href: "/insurance/income-protection", icon: "💼", desc: "70% of income while unable to work" },
              { title: "TPD Insurance", href: "/insurance/tpd", icon: "⚕️", desc: "Permanently unable to work payout" },
              { title: "Health Insurance", href: "/insurance/health", icon: "🏥", desc: "Private hospital and extras" },
            ].map((ins) => (
              <Link key={ins.href} href={ins.href} className="group bg-white border border-slate-200 rounded-xl p-5 hover:border-amber-300 hover:shadow-sm transition-all">
                <div className="text-2xl mb-2">{ins.icon}</div>
                <p className="text-sm font-bold text-slate-900 group-hover:text-amber-700 mb-1">{ins.title}</p>
                <p className="text-xs text-slate-500">{ins.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-12 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
        <div className="container-custom text-center max-w-xl">
          <h2 className="text-xl font-extrabold mb-3">Get personalised trauma insurance advice</h2>
          <p className="text-sm text-slate-300 mb-6">
            Definition quality varies significantly between trauma policies. An insurance specialist can identify
            the right cover for your situation and health history.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/quiz" className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm rounded-xl transition-colors">
              Find an Insurance Adviser →
            </Link>
            <Link href="/insurance" className="px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold text-sm rounded-xl transition-colors">
              All Insurance Types →
            </Link>
          </div>
        </div>
      </section>

      <section className="py-6 bg-slate-100 border-t border-slate-200">
        <div className="container-custom max-w-3xl">
          <p className="text-xs text-slate-500 leading-relaxed">{GENERAL_ADVICE_WARNING}</p>
        </div>
      </section>
    </div>
  );
}
