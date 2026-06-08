import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, UPDATED_LABEL, absoluteUrl } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";
import HubAdvisorCTA from "@/components/HubAdvisorCTA";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `Downsizer Contribution to Super — Complete Guide (${CURRENT_YEAR}) | invest.com.au`,
  description: `How the downsizer contribution works for Australians aged 55+: eligibility, the $300,000 per person cap, Age Pension impact, 90-day deadline, and how to make the contribution. ${UPDATED_LABEL}.`,
  openGraph: {
    title: `Downsizer Contribution to Super (${CURRENT_YEAR}) — Eligibility, Limits & Strategy`,
    description: "Contribute up to $300,000 per person from your home sale into super — outside the normal contribution caps. Eligibility, Age Pension interaction, and common traps.",
    url: absoluteUrl("/retirement/downsizer-contribution"),
    images: [{ url: `/api/og?title=${encodeURIComponent("Downsizer Contribution")}&sub=${encodeURIComponent("$300k per person · No TSB limit · Age 55+ · " + CURRENT_YEAR)}`, width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: absoluteUrl("/retirement/downsizer-contribution") },
};

const COMPARISON_ROWS = [
  {
    feature: "Annual cap",
    standard: "$120,000",
    downsizer: "$300,000 per person",
    highlight: true,
  },
  {
    feature: "Total Super Balance (TSB) limit",
    standard: "$1.9M — work test applies; $1.66M cap for bring-forward",
    downsizer: "No TSB limit — even $5M+ balances qualify",
    highlight: true,
  },
  {
    feature: "Tax on contribution",
    standard: "Non-concessional (after-tax, no further tax in fund)",
    downsizer: "Non-concessional (after-tax, no further tax in fund)",
    highlight: false,
  },
  {
    feature: "Counts toward contribution caps",
    standard: "Yes — counts toward the $120,000 NCC cap",
    downsizer: "No — separate from all contribution caps",
    highlight: true,
  },
  {
    feature: "CGT event on property sale",
    standard: "Separate CGT event — unrelated to contribution",
    downsizer: "Separate CGT event — unrelated to contribution",
    highlight: false,
  },
  {
    feature: "Times usable",
    standard: "Unlimited (within annual caps each year)",
    downsizer: "Once in a lifetime per person",
    highlight: false,
  },
  {
    feature: "Property ownership required",
    standard: "No property requirement",
    downsizer: "Must be from sale of main residence held 10+ years",
    highlight: false,
  },
];

const ELIGIBILITY = [
  {
    label: "Age",
    detail: "55 or older at the time you make the contribution (not at settlement). The age threshold was lowered from 65 to 60 in July 2022, then from 60 to 55 in January 2023.",
    pass: true,
  },
  {
    label: "Property location",
    detail: "The property must be in Australia — overseas properties do not qualify.",
    pass: true,
  },
  {
    label: "Main residence",
    detail: "The property must be, or have been at some point, your main residence. The main residence CGT exemption must apply fully or partially. A pure investment property that was never your home does not qualify.",
    pass: true,
  },
  {
    label: "10-year ownership",
    detail: "You or your spouse must have owned the property for at least 10 years prior to the sale. The 10-year clock runs from the date the property was acquired.",
    pass: true,
  },
  {
    label: "90-day window",
    detail: "The contribution must be made within 90 days of the settlement date of the property sale. There are no standard extensions — missing this deadline means you cannot use the downsizer scheme for that sale.",
    pass: true,
  },
  {
    label: "Not previously used",
    detail: "You have not previously made a downsizer contribution from an earlier property sale. Each person can only ever use the scheme once.",
    pass: true,
  },
  {
    label: "No need to buy another home",
    detail: "You do not need to actually downsize. You can rent, move into a retirement village, or buy a more expensive home — the scheme applies regardless of what you do after the sale.",
    pass: true,
  },
  {
    label: "No TSB limit",
    detail: "There is no Total Super Balance requirement. Even people with $5M or more in super are eligible to make a downsizer contribution.",
    pass: true,
  },
];

const TRAPS = [
  {
    title: "Missing the 90-day deadline",
    body: "The 90-day window runs from the date of settlement — not exchange of contracts, not when you receive the funds. There is normally no extension available. Set a calendar reminder the day settlement occurs.",
  },
  {
    title: "Contributing more than the sale proceeds or $300K",
    body: "Your contribution cannot exceed the lesser of (a) $300,000 per person, or (b) your total sale proceeds. If the property sells for $400,000 and you contributed $300,000 as a couple, the per-person limit still applies — each person can contribute at most $200,000 in this case.",
  },
  {
    title: "Investment property that was never a main residence",
    body: "A rental property you have owned for 20 years but never lived in does not qualify. The main residence CGT exemption — full or partial — must apply to the property. Check with a tax adviser if the property had mixed use.",
  },
  {
    title: "Forgetting the Age Pension assets test impact",
    body: "Proceeds from the home sale sitting in a bank account before you contribute are already outside the home exemption. Once inside super, they count toward the assets test and can reduce Age Pension entitlements significantly. Model this before contributing — especially if you are close to the assets test threshold.",
  },
];

const FAQS = [
  {
    q: "Do I need to actually buy a smaller property?",
    a: "No. The name 'downsizer contribution' is misleading — there is no requirement to buy a smaller or cheaper property after the sale. You can rent, buy a property of any value, or move into a retirement village. The scheme simply requires the sale of a qualifying main residence; your subsequent housing arrangements are irrelevant.",
  },
  {
    q: "Can I make a downsizer contribution from an investment property sale?",
    a: "Only if the property was at some point your main residence. The main residence CGT exemption must apply — fully or partially — to the property. A pure investment property that was never your home does not qualify, regardless of how long you have owned it. If the property had mixed use (for example, you lived there and then rented it out), seek advice from a tax professional on whether the partial main residence exemption applies.",
  },
  {
    q: "What if my spouse is under 55?",
    a: "Each person must independently meet the age requirement at the time they make their contribution. If one spouse is 57 and the other is 52, only the older spouse can make a downsizer contribution from that sale. The younger spouse would need to wait until they reach 55 — but by then the 90-day settlement window will have closed. Plan ahead: if one spouse will be under 55 at the time of sale and settlement, only one contribution (up to $300,000) will be possible.",
  },
  {
    q: "Will the downsizer contribution affect my Age Pension?",
    a: "Potentially, yes. The home itself is exempt from the Age Pension assets test — but once the proceeds leave the property (whether into a bank account or into super), they become assessable assets. Super balances count in the assets test once you reach Age Pension age. An extra $300,000 in super reduces your fortnightly Age Pension by $900/fortnight ($23,400/year) under the 2024-25 assets test taper rate of $3/fortnight per $1,000 over the threshold. Model the pension impact before contributing, particularly if you are near the assets test threshold.",
  },
  {
    q: "Can I make a downsizer contribution even if I have more than $1.9 million in super?",
    a: "Yes. The downsizer contribution has no Total Super Balance (TSB) restriction. Standard non-concessional contributions are blocked once your TSB reaches $1.9M, but the downsizer scheme operates completely outside the normal contribution cap framework. This makes it one of the only ways for high-balance retirees to add meaningful new money to super.",
  },
  {
    q: "Is the downsizer contribution tax-deductible?",
    a: "No. Downsizer contributions are non-concessional — you make them from after-tax money, and no tax deduction is available. The contribution is not taxed again when it enters the fund (unlike concessional contributions, which are taxed at 15% on entry). Once inside super, any earnings on the contribution are taxed at the same rate as the rest of your super balance — 15% in accumulation phase, or zero in pension phase.",
  },
];

export default function DownsizerContributionPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: SITE_URL },
    { name: "Retirement", url: `${SITE_URL}/retirement` },
    { name: "Downsizer Contribution" },
  ]);
  const faqLd = faqJsonLd(FAQS.map((f) => ({ q: f.q, a: f.a })));

  return (
    <div className="bg-white min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      {faqLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />}

      {/* Hero */}
      <section className="bg-slate-900 text-white py-10 md:py-14">
        <div className="container-custom max-w-4xl">
          <nav aria-label="Breadcrumb" className="text-xs text-slate-400 mb-5 flex items-center gap-1.5 flex-wrap">
            <Link href="/" className="hover:text-white">Home</Link><span>/</span>
            <Link href="/retirement" className="hover:text-white">Retirement</Link><span>/</span>
            <span className="text-slate-200 font-medium">Downsizer Contribution</span>
          </nav>
          <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-4">
            Downsizer contribution to super: the complete guide ({CURRENT_YEAR})
          </h1>
          <p className="text-lg text-slate-300 leading-relaxed mb-6">
            Australians aged 55 and over can contribute up to $300,000 each from the sale of their home
            into superannuation — completely outside the normal contribution caps, and with no Total Super
            Balance limit. One of the most powerful retirement planning strategies available.
          </p>
          {/* Key stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Max per person", value: "$300,000", sub: "From home sale proceeds" },
              { label: "Max per couple", value: "$600,000", sub: "$300k each" },
              { label: "Minimum age", value: "55+", sub: "At time of contribution" },
              { label: "TSB limit", value: "None", sub: "No balance cap applies" },
            ].map((stat) => (
              <div key={stat.label} className="bg-slate-800 rounded-xl p-4 border border-slate-700">
                <p className="text-xs text-slate-400 mb-1">{stat.label}</p>
                <p className="text-2xl font-extrabold text-white">{stat.value}</p>
                <p className="text-xs text-slate-400 mt-0.5">{stat.sub}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-500 mt-4">{UPDATED_LABEL} · Verify current rules at ato.gov.au</p>
        </div>
      </section>

      {/* What is the downsizer contribution */}
      <section className="py-10 border-b border-slate-100">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-4">What is the downsizer contribution?</h2>
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-6 space-y-3">
            <p className="text-sm text-slate-700 leading-relaxed">
              The <strong className="text-slate-900">downsizer contribution</strong> is a special superannuation
              contribution that allows eligible Australians aged 55 and over to contribute up to $300,000 from
              the proceeds of selling their main residence directly into super — without it counting toward
              their concessional or non-concessional contribution caps.
            </p>
            <p className="text-sm text-slate-700 leading-relaxed">
              For couples, each spouse can contribute up to $300,000, meaning a couple can together add up
              to <strong className="text-slate-900">$600,000 into super</strong> from a single home sale. Both
              spouses must each meet the eligibility criteria independently.
            </p>
            <p className="text-sm text-slate-700 leading-relaxed">
              Despite the name, you do not have to downsize. You can use the scheme if you buy a more
              expensive property, rent after the sale, or move into a retirement village. The only requirement
              is that the property sold was your main residence (at some point) and was owned for at least
              10 years.
            </p>
            <p className="text-sm text-slate-700 leading-relaxed">
              <strong className="text-slate-900">One key distinction:</strong> the downsizer contribution is
              a <em>non-concessional</em> (after-tax) contribution — you receive no tax deduction for it.
              However, once inside super, earnings on those funds are taxed at just 15% in accumulation
              phase, or <strong className="text-slate-900">zero in pension phase</strong> — a substantial
              tax advantage for retirees.
            </p>
          </div>
        </div>
      </section>

      {/* Eligibility checklist */}
      <section className="py-10 border-b border-slate-100 bg-slate-50">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-2">Eligibility checklist</h2>
          <p className="text-sm text-slate-500 mb-5">
            You must meet <em>all</em> of the following criteria. Each spouse is assessed independently.
          </p>
          <div className="space-y-3">
            {ELIGIBILITY.map((item, i) => (
              <div key={i} className="flex gap-4 items-start rounded-xl border border-slate-200 bg-white p-4">
                <span className="shrink-0 w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-extrabold mt-0.5">
                  {i + 1}
                </span>
                <div>
                  <p className="text-sm font-bold text-slate-900">{item.label}</p>
                  <p className="text-sm text-slate-600 leading-relaxed mt-0.5">{item.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison table */}
      <section className="py-10 border-b border-slate-100">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-2">
            Downsizer vs standard non-concessional contributions
          </h2>
          <p className="text-sm text-slate-500 mb-5">
            The downsizer contribution sits completely outside the standard contribution framework —
            it does not consume your non-concessional cap and has no TSB gate.
          </p>
          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm" aria-label="Downsizer contribution vs standard non-concessional contribution comparison">
              <thead>
                <tr className="bg-slate-900">
                  <th scope="col" className="text-left px-4 py-3 text-xs font-bold text-white uppercase tracking-wide">Feature</th>
                  <th scope="col" className="text-left px-3 py-3 text-xs font-bold text-white uppercase tracking-wide">Standard non-concessional</th>
                  <th scope="col" className="text-left px-3 py-3 text-xs font-bold text-emerald-300 uppercase tracking-wide">Downsizer contribution</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {COMPARISON_ROWS.map((row, i) => (
                  <tr key={i} className={row.highlight ? "bg-emerald-50 hover:bg-emerald-100" : "hover:bg-slate-50"}>
                    <td className="px-4 py-3 font-semibold text-slate-900 text-xs">{row.feature}</td>
                    <td className="px-3 py-3 text-xs text-slate-600">{row.standard}</td>
                    <td className="px-3 py-3 text-xs font-semibold text-emerald-800">{row.downsizer}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Worked example */}
      <section className="py-10 border-b border-slate-100 bg-slate-50">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-4">Worked example</h2>
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-6">
            <h3 className="text-base font-extrabold text-slate-900 mb-1">
              Margaret and John — selling the family home
            </h3>
            <p className="text-xs text-slate-500 mb-5">
              Both aged 65 · family home owned for 30 years · sold for $2,000,000
            </p>
            <div className="space-y-2 text-sm mb-5">
              <div className="flex justify-between items-center border-b border-amber-200 pb-2">
                <span className="text-slate-700">Margaret&apos;s super balance before contribution</span>
                <span className="font-bold text-slate-900">$800,000</span>
              </div>
              <div className="flex justify-between items-center border-b border-amber-200 pb-2">
                <span className="text-slate-700">John&apos;s super balance before contribution</span>
                <span className="font-bold text-slate-900">$600,000</span>
              </div>
              <div className="flex justify-between items-center border-b border-amber-200 pb-2">
                <span className="text-slate-700">Margaret contributes $300,000 downsizer</span>
                <span className="font-bold text-emerald-700">+$300,000</span>
              </div>
              <div className="flex justify-between items-center border-b border-amber-200 pb-2">
                <span className="text-slate-700">John contributes $300,000 downsizer</span>
                <span className="font-bold text-emerald-700">+$300,000</span>
              </div>
              <div className="flex justify-between items-center border-b border-amber-200 pb-2">
                <span className="font-bold text-slate-900">Total new super (combined)</span>
                <span className="font-bold text-emerald-700">$2,000,000</span>
              </div>
              <div className="flex justify-between items-center pt-1">
                <span className="text-slate-700">
                  Extra $600,000 in pension phase at 5% return
                </span>
                <span className="font-bold text-emerald-700">~$30,000/year tax-free</span>
              </div>
            </div>
            <div className="rounded-lg border border-emerald-200 bg-white p-4">
              <p className="text-xs font-bold text-emerald-800 uppercase tracking-wide mb-1">Key outcome</p>
              <p className="text-sm text-slate-700 leading-relaxed">
                Both Margaret and John are already in pension phase. Earnings on the extra $600,000 inside
                their super funds are completely <strong className="text-slate-900">tax-free</strong> — the
                same $600,000 outside super in a bank account or investment portfolio would generate taxable
                income. The tax saving at a 32.5% marginal rate on $30,000 income would be approximately
                $9,750 per year, every year.
              </p>
            </div>
            <p className="text-xs text-slate-500 mt-3">
              Neither contribution counts toward their non-concessional caps — their existing super balances
              did not restrict eligibility. Figures are illustrative; returns are not guaranteed.
            </p>
          </div>
        </div>
      </section>

      {/* Age Pension interaction */}
      <section className="py-10 border-b border-slate-100">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-4">Age Pension interaction</h2>
          <p className="text-sm text-slate-500 mb-5">
            The downsizer contribution increases super assets — which can affect Age Pension entitlements.
            Understanding the sequence of events matters.
          </p>
          <div className="grid sm:grid-cols-2 gap-5 mb-6">
            <div className="rounded-xl border border-red-200 bg-red-50 p-5">
              <p className="text-xs font-bold text-red-800 uppercase tracking-wide mb-2">Impact on assets test</p>
              <p className="text-sm text-red-900 leading-relaxed">
                Super balances count toward the Age Pension assets test once both spouses have reached Age
                Pension age. The 2024-25 taper rate is $3 per fortnight reduction for every $1,000 in
                assets over the threshold. An extra $300,000 in super reduces the fortnightly Age Pension
                by up to $900/fortnight — $23,400 per year.
              </p>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
              <p className="text-xs font-bold text-emerald-800 uppercase tracking-wide mb-2">The 24-month home sale exemption</p>
              <p className="text-sm text-emerald-900 leading-relaxed">
                Home sale proceeds are exempt from the assets test for up to 24 months (12 months,
                extendable) while you intend to use them to buy a new home. This window gives you time
                to plan. Once proceeds are contributed to super or spent, the exemption ends and those
                assets are assessed.
              </p>
            </div>
          </div>
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-5">
            <p className="text-xs font-bold text-blue-800 uppercase tracking-wide mb-2">Strategy — time your contribution</p>
            <p className="text-sm text-blue-900 leading-relaxed">
              If you are receiving the Age Pension, consider using the 24-month exemption period fully
              before making the downsizer contribution. While the proceeds sit in a bank account under
              the &ldquo;intending to purchase&rdquo; exemption, they are not assessed in the assets test.
              Once you contribute to super they become assessed. Contributing near the end of the exemption
              period minimises the window during which the assets test applies before any potential new
              home purchase reduces your super balance.
            </p>
            <p className="text-sm text-blue-800 leading-relaxed mt-3">
              This is a material strategy decision with individual circumstances — always model with a
              licensed financial adviser before proceeding.
            </p>
          </div>
        </div>
      </section>

      {/* How to make the contribution */}
      <section className="py-10 border-b border-slate-100 bg-slate-50">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-4">How to make the downsizer contribution</h2>
          <div className="space-y-4">
            {[
              {
                step: "1",
                title: "Obtain the ATO form",
                body: "Download and complete the ATO's Downsizer Contribution into Superannuation form (NAT 75073) from ato.gov.au, or obtain an equivalent form directly from your super fund. Most large funds have their own version.",
              },
              {
                step: "2",
                title: "Provide the form to your super fund",
                body: "The completed form must be provided to your super fund at or before the time you make the contribution. You cannot submit the form after the money has been received by the fund.",
              },
              {
                step: "3",
                title: "Transfer the funds within 90 days of settlement",
                body: "The contribution must be received by your super fund within 90 days of the settlement date of the property sale. Settlement date — not exchange of contracts, not when you receive cheque — starts the clock.",
              },
              {
                step: "4",
                title: "Fund lodges with the ATO",
                body: "Your super fund will record the contribution as a 'Downsizer Contribution' in their reporting to the ATO. This ensures the ATO can verify you have only used the scheme once and that the amounts are within the permitted limits.",
              },
            ].map((item) => (
              <div key={item.step} className="flex gap-4 items-start rounded-xl border border-slate-200 bg-white p-5">
                <span className="shrink-0 w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-sm font-extrabold">
                  {item.step}
                </span>
                <div>
                  <p className="text-sm font-bold text-slate-900 mb-1">{item.title}</p>
                  <p className="text-sm text-slate-600 leading-relaxed">{item.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Common traps */}
      <section className="py-10 border-b border-slate-100">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-5">Common traps to avoid</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {TRAPS.map((trap, i) => (
              <div key={i} className="rounded-xl border border-red-200 bg-red-50 p-5">
                <p className="text-sm font-extrabold text-red-900 mb-2">{trap.title}</p>
                <p className="text-sm text-red-800 leading-relaxed">{trap.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-10 border-b border-slate-100 bg-slate-50">
        <div className="container-custom max-w-3xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-6">Frequently asked questions</h2>
          <div className="space-y-4">
            {FAQS.map((faq, i) => (
              <details key={i} className="group border border-slate-200 rounded-xl p-4 bg-white">
                <summary className="cursor-pointer list-none font-bold text-slate-900 flex items-start justify-between gap-3">
                  {faq.q}
                  <span className="shrink-0 text-slate-400 group-open:rotate-180 transition-transform text-lg leading-none">&#9662;</span>
                </summary>
                <p className="mt-3 text-sm text-slate-600 leading-relaxed">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Advisor CTA */}
      <HubAdvisorCTA
        heading="Maximise your downsizer contribution strategy"
        subheading="Downsizer contributions interact with transfer balance cap, total super balance, and Age Pension eligibility. A super specialist can model the full impact for your situation."
        intent={{ need: "retirement", context: ["downsizer_contribution", "super_strategy"] }}
        source="retirement_downsizer_contribution"
        ctaLabel="Find a super specialist"
        className="py-12 bg-amber-50 border-t border-amber-200"
      />

      {/* Related guides */}
      <section className="py-8 border-b border-slate-100">
        <div className="container-custom max-w-4xl">
          <h2 className="text-xl font-extrabold text-slate-900 mb-4">Related guides</h2>
          <div className="flex flex-wrap gap-3">
            {[
              { href: "/retirement/age-pension", label: "Age Pension overview" },
              { href: "/retirement/age-pension-assets-test", label: "Assets test thresholds" },
              { href: "/retirement/deeming-rates", label: "Deeming rates" },
              { href: "/retirement/pension-phase", label: "Pension phase (ABP)" },
              { href: "/retirement/annuities", label: "Annuities guide" },
              { href: "/retirement/how-much-do-you-need", label: "How much to retire?" },
              { href: "/retirement", label: "Retirement hub" },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-full text-sm font-semibold text-slate-700 hover:border-amber-300 hover:text-amber-700 transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Compliance footer */}
      <section className="py-8 bg-slate-50">
        <div className="container-custom max-w-4xl">
          <p className="text-[11px] text-slate-500 leading-relaxed">
            <strong>General advice warning.</strong> {GENERAL_ADVICE_WARNING} Downsizer contribution rules,
            eligibility criteria, and contribution caps are subject to change — always verify current
            information at ato.gov.au or servicesaustralia.gov.au. Age Pension assets test thresholds and
            taper rates change annually. The interaction between the downsizer contribution, Age Pension
            entitlements, and your personal tax position can be complex and depends on individual
            circumstances. This page is general information only; it is not financial, taxation, or legal
            advice. Consult a licensed financial adviser before making superannuation or pension decisions.
          </p>
        </div>
      </section>
    </div>
  );
}
