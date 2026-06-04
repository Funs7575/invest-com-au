import type { Metadata } from "next";
import { SITE_URL, CURRENT_YEAR, UPDATED_LABEL } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";
import Link from "next/link";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `Superannuation Death Benefits — Who Gets Your Super & How It's Taxed (${CURRENT_YEAR})`,
  description:
    "How super death benefits work in Australia: who can receive them, the tax-free vs taxed distinction between dependants and non-dependants, binding death benefit nominations, reversionary pensions, the re-contribution strategy, and SMSF estate planning. " +
    UPDATED_LABEL +
    ".",
  openGraph: {
    title: `Superannuation Death Benefits — Who Gets Your Super & How It's Taxed (${CURRENT_YEAR})`,
    description:
      "Your super doesn't automatically go to your estate. Understand SIS dependants vs tax dependants, the 15% death benefit tax adult children pay, binding nominations, reversionary pensions, and the re-contribution strategy.",
    url: `${SITE_URL}/super/death-benefit`,
    images: [
      {
        url: `/api/og?title=${encodeURIComponent("Superannuation Death Benefits")}&sub=${encodeURIComponent(
          "Who Gets Your Super · Tax Dependants · Binding Nominations · " + CURRENT_YEAR,
        )}`,
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: `${SITE_URL}/super/death-benefit` },
};

/* ─── Hero stat cards ──────────────────────────────────────────── */
const KEY_STATS = [
  {
    label: "Not Your Estate",
    value: "Held in trust",
    accent: "amber",
    note: "Super doesn't pass under your will by default — the trustee or a binding nomination decides who's paid.",
  },
  {
    label: "Spouse Tax",
    value: "$0 — tax-free",
    accent: "green",
    note: "A spouse is a tax dependant, so a lump sum death benefit is received completely tax-free.",
  },
  {
    label: "Adult Child Tax",
    value: "15% + Medicare",
    accent: "red",
    note: "On the taxed element of the taxable component (30% + Medicare on any untaxed element).",
  },
  {
    label: "Binding Nomination",
    value: "3-year expiry",
    accent: "blue",
    note: "Lapsing nominations expire every 3 years; non-lapsing nominations stay in force until changed.",
  },
] as const;

const STAT_ACCENT: Record<string, { border: string; label: string; value: string }> = {
  amber: { border: "border-amber-200", label: "text-amber-800", value: "text-amber-700" },
  green: { border: "border-green-200", label: "text-green-800", value: "text-green-700" },
  red: { border: "border-red-200", label: "text-red-800", value: "text-red-700" },
  blue: { border: "border-blue-200", label: "text-blue-800", value: "text-blue-700" },
};

/* ─── Who can receive a death benefit (SIS dependants) ─────────── */
const SIS_DEPENDANTS = [
  {
    category: "Spouse",
    definition:
      "A person you are legally married to, or a de facto partner (including same-sex partners) you live with on a genuine domestic basis. A former spouse is generally not a SIS dependant once the relationship has ended.",
    canReceive: "Yes — directly",
  },
  {
    category: "Children (any age)",
    definition:
      "Your biological children, adopted children, stepchildren, and children of your spouse. There is no age limit under the SIS definition — an adult child is still a child for the purpose of who can receive a benefit (though the tax treatment differs sharply, see below).",
    canReceive: "Yes — directly",
  },
  {
    category: "Financial dependants",
    definition:
      "Any person who was financially dependent on you at the date of your death — wholly or partially relying on you for financial support. This can include an elderly parent, a sibling, or another relative you supported.",
    canReceive: "Yes — directly",
  },
  {
    category: "Interdependency relationship",
    definition:
      "Two people who live together in a close personal relationship, where one or both provide financial support, domestic support, and personal care. This can cover carers, adult children living at home, or other close relationships that aren't a spouse or child.",
    canReceive: "Yes — directly",
  },
  {
    category: "Legal personal representative (estate)",
    definition:
      "The executor of your will or the administrator of your estate. Paying the benefit to your LPR means the money flows into your estate and is then distributed according to your will (or the rules of intestacy if you have no valid will).",
    canReceive: "Yes — via your estate",
  },
];

/* ─── Tax treatment: dependants vs non-dependants ──────────────── */
const TAX_TREATMENT = [
  {
    recipient: "Spouse (married or de facto)",
    sisDependant: "Yes",
    taxDependant: "Yes",
    lumpSumTax: "Tax-free",
  },
  {
    recipient: "Minor child (under 18)",
    sisDependant: "Yes",
    taxDependant: "Yes",
    lumpSumTax: "Tax-free",
  },
  {
    recipient: "Financial dependant",
    sisDependant: "Yes",
    taxDependant: "Yes",
    lumpSumTax: "Tax-free",
  },
  {
    recipient: "Interdependency relationship",
    sisDependant: "Yes",
    taxDependant: "Yes",
    lumpSumTax: "Tax-free",
  },
  {
    recipient: "Adult child (financially independent)",
    sisDependant: "Yes",
    taxDependant: "No",
    lumpSumTax: "15% + Medicare on taxed element; 30% + Medicare on untaxed element",
  },
  {
    recipient: "Estate / LPR",
    sisDependant: "N/A",
    taxDependant: "Depends on who ultimately benefits",
    lumpSumTax: "Tax flows through based on whether the ultimate beneficiary is a tax dependant",
  },
];

/* ─── Binding vs non-binding nominations ───────────────────────── */
const NOMINATION_COMPARISON = [
  {
    label: "Is the trustee bound?",
    binding: "Yes — the trustee must pay as you direct (if the nomination is valid)",
    nonBinding: "No — the trustee retains full discretion over who receives the benefit",
  },
  {
    label: "Certainty of outcome",
    binding: "High — removes trustee discretion and reduces the risk of disputes",
    nonBinding: "Low — the outcome depends on the trustee's assessment of your dependants",
  },
  {
    label: "Validity requirements",
    binding: "Correct form, signed and dated, witnessed by two adults who aren't beneficiaries, made to eligible beneficiaries (SIS dependants or LPR)",
    nonBinding: "Simpler — you express a preference, no witnessing required in most funds",
  },
  {
    label: "Expiry",
    binding: "Lapsing nominations expire every 3 years; non-lapsing nominations stay in force until changed or revoked",
    nonBinding: "Does not expire, but the trustee is never obliged to follow it",
  },
  {
    label: "Best for",
    binding: "People who want certainty — blended families, estranged relatives, or specific bequests",
    nonBinding: "Simple family situations where you trust the trustee to pay the obvious dependant",
  },
];

/* ─── Lump sum vs reversionary pension ─────────────────────────── */
const PAYMENT_FORM_COMPARISON = [
  {
    label: "How it's paid",
    lumpSum: "A single payment of the death benefit to the beneficiary",
    reversionary: "An existing pension automatically continues to the nominated beneficiary",
  },
  {
    label: "Income continuity",
    lumpSum: "No ongoing income — the beneficiary receives a capital sum",
    reversionary: "Seamless — pension payments continue without interruption on death",
  },
  {
    label: "Transfer balance cap impact",
    lumpSum: "Not counted against the recipient's transfer balance cap",
    reversionary: "Counts toward the recipient's transfer balance cap, with a 12-month grace period before the credit applies",
  },
  {
    label: "Who can receive it",
    lumpSum: "Any SIS dependant or the estate",
    reversionary: "Must be a dependant eligible to receive a death benefit income stream (generally a spouse, or a child in limited circumstances)",
  },
  {
    label: "Flexibility",
    lumpSum: "Full access to the capital immediately",
    reversionary: "Locked into pension rules, but provides stable retirement income",
  },
];

/* ─── Worked example: adult son vs spouse ($500k balance) ──────── */
const WORKED_EXAMPLE = [
  { line: "Total super balance", son: "$500,000", spouse: "$500,000" },
  { line: "Tax-free component (always tax-free)", son: "$100,000", spouse: "$100,000" },
  { line: "Taxable component (taxed element)", son: "$400,000", spouse: "$400,000" },
  { line: "Death benefit tax (15% + 2% Medicare on taxable)", son: "−$68,000", spouse: "$0" },
  { line: "Net amount received", son: "$432,000", spouse: "$500,000" },
];

/* ─── Process timeline ─────────────────────────────────────────── */
const PROCESS_STEPS = [
  {
    step: 1,
    title: "Notify the super fund of the death",
    detail:
      "The executor, next of kin, or a beneficiary contacts the fund to report the death and request a death benefit claim pack. For an SMSF, the surviving trustee(s) begin the process internally. The sooner the fund is notified, the sooner the assessment can begin.",
  },
  {
    step: 2,
    title: "Provide the death certificate and supporting documents",
    detail:
      "The fund requires a certified copy of the death certificate, proof of identity for claimants, and (where relevant) the grant of probate or letters of administration. If a binding nomination exists, the fund checks its validity. If not, claimants may need to provide evidence of dependency or interdependency.",
  },
  {
    step: 3,
    title: "The trustee assesses the claim",
    detail:
      "Where there is a valid binding nomination, the trustee is bound to pay as directed. Where the nomination is non-binding or absent, the trustee must identify all potential SIS dependants and decide how to distribute the benefit — a process that can take longer and is where most disputes arise.",
  },
  {
    step: 4,
    title: "The death benefit is paid",
    detail:
      "Once the claim is assessed, the trustee pays the benefit as a lump sum, a reversionary or new death benefit pension, or to the estate. For straightforward claims with a valid binding nomination this typically takes a few weeks to a few months; contested or complex claims (especially in SMSFs) can take much longer.",
  },
  {
    step: 5,
    title: "Disputes are escalated",
    detail:
      "If a claimant disagrees with the trustee's decision, an APRA-regulated fund's decision can be challenged through the Australian Financial Complaints Authority (AFCA). SMSF disputes are not covered by AFCA and are resolved in court — which is slow and expensive, underlining why binding nominations matter most in SMSFs.",
  },
];

/* ─── Estate planning considerations ───────────────────────────── */
const ESTATE_PLANNING = [
  {
    title: "Paying to the estate vs directly to beneficiaries",
    body: "Directing the benefit to your estate lets your will control the distribution and unlocks testamentary trust protections — but the money then becomes part of the estate and is potentially exposed to creditors and family provision claims. Paying directly to a dependant keeps the money out of the estate and is usually faster.",
  },
  {
    title: "Super proceeds trusts and testamentary trusts",
    body: "A testamentary trust created by your will can receive super proceeds (when the benefit is paid to your estate) and hold them for beneficiaries — useful for minor children, beneficiaries with a disability, or asset protection. A dedicated super proceeds trust can, in some circumstances, allow minor children to be taxed at adult marginal rates rather than penalty rates on the income.",
  },
  {
    title: "Coordinating super nominations with your will",
    body: 'If you nominate your estate, the death benefit follows your will; if you nominate a person, it bypasses your will entirely. A common error is a will that "gives" super to someone while a binding nomination directs it elsewhere — the nomination wins. Review your nominations and your will together, ideally with an estate planning specialist.',
  },
];

/* ─── Long-form content sections ───────────────────────────────── */
const CONTENT_SECTIONS = [
  {
    heading: "Super is held in trust — it doesn't automatically join your estate",
    body: "Your superannuation is not owned by you in the same way as a bank account or a house. It is held on your behalf by the trustee of your super fund under a trust deed. Because of this legal structure, super is generally not an asset of your estate and does not automatically pass under your will.\n\nWhen you die, the trustee of the fund decides — or is directed by a valid binding nomination — how the death benefit is paid. The benefit can be paid directly to one or more dependants, or to your legal personal representative (your estate), where it is then distributed under your will.\n\nThis is the single most misunderstood fact about super. Many people assume their will controls their super. It does not, unless you have specifically directed the benefit to your estate (or your fund's rules default to the estate). A well-drafted will is no substitute for a properly completed death benefit nomination.\n\nA death benefit can be paid as a lump sum or, for eligible dependants, as an income stream (a death benefit pension). Which form is available, and which is most tax-effective, depends on who the beneficiary is.",
  },
  {
    heading: "The critical distinction: SIS dependants vs tax dependants",
    body: "There are two separate definitions of 'dependant' that operate at the same time, and confusing them is the source of most unexpected tax bills.\n\nSIS dependants (under the Superannuation Industry (Supervision) Act) determine WHO is allowed to receive a death benefit directly from the fund. This group includes your spouse, your children of any age, anyone financially dependent on you, and anyone in an interdependency relationship with you.\n\nTax dependants (under the Income Tax Assessment Act) determine WHO receives the benefit tax-free. This is a narrower group: your spouse, your minor children (under 18), people who were financially dependent on you, and people in an interdependency relationship with you.\n\nThe mismatch that catches families out: an adult, financially independent child is a SIS dependant (so they CAN receive your super) but is usually NOT a tax dependant (so they PAY tax on the taxable component). This is one of the most common and costly surprises in Australian estate planning — a benefit paid to an adult child can be reduced by tens of thousands of dollars in tax that a spouse would never have paid.",
  },
  {
    heading: "How death benefit tax is calculated — taxed and untaxed elements",
    body: "Death benefit tax only ever applies to the taxable component of your super, and only when it is paid to a non-tax-dependant. The tax-free component is always paid tax-free, to anyone.\n\nSuper is made up of two broad components:\n\nTax-free component: amounts that came from after-tax (non-concessional) contributions, plus certain other amounts. No tax is payable on this component, regardless of who receives it.\n\nTaxable component: amounts that came from concessional (pre-tax) contributions — employer SG, salary sacrifice, personal deductible contributions — plus all the investment earnings. The taxable component is itself split into a 'taxed element' (the usual case, where 15% contributions tax has already been paid inside the fund) and an 'untaxed element' (less common, found in some public sector funds and where life insurance proceeds inflate the benefit).\n\nWhen a non-tax-dependant (such as an adult child) receives a lump sum death benefit:\n• Taxed element of the taxable component: taxed at 15% plus the Medicare levy (2%)\n• Untaxed element of the taxable component: taxed at 30% plus the Medicare levy (2%)\n• Tax-free component: always tax-free\n\nWhen a tax dependant (such as a spouse) receives the same lump sum, the entire amount — taxable and tax-free components alike — is received completely tax-free.",
  },
  {
    heading: "Coordinating super with your overall estate plan",
    body: "Because super sits outside your will by default, it must be planned alongside — not inside — your estate plan. A few structures and considerations matter:\n\nPaying to the estate vs directly to beneficiaries: Directing the benefit to your estate (your LPR) lets your will control the distribution and can be useful where you want the protections of a testamentary trust. The trade-off is that the money becomes part of the estate and is potentially exposed to creditors and to family provision (estate) claims. Paying directly to a dependant keeps the money out of the estate and is usually faster.\n\nSuper proceeds trusts and testamentary trusts: A testamentary trust created by your will can receive super proceeds (when the benefit is paid to your estate) and hold them for beneficiaries — useful for minor children, beneficiaries with disabilities, or asset protection. A dedicated super proceeds trust can, in some circumstances, allow minor children to be taxed at adult marginal rates on the income rather than penalty rates.\n\nInteraction with the will: If you nominate your estate, the death benefit follows your will; if you nominate a person, it bypasses your will entirely. A common planning error is a will that 'gives' super to someone while a binding nomination directs it elsewhere — the nomination wins. Super nominations and the will must be reviewed together, ideally with an estate planning specialist.",
  },
  {
    heading: "Timeframes, process, and disputes",
    body: "There is no single legislated deadline for paying a death benefit, but trustees are expected to pay 'as soon as practicable' after the member's death. In practice, a straightforward claim with a valid binding nomination is usually paid within a few weeks to a few months once the death certificate and required documents are provided.\n\nWhat slows it down: a non-binding or absent nomination (the trustee must investigate and weigh up all potential dependants), competing claims, incomplete documentation, or the need to obtain probate. SMSF claims can be the slowest where surviving trustees disagree.\n\nIf you are unhappy with a trustee's decision on an APRA-regulated fund, you can lodge a complaint with the Australian Financial Complaints Authority (AFCA), which can review the trustee's decision. SMSFs are outside AFCA's jurisdiction — disputes there must be resolved in court, which is one more reason binding nominations are so important for self-managed funds.",
  },
];

/* ─── FAQ ──────────────────────────────────────────────────────── */
const DEATH_BENEFIT_FAQS = [
  {
    q: "Does my super automatically go to my spouse when I die?",
    a: "Not automatically. Super is held in trust and is not part of your estate by default, so it does not pass under your will and it does not automatically go to your spouse. The trustee of your fund decides how the death benefit is paid — unless you have made a valid binding death benefit nomination directing it to your spouse, in which case the trustee must follow it. A spouse is both a SIS dependant (so they can receive it) and a tax dependant (so they receive it tax-free), but you still need a valid nomination (or to rely on trustee discretion) for the benefit to actually reach them.",
  },
  {
    q: "Do my children pay tax on my super death benefit?",
    a: "It depends on their age and dependency. Minor children (under 18) and any financially dependent children are tax dependants and receive the benefit tax-free. Adult, financially independent children are SIS dependants (so they can receive your super) but are usually NOT tax dependants — they pay 15% plus the Medicare levy on the taxed element of the taxable component, and 30% plus Medicare on any untaxed element. The tax-free component is always tax-free. This is why a benefit left to adult children can be reduced by tens of thousands of dollars that a spouse would never have paid.",
  },
  {
    q: "What is a binding death benefit nomination?",
    a: "A binding death benefit nomination (BDBN) is a legally binding instruction to your super fund trustee directing exactly who should receive your death benefit and in what proportions. If the nomination is valid — made on the correct form, signed, dated, witnessed by two adults who are not beneficiaries, and made to eligible beneficiaries (SIS dependants or your legal personal representative) — the trustee must pay as you direct, removing their discretion. Nominations can be lapsing (they expire every 3 years and must be renewed) or non-lapsing (they stay in force until you change or revoke them). Review your nomination regularly, especially after marriage, divorce, the birth of children, or the death of a beneficiary.",
  },
  {
    q: "How can I reduce death benefit tax for my adult children?",
    a: "The most common approach is the re-contribution strategy. Once you are over 60 you can usually withdraw super tax-free, then re-contribute it as a non-concessional contribution, which lands in the tax-free component. Over time this converts taxable component into tax-free component, reducing the death benefit tax your adult children would otherwise pay. You must work within the non-concessional contribution caps and bring-forward rules, and have the capacity to make the contribution. Other options include drawing down super in retirement (spending the taxable component) and, for some, directing benefits through an estate with appropriate trust structures. Because the caps and conditions are detailed, this is an area for specialist advice.",
  },
  {
    q: "What is a reversionary pension?",
    a: "A reversionary pension is a super income stream that is set up so that, on your death, it automatically continues (reverts) to a nominated beneficiary — usually your spouse. The key benefit is seamless income continuity: the pension payments simply keep flowing to the survivor without the need for a fresh claim or a lump sum payout. The reverted pension counts toward the recipient's transfer balance cap, but there is a 12-month grace period before the credit is applied, giving the survivor time to rearrange their affairs. A reversionary pension is an alternative to taking the death benefit as a lump sum, and is a common feature of both APRA-fund and SMSF pensions.",
  },
];

export default function SuperDeathBenefitPage() {
  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Super", item: `${SITE_URL}/super` },
      { "@type": "ListItem", position: 3, name: "Death Benefits", item: `${SITE_URL}/super/death-benefit` },
    ],
  };

  const faqSchema = faqJsonLd(DEATH_BENEFIT_FAQS);

  return (
    <div className="bg-white min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      {faqSchema && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      )}

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="relative bg-white border-b border-slate-100 overflow-hidden py-8 md:py-12">
        <div className="container-custom">
          <nav className="text-xs text-slate-500 mb-5 flex items-center gap-1.5 flex-wrap">
            <Link href="/" className="hover:text-slate-900">Home</Link>
            <span>/</span>
            <Link href="/super" className="hover:text-slate-900">Super</Link>
            <span>/</span>
            <span className="text-slate-900 font-medium">Death Benefits</span>
          </nav>
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 border border-slate-200 rounded-full text-xs font-semibold text-slate-600 mb-4">
              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full" />
              Super Death Benefits · {UPDATED_LABEL}
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold leading-[1.1] mb-3 tracking-tight text-slate-900">
              Superannuation Death Benefits:{" "}
              <span className="text-amber-600">Who Gets Your Super &amp; How It&apos;s Taxed</span>
            </h1>
            <p className="text-sm md:text-base text-slate-600 leading-relaxed">Your super doesn&apos;t automatically form part of your estate. How your death benefit is paid depends entirely on your nomination and who qualifies as a dependant — and there are significant tax differences between dependants and non-dependants that can cost your family tens of thousands of dollars.</p>
          </div>
        </div>
      </section>

      {/* ── Key Callouts ─────────────────────────────────────────────── */}
      <section className="py-8 bg-slate-50">
        <div className="container-custom">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {KEY_STATS.map((stat) => {
              const c = STAT_ACCENT[stat.accent] ?? STAT_ACCENT.amber!;
              return (
                <div key={stat.label} className={`bg-white rounded-2xl border ${c.border} p-5`}>
                  <p className={`text-xs font-bold ${c.label} uppercase tracking-wide mb-1`}>{stat.label}</p>
                  <p className={`text-xl font-black ${c.value}`}>{stat.value}</p>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">{stat.note}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Super basics ─────────────────────────────────────────────── */}
      <section className="py-10 md:py-12">
        <div className="container-custom max-w-3xl">
          <p className="text-xs font-bold text-amber-600 uppercase tracking-wide mb-2">The fundamentals</p>
          <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-3 tracking-tight">Super death benefit basics</h2>
          <div className="bg-amber-50 border-l-4 border-amber-500 rounded-r-xl p-5 mb-6">
            <p className="text-sm font-bold text-amber-900 mb-2">Your will does not control your super</p>
            <p className="text-sm text-amber-800 leading-relaxed">Superannuation is held in trust by your fund. On your death, the trustee pays the death benefit — it does <strong>not</strong> automatically go to your will or estate unless you specifically direct it there. The benefit can be paid as a lump sum or, for eligible dependants, as an income stream (a death benefit pension).</p>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed mb-3">Because super sits outside your estate by default, a well-drafted will is no substitute for a properly completed death benefit nomination. The two documents must be coordinated — and where they conflict, a valid binding nomination almost always wins over what your will says.</p>
          <p className="text-sm text-slate-600 leading-relaxed">Whether the benefit is paid as a lump sum or as a pension, and how much tax (if any) applies, depends on <strong>who</strong> the beneficiary is. That is the thread running through everything below.</p>
        </div>
      </section>

      {/* ── Who can receive (SIS dependants) table ───────────────────── */}
      <section className="py-12 md:py-16 bg-slate-50">
        <div className="container-custom">
          <p className="text-xs font-bold text-amber-600 uppercase tracking-wide mb-2">Eligibility</p>
          <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-2 tracking-tight">Who can receive a death benefit (SIS dependants)</h2>
          <p className="text-sm text-slate-600 leading-relaxed mb-6 max-w-3xl">Under the Superannuation Industry (Supervision) Act, only certain people can receive your death benefit directly from the fund. Anyone else must receive it via your estate.</p>
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-900 text-white">
                  <th className="px-5 py-4 text-left font-bold text-xs uppercase tracking-wide w-56">Category</th>
                  <th className="px-5 py-4 text-left font-bold text-xs uppercase tracking-wide">Definition</th>
                  <th className="px-5 py-4 text-left font-bold text-xs uppercase tracking-wide text-amber-300 w-40">Can receive?</th>
                </tr>
              </thead>
              <tbody>
                {SIS_DEPENDANTS.map((row, i) => (
                  <tr key={row.category} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                    <td className="px-5 py-3.5 font-semibold text-slate-900 text-xs align-top">{row.category}</td>
                    <td className="px-5 py-3.5 text-slate-600 text-xs leading-relaxed align-top">{row.definition}</td>
                    <td className="px-5 py-3.5 text-slate-700 border-l border-amber-100 text-xs font-medium align-top">{row.canReceive}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── Tax treatment table ──────────────────────────────────────── */}
      <section className="py-12 md:py-16">
        <div className="container-custom">
          <p className="text-xs font-bold text-amber-600 uppercase tracking-wide mb-2">The critical distinction</p>
          <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-2 tracking-tight">Tax treatment — dependants vs non-dependants</h2>
          <p className="text-sm text-slate-600 leading-relaxed mb-6 max-w-3xl">Two different definitions of &quot;dependant&quot; apply at the same time. SIS dependants can <em> receive</em> your super; tax dependants receive it <em>tax-free</em>. The mismatch — adult children are SIS dependants but usually not tax dependants — is the most common and costly surprise in Australian estate planning.</p>
          <div className="overflow-x-auto rounded-2xl border border-slate-200 mb-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-900 text-white">
                  <th className="px-5 py-4 text-left font-bold text-xs uppercase tracking-wide">Recipient</th>
                  <th className="px-4 py-4 text-left font-bold text-xs uppercase tracking-wide w-28">SIS dependant?</th>
                  <th className="px-4 py-4 text-left font-bold text-xs uppercase tracking-wide w-28">Tax dependant?</th>
                  <th className="px-5 py-4 text-left font-bold text-xs uppercase tracking-wide text-amber-300">Lump sum tax</th>
                </tr>
              </thead>
              <tbody>
                {TAX_TREATMENT.map((row, i) => (
                  <tr key={row.recipient} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                    <td className="px-5 py-3.5 font-semibold text-slate-900 text-xs align-top">{row.recipient}</td>
                    <td className="px-4 py-3.5 text-slate-600 text-xs align-top">{row.sisDependant}</td>
                    <td className="px-4 py-3.5 text-slate-600 text-xs align-top">{row.taxDependant}</td>
                    <td className="px-5 py-3.5 text-slate-700 border-l border-amber-100 text-xs leading-relaxed align-top">{row.lumpSumTax}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="bg-red-50 border-l-4 border-red-500 rounded-r-xl p-5">
            <p className="text-sm font-bold text-red-900 mb-2">The mismatch that catches families out</p>
            <p className="text-sm text-red-800 leading-relaxed">An adult, financially independent child <strong>is</strong> a SIS dependant (so they can receive your super) but is usually <strong>not</strong> a tax dependant (so they pay tax on the taxable component). A benefit paid to an adult child is taxed at 15% plus Medicare on the taxed element — and 30% plus Medicare on any untaxed element — while the very same benefit paid to a spouse is completely tax-free.</p>
          </div>
        </div>
      </section>

      {/* ── Components explained ─────────────────────────────────────── */}
      <section className="py-12 md:py-16 bg-slate-50">
        <div className="container-custom max-w-3xl">
          <p className="text-xs font-bold text-amber-600 uppercase tracking-wide mb-2">What gets taxed</p>
          <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-3 tracking-tight">Taxable vs tax-free components</h2>
          <p className="text-sm text-slate-600 leading-relaxed mb-6">Your super balance is split into two components. Death benefit tax only ever applies to the taxable component, and only when it is paid to a non-tax-dependant. The tax-free component is always paid tax-free, to anyone.</p>
          <div className="grid sm:grid-cols-2 gap-4 mb-6">
            <div className="bg-white rounded-2xl border border-green-200 p-5">
              <p className="text-xs font-bold text-green-800 uppercase tracking-wide mb-2">Tax-free component</p>
              <p className="text-sm text-slate-600 leading-relaxed">Built up from after-tax (non-concessional) contributions and certain other amounts. Always paid tax-free — to dependants and non-dependants alike.</p>
            </div>
            <div className="bg-white rounded-2xl border border-red-200 p-5">
              <p className="text-xs font-bold text-red-800 uppercase tracking-wide mb-2">Taxable component</p>
              <p className="text-sm text-slate-600 leading-relaxed">Built up from concessional (pre-tax) contributions plus all investment earnings. Split into a taxed element (15% + Medicare to non-dependants) and an untaxed element (30% + Medicare to non-dependants).</p>
            </div>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed">The practical takeaway: the larger your <strong>tax-free</strong> component, the smaller the death benefit tax your non-dependant beneficiaries will pay. This is exactly what the re-contribution strategy (below) is designed to achieve.</p>
        </div>
      </section>

      {/* ── Worked example ───────────────────────────────────────────── */}
      <section className="py-10 bg-amber-50 border-y border-amber-100">
        <div className="container-custom max-w-2xl">
          <p className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-2">Worked example</p>
          <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-3 tracking-tight">$500,000 super: adult son vs spouse</h2>
          <p className="text-sm text-slate-600 leading-relaxed mb-4">Scenario: a $500,000 balance made up of a $400,000 taxable component and a $100,000 tax-free component. Compare paying it to an adult, financially independent son (a non-tax-dependant) with paying the identical balance to a spouse (a tax dependant).</p>
          <div className="overflow-x-auto rounded-2xl border border-amber-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-900 text-white">
                  <th className="px-5 py-4 text-left font-bold text-xs uppercase tracking-wide">Line item</th>
                  <th className="px-5 py-4 text-right font-bold text-xs uppercase tracking-wide text-red-300">Adult son</th>
                  <th className="px-5 py-4 text-right font-bold text-xs uppercase tracking-wide text-green-300">Spouse</th>
                </tr>
              </thead>
              <tbody>
                {WORKED_EXAMPLE.map((row, i) => (
                  <tr key={row.line} className={i === WORKED_EXAMPLE.length - 1 ? "bg-amber-50 font-bold" : i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                    <td className="px-5 py-3 text-slate-700 text-xs leading-relaxed">{row.line}</td>
                    <td className="px-5 py-3 text-right text-slate-900 text-xs whitespace-nowrap">{row.son}</td>
                    <td className="px-5 py-3 text-right text-slate-900 text-xs whitespace-nowrap">{row.spouse}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-xs text-slate-400 leading-relaxed">Illustrative only, using a taxed element and a 2% Medicare levy. The $68,000 tax bill is entirely a function of who receives the benefit — the son nets $432,000 while the spouse receives the full $500,000 tax-free. An untaxed element would be taxed at 30% + Medicare. Always seek advice before acting.</p>
        </div>
      </section>

      {/* ── Nominations: binding vs non-binding ──────────────────────── */}
      <section className="py-12 md:py-16">
        <div className="container-custom">
          <p className="text-xs font-bold text-amber-600 uppercase tracking-wide mb-2">Directing your benefit</p>
          <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-2 tracking-tight">Binding vs non-binding nominations</h2>
          <p className="text-sm text-slate-600 leading-relaxed mb-6 max-w-3xl">A nomination tells the trustee who you want to receive your death benefit. A <strong>binding</strong>{" "} nomination legally compels the trustee to follow it; a <strong>non-binding</strong> nomination is only a preference the trustee may choose to ignore.</p>
          <div className="overflow-x-auto rounded-2xl border border-slate-200 mb-8">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-900 text-white">
                  <th className="px-5 py-4 text-left font-bold text-xs uppercase tracking-wide w-48">Feature</th>
                  <th className="px-5 py-4 text-left font-bold text-xs uppercase tracking-wide text-blue-300">Binding nomination</th>
                  <th className="px-5 py-4 text-left font-bold text-xs uppercase tracking-wide text-slate-300">Non-binding nomination</th>
                </tr>
              </thead>
              <tbody>
                {NOMINATION_COMPARISON.map((row, i) => (
                  <tr key={row.label} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                    <td className="px-5 py-3.5 font-semibold text-slate-700 text-xs align-top">{row.label}</td>
                    <td className="px-5 py-3.5 text-slate-600 border-l border-blue-100 text-xs leading-relaxed align-top">{row.binding}</td>
                    <td className="px-5 py-3.5 text-slate-600 border-l border-slate-100 text-xs leading-relaxed align-top">{row.nonBinding}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 mb-2">Binding death benefit nominations (BDBN)</h3>
              <p className="text-sm text-slate-600 leading-relaxed">A BDBN legally binds the trustee to pay your benefit as you direct. To be valid it must be on the correct form, signed and dated, witnessed by two adults who are not named beneficiaries, and made only to eligible beneficiaries (SIS dependants or your legal personal representative). Lapsing nominations expire every 3 years and must be renewed; non-lapsing nominations remain in force until you change or revoke them. Review your nomination regularly — especially after marriage, divorce, the birth of a child, or the death of a beneficiary, any of which can leave an old nomination invalid or pointing at the wrong person.</p>
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 mb-2">Non-binding nominations</h3>
              <p className="text-sm text-slate-600 leading-relaxed">A non-binding nomination simply expresses a preference. The trustee considers it but retains full discretion — it must weigh up all of your potential dependants and decide for itself how to pay the benefit. This is the default for many Australians, and while it offers flexibility, it can lead to delays and disputes, particularly in blended families or where relationships have broken down. If certainty matters to you, a valid binding nomination is the safer choice.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Lump sum vs reversionary pension ─────────────────────────── */}
      <section className="py-12 md:py-16 bg-slate-50">
        <div className="container-custom">
          <p className="text-xs font-bold text-amber-600 uppercase tracking-wide mb-2">How it&apos;s paid</p>
          <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-2 tracking-tight">Reversionary pensions vs lump sum death benefits</h2>
          <p className="text-sm text-slate-600 leading-relaxed mb-6 max-w-3xl">A reversionary pension is an income stream set up so that, on your death, it automatically continues to a nominated beneficiary (usually your spouse). It is an alternative to taking the benefit as a one-off lump sum.</p>
          <div className="overflow-x-auto rounded-2xl border border-slate-200 mb-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-900 text-white">
                  <th className="px-5 py-4 text-left font-bold text-xs uppercase tracking-wide w-48">Feature</th>
                  <th className="px-5 py-4 text-left font-bold text-xs uppercase tracking-wide text-slate-300">Lump sum death benefit</th>
                  <th className="px-5 py-4 text-left font-bold text-xs uppercase tracking-wide text-green-300">Reversionary pension</th>
                </tr>
              </thead>
              <tbody>
                {PAYMENT_FORM_COMPARISON.map((row, i) => (
                  <tr key={row.label} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                    <td className="px-5 py-3.5 font-semibold text-slate-700 text-xs align-top">{row.label}</td>
                    <td className="px-5 py-3.5 text-slate-600 border-l border-slate-100 text-xs leading-relaxed align-top">{row.lumpSum}</td>
                    <td className="px-5 py-3.5 text-slate-600 border-l border-green-100 text-xs leading-relaxed align-top">{row.reversionary}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed max-w-3xl">The main appeal of a reversionary pension is seamless income continuation — the survivor&apos;s payments simply keep flowing without a fresh claim. The reverted pension counts toward the recipient&apos;s transfer balance cap, but a 12-month grace period applies before the credit is counted, giving the survivor time to restructure if the combined balances would otherwise breach the cap.</p>
        </div>
      </section>

      {/* ── Re-contribution strategy ─────────────────────────────────── */}
      <section className="py-12 md:py-16">
        <div className="container-custom max-w-3xl">
          <p className="text-xs font-bold text-amber-600 uppercase tracking-wide mb-2">A planning strategy</p>
          <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-3 tracking-tight">The re-contribution strategy</h2>
          <p className="text-sm text-slate-600 leading-relaxed mb-4">The re-contribution strategy is the most common way to reduce the death benefit tax your adult children would otherwise pay. The idea is to convert taxable component into tax-free component while you are alive.</p>
          <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6 mb-4">
            <p className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-3">How it works</p>
            <ol className="space-y-2 text-sm text-slate-600 leading-relaxed list-decimal pl-5">
              <li>Once you are over 60 and able to access your super, you withdraw a lump sum — which is generally tax-free at that age.</li>
              <li>You then re-contribute that amount as a non-concessional (after-tax) contribution, which lands in the tax-free component of your super.</li>
              <li>Repeating this over several years steadily shifts your balance from taxable to tax-free, shrinking the taxable component your non-dependant beneficiaries would be taxed on.</li>
            </ol>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed mb-3"><strong>The caps involved:</strong> re-contributions must fit within the non-concessional contribution cap ($120,000 per year for 2025–26), or up to $360,000 in a single year using the three-year bring-forward rule if your Total Super Balance is below the relevant threshold. Your Total Super Balance must also be under the general transfer balance cap for non-concessional contributions to be allowed at all, and contribution rules tighten from age 75.</p>
          <p className="text-sm text-slate-600 leading-relaxed">Done well, this strategy can save adult children tens of thousands of dollars in death benefit tax. Because it depends on your age, contribution caps, Total Super Balance, and timing, it is an area where specialist advice pays for itself.</p>
        </div>
      </section>

      {/* ── Estate planning considerations ───────────────────────────── */}
      <section className="py-12 md:py-16 bg-slate-50">
        <div className="container-custom max-w-3xl">
          <p className="text-xs font-bold text-amber-600 uppercase tracking-wide mb-2">Coordinating the bigger picture</p>
          <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-3 tracking-tight">Estate planning considerations</h2>
          <p className="text-sm text-slate-600 leading-relaxed mb-4">Because super sits outside your will by default, it must be planned alongside — not inside — your estate plan. The key levers:</p>
          <div className="space-y-4">
            {ESTATE_PLANNING.map((item) => (
              <div key={item.title} className="bg-white rounded-2xl border border-slate-200 p-5">
                <h3 className="text-sm font-extrabold text-slate-900 mb-1.5">{item.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SMSF death benefits ──────────────────────────────────────── */}
      <section className="py-12 md:py-16">
        <div className="container-custom max-w-3xl">
          <p className="text-xs font-bold text-amber-600 uppercase tracking-wide mb-2">Self-managed funds</p>
          <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-3 tracking-tight">SMSF death benefits — control of the fund is control of the benefit</h2>
          <p className="text-sm text-slate-600 leading-relaxed mb-4">Death benefits from a self-managed super fund carry a unique risk: the people deciding how your benefit is paid are usually the surviving members of your own fund. Whoever controls the fund after your death effectively controls the trustee discretion — and that may not be the person you intended to benefit.</p>
          <div className="bg-amber-50 border-l-4 border-amber-500 rounded-r-xl p-5 mb-4">
            <p className="text-sm font-bold text-amber-900 mb-2">The Katz v Grossman lesson</p>
            <p className="text-sm text-amber-800 leading-relaxed">In the well-known case of <em>Katz v Grossman</em>, a surviving family member who gained control of the SMSF trustee was able to direct the deceased&apos;s death benefit to themselves — contrary to what the deceased had apparently wanted — because the nomination was not binding. The lesson: in an SMSF, control of the fund equals control of the death benefit, so a valid <strong>binding</strong> nomination (and careful thought about who becomes trustee) matters even more than in an APRA fund.</p>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed mb-3">Because SMSF disputes fall outside AFCA&apos;s jurisdiction and must be fought in court — slow and expensive — prevention is everything. A properly drafted binding nomination, a clear plan for who controls the trustee on your death, and consideration of a reversionary pension (which automatically continues to your spouse, bypassing trustee discretion entirely) are the main protective tools.</p>
          <p className="text-sm text-slate-600 leading-relaxed">Reversionary pensions are especially valuable in an SMSF: because the pension reverts automatically to the nominated beneficiary, it sidesteps the very trustee-discretion problem the <em> Katz v Grossman</em> case exposed.</p>
        </div>
      </section>

      {/* ── Process timeline ─────────────────────────────────────────── */}
      <section className="py-12 md:py-16 bg-slate-50">
        <div className="container-custom max-w-3xl">
          <p className="text-xs font-bold text-amber-600 uppercase tracking-wide mb-2">What happens after death</p>
          <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-2 tracking-tight">Timeframes and the claim process</h2>
          <p className="text-sm text-slate-600 leading-relaxed mb-6">There is no single legislated deadline, but trustees must pay &quot;as soon as practicable&quot;. A straightforward claim with a valid binding nomination is typically paid within a few weeks to a few months.</p>
          <div className="space-y-4">
            {PROCESS_STEPS.map((s) => (
              <div key={s.step} className="bg-white rounded-2xl border border-slate-200 p-5 flex gap-5">
                <div className="shrink-0 w-9 h-9 rounded-full bg-amber-500 text-slate-900 font-black text-sm flex items-center justify-center">
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

      {/* ── Long-form content sections ───────────────────────────────── */}
      <section className="py-12 md:py-16">
        <div className="container-custom max-w-3xl">
          <p className="text-xs font-bold text-amber-600 uppercase tracking-wide mb-2">Complete guide</p>
          <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-6 tracking-tight">Everything you need to know about super death benefits</h2>
          <div className="space-y-10">
            {CONTENT_SECTIONS.map((section) => (
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
          <p className="text-xs font-bold text-amber-600 uppercase tracking-wide mb-2">Questions</p>
          <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-6 tracking-tight">Frequently asked questions</h2>
          <div className="space-y-4">
            {DEATH_BENEFIT_FAQS.map((faq) => (
              <details key={faq.q} className="group bg-white rounded-xl border border-slate-200">
                <summary className="px-5 py-4 text-sm font-bold text-slate-900 cursor-pointer list-none flex items-center justify-between hover:bg-slate-50 rounded-xl transition-colors">{faq.q} <span className="text-slate-400 group-open:rotate-180 transition-transform text-base ml-3">⌄</span></summary>
                <div className="px-5 pb-4 text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
                  {faq.a}
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
            <h2 className="text-lg font-extrabold text-white mb-1">Get your super estate planning right</h2>
            <p className="text-slate-400 text-sm">Death benefit planning is specialist territory — speak with a financial planner or estate planning adviser.</p>
          </div>
          <div className="flex gap-3 shrink-0 flex-wrap">
            <Link
              href="/advisors/financial-planners"
              className="px-5 py-3 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold rounded-xl text-sm transition-colors whitespace-nowrap"
            >
              Find a Financial Planner
            </Link>
            <Link
              href="/super"
              className="px-5 py-3 border border-slate-600 hover:border-slate-400 text-slate-300 font-semibold rounded-xl text-sm transition-colors whitespace-nowrap"
            >
              Explore Super Guides
            </Link>
          </div>
        </div>
      </section>

      {/* ── Compliance footer ────────────────────────────────────────── */}
      <section className="py-6 bg-slate-50 border-t border-slate-200">
        <div className="container-custom">
          <p className="text-xs text-slate-500 leading-relaxed">{GENERAL_ADVICE_WARNING}</p>
        </div>
      </section>
    </div>
  );
}
