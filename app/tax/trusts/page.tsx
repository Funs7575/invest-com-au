import type { Metadata } from "next";
import { SITE_URL, CURRENT_YEAR, UPDATED_LABEL } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";
import Link from "next/link";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `Trusts & Trust Taxation in Australia (${CURRENT_YEAR}) — Complete Guide`,
  description: `How Australian trusts are taxed: family trust income streaming, the minor beneficiary trap, section 100A, testamentary trusts, and when to use a trust. ${UPDATED_LABEL}.`,
  openGraph: {
    title: `Trusts & Trust Taxation in Australia (${CURRENT_YEAR})`,
    description:
      "How trust income flows through to beneficiaries, income splitting in family trusts, section 100A, testamentary trusts, and trust loss rules.",
    url: `${SITE_URL}/tax/trusts`,
    images: [{ url: `/api/og?title=${encodeURIComponent("Trusts & Trust Taxation Australia")}&sub=${encodeURIComponent("Family Trusts · Income Splitting · Section 100A · " + CURRENT_YEAR)}`, width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: `${SITE_URL}/tax/trusts` },
};

// ─── Stat band ────────────────────────────────────────────────
const STATS = [
  {
    label: "Undistributed Income",
    value: "47%",
    note: "Income not distributed before 30 June is taxed in the trustee's hands at the top marginal rate plus Medicare levy",
    accent: true,
  },
  {
    label: "Minor Penalty Rate",
    value: "66%",
    note: "Division 6AA can tax a minor's unearned trust income above $416 at penalty rates up to 66%",
    accent: false,
  },
  {
    label: "CGT Discount",
    value: "50%",
    note: "The 50% CGT discount on assets held 12+ months flows through the trust to individual beneficiaries",
    accent: false,
  },
];

// ─── Types of trusts ──────────────────────────────────────────
const TRUST_TYPES = [
  {
    type: "Discretionary (family) trust",
    features:
      "Trustee has full discretion over who receives income and capital each year; no beneficiary has a fixed entitlement",
    uses: "Family businesses, investment holding, income splitting among family members, asset protection",
  },
  {
    type: "Unit trust",
    features:
      "Beneficiaries (unitholders) hold fixed units; income and capital are distributed in proportion to units held",
    uses: "Joint ventures, property syndicates, unrelated parties pooling capital, managed funds",
  },
  {
    type: "Fixed trust",
    features:
      "Beneficiaries have fixed, defined entitlements to income and capital that the trustee cannot vary",
    uses: "Where certainty of entitlement matters; can simplify the trust loss rules and franking access",
  },
  {
    type: "Testamentary trust",
    features:
      "Created by a will and takes effect on death; minors can receive income at adult marginal rates",
    uses: "Estate planning, passing wealth to children and grandchildren, protecting vulnerable beneficiaries",
  },
  {
    type: "Bare trust",
    features:
      "Trustee holds legal title but the beneficiary has absolute beneficial ownership; trustee acts on instruction only",
    uses: "SMSF limited recourse borrowing arrangements (LRBAs), holding assets for a minor, nominee holdings",
  },
  {
    type: "Hybrid trust",
    features:
      "Combines discretionary and fixed (unit) features; some entitlements are fixed, others discretionary",
    uses: "Less common; flexible structuring, though the ATO scrutinises these and many deeds are now avoided",
  },
];

// ─── Costs table ──────────────────────────────────────────────
const COSTS = [
  {
    item: "Trust establishment",
    cost: "$1,500 – $3,000",
    note: "Drafting the deed, settling the trust, and (usually) setting up a corporate trustee",
  },
  {
    item: "Corporate trustee company",
    cost: "$500 – $1,000 setup",
    note: "Plus the annual ASIC review fee; many advisers recommend a company as trustee for asset protection",
  },
  {
    item: "Annual trust tax return",
    cost: "$1,000 – $3,000+",
    note: "Preparation of the trust return and distribution statements; rises with complexity",
  },
  {
    item: "Trustee resolution",
    cost: "Included / nominal",
    note: "Must be made before 30 June each year — a late or missing resolution can trigger top-rate tax",
  },
  {
    item: "Accounting & bookkeeping",
    cost: "Ongoing",
    note: "Separate books, financial statements, and beneficiary distribution records each year",
  },
];

// ─── Structure comparison ─────────────────────────────────────
const STRUCTURE_COMPARISON = [
  {
    feature: "Who pays the tax",
    trust: "Beneficiaries, at their own marginal rates (flow-through)",
    company: "The company, at the 25–30% company tax rate",
    individual: "You, at your marginal rate",
  },
  {
    feature: "50% CGT discount",
    trust: "Yes — flows through to individual beneficiaries",
    company: "No — companies do not receive the discount",
    individual: "Yes",
  },
  {
    feature: "Income splitting",
    trust: "Strong — discretionary distributions across the family group",
    company: "Limited — via dividends to shareholders only",
    individual: "None",
  },
  {
    feature: "Asset protection",
    trust: "Strong — assets sit outside an individual's estate",
    company: "Strong — separate legal entity",
    individual: "Weak — assets are in your own name",
  },
  {
    feature: "Can distribute losses",
    trust: "No — losses are trapped and carried forward",
    company: "No — losses stay in the company",
    individual: "Capital losses offset capital gains; carried forward",
  },
  {
    feature: "Setup & running cost",
    trust: "Higher — deed, trustee, annual return, resolutions",
    company: "Higher — ASIC, annual return",
    individual: "Lowest — included in your personal return",
  },
];

// ─── Trustee resolution checklist ─────────────────────────────
const RESOLUTION_CHECKLIST = [
  "Make the resolution in writing before 30 June — not after. A resolution dated 1 July is too late for that financial year.",
  "Identify the beneficiaries who are presently entitled to income, and the share or amount each receives.",
  "Record any streaming of franked dividends or capital gains, and confirm the deed actually permits it.",
  "Check distributions stay inside the family group if a family trust election is in place (otherwise 47% FTDT applies).",
  "Avoid distributing meaningful investment income to beneficiaries under 18 (Division 6AA penalty rates).",
  "Consider section 100A: make sure the beneficiary who is taxed actually receives the benefit of the income.",
  "Keep the resolution, the deed, and the distribution statements together — documentation is your defence if the ATO asks.",
];

// ─── Main content sections ────────────────────────────────────
const SECTIONS = [
  {
    heading: "How trust taxation works",
    body: `A trust is not a separate taxpayer in the usual sense. Unlike a company, a trust generally does not pay tax on income it earns and then distributes. Instead, income "flows through" the trust to its beneficiaries, who include their share in their own assessable income and pay tax at their own marginal rates.

The mechanics each year:
1. The trust earns income (rent, dividends, interest, capital gains, business profit).
2. Before 30 June, the trustee makes a resolution deciding which beneficiaries are "presently entitled" to that income.
3. Each beneficiary declares their share and pays tax at their personal marginal rate.

The critical deadline: if the trustee fails to distribute the income — or fails to make a valid resolution by 30 June — that undistributed income is taxed in the trustee's hands at the top marginal rate of 47% (45% plus the 2% Medicare levy). This is the penalty for not distributing, and it is why the 30 June trustee resolution is one of the most important dates in the trust calendar.

Because income is taxed in the beneficiary's hands, the same dollar of trust income can attract very different tax depending on who receives it — a beneficiary on a low marginal rate pays far less than one at the top rate. That flexibility is the entire point of a discretionary trust, but it is also exactly what the integrity rules below are designed to police.`,
  },
  {
    heading: "Discretionary (family) trusts — a deep dive",
    body: `A discretionary trust — commonly called a family trust — is the most widely used trust structure in Australia. Its defining feature is that no beneficiary has a fixed entitlement to income or capital. Instead, the trustee has discretion each year to decide who receives what.

The key roles:
- The trustee (often a company) holds and manages the trust assets and makes the annual distribution decisions.
- The appointor (sometimes called the principal) is the real power behind the trust — the appointor can hire and fire the trustee, which means the appointor ultimately controls the trust.
- The beneficiaries are the wide class of people (and entities) who can potentially receive distributions — usually defined to include the family members, their spouses, children, and related companies and trusts.

Why families use them:
- Income splitting: by distributing income to family members on lower marginal rates, the overall family tax bill can be reduced. A $30,000 distribution to an adult beneficiary with no other income is taxed far more lightly than the same amount added to a top-rate earner.
- Asset protection: assets held in the trust generally sit outside an individual's personal estate, which can protect them from creditors and from claims against an individual beneficiary.
- Flexibility: the trustee can vary distributions year to year as circumstances and tax positions change.

Discretionary trusts are common for family businesses (the trading entity or the holding structure) and for holding investment portfolios where there is income to split among several adult family members.`,
  },
  {
    heading: "Income streaming — directing different income to different beneficiaries",
    body: `Streaming is the ability to direct particular categories of income to particular beneficiaries, rather than splitting every dollar of trust income proportionally. The two categories that can be streamed are franked dividends (with their attached franking credits) and capital gains.

Why it is powerful:
- Franking credits can be streamed to the beneficiary who benefits most from them — for example, a beneficiary on a low marginal rate who can fully use (and even receive a refund of) the franking credits, rather than wasting them on a beneficiary who is already paying the top rate.
- Capital gains can be streamed to a beneficiary who has capital losses to offset, so the gain is absorbed by the loss instead of being taxed.

The rules that make streaming valid:
- The trust deed must permit streaming — older deeds may need updating.
- The beneficiary must be "specifically entitled" to the franked dividend or capital gain, and that entitlement must be recorded in the trustee's resolution (and the trust records) by the relevant deadline — generally 30 June for capital gains and 30 June (or the date of the resolution) for franked distributions.
- The streamed amount must be properly traced and documented; a vague or after-the-fact allocation will not satisfy the ATO.

Done correctly, streaming lets a family allocate the most tax-effective income to the most tax-effective beneficiary. Done loosely — without a supporting deed or a timely resolution — it can be unwound by the ATO, with the income reassessed on a proportionate basis.`,
  },
  {
    heading: "The minor beneficiary trap — Division 6AA",
    body: `One of the most common mistakes is assuming you can split trust income to your young children. Division 6AA of the tax law exists specifically to stop this.

Distributions of "unearned" income (which includes trust distributions) to a minor — a beneficiary under 18 — are taxed at penalty rates:
- The first $416 is tax-free.
- Amounts above $416 are taxed at high rates, escalating to 66% on unearned income, and 45% once the amount is large enough.

The effect is that distributing investment income to a child is usually worse than keeping it in the hands of an adult, because the penalty rates quickly exceed an adult's marginal rate. Division 6AA deliberately removes the incentive to use children for income splitting.

The exceptions that matter:
- Excepted trust income: income from a testamentary trust (one created under a will) is "excepted" and is taxed at ordinary adult marginal rates, not the penalty rates. This is the single biggest reason testamentary trusts are so valuable for passing wealth to children and grandchildren.
- Income from the minor's own work, certain compensation and inheritance amounts, and income from property transferred to the minor as a result of a death can also be excepted.

For an ordinary inter vivos (living) family trust, though, the practical takeaway is simple: do not rely on distributing meaningful investment income to children under 18.`,
  },
  {
    heading: "Section 100A — reimbursement agreements",
    body: `Section 100A is the ATO's anti-avoidance rule aimed at "reimbursement agreements" — arrangements where a beneficiary is made presently entitled to trust income (and is taxed on it) but the real economic benefit of that income goes to someone else, usually a person on a higher marginal rate.

A classic example the ATO targets: a trust distributes income to an adult child on a low tax rate, the child is taxed at that low rate, but the cash is then paid to (or used for the benefit of) the parents who are on the top rate. The low-rate beneficiary is a conduit; the high-rate person enjoys the money.

Where section 100A applies, the distribution is effectively ignored and the income is taxed to the trustee at the top marginal rate of 47% — and there is no time limit on the ATO amending assessments for arrangements caught by it.

The 2022 guidance:
- TR 2022/4 is the ATO's ruling setting out its view of how section 100A operates.
- PCG 2022/2 is the practical compliance guideline that sorts arrangements into risk "zones" (often described as green, blue, and red), signalling where the ATO will and will not devote compliance resources.

The "ordinary family dealing" exception: section 100A does not apply to arrangements entered into in the course of an ordinary family or commercial dealing. The difficulty is that the boundary of "ordinary family dealing" is contested, and the ATO takes a narrower view than many families historically assumed. This is why section 100A now sits at the centre of how family trust distributions are reviewed — distributions that were once treated as routine (especially adult-child distributions where the parents keep the cash) now need careful thought, documentation, and often professional advice.`,
  },
  {
    heading: "Capital gains in trusts",
    body: `Capital gains made inside a trust receive broadly the same concessional treatment as gains made by an individual — but the benefit is delivered to the beneficiary, not trapped in the trust.

The 50% CGT discount: if the trust held the asset for more than 12 months before disposal, the 50% CGT discount is available, and it flows through to individual beneficiaries who are presently entitled to the gain. (Companies do not get the discount, so distributing a gain to a corporate beneficiary loses it.)

Streaming gains to losses: a trust can stream a capital gain to a beneficiary who has their own capital losses to offset it. The gain lands with the loss and is absorbed, instead of being taxed. This is one of the most useful planning levers in a family group — but it only works if the trust deed allows capital gains to be streamed and the beneficiary is made specifically entitled to the gain in the trustee's resolution.

The deed matters: many disputes and reassessments come down to whether the trust deed actually permitted the trustee to separate ("stream") the capital gain from the rest of the trust income. An older or poorly drafted deed can block streaming entirely, forcing the gain to be distributed proportionally across all income beneficiaries — which can waste the loss-offset opportunity and the discount.`,
  },
  {
    heading: "Testamentary trusts",
    body: `A testamentary trust is created by a will and takes effect on the death of the person who made the will (the testator). Rather than leaving assets outright to beneficiaries, the will directs that they be held in trust.

The standout tax advantage: income that a minor receives from a testamentary trust is "excepted trust income", which means it is taxed at ordinary adult marginal rates — including the full tax-free threshold — rather than the Division 6AA penalty rates that apply to ordinary family trusts. In practice this means a deceased parent's estate can support several children or grandchildren, with each child able to receive income up to the tax-free threshold each year, taxed as if they were an adult.

Why families use them:
- Tax-effective support for children and grandchildren: each minor beneficiary effectively gets their own adult tax-free threshold for excepted income.
- Asset protection: assets stay in the trust rather than passing into a beneficiary's personal name, which can shelter them from a beneficiary's creditors, bankruptcy, or family-law claims.
- Control across generations: the will can stagger distributions, protect a vulnerable beneficiary, or keep a family business intact.

Because testamentary trusts are written into a will, they need to be set up as part of estate planning — well before they are needed — with a solicitor and (ideally) a tax adviser working together.`,
  },
  {
    heading: "Trust losses — trapped, not distributed",
    body: `A crucial asymmetry: a trust can distribute income, but it cannot distribute a loss. If a trust makes a tax loss in a year, that loss is trapped inside the trust. Beneficiaries cannot use it against their own income. The loss is carried forward and can only be used against the trust's own future income.

That alone is a planning consideration — if you expect losses (for example, a heavily geared investment), the loss sits in the trust until the trust earns enough income to absorb it.

The trust loss rules: to actually use a carried-forward loss in a later year, the trust must satisfy a set of integrity tests designed to stop loss trafficking (buying a trust just to use its losses):
- The pattern of distributions test — broadly, the same people must continue to benefit from the trust across the relevant years.
- The control test — the same individuals must continue to control the trust; a change in control can fail the test.
- The income injection test — losses cannot be used by artificially injecting income into the trust under a scheme to soak up the loss.
- (A 50% stake test and a same-business-type test can also be relevant depending on the trust.)

Making a family trust election (see below) replaces several of these tests with a single, simpler test, which is one of the main reasons families make the election where losses or franking credits are in play.`,
  },
  {
    heading: "Family trust elections (FTE)",
    body: `A family trust election (FTE) is a formal choice that nominates a "test individual", which in turn defines the trust's "family group" — broadly that individual, their relatives, and certain related entities.

What an FTE gives you:
- Franking credits: to pass franking credits through to beneficiaries, a trust generally needs to satisfy a holding-period and related-payments rule. The "family trust" concession effectively lets the trust meet this without each beneficiary having to satisfy the 45-day rule individually.
- Simpler loss rules: an FTE replaces the multi-test trust loss regime with a single test, making it much easier to use carried-forward losses.

The cost of making it:
- An FTE locks distributions to the family group. If the trust distributes income (or confers benefits) on someone outside the defined family group, that distribution attracts family trust distribution tax (FTDT) at 47% — the top marginal rate plus Medicare levy.
- The election is generally difficult or impossible to revoke, so it is a long-term commitment.

When to make one: an FTE makes sense when the trust holds franked shares (and you want the credits to flow through cleanly), or when the trust carries forward losses you want to use under the simpler test — and when you are confident distributions will stay within the family group. It is a poor choice if you might one day want to distribute to people or entities outside that group.`,
  },
  {
    heading: "Costs, compliance, and when a trust makes sense",
    body: `A trust is a structure, and structures cost money to run. Establishment typically runs $1,500–$3,000 (more with a corporate trustee), and then there is an annual trust tax return, accounting and bookkeeping, the ASIC fee if a company is the trustee, and — every single year — a trustee resolution made before 30 June. That last item is not optional administration: a late or missing resolution can see the whole year's income taxed at the top marginal rate.

So the question is always whether the tax and protection benefits outweigh that administrative burden.

A trust tends to make sense when:
- You run a family business and want flexibility over how profits are distributed and a layer of asset protection.
- You hold an investment portfolio that throws off meaningful income, and you have several adult family members on lower marginal rates to distribute to.
- Asset protection is a genuine concern (for example, a business owner exposed to liability).
- You are planning your estate and want to pass wealth to children or grandchildren tax-effectively (here a testamentary trust is usually the right tool).

A trust often does not make sense when:
- You are a single person with no one else to distribute income to — the splitting benefit largely disappears.
- The income involved is small, so the annual running costs outweigh any tax saving.
- You would be tempted to distribute mainly to children under 18 (Division 6AA defeats that), or in ways that section 100A would challenge.

The honest summary: a trust is a powerful tool in the right circumstances, but it is over-sold. For many individual investors the cost and compliance load is not justified, and the same after-tax outcome can be achieved more simply. Trust structuring is exactly the kind of decision to take to a qualified tax adviser and solicitor before committing.`,
  },
];

// ─── FAQ ──────────────────────────────────────────────────────
const FAQS = [
  {
    q: "How is trust income taxed in Australia?",
    a: "A trust generally is not taxed as a separate entity. Instead, its income flows through to the beneficiaries who are made presently entitled to it before 30 June, and each beneficiary pays tax at their own marginal rate. If the trustee fails to distribute the income or fails to make a valid resolution by 30 June, the undistributed income is taxed in the trustee's hands at the top marginal rate of 47% (45% plus the 2% Medicare levy).",
  },
  {
    q: "What is a discretionary family trust?",
    a: "A discretionary (family) trust is a trust where no beneficiary has a fixed entitlement — the trustee has discretion each year over who receives income and capital from a defined class of beneficiaries, usually the family members and related entities. The appointor controls the trust because they can appoint and remove the trustee. Families use them for income splitting among members on lower marginal rates, for asset protection, and for flexibility in family businesses and investment holdings.",
  },
  {
    q: "Can I distribute trust income to my children?",
    a: "You can, but it is rarely worthwhile for children under 18. Division 6AA taxes a minor's unearned income (including ordinary trust distributions) at penalty rates — tax-free only up to $416, then escalating to as high as 66%. This deliberately removes the income-splitting benefit. The main exception is a testamentary trust: income a minor receives from a testamentary trust is excepted trust income and is taxed at ordinary adult marginal rates instead.",
  },
  {
    q: "What is section 100A and how does it affect family trusts?",
    a: "Section 100A is an anti-avoidance rule targeting reimbursement agreements, where a beneficiary is taxed on trust income but the economic benefit actually goes to someone else (often a higher-rate taxpayer). Where it applies, the distribution is ignored and the income is taxed to the trustee at 47%, with no time limit on amendment. The ATO set out its current view in TR 2022/4 and PCG 2022/2. There is an exception for arrangements that are an ordinary family or commercial dealing, but the ATO takes a narrow view, so many routine adult-child distributions now need careful documentation and advice.",
  },
  {
    q: "What is the advantage of a testamentary trust?",
    a: "The headline advantage is that minors can receive income taxed at adult marginal rates. A testamentary trust is created by a will and takes effect on death, and the income it distributes to children and grandchildren is excepted trust income — so each minor effectively gets their own adult tax-free threshold rather than being hit by Division 6AA penalty rates. It also provides asset protection and lets the testator control how wealth passes across generations.",
  },
];

export default function TrustsTaxPage() {
  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Tax Strategy", item: `${SITE_URL}/tax` },
      { "@type": "ListItem", position: 3, name: "Trusts" },
    ],
  };

  const faqSchema = faqJsonLd(FAQS);

  return (
    <div className="bg-white min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      {faqSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
      )}

      {/* Hero */}
      <section className="relative bg-white border-b border-slate-100 overflow-hidden py-8 md:py-12">
        <div className="container-custom">
          <nav aria-label="Breadcrumb" className="text-xs text-slate-500 mb-5 flex items-center gap-1.5 flex-wrap">
            <Link href="/" className="hover:text-slate-900">
              Home
            </Link>
            <span>/</span>
            <Link href="/tax" className="hover:text-slate-900">
              Tax Strategy
            </Link>
            <span>/</span>
            <span className="text-slate-900 font-medium">Trusts</span>
          </nav>
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 border border-slate-200 rounded-full text-xs font-semibold text-slate-600 mb-4">
              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full" />
              Trusts Guide · {UPDATED_LABEL}
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold leading-[1.1] mb-3 tracking-tight text-slate-900">
              Trusts &amp; Trust Taxation in Australia{" "}
              <span className="text-amber-600">({CURRENT_YEAR})</span>
            </h1>
            <p className="text-sm md:text-base text-slate-600 leading-relaxed">
              Trusts are widely used in Australia for asset protection, tax planning, and estate
              planning. How a trust&apos;s income is taxed depends on the type of trust and on how
              the trustee distributes income to beneficiaries each year &mdash; this guide walks
              through the structures, the rules, and when a trust is actually worth it.
            </p>
          </div>
        </div>
      </section>

      {/* Stat band */}
      <section className="py-8 bg-slate-50 border-b border-slate-200">
        <div className="container-custom">
          <div className="grid sm:grid-cols-3 gap-4">
            {STATS.map((s) => (
              <div
                key={s.label}
                className={`bg-white rounded-2xl border p-5 ${
                  s.accent ? "border-amber-200" : "border-slate-200"
                }`}
              >
                <p
                  className={`text-xs font-bold uppercase tracking-wide mb-1 ${
                    s.accent ? "text-amber-800" : "text-slate-600"
                  }`}
                >
                  {s.label}
                </p>
                <p
                  className={`text-xl font-black ${
                    s.accent ? "text-amber-700" : "text-slate-900"
                  }`}
                >
                  {s.value}
                </p>
                <p className="text-xs text-slate-600 mt-1">{s.note}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Types of trusts table */}
      <section className="py-10 md:py-12 bg-white">
        <div className="container-custom">
          <div className="max-w-3xl">
            <p className="text-xs font-bold text-amber-600 uppercase tracking-wide mb-2">
              Trust Structures
            </p>
            <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-2">
              Types of trusts in Australia
            </h2>
            <p className="text-sm text-slate-600">
              Different trust structures serve different purposes. The right choice depends on who
              the beneficiaries are, what you&apos;re protecting, and how flexible you need
              distributions to be.
            </p>
          </div>
          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-sm border-collapse min-w-[640px]" aria-label="Types of trusts in Australia: features and common uses">
              <thead>
                <tr className="bg-slate-800 text-white">
                  <th scope="col" className="text-left py-3 px-4 text-xs font-bold w-1/5">Trust type</th>
                  <th scope="col" className="text-left py-3 px-4 text-xs font-bold">Key features</th>
                  <th scope="col" className="text-left py-3 px-4 text-xs font-bold">Common uses</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {TRUST_TYPES.map((row) => (
                  <tr key={row.type} className="bg-white hover:bg-slate-50 transition-colors align-top">
                    <td className="py-3 px-4 text-xs font-bold text-slate-900">{row.type}</td>
                    <td className="py-3 px-4 text-xs text-slate-600 leading-relaxed">
                      {row.features}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-600 leading-relaxed">{row.uses}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Structure comparison */}
      <section className="py-10 md:py-12 bg-slate-50 border-t border-slate-200">
        <div className="container-custom">
          <div className="max-w-3xl">
            <p className="text-xs font-bold text-amber-600 uppercase tracking-wide mb-2">
              Trust vs Company vs You
            </p>
            <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-2">
              How a trust compares to other structures
            </h2>
            <p className="text-sm text-slate-600">
              A trust isn&apos;t the only way to hold investments or run a business. Here&apos;s how
              it stacks up against a company and simply holding assets in your own name.
            </p>
          </div>
          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-sm border-collapse min-w-[680px]" aria-label="Discretionary trust vs company vs personal ownership comparison">
              <thead>
                <tr className="bg-slate-800 text-white">
                  <th scope="col" className="text-left py-3 px-4 text-xs font-bold w-1/5">Feature</th>
                  <th scope="col" className="text-left py-3 px-4 text-xs font-bold">Discretionary trust</th>
                  <th scope="col" className="text-left py-3 px-4 text-xs font-bold">Company</th>
                  <th scope="col" className="text-left py-3 px-4 text-xs font-bold">Held personally</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {STRUCTURE_COMPARISON.map((row) => (
                  <tr
                    key={row.feature}
                    className="bg-white hover:bg-slate-50 transition-colors align-top"
                  >
                    <td className="py-3 px-4 text-xs font-bold text-slate-900">{row.feature}</td>
                    <td className="py-3 px-4 text-xs text-slate-600 leading-relaxed">{row.trust}</td>
                    <td className="py-3 px-4 text-xs text-slate-600 leading-relaxed">
                      {row.company}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-600 leading-relaxed">
                      {row.individual}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Main content */}
      <section className="py-10 md:py-12 bg-white">
        <div className="container-custom max-w-3xl">
          <p className="text-xs font-bold text-amber-600 uppercase tracking-wide mb-2">
            Complete Guide
          </p>
          <h2 className="text-xl md:text-2xl font-extrabold text-slate-900">
            How trusts are taxed, explained
          </h2>
          <div className="mt-8 space-y-10">
            {SECTIONS.map((sec) => (
              <div key={sec.heading}>
                <h3 className="text-lg font-extrabold text-slate-900 mb-3">{sec.heading}</h3>
                <div className="text-sm text-slate-600 leading-relaxed space-y-3">
                  {sec.body.split("\n\n").map((para, i) => (
                    <p key={i} className="whitespace-pre-line break-words">
                      {para}
                    </p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Costs table */}
      <section className="py-10 md:py-12 bg-slate-50">
        <div className="container-custom">
          <div className="max-w-3xl">
            <p className="text-xs font-bold text-amber-600 uppercase tracking-wide mb-2">
              The Running Cost
            </p>
            <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-2">
              What a trust costs to set up and run
            </h2>
            <p className="text-sm text-slate-600">
              A trust only makes sense when the tax and protection benefits clear these ongoing
              costs. The 30 June trustee resolution is the line item people forget &mdash; and the
              one with the harshest penalty for getting it wrong.
            </p>
          </div>
          <div className="mt-6 overflow-x-auto max-w-3xl">
            <table className="w-full text-sm border-collapse min-w-[560px]" aria-label="Trust setup and ongoing costs">
              <thead>
                <tr className="bg-slate-800 text-white">
                  <th scope="col" className="text-left py-3 px-4 text-xs font-bold">Item</th>
                  <th scope="col" className="text-left py-3 px-4 text-xs font-bold">Indicative cost</th>
                  <th scope="col" className="text-left py-3 px-4 text-xs font-bold">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {COSTS.map((row) => (
                  <tr key={row.item} className="bg-white hover:bg-slate-50 transition-colors align-top">
                    <td className="py-3 px-4 text-xs font-bold text-slate-900">{row.item}</td>
                    <td className="py-3 px-4 text-xs font-semibold text-slate-700">{row.cost}</td>
                    <td className="py-3 px-4 text-xs text-slate-600 leading-relaxed">{row.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-xs text-slate-400 mt-2">
              Indicative ranges only &mdash; actual fees vary by adviser, state, and complexity.
              Confirm current ATO rules at ato.gov.au.
            </p>
          </div>
        </div>
      </section>

      {/* Trustee resolution checklist */}
      <section className="py-10 md:py-12 bg-white border-t border-slate-200">
        <div className="container-custom max-w-3xl">
          <p className="text-xs font-bold text-amber-600 uppercase tracking-wide mb-2">
            Before 30 June
          </p>
          <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-2">
            The trustee resolution checklist
          </h2>
          <p className="text-sm text-slate-600">
            The annual resolution is where most trust mistakes happen. Get it in writing before the
            financial year ends, and make sure it holds up to scrutiny.
          </p>
          <ul className="mt-6 space-y-3">
            {RESOLUTION_CHECKLIST.map((item) => (
              <li key={item} className="flex items-start gap-3">
                <span className="mt-1 shrink-0 w-5 h-5 rounded-full bg-amber-100 border border-amber-200 text-amber-700 text-xs font-bold flex items-center justify-center">
                  &#10003;
                </span>
                <span className="text-sm text-slate-600 leading-relaxed">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-10 md:py-12 bg-slate-50">
        <div className="container-custom max-w-2xl">
          <p className="text-xs font-bold text-amber-600 uppercase tracking-wide mb-2">FAQ</p>
          <h2 className="text-xl md:text-2xl font-extrabold text-slate-900">
            Trust tax questions answered
          </h2>
          <div className="mt-6 divide-y divide-slate-200">
            {FAQS.map((faq) => (
              <details key={faq.q} className="py-4 group">
                <summary className="text-sm font-semibold text-slate-900 cursor-pointer list-none flex items-center justify-between gap-2">
                  {faq.q}
                  <span className="text-slate-400 group-open:rotate-180 transition-transform shrink-0" aria-hidden="true">
                    &#9662;
                  </span>
                </summary>
                <p className="mt-3 text-sm text-slate-600 leading-relaxed">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-12 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
        <div className="container-custom text-center max-w-xl">
          <h2 className="text-xl font-extrabold mb-3">Thinking about a trust structure?</h2>
          <p className="text-sm text-slate-300 mb-6">
            Trust structuring sits at the intersection of tax and law. A registered tax agent and a
            solicitor can confirm whether a trust suits your circumstances &mdash; and keep you on
            the right side of section 100A and the trustee-resolution deadline.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/advisors/tax-agents"
              className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm rounded-xl transition-colors"
            >
              Find a Tax Agent &rarr;
            </Link>
            <Link
              href="/tax"
              className="px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold text-sm rounded-xl transition-colors"
            >
              Tax Strategy Hub &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* Related guides */}
      <section className="py-10 bg-white border-t border-slate-200">
        <div className="container-custom max-w-3xl">
          <h2 className="text-lg font-bold text-slate-900 mb-4">Related tax guides</h2>
          <div className="grid sm:grid-cols-3 gap-3">
            <Link
              href="/tax/capital-gains"
              className="block bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl p-4 transition-colors"
            >
              <p className="font-bold text-slate-900 text-sm">Capital Gains Tax</p>
              <p className="text-xs text-slate-500 mt-1">
                The 50% discount and how gains flow through to beneficiaries.
              </p>
            </Link>
            <Link
              href="/tax/franking-credits"
              className="block bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl p-4 transition-colors"
            >
              <p className="font-bold text-slate-900 text-sm">Franking Credits</p>
              <p className="text-xs text-slate-500 mt-1">
                How franking credits can be streamed to the right beneficiary.
              </p>
            </Link>
            <Link
              href="/tax/negative-gearing"
              className="block bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl p-4 transition-colors"
            >
              <p className="font-bold text-slate-900 text-sm">Negative Gearing</p>
              <p className="text-xs text-slate-500 mt-1">
                Why losses can be trapped when geared assets sit inside a trust.
              </p>
            </Link>
          </div>
        </div>
      </section>

      {/* Advice warning */}
      <section className="py-6 bg-slate-100 border-t border-slate-200">
        <div className="container-custom max-w-3xl">
          <p className="text-xs text-slate-500 leading-relaxed">
            {GENERAL_ADVICE_WARNING} Trust structuring requires professional tax and legal advice
            tailored to your circumstances. Tax information here is general in nature &mdash; verify
            current rates and rules with the ATO (ato.gov.au) or a registered tax agent.
          </p>
        </div>
      </section>
    </div>
  );
}
