import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, UPDATED_LABEL } from "@/lib/seo";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";
import SectionHeading from "@/components/SectionHeading";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `TPD Insurance Australia (${CURRENT_YEAR}) — Total & Permanent Disability Guide`,
  description: `Complete guide to TPD (Total and Permanent Disability) insurance in Australia: own occupation vs any occupation definitions, inside super vs outside, typical payouts, and how to choose cover. ${UPDATED_LABEL}.`,
  openGraph: {
    title: `TPD Insurance Australia (${CURRENT_YEAR}) — Total & Permanent Disability Guide`,
    description: "Everything you need to know about TPD insurance in Australia — definitions, super vs outside, costs, and who needs it.",
    url: `${SITE_URL}/insurance/tpd`,
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: `${SITE_URL}/insurance/tpd` },
};

const SECTIONS = [
  {
    heading: "What is TPD insurance and who needs it?",
    body: `Total and Permanent Disability (TPD) insurance pays you a lump sum if you become permanently unable to work due to illness or injury. Unlike income protection — which pays a monthly benefit during disability — TPD is a one-time payment designed to cover major life expenses, adapt your home or vehicle, repay debt, and fund ongoing care.

**Who needs TPD insurance?**
TPD is most valuable for people who:
- Have a mortgage or significant debt that a total disability would make unserviceable
- Have dependants who rely on their income
- Are in a physically demanding occupation where disability risk is higher
- Have no significant financial assets to self-insure against a total disability
- Are under 60 and still building wealth

TPD is less critical for:
- Retirees with substantial super or assets
- People whose mortgages are largely paid off
- People with very high income protection cover that includes permanent disability benefits

**How much TPD cover do you need?**
A basic calculation: Outstanding mortgage + outstanding debts + 3-5 years of living expenses + estimated ongoing care costs. For a 40-year-old with a $600,000 mortgage and $200,000 in other debts, $1-1.5 million in TPD cover may be appropriate. Super funds often provide default TPD cover of $200,000-$500,000 — this is typically far below what most Australians actually need.

**The Disability Gap:**
ASIC research shows the majority of Australians with TPD insurance are significantly underinsured — often holding 20-30% of the cover they actually need. This is partly because most TPD cover is default cover inside super, where amounts are not individually tailored.`,
  },
  {
    heading: "Own occupation vs any occupation — the critical difference",
    body: `The single most important decision in TPD insurance is the definition of disability. There are two main definitions:

**Own occupation TPD:**
Pays if you are permanently unable to perform your specific occupation. A surgeon who loses a hand, a pilot who develops a vision problem, or a tradesperson with a serious back injury could all claim under own occupation TPD — even if they could theoretically do some other form of work.

- More generous definition — more likely to pay at claim time
- Can only be held outside super (since July 2014 tax law changes)
- Higher premiums than any occupation

**Any occupation TPD:**
Pays only if you are permanently unable to perform any work suited to your education, training, or experience. This is a much higher bar — a surgeon who loses a hand might not qualify if they could theoretically work as a medical consultant or administrator.

- More restrictive definition — lower premium but harder to claim
- Can be held inside or outside super
- Most default super fund TPD is 'any occupation'

**The 2014 super tax change:**
From July 2014, TPD insurance held inside super must use the 'any occupation' definition (or a more restrictive 'activities of daily living' definition). Own occupation TPD must now be held outside super. This means most Australians' default super fund TPD is the less protective 'any occupation' definition.

**Our recommendation:**
For professionals, tradespeople, and anyone with a specialised occupation, own occupation TPD held outside super provides materially better protection. The premium difference is typically 20-40% more than any occupation — worth it for the dramatically better claim outcome in most disability scenarios.`,
  },
  {
    heading: "TPD inside super vs outside super",
    body: `Most Australians receive some default TPD cover inside their super fund. Understanding the trade-offs between inside and outside super is critical for TPD insurance decisions.

**TPD inside super:**

Advantages:
- Premiums paid from pre-tax super contributions — reduces the effective premium cost
- No out-of-pocket cost (premiums come from your super balance, not your bank account)
- Default cover is automatic and doesn't require health underwriting in many cases

Disadvantages:
- Must use 'any occupation' definition (more restrictive, harder to claim)
- Super fund can have restrictive investment mandates and limited claims support
- Condition of release rules apply — you must meet a super fund condition of release to access the money (typically 'permanent incapacity', assessed by the trustee)
- Erosion of super balance if premiums are not offset by super contributions
- Can't be 'own occupation' definition (since July 2014)

**TPD outside super:**

Advantages:
- Own occupation definition available — better claim outcome
- Direct ownership — you deal directly with the insurer, not through super trustee
- Payment is direct — no super fund trustee approval required
- No super preservation rules — you access the lump sum directly at claim time

Disadvantages:
- Premiums paid from after-tax income (not tax-deductible for individuals)
- Higher out-of-pocket cost vs inside super

**The hybrid approach:**
Many financial advisers recommend holding some TPD inside super (using pre-tax dollars for a basic amount) and additional TPD outside super with an own occupation definition. For example: $500,000 inside super (any occupation, funded by super contributions) + $500,000 outside super (own occupation, after-tax premiums) gives a $1M total coverage with the better definition on the outside-super portion.`,
  },
  {
    heading: "How a TPD claim works",
    body: `Understanding the claims process before you need it avoids the compounding stress of a disability event. TPD claims are more complex than life insurance claims because you're alive and must prove total and permanent disability — not a straightforward event like death.

**Step 1 — Notify your insurer:**
Contact your insurer or super fund trustee as soon as it becomes clear your disability is likely to be permanent. Don't wait until you're certain — start the process early. The insurer will provide a claims kit.

**Step 2 — Medical evidence:**
You'll need detailed medical evidence from your treating doctors, specialists, and possibly independent medical examiners chosen by the insurer. Expect multiple medical reports, functional capacity assessments, and occupational assessments. This process typically takes 3-12 months.

**Step 3 — Occupational evidence:**
For 'any occupation' definitions, the insurer will also assess your education, training, and experience to determine what jobs you could potentially perform. This is where many claims are disputed — the insurer may argue you could theoretically do some form of sedentary work.

**Step 4 — Trustee decision (for super fund TPD):**
If held inside super, the trustee (super fund) must be satisfied you meet the definition before releasing the benefit. The super fund's trustee acts as an intermediary — which can add complexity and delay.

**Step 5 — Appeal process:**
If your claim is denied, you can appeal internally (to the insurer or trustee), then to the Australian Financial Complaints Authority (AFCA), and ultimately to court. Having an insurance broker or specialist lawyer at claim time significantly improves outcomes for disputed claims.

**Getting help:**
TPD claims are the most litigated area of insurance. Consider engaging an insurance specialist broker before you need to claim — they can advocate on your behalf and know the insurer's claims process from the inside. Specialist insurance lawyers work on a no-win, no-fee basis for disputed TPD claims.`,
  },
];

const TPD_COSTS = [
  { profile: "35-year-old male, office worker, $500K cover, any occupation, inside super", monthlyPremium: "$35–$65/month" },
  { profile: "35-year-old male, tradesperson, $500K cover, any occupation, inside super", monthlyPremium: "$70–$120/month" },
  { profile: "35-year-old female, office worker, $500K cover, own occupation, outside super", monthlyPremium: "$45–$80/month" },
  { profile: "40-year-old male, professional, $1M cover, own occupation, outside super", monthlyPremium: "$140–$220/month" },
  { profile: "45-year-old, office worker, $500K cover, any occupation, inside super", monthlyPremium: "$90–$150/month" },
];

const FAQS = [
  {
    question: "How much does TPD insurance cost in Australia?",
    answer: "TPD premiums vary significantly by age, occupation, health, sum insured, and definition (own vs any occupation). A rough guide: a 35-year-old office worker holding $500,000 TPD inside super with an any occupation definition typically pays $35-65/month. Own occupation definitions and outside super holding cost more. A 40-year-old professional seeking $1M in own occupation TPD outside super might pay $140-220/month. The only accurate way to know your premium is to get a personalised quote.",
  },
  {
    question: "Is TPD insurance tax-deductible?",
    answer: "TPD premiums held outside super are generally NOT tax-deductible for individuals. TPD premiums held inside super are deductible to the super fund — which is why inside-super TPD is effectively paid with pre-tax money (a cost advantage). Income protection premiums outside super ARE tax-deductible — a key difference between the two products.",
  },
  {
    question: "What happens to my TPD insurance if I leave my super fund?",
    answer: "If you leave your super fund, your default TPD cover typically ceases. When you join a new employer and super fund, you may receive new default cover — but you may be assessed at your current age and health, and the cover amount may differ. Any pre-existing conditions you've developed since joining the old fund may be excluded. If you leave employment, check your cover situation immediately — this is a common gap.",
  },
  {
    question: "Can I hold TPD and income protection at the same time?",
    answer: "Yes — in fact, most financial advisers recommend holding both. They serve different purposes: income protection pays a monthly benefit while you're unable to work (and you may recover); TPD pays a lump sum only if your disability is total and permanent. Income protection provides cash flow during recovery; TPD provides a capital sum if you'll never work again. Together they address both short-medium term disability and permanent disability.",
  },
  {
    question: "What is the difference between TPD and trauma insurance?",
    answer: "TPD pays if you are permanently unable to work. Trauma insurance pays a lump sum if you are diagnosed with a specified serious illness (cancer, heart attack, stroke, etc.) — regardless of whether you can still work. A cancer patient who continues to work while undergoing treatment could claim trauma insurance but not TPD. They target different events, which is why some advisers recommend holding both.",
  },
  {
    question: "What is the tax treatment of a TPD payout?",
    answer: "TPD benefits received inside super are treated as super fund payments and have complex tax treatment depending on your age, preservation age, and how the benefit is paid. Generally, a TPD payment to someone under preservation age (currently 60) from inside super may include a taxable component taxed at 20% (plus Medicare levy) and a tax-free component. TPD benefits outside super are generally tax-free. This is one reason some advisers prefer outside-super TPD for large sum insured amounts — but you should get specific tax advice for your situation.",
  },
];

export default function TPDInsurancePage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: SITE_URL },
    { name: "Insurance", url: `${SITE_URL}/insurance` },
    { name: "TPD Insurance" },
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
            <span className="text-slate-300">TPD Insurance</span>
          </nav>
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-purple-500/20 border border-purple-500/30 rounded-full text-xs font-semibold text-purple-300 mb-4">
              <span className="w-1.5 h-1.5 bg-purple-400 rounded-full" />
              TPD Insurance · {UPDATED_LABEL}
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold leading-[1.1] mb-3 tracking-tight">
              TPD Insurance Australia{" "}
              <span className="text-amber-400">({CURRENT_YEAR})</span>
            </h1>
            <p className="text-sm md:text-base text-slate-300 leading-relaxed max-w-2xl">
              Total and Permanent Disability (TPD) insurance pays a lump sum if you&apos;re permanently unable to work.
              Understand own vs any occupation definitions, inside vs outside super, and how much cover you actually need.
            </p>
            <div className="flex flex-wrap gap-3 mt-5">
              <Link href="/quiz" className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold rounded-lg transition-colors">
                Find an Insurance Adviser →
              </Link>
              <Link href="/insurance" className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-lg transition-colors border border-white/20">
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
            <div className="bg-white rounded-2xl border border-purple-200 p-5">
              <p className="text-xs font-bold text-purple-700 uppercase tracking-wide mb-1">Common Default Super Cover</p>
              <p className="text-xl font-black text-purple-700">$200K–$500K</p>
              <p className="text-xs text-slate-600 mt-1">Default TPD inside super is often far below what Australians actually need. Most are significantly underinsured.</p>
            </div>
            <div className="bg-white rounded-2xl border border-amber-200 p-5">
              <p className="text-xs font-bold text-amber-800 uppercase tracking-wide mb-1">Own vs Any Occupation</p>
              <p className="text-xl font-black text-amber-700">Critical choice</p>
              <p className="text-xs text-slate-600 mt-1">&apos;Own occupation&apos; is far more likely to pay at claim time. Only available outside super. Worth the premium difference.</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">Tax Treatment Outside Super</p>
              <p className="text-xl font-black text-slate-900">Tax-free payout</p>
              <p className="text-xs text-slate-600 mt-1">TPD benefits paid directly from outside-super policies are generally received tax-free. Inside-super payouts have complex tax treatment.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Own vs Any Comparison */}
      <section className="py-10 md:py-12">
        <div className="container-custom">
          <SectionHeading
            eyebrow="Key Decision"
            title="Own Occupation vs Any Occupation"
            sub="The most important choice in TPD insurance — understand the difference before you buy."
          />
          <div className="mt-8 grid sm:grid-cols-2 gap-6">
            <div className="bg-green-50 border border-green-200 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2.5 h-2.5 bg-green-500 rounded-full" />
                <h3 className="text-base font-bold text-green-900">Own Occupation (Recommended)</h3>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed mb-4">
                Pays if you can no longer perform <strong>your specific occupation</strong>. A surgeon, pilot, or
                tradesperson who can&apos;t do their job — even if they could theoretically do other work — can claim.
              </p>
              <ul className="space-y-2">
                {[
                  "More likely to pay at claim time",
                  "Accounts for your specific training and skills",
                  "Better protection for professionals and tradespeople",
                  "Payout is generally tax-free",
                ].map((p) => (
                  <li key={p} className="flex items-start gap-2 text-xs text-slate-700">
                    <span className="text-green-600 font-bold mt-0.5 shrink-0">✓</span>{p}
                  </li>
                ))}
              </ul>
              <div className="mt-4 pt-4 border-t border-green-200">
                <p className="text-xs text-green-800 font-semibold">Must be held outside super · Higher premiums</p>
              </div>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2.5 h-2.5 bg-amber-500 rounded-full" />
                <h3 className="text-base font-bold text-amber-900">Any Occupation (Default in Super)</h3>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed mb-4">
                Pays only if you can no longer perform <strong>any occupation</strong> suited to your education,
                training, or experience. A much higher threshold — and the default definition in most super funds.
              </p>
              <ul className="space-y-2">
                {[
                  "Lower premiums — can be funded from super",
                  "Suitable for general workforce roles",
                  "Can be held inside or outside super",
                  "Default cover in most super funds",
                ].map((p) => (
                  <li key={p} className="flex items-start gap-2 text-xs text-slate-700">
                    <span className="text-amber-600 font-bold mt-0.5 shrink-0">→</span>{p}
                  </li>
                ))}
              </ul>
              <div className="mt-4 pt-4 border-t border-amber-200">
                <p className="text-xs text-amber-800 font-semibold">Higher claim bar · Insurer can dispute more easily</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Cost Table */}
      <section className="py-10 bg-slate-50">
        <div className="container-custom">
          <SectionHeading
            eyebrow="Premium Guide"
            title="Indicative TPD Insurance Costs"
            sub="Monthly premiums vary significantly by age, occupation, definition, and health. These are indicative ranges only — get personalised quotes."
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
                {TPD_COSTS.map((row) => (
                  <tr key={row.profile} className="bg-white hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 text-xs text-slate-700">{row.profile}</td>
                    <td className="py-3 px-4 text-xs font-bold text-slate-900 text-center">{row.monthlyPremium}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-xs text-slate-400 mt-2">Indicative only. Actual premiums depend on health history, smoker status, and individual underwriting. See a financial adviser for a personalised quote.</p>
          </div>
        </div>
      </section>

      {/* Editorial Sections */}
      <section className="py-10 md:py-12">
        <div className="container-custom max-w-3xl">
          <SectionHeading eyebrow="TPD Insurance Guide" title="Everything You Need to Know About TPD" />
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
          <SectionHeading eyebrow="FAQ" title="TPD Insurance Questions Answered" />
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
              { title: "Trauma Insurance", href: "/insurance/trauma", icon: "❤️", desc: "Serious illness lump sum" },
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
          <h2 className="text-xl font-extrabold mb-3">Get personalised TPD insurance advice</h2>
          <p className="text-sm text-slate-300 mb-6">
            TPD insurance is complex — own vs any occupation, inside vs outside super, and the right sum insured all matter.
            An insurance specialist can structure your cover correctly.
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
