import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL } from "@/lib/seo";
import { SUPER_WARNING_SHORT, GENERAL_ADVICE_WARNING } from "@/lib/compliance";
import SectionHeading from "@/components/SectionHeading";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Consolidate Your Super — How to Find & Merge Multiple Accounts (2026 Guide)",
  description:
    "Step-by-step guide to consolidating multiple super accounts in Australia. How to find lost super via myGov and the ATO, insurance warnings, choosing the right fund, and tax-free rollovers. Updated March 2026.",
  openGraph: {
    title: "Consolidate Your Super — Find & Merge Multiple Accounts — 2026",
    description:
      "How to find all your super accounts via myGov, check insurance before you roll over, compare fees, and complete a tax-free rollover. The definitive Australian guide.",
    url: `${SITE_URL}/super/consolidation`,
    images: [
      {
        url: `/api/og?title=${encodeURIComponent("Consolidate Your Super")}&sub=${encodeURIComponent("Find Lost Super · Insurance Check · Tax-Free Rollover · 2026")}`,
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: `${SITE_URL}/super/consolidation` },
};

const CONSOLIDATION_STEPS = [
  {
    step: 1,
    title: "Find all your super accounts via myGov or ATO",
    detail:
      "Log in to myGov and link the ATO service. Under the 'Super' tab, the ATO will show every super fund that has received a Superannuation Guarantee (SG) contribution under your TFN. This includes old accounts from previous employers, lost super with eligible rollover funds (ERFs), and any unclaimed super held directly by the ATO. The ATO's SuperSeeker tool (accessible without a myGov account) can also locate accounts using your TFN, date of birth, and name.",
  },
  {
    step: 2,
    title: "Check the insurance held in each fund",
    detail:
      "Before you close any account, confirm whether it holds life insurance (death cover), total and permanent disability (TPD) cover, or income protection insurance. Call the fund or check your member portal. Ask: what is the cover amount, is it automatic (default) or opted in, and is it still active? Some older funds have generous grandfathered insurance arrangements that would be impossible to replicate today — especially if your health has changed since you joined.",
  },
  {
    step: 3,
    title: "Compare fees and performance across your funds",
    detail:
      "Use the ATO's YourSuper comparison tool at ato.gov.au to compare annual fees and long-term investment returns across all APRA-regulated funds. Focus on the total annual fee as a percentage of your balance — this is what erodes your retirement savings. A 0.5% difference in fees compounded over 30 years can mean tens of thousands of dollars at retirement.",
  },
  {
    step: 4,
    title: "Choose which fund to keep",
    detail:
      "Select the fund that offers the best combination of fees, investment performance, insurance, and investment options for your situation. Consider: your employer's default fund (some employers contribute to one fund only), your current insurance arrangements, and whether the fund offers the investment mix you want. Your employer may have a workplace super arrangement but you generally have the right to choose your own fund.",
  },
  {
    step: 5,
    title: "Complete the rollover request",
    detail:
      "You can initiate a rollover through myGov (ATO's 'Transfer super' tool) — this is the fastest and easiest method for most people. Alternatively, contact your chosen fund directly and ask for a rollover request form, providing details of the fund(s) you want to roll into the new account. You'll need the fund's ABN and your member number(s). The rollover process typically takes 3–10 business days.",
  },
  {
    step: 6,
    title: "Confirm the transfer is complete",
    detail:
      "Log back into myGov after 2 weeks to confirm the old accounts are closed and the balance has been transferred correctly. Contact the old fund directly if the rollover hasn't appeared. Check that any pending employer contributions (from your most recent payroll) are redirected to your consolidated fund — your employer will need your new fund's details and your member number.",
  },
];

const CONSOLIDATION_SECTIONS = [
  {
    heading: "How to find lost super — myGov and the ATO SuperSeeker",
    body: "There is approximately $17 billion in lost and unclaimed super in Australia. The most common reason people have multiple accounts is changing jobs — each new employer opens a default account if the employee doesn't nominate a fund.\n\nThe fastest way to find all your accounts is through myGov:\n\n1. Create or log in to your myGov account at my.gov.au\n2. Link the ATO as a service (you'll need your TFN and identity documents)\n3. Go to the 'Super' section to see all funds linked to your TFN\n\nThe ATO's SuperSeeker tool is an alternative if you don't have a myGov account — visit ato.gov.au/super and search by TFN, name, and date of birth.\n\nATO-held super: If your fund couldn't locate you (e.g. you changed address without updating your fund), your balance may have been transferred to the ATO as unclaimed super. The ATO holds this indefinitely and you can claim it at any time through myGov — it earns a low CPI-based return while held by the ATO.",
  },
  {
    heading: "Insurance implications — the biggest risk when consolidating",
    body: "This is the single most important thing to check before rolling over a super account. Many Australians have valuable insurance in older super accounts that they are unaware of:\n\n• Life (death) cover: pays a lump sum to your dependants if you die\n• Total and permanent disability (TPD): pays if you become permanently unable to work\n• Income protection: replaces income if you're temporarily disabled\n\nThe risk: when you close a super account by rolling it over, the insurance inside that account is cancelled — often permanently and without the option to reapply at the same terms.\n\nWhy this matters: insurers assess applications based on your current health. If your health has changed since your original fund's insurance was issued (e.g. you've developed a medical condition), you may be unable to get equivalent cover in a new fund, or may be charged exclusions or higher premiums.\n\nWhat to check before rolling over:\n• What type of cover does each account hold?\n• How much cover?\n• Is the cover still active (some accounts go inactive if no contributions for 16 months)?\n• Can you transfer the cover to your new fund?\n\nSome funds offer 'insurance linking' or 'transfer of insurance' — meaning you can move to a new fund and port your existing cover amount without underwriting. Ask the receiving fund before you roll over.",
  },
  {
    heading: "When NOT to consolidate",
    body: "Consolidating is almost always beneficial — but there are circumstances where you should pause:\n\n1. You have valuable group insurance in an older fund. As above — if you have significant TPD or income protection cover in an old employer fund at terms that would be hard to replicate, consider whether to keep that account open (even a small balance) to preserve the insurance.\n\n2. Your employer requires a specific default fund. Some enterprise agreements and legacy workplace arrangements specify a default fund. While the Superannuation Choice legislation gives most employees the right to choose, some defined benefit schemes are locked. If your employer contributes to a defined benefit fund, seek advice before rolling out.\n\n3. You hold a defined benefit super entitlement. Many older public sector super funds (e.g. State Super, CSS, PSS) are defined benefit schemes with guaranteed retirement income formulas. These entitlements are extremely valuable and cannot be replicated with accumulation super. Never roll a defined benefit entitlement without specialist advice.\n\n4. You are close to retirement and have complexities. If you're within 5 years of retirement and have significant super balances across multiple funds, the interaction of contributions caps, Total Super Balance (TSB), and pension phases across funds can create complexity. A financial adviser can help.",
  },
  {
    heading: "How to choose which fund to keep",
    body: "When deciding which fund to consolidate into, evaluate:\n\nFees: The annual administration fee and investment fee together. The YourSuper comparison tool (ato.gov.au) standardises comparison across APRA funds. Larger industry funds typically have lower fees on larger balances.\n\nInvestment performance: Look at 5-year and 7-year net returns (after fees and tax) in comparable investment options (e.g. 'Balanced' or 'Growth'). The YourSuper tool flags 'underperforming' funds that have consistently delivered below-benchmark returns.\n\nInsurance: Once you've checked all your existing insurance, confirm the receiving fund can provide adequate cover going forward. Group insurance through super is typically cheaper than retail insurance.\n\nInvestment options: If you want to direct your super into specific sectors, ETFs, or a direct investment option (e.g. choosing ASX-listed ETFs within your super), check which funds offer this.\n\nMember services: Online portal quality, investment switching ease, and financial advice availability matter more as your balance grows.\n\nYour employer's fund: There can be a practical advantage to consolidating into your current employer's default fund — SG contributions arrive there automatically and you don't need to provide fund details.",
  },
  {
    heading: "Tax implications of consolidating super — rollovers are tax-free",
    body: "Superannuation rollovers between complying funds are tax-free. You do not pay:\n\n• No income tax on the rollover amount\n• No capital gains tax on the transfer\n• No exit tax\n\nThis is an important point — many people defer consolidating because they assume there's a tax cost. There isn't, for standard accumulation super rollovers between APRA-regulated funds.\n\nThe only tax consideration is if your fund holds an 'untaxed element' (common in some older public sector funds). Untaxed super has not yet had the standard 15% contributions tax applied — when rolled into a taxed fund, the 15% tax is applied at that point. This is not a reason to avoid rolling over, but it's worth understanding what type of element your super balance is classified as.\n\nContributions tax already paid: Your employer's SG contributions have already had 15% tax applied inside the fund. This 'taxed element' can be accessed in retirement as largely tax-free income (for people over 60).",
  },
];

const CONSOLIDATION_FAQS = [
  {
    question: "How long does a super rollover take?",
    answer:
      "Most rollovers processed via myGov (ATO's 'Transfer super' function) complete within 3 business days. Manual rollovers via paper forms can take 10–28 days. The receiving fund may take 2–5 business days to credit the funds after receiving the rollover request. The old fund is legally required to process the rollover within 3 business days of receiving a valid request. If your rollover is taking longer, contact the old fund directly.",
  },
  {
    question: "Is there any tax on a super rollover?",
    answer:
      "No — rollovers between complying superannuation funds are tax-free. You won't pay income tax, capital gains tax, or any exit fee on the transfer. The only exception involves 'untaxed elements' in some older public sector funds, where the 15% contributions tax is applied at the time of rollover rather than having been applied to employer contributions when they were made. For the vast majority of Australians with standard accumulation accounts, rollovers are completely tax-free.",
  },
  {
    question: "Does my employer have to contribute to my chosen fund?",
    answer:
      "Under the Superannuation Choice legislation, most employees have the right to choose which super fund their employer's Superannuation Guarantee (SG) contributions go to. Your employer must contribute to your nominated fund if it is a complying fund. Exceptions exist for enterprise agreements made before 1 January 2021 that specify a particular fund, and for defined benefit funds. Your employer is required to provide you with a Standard Choice Form (ATO form NAT 13080) and act on your completed choice within 2 months.",
  },
  {
    question: "What happens to employer contributions already on their way when I switch funds?",
    answer:
      "There's often a timing gap between the last payroll SG contribution going to your old fund and your rollover request. Contributions that arrive at your old fund after you've rolled over will typically sit in that account or be forwarded to your new fund if the account remains open. Once your rollover is complete, provide your new fund's details (including ABN and member number) to your employer via a Standard Choice Form to redirect all future contributions.",
  },
  {
    question: "Can I consolidate super from multiple employers at the same time?",
    answer:
      "Yes — you can roll over as many accounts as you like in a single process through myGov. The ATO's 'Transfer super' tool lets you select all accounts and roll them into one fund simultaneously. You can also roll over in stages. If you have accounts with former employer funds, some may have already moved your balance to an Eligible Rollover Fund (ERF) or the ATO (as unclaimed super) if you couldn't be contacted — check the ATO Super tab for accounts you may have forgotten.",
  },
];

export default function SuperConsolidationPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: SITE_URL },
    { name: "Super", url: `${SITE_URL}/super` },
    { name: "Consolidation" },
  ]);

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: CONSOLIDATION_FAQS.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };

  return (
    <div className="bg-white min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="relative bg-white border-b border-slate-100 overflow-hidden py-8 md:py-12">
        <div className="container-custom">
          <nav className="text-xs text-slate-500 mb-5 flex items-center gap-1.5 flex-wrap">
            <Link href="/" className="hover:text-slate-900">Home</Link>
            <span>/</span>
            <Link href="/super" className="hover:text-slate-900">Super</Link>
            <span>/</span>
            <span className="text-slate-900 font-medium">Consolidation</span>
          </nav>
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 border border-slate-200 rounded-full text-xs font-semibold text-slate-600 mb-4">
              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full" />
              Super Consolidation · Updated March 2026
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold leading-[1.1] mb-3 tracking-tight text-slate-900">
              Consolidate Your Super:{" "}
              <span className="text-amber-600">How to Find &amp; Merge Multiple Accounts</span>
            </h1>
            <p className="text-sm md:text-base text-slate-600 leading-relaxed">
              The average Australian has 2.3 super accounts — costing hundreds in duplicate fees every year.
              Here&apos;s how to find all your accounts, check your insurance, and roll them into one without
              making expensive mistakes.
            </p>
          </div>
        </div>
      </section>

      {/* ── Key Callouts ─────────────────────────────────────────────── */}
      <section className="py-8 bg-slate-50">
        <div className="container-custom">
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl border border-amber-200 p-5">
              <p className="text-xs font-bold text-amber-800 uppercase tracking-wide mb-1">Average Lost Super</p>
              <p className="text-xl font-black text-amber-700">$12,000</p>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">Average lost super per person across Australia — $17 billion in total sits unclaimed.</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">Multiple Accounts</p>
              <p className="text-xl font-black text-slate-700">2.3 accounts</p>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">Average number of super accounts per Australian — most opened by employers without the member&apos;s knowledge.</p>
            </div>
            <div className="bg-white rounded-2xl border border-green-200 p-5">
              <p className="text-xs font-bold text-green-800 uppercase tracking-wide mb-1">Fee Saving</p>
              <p className="text-xl font-black text-green-700">$200–800/yr</p>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">Typical annual fee saving from consolidating duplicate super accounts — compounded over decades, this is significant.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Insurance Warning ────────────────────────────────────────── */}
      <section className="py-10 md:py-12">
        <div className="container-custom max-w-3xl">
          <SectionHeading
            eyebrow="Critical first step"
            title="Check your insurance before you consolidate"
          />
          <div className="bg-amber-50 border-l-4 border-amber-500 rounded-r-xl p-5 mb-6">
            <p className="text-sm font-bold text-amber-900 mb-2">Important: closing an account cancels its insurance</p>
            <p className="text-sm text-amber-800 leading-relaxed">
              {SUPER_WARNING_SHORT} Rolling over a super account closes it — and cancels any life insurance,
              TPD, or income protection insurance held within it. If your health has changed since that
              policy was issued, you may not be able to get equivalent cover in a new fund. Always check
              what insurance each account holds <strong>before</strong> initiating a rollover.
            </p>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed">
            Call each fund and ask: <em>"What insurance do I have in this account, how much is the cover, and is it currently active?"</em>{" "}
            A 10-minute phone call could save you from losing insurance that would otherwise take a new medical assessment to replace.
          </p>
        </div>
      </section>

      {/* ── Step-by-Step Process ─────────────────────────────────────── */}
      <section className="py-10 md:py-14 bg-slate-50">
        <div className="container-custom max-w-3xl">
          <SectionHeading
            eyebrow="How it works"
            title="6-step super consolidation process"
            sub="Follow these steps in order — skipping step 2 (insurance check) is the most common mistake."
          />
          <div className="space-y-4">
            {CONSOLIDATION_STEPS.map((s) => (
              <div key={s.step} className="bg-white rounded-2xl border border-slate-200 p-5 flex gap-5">
                <div className="shrink-0 w-9 h-9 rounded-full bg-amber-500 text-white font-black text-sm flex items-center justify-center">
                  {s.step}
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 mb-1.5">{s.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{s.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Content Sections ─────────────────────────────────────────── */}
      <section className="py-12 md:py-16">
        <div className="container-custom max-w-3xl">
          <SectionHeading eyebrow="Complete guide" title="Everything you need to know about super consolidation" />
          <div className="space-y-10">
            {CONSOLIDATION_SECTIONS.map((section) => (
              <div key={section.heading}>
                <h3 className="text-base font-extrabold text-slate-900 mb-3">{section.heading}</h3>
                <div className="text-sm text-slate-600 leading-relaxed space-y-3">
                  {section.body.split("\n\n").map((para, i) => (
                    <p key={i}>{para}</p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQs ─────────────────────────────────────────────────────── */}
      <section className="py-12 md:py-16 bg-slate-50">
        <div className="container-custom max-w-3xl">
          <SectionHeading eyebrow="Questions" title="Frequently asked questions" />
          <div className="space-y-4">
            {CONSOLIDATION_FAQS.map((faq) => (
              <details key={faq.question} className="group bg-white rounded-xl border border-slate-200">
                <summary className="px-5 py-4 text-sm font-bold text-slate-900 cursor-pointer list-none flex items-center justify-between hover:bg-slate-50 rounded-xl transition-colors">
                  {faq.question}
                  <span className="text-slate-400 group-open:rotate-180 transition-transform text-base ml-3">⌄</span>
                </summary>
                <div className="px-5 pb-4 text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
                  {faq.answer}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────── */}
      <section className="py-10 bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="container-custom flex flex-col sm:flex-row items-center gap-6 justify-between">
          <div>
            <h2 className="text-lg font-extrabold text-white mb-1">Ready to choose a better super fund?</h2>
            <p className="text-slate-400 text-sm">Compare fees, performance, and insurance across Australia&apos;s best super funds.</p>
          </div>
          <div className="flex gap-3 shrink-0 flex-wrap">
            <Link
              href="/compare/super"
              className="px-5 py-3 bg-amber-500 hover:bg-amber-400 text-white font-bold rounded-xl text-sm transition-colors whitespace-nowrap"
            >
              Compare Super Funds
            </Link>
            <Link
              href="/advisors/smsf-accountants"
              className="px-5 py-3 border border-slate-600 hover:border-slate-400 text-slate-300 font-semibold rounded-xl text-sm transition-colors whitespace-nowrap"
            >
              Find a Super Specialist
            </Link>
          </div>
        </div>
      </section>

      {/* ── Compliance footer ────────────────────────────────────────── */}
      <section className="py-6 bg-slate-50 border-t border-slate-200">
        <div className="container-custom">
          <p className="text-xs text-slate-400 leading-relaxed">{GENERAL_ADVICE_WARNING}</p>
        </div>
      </section>
    </div>
  );
}
