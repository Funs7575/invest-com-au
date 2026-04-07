import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, UPDATED_LABEL } from "@/lib/seo";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";
import SectionHeading from "@/components/SectionHeading";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `Life Insurance Australia (${CURRENT_YEAR}) — Guide & Comparison`,
  description: `How much life insurance do you need in Australia? Compare inside vs outside super, stepped vs level premiums, and get expert guidance. ${UPDATED_LABEL}.`,
  openGraph: {
    title: `Life Insurance Australia (${CURRENT_YEAR}) — Guide & Comparison`,
    description: "Complete life insurance guide for Australians: how much cover you need, inside vs outside super, and premium types explained.",
    url: `${SITE_URL}/insurance/life`,
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: `${SITE_URL}/insurance/life` },
};

const SECTIONS = [
  {
    heading: "What is life insurance?",
    body: `Life insurance (also called death cover) pays a lump sum to your beneficiaries when you die, or to you if you're diagnosed with a terminal illness with less than 24 months to live. It's the most fundamental form of personal insurance and the cornerstone of most Australians' risk management plans.

The lump sum can be used for anything: repaying a mortgage, replacing lost income for a surviving spouse, funding children's education, or covering funeral costs. There's no restriction on how the money is used once it's paid.

**Terminal illness benefit:** Most modern life insurance policies include an advancement of the death benefit if you're diagnosed with a terminal illness. This means you receive the payout while still alive, allowing you to use the funds for treatment, travel, or financial planning before death.

**Not to be confused with:** Total and Permanent Disability (TPD) cover pays if you're permanently unable to work. Income protection pays a monthly benefit if you're temporarily disabled. Trauma (critical illness) cover pays for specific medical events like cancer, heart attack, or stroke. Life insurance specifically covers death and terminal illness only.`,
  },
  {
    heading: "How much life insurance do you need?",
    body: `The right amount of life insurance is personal, but the most common starting point is the **10x income rule of thumb**: multiply your annual income by 10. For example, if you earn $120,000 per year, a $1.2M policy is a rough starting point.

A more precise calculation considers four components:

**1. Debt repayment:** Add up all your liabilities — mortgage, car loans, personal loans, HECS debt. Your life insurance should be sufficient to clear all debts so your family isn't forced to sell assets.

**2. Income replacement:** How many years of income would your family need to maintain their lifestyle? A common approach is 5–10 years of after-tax income. If you have young children, you may want 10–15 years of income replaced.

**3. Education costs:** If you have or plan to have children, factor in private school fees and university costs. Depending on your family's expectations, this can add $100,000–$500,000+ to your cover needs.

**4. Funeral and estate costs:** Include a buffer of $15,000–$30,000 for funeral expenses, estate administration, and immediate cash needs.

**Subtract your existing assets:** Offset your superannuation balance, savings, investment portfolio, and any existing life insurance. The gap between your total needs and existing assets is your required cover amount.

**Average Australian gap:** Research consistently shows most Australians are underinsured by $500,000 or more — particularly those with mortgages and young children.`,
  },
  {
    heading: "Inside super vs outside super for life insurance",
    body: `Life insurance can be held in two ways: inside your superannuation fund or directly (outside super). Each has significant advantages and trade-offs.

**Inside superannuation:**
- **Cashflow advantage:** Premiums are paid from your super balance, not your take-home pay. This is valuable if cash is tight.
- **Tax efficiency:** Super fund contributions are taxed at 15%, and the fund receives a 15% tax deduction on life insurance premiums. This can make cover cheaper than buying direct.
- **Default cover:** Many super funds provide default life insurance without underwriting (no medical exam) when you join. This is valuable if you have health conditions.
- **Limitations:** The super fund is the policy owner. The trustee distributes the death benefit — not necessarily to who you want. While you can nominate beneficiaries, binding nominations must be renewed every 3 years with most funds. Cover also often lapses when your account balance falls below a threshold or you're inactive.

**Outside superannuation (retail/direct):**
- **Control over beneficiaries:** You own the policy and can name any beneficiary directly. The payout goes directly to them, bypassing the super system entirely.
- **No lapse risk:** The policy stays in force as long as you pay premiums, regardless of super fund activity.
- **Estate planning flexibility:** Particularly important for blended families, business owners, or those with complex estate plans.
- **Cost:** Premiums paid outside super are not tax-deductible (unlike income protection). You pay from post-tax income.

**Best approach for most Australians:** Use a combination — hold a base level of cover inside super (for cashflow efficiency) and top up with a direct policy for beneficiary control and to cover any gap between what super provides and what you actually need.`,
  },
  {
    heading: "Stepped vs level premiums",
    body: `Life insurance premiums can be structured in two ways, and the choice has a significant long-term cost impact.

**Stepped premiums:**
- Recalculated each year based on your current age
- Start cheaper — significantly lower premiums in your 30s and 40s
- Increase with each year as you age
- By your late 50s and 60s, stepped premiums can be very expensive
- Better if you expect your need for cover to reduce over time (e.g., as you pay off your mortgage and build super)

**Level premiums:**
- Set at a higher flat rate that doesn't increase with age (though they can still be adjusted for inflation indexation or CPI increases)
- More expensive initially — sometimes 30–50% more than stepped premiums for the same cover
- The gap narrows around age 45–50, and level premiums become cheaper than stepped from that point
- Provide cost certainty for long-term planning

**The break-even point:** For most policies, stepped and level premiums cost the same total over approximately a 15–20 year period. If you're 35 and plan to hold cover until 65, level premiums will often cost less in total.

**Who should choose level premiums:** People who expect to need cover for 15+ years, those around 35–45 years old, and those who value premium certainty for budgeting purposes.

**Who should choose stepped premiums:** Younger people in their 20s who want to minimise current costs, those who expect significant reduction in cover needs within 10 years, or those planning to build significant wealth (super and investments) that will eventually replace their insurance needs.`,
  },
  {
    heading: "When to review your life insurance",
    body: `Life insurance needs change significantly through life. Set a calendar reminder to review your cover whenever a major life event occurs:

**Marriage or de facto relationship:** Your financial responsibilities to a partner typically increase significantly. Your spouse may rely on your income, and you'll likely take on shared debt. Review cover immediately after any relationship change.

**New child:** This is the most common trigger for buying or increasing life insurance. A new baby creates 18+ years of financial dependency. Factor in childcare costs, lost income if your partner reduces work hours, and future education expenses.

**New mortgage:** If you've bought a home, your life insurance should at minimum cover your remaining mortgage balance. Many banks offer mortgage protection insurance — but a standalone life insurance policy is typically better value and more flexible.

**Divorce or separation:** Your cover needs and beneficiary nominations must be updated. Check binding nominations on any super-held policies immediately. Former spouses may still be entitled to super death benefits if nominations aren't updated.

**Significant income change:** A major pay rise means your family has become accustomed to a higher income — your cover should reflect your current income, not what you earned 5 years ago.

**Approaching retirement:** As your super grows and your mortgage reduces, you may need less life insurance. Review and potentially reduce cover to avoid paying for coverage you no longer need.

**Annual review:** Even without major life events, review your policy annually to check that cover amounts keep pace with inflation, that premiums remain competitive, and that the policy terms still suit your needs.`,
  },
];

const FAQS = [
  {
    question: "Is life insurance tax deductible in Australia?",
    answer: "Life insurance premiums paid outside of superannuation are NOT tax deductible for individuals. This is different from income protection insurance, which is tax deductible. However, when life insurance is held inside a superannuation fund, the fund can claim a tax deduction on the premiums (at the 15% super tax rate), which effectively reduces the cost of cover. This is one reason holding life insurance inside super can be more cost-effective.",
  },
  {
    question: "How does life insurance work inside superannuation?",
    answer: "When you hold life insurance inside super, your super fund takes out a group policy covering you as a member. Premiums are deducted from your super balance rather than your take-home pay. When a claim is made (on death or terminal illness), the super fund trustee receives the payment and distributes it to your nominated beneficiaries or your estate. The trustee has discretion in distributions unless you have a valid binding death benefit nomination. Cover often lapses if your account balance falls below a minimum threshold or the account becomes inactive for 16 months.",
  },
  {
    question: "What's the difference between life insurance and TPD insurance?",
    answer: "Life insurance (death cover) pays a lump sum when you die or are diagnosed with a terminal illness. Total and Permanent Disability (TPD) insurance pays a lump sum if you become permanently unable to work due to illness or injury. TPD is about protecting you if you're alive but can never work again — it covers the costs of care, medical treatment, home modifications, and replaces the income you'll never earn. Most Australians hold both covers together, either through super or a combined retail policy.",
  },
  {
    question: "Can I get life insurance if I have a pre-existing condition?",
    answer: "Yes, but pre-existing conditions may affect your eligibility, premiums, or policy exclusions. Insurers assess each application individually. Common outcomes include: standard terms (condition is not considered significant), loadings (higher premium to reflect increased risk), exclusions (the condition is excluded from cover), or postponement/decline (cover not available currently). Group insurance through superannuation funds often provides default cover without full medical underwriting for new members — this can be valuable if you have health conditions that would make retail insurance expensive or unavailable.",
  },
  {
    question: "How long does a life insurance claim take to pay out?",
    answer: "For straightforward claims with clear documentation, life insurance claims typically pay out within 2–8 weeks. Complex claims — particularly those involving terminal illness, disputes over the cause of death, or concerns about non-disclosure — can take 3–6 months or longer. For policies held inside super, the super fund trustee must also assess beneficiary nominations and potentially seek legal advice before distributing the benefit, which can add time. AFCA (Australian Financial Complaints Authority) handles disputes if a claim is denied or delayed.",
  },
];

export default function LifeInsurancePage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: SITE_URL },
    { name: "Insurance", url: `${SITE_URL}/insurance` },
    { name: "Life Insurance" },
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
            <span className="text-slate-900 font-medium">Life Insurance</span>
          </nav>
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 border border-slate-200 rounded-full text-xs font-semibold text-slate-600 mb-4">
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full" />
              Life Insurance · {UPDATED_LABEL}
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold leading-[1.1] mb-3 tracking-tight text-slate-900">
              Life Insurance Australia{" "}
              <span className="text-amber-600">({CURRENT_YEAR})</span>
              {" "}— How Much Do You Need?
            </h1>
            <p className="text-sm md:text-base text-slate-600 leading-relaxed">
              Most Australians are underinsured by $500,000 or more. We explain how to calculate your life insurance needs,
              whether to hold cover inside or outside super, and how to choose between stepped and level premiums.
            </p>
          </div>
        </div>
      </section>

      {/* Callouts */}
      <section className="py-8 bg-slate-50 border-b border-slate-200">
        <div className="container-custom">
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl border border-green-200 p-5">
              <p className="text-xs font-bold text-green-800 uppercase tracking-wide mb-1">Average Coverage Gap</p>
              <p className="text-xl font-black text-green-700">$500K+</p>
              <p className="text-xs text-slate-600 mt-1">Most Australian families are significantly underinsured relative to their actual needs</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">Super Advantage</p>
              <p className="text-xl font-black text-slate-900">Inside Super</p>
              <p className="text-xs text-slate-600 mt-1">Life insurance can be held inside super — premiums paid from your balance, not take-home pay</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">Tax Treatment</p>
              <p className="text-xl font-black text-slate-900">Not Deductible</p>
              <p className="text-xs text-slate-600 mt-1">Life insurance premiums paid outside super are not tax deductible (unlike income protection)</p>
            </div>
          </div>
        </div>
      </section>

      {/* Content Sections */}
      <section className="py-10 md:py-12 bg-slate-50">
        <div className="container-custom max-w-3xl">
          <SectionHeading eyebrow="Life Insurance Guide" title="Everything You Need to Know" />
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
          <SectionHeading eyebrow="FAQ" title="Life Insurance Questions" />
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
          <h2 className="text-xl font-extrabold mb-3">Get the right life insurance cover</h2>
          <p className="text-sm text-slate-300 mb-6">An insurance broker compares policies across multiple insurers and can advise on the right cover amount for your situation.</p>
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
          <p className="text-xs text-slate-500 leading-relaxed">{GENERAL_ADVICE_WARNING} Life insurance premiums, policy terms, and underwriting criteria vary between insurers. Always read the Product Disclosure Statement before purchasing any insurance product.</p>
        </div>
      </section>
    </div>
  );
}
