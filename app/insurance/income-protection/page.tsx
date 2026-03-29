import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, UPDATED_LABEL } from "@/lib/seo";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";
import SectionHeading from "@/components/SectionHeading";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `Income Protection Insurance Australia (${CURRENT_YEAR})`,
  description: `Complete guide to income protection insurance in Australia: benefit periods, waiting periods, own vs any occupation definitions, agreed value vs indemnity. ${UPDATED_LABEL}.`,
  openGraph: {
    title: `Income Protection Insurance Australia (${CURRENT_YEAR})`,
    description: "How income protection works, what to look for, and why it matters for working Australians.",
    url: `${SITE_URL}/insurance/income-protection`,
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: `${SITE_URL}/insurance/income-protection` },
};

const SECTIONS = [
  {
    heading: "What is income protection and why it matters most",
    body: `Income protection insurance pays a monthly benefit — typically up to 70% of your pre-disability income — if you're unable to work due to illness or injury. Unlike life insurance, which protects your family after you die, income protection protects you while you're alive but unable to earn.

For most working Australians, income protection is arguably the most important insurance they can hold. Consider: your ability to earn income is your most valuable financial asset. A 35-year-old earning $100,000 per year has 30 years of potential earnings ahead — that's $3,000,000 in total future income (before salary increases). The chance of a working-age Australian experiencing a disability lasting 3 months or more is roughly 1 in 3 over a working lifetime.

**What it covers:** Illness (cancer, mental health conditions, cardiovascular disease) and injury (accidents, musculoskeletal problems). Mental health claims have become increasingly common — making sure your policy covers mental illness is important.

**What it doesn't cover:** Self-inflicted injuries, pre-existing conditions (unless specifically agreed), and normal pregnancy (though complications may be covered). Policies also won't pay if you're still working, or if you're unemployed when the disability occurs.

**The government safety net is minimal:** Centrelink's Disability Support Pension requires total permanent disability. If you're temporarily disabled — unable to work for 6 months but expected to recover — you receive only JobSeeker ($762.70 per fortnight in 2026), which is a dramatic income cut for most working Australians.`,
  },
  {
    heading: "Benefit period choices: 2 years, 5 years, or to age 65",
    body: `The benefit period is how long the insurer will pay your monthly benefit if you remain disabled. It's one of the most important choices you make, and there's a significant cost difference between options.

**2-year benefit period:**
- The cheapest option
- Covers short-to-medium-term disabilities — which represent the majority of income protection claims
- Leaves you exposed to long-term or permanent disabilities
- Suitable for people with significant savings, super balances, or other financial safety nets
- Not suitable for anyone with high debt, dependants, or minimal savings

**5-year benefit period:**
- A middle-ground option that provides meaningful long-term protection at moderate cost
- Statistics show most disabilities that last 2 years will last significantly longer
- Suitable if budget is the primary constraint but you want more than 2-year protection

**To age 65 benefit period:**
- The gold standard of income protection
- If you're permanently disabled at 40, you receive benefits for 25 years
- Significantly more expensive — can be 50–100% more than a 2-year benefit period
- Strongly recommended for professionals with high income, high debt, and dependants
- Consider: a single long-term disability claim on a "to age 65" policy can pay out millions in total benefits

**Our guidance:** For most working Australians under 50 with a mortgage and dependants, a "to age 65" benefit period provides significantly better protection than the cost difference suggests. The marginal cost of upgrading from 2-year to to-65 is often less than $1,000 per year — yet the protection difference can be many millions of dollars.`,
  },
  {
    heading: "Waiting period choices: 30, 60, 90 days",
    body: `The waiting period (also called the elimination period) is how long you must be disabled before benefit payments begin. It functions like an excess on a car insurance policy — the longer you're willing to self-insure, the lower your premiums.

**30-day waiting period:**
- Benefits start after 30 days of disability
- Highest premiums
- Appropriate if you have minimal savings (less than 1 month of expenses in reserve)
- Useful for people who live pay-cheque to pay-cheque

**60-day waiting period:**
- A balanced option — materially cheaper than 30 days
- You need to cover 2 months of expenses from savings or leave entitlements
- Good choice for people with 2+ months of emergency savings

**90-day waiting period:**
- The most common choice
- Significantly cheaper than 30-day policies
- You cover the first 3 months yourself — generally manageable with sick leave, annual leave, and savings
- Most employers provide at least 10 days of sick leave per year, and accumulated leave can cover the gap

**Choosing your waiting period:** Match it to your financial reserves. If you have 3 months of expenses in savings and can use sick leave entitlements, a 90-day waiting period makes financial sense. If you would struggle within 2 weeks of stopping work, choose a shorter waiting period.

**Important note:** The waiting period restarts if you return to work and then become disabled again. Check your policy's specific "recurrence" provisions carefully.`,
  },
  {
    heading: "Own occupation vs any occupation definitions",
    body: `The disability definition — how the insurer decides whether you qualify for benefits — is arguably the most important feature of an income protection policy. The difference between definitions can mean tens or hundreds of thousands of dollars in benefit payments.

**Own occupation definition (best):**
You're considered disabled if you're unable to perform the duties of YOUR specific occupation. A surgeon who loses fine motor control in their hands is disabled under an own occupation definition — even if they could theoretically work as a medical administrator or consultant.

This is the superior definition because:
- Pays based on your actual trained occupation and income
- Doesn't require you to accept lower-paid work in a different field
- Particularly valuable for specialists, tradespeople, and professionals whose skills are highly specific

**Any occupation definition (inferior):**
You're considered disabled only if you're unable to work in ANY occupation for which you're reasonably suited by education, training, or experience. This is a significantly higher bar. The surgeon above would not qualify — they could theoretically work in a different role.

**Switched definitions inside super:** This is a critical point. Income protection held inside superannuation typically uses an "any occupation" definition or switches to one after 2 years. This is why income protection inside super is generally inferior for most working professionals.

**Income Protection inside super vs outside:**
- Inside super: premiums paid from super balance (cashflow advantage), but "any occupation" definition, benefit period often limited to 2 years, and benefits go through super before reaching you (tax treatment differs)
- Outside super: own occupation definition, to-age-65 benefit periods available, tax deductible premiums, benefits paid directly to you

For most professionals and high-income earners, a retail income protection policy outside super with own occupation definition is worth the premium.`,
  },
  {
    heading: "Agreed value vs indemnity policies",
    body: `This distinction is particularly important for self-employed people, business owners, and anyone with variable income.

**Agreed value (no longer available for new policies):**
The insured amount is agreed upfront at application. If approved for $10,000 per month cover, you receive $10,000 per month on a claim — regardless of what your income was at the time of the claim. Agreed value policies are no longer available for new policies in Australia following APRA's 2021 reforms, but existing policies can be maintained.

**Indemnity value (now standard for new policies):**
Your benefit is calculated based on your actual income at the time of the claim (or in the 12 months before the claim, depending on the policy). If your income has dropped since taking out the policy, your benefit also drops.

**Why this matters for variable income earners:**
- Self-employed people with fluctuating income need to carefully document their earnings
- Business owners who minimise their personal salary for tax purposes may find their benefit is much lower than expected
- People who reduce hours before a claim (e.g., due to a creeping illness) may receive lower benefits

**Maximising indemnity policy benefits:**
- Keep good records of all income — business income, investment income, salary
- Consider your income over the 12-month period before a likely claim
- Work with your accountant to ensure your reported income reflects your true earnings capacity
- Review your cover annually if your income changes significantly`,
  },
  {
    heading: "Income protection inside super — important limitations",
    body: `While income protection can technically be held inside superannuation, it comes with significant limitations that most financial advisers recommend against for professionals and high-income earners.

**The key restrictions:**
1. **Disability definition:** Super fund income protection typically uses "any occupation" rather than "own occupation." This is a substantially harder threshold to meet.
2. **Benefit period:** Often limited to 2 years maximum inside super funds (some funds offer 5-year, but "to age 65" is rarely available).
3. **Benefit payment route:** Benefits are first paid into your super account, then need to be released under a condition of release. This adds complexity and potential tax implications.
4. **Tax deductibility:** While premiums inside super use pre-tax super contributions (effectively 15% tax), retail income protection premiums outside super are 100% tax deductible against your marginal rate (which for most professionals is 32.5–47%).

**The tax deduction argument:**
For a professional earning $150,000 (47% marginal tax rate including Medicare), a $3,000 annual income protection premium outside super saves $1,410 in tax — making the net cost $1,590. Inside super, the same premium would be paid from 15% taxed super contributions. Outside super wins significantly on tax efficiency for higher earners.

**Recommendation:** Hold income protection outside super as a standalone retail policy. The tax deduction, superior disability definition, and longer benefit periods typically outweigh any cashflow convenience of paying from super.`,
  },
];

const FAQS = [
  {
    question: "Are income protection premiums tax deductible?",
    answer: "Yes — income protection insurance premiums are 100% tax deductible for Australian residents when the policy is held outside superannuation. This is one of the most favourable tax treatments of any insurance product in Australia. If your marginal tax rate is 32.5%, a $2,000 annual premium effectively costs you $1,350 after tax. However, the tax deduction means that any benefit you receive is treated as taxable income (like your regular salary), so you're taxed on payments you receive.",
  },
  {
    question: "What percentage of income does income protection cover?",
    answer: "Income protection typically covers up to 70% of your pre-disability gross income. The 30% gap is intentional — insurers don't want to create a financial incentive not to return to work. Some policies also include a super contribution benefit that adds another 9–10% of income to maintain super contributions during a claim. The 70% figure is calculated based on your income in the 12 months before the disability (for indemnity policies), so maintaining consistent income records is important.",
  },
  {
    question: "Can I claim income protection if I have a mental health condition?",
    answer: "Many income protection policies cover mental health conditions including depression, anxiety, PTSD, and burnout — but check your specific policy carefully. Mental health claims have become the most common type of income protection claim in Australia. Some policies apply waiting periods before mental health cover kicks in, or limit the benefit period for mental health claims (e.g., 2-year maximum for mental illness even on a to-age-65 policy). Always read the Product Disclosure Statement to understand mental health coverage terms.",
  },
  {
    question: "What happens to my income protection if I change jobs?",
    answer: "Your income protection policy is portable — it's not tied to your employer. If you change jobs, your policy continues as long as you keep paying premiums. However, if your new job has a significantly different income, risk profile, or hours, it's worth reviewing your cover amount and notifying your insurer of any material changes. If your new job is classified as higher risk (e.g., moving from office work to manual labour), your premiums may increase. Self-employed people should also review their policy when moving from employment, as income documentation requirements change.",
  },
  {
    question: "How long does an income protection claim take?",
    answer: "Once the waiting period has elapsed and you submit a claim, most insurers aim to assess and pay within 10–15 business days for straightforward claims. Complex claims — particularly those involving mental health, disputed diagnosis, or employment income verification — can take longer. Initial payments are often made while further medical evidence is being gathered. Monthly benefits then continue as long as you remain disabled under the policy's definition. Your insurer will typically conduct periodic reviews (every 3–12 months) to confirm ongoing disability.",
  },
];

export default function IncomeProtectionPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: SITE_URL },
    { name: "Insurance", url: `${SITE_URL}/insurance` },
    { name: "Income Protection" },
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
            <span className="text-slate-300">Income Protection</span>
          </nav>
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-500/20 border border-green-500/30 rounded-full text-xs font-semibold text-green-300 mb-4">
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full" />
              Income Protection · {UPDATED_LABEL}
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold leading-[1.1] mb-3 tracking-tight">
              Income Protection Insurance Australia{" "}
              <span className="text-amber-400">({CURRENT_YEAR})</span>
            </h1>
            <p className="text-sm md:text-base text-slate-300 leading-relaxed">
              Income protection replaces up to 70% of your salary if you can't work due to illness or injury.
              We explain benefit periods, waiting periods, own vs any occupation, and how to get it right.
            </p>
          </div>
        </div>
      </section>

      {/* Callouts */}
      <section className="py-8 bg-slate-50 border-b border-slate-200">
        <div className="container-custom">
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl border border-green-200 p-5">
              <p className="text-xs font-bold text-green-800 uppercase tracking-wide mb-1">Income Covered</p>
              <p className="text-xl font-black text-green-700">Up to 70%</p>
              <p className="text-xs text-slate-600 mt-1">Monthly benefit pays up to 70% of pre-disability gross income while you can't work</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">Tax Deductibility</p>
              <p className="text-xl font-black text-slate-900">100% Deductible</p>
              <p className="text-xs text-slate-600 mt-1">Premiums outside super are fully tax deductible against your marginal tax rate</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">Best Definition</p>
              <p className="text-xl font-black text-slate-900">Own Occupation</p>
              <p className="text-xs text-slate-600 mt-1">Own occupation definition pays based on your specific job — far better than "any occupation"</p>
            </div>
          </div>
        </div>
      </section>

      {/* Content Sections */}
      <section className="py-10 md:py-12 bg-slate-50">
        <div className="container-custom max-w-3xl">
          <SectionHeading eyebrow="Income Protection Guide" title="How Income Protection Works" />
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
          <SectionHeading eyebrow="FAQ" title="Income Protection Questions" />
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
          <h2 className="text-xl font-extrabold mb-3">Get income protection that actually pays</h2>
          <p className="text-sm text-slate-300 mb-6">An insurance broker can compare policies across insurers and ensure you get the right definition, benefit period, and waiting period for your situation.</p>
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
          <p className="text-xs text-slate-500 leading-relaxed">{GENERAL_ADVICE_WARNING} Income protection premiums, definitions, and benefit terms vary significantly between insurers. Always read the Product Disclosure Statement before purchasing any insurance product.</p>
        </div>
      </section>
    </div>
  );
}
