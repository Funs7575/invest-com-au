import type { Metadata } from "next";
import Link from "next/link";
import { SITE_URL, CURRENT_YEAR, UPDATED_LABEL, breadcrumbJsonLd } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `Consolidate Your Super — How to Find &amp; Merge Multiple Accounts (${CURRENT_YEAR} Guide)`,
  description:
    `How to consolidate super: find lost accounts via myGov/ATO, check insurance before rolling over, and complete a tax-free rollover. ${UPDATED_LABEL}.`,
  openGraph: {
    title: `Consolidate Your Super — Find &amp; Merge Multiple Accounts — ${CURRENT_YEAR}`,
    description:
      "How to find all your super accounts via myGov, check insurance before you roll over, compare fees, and complete a tax-free rollover. The definitive Australian guide.",
    url: `${SITE_URL}/super/consolidation`,
    images: [
      {
        url: `/api/og?title=${encodeURIComponent("Consolidate Your Super")}&sub=${encodeURIComponent("Find Lost Super · Insurance Check · Tax-Free Rollover · " + CURRENT_YEAR)}`,
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: `${SITE_URL}/super/consolidation` },
};

// ── Data ──────────────────────────────────────────────────────────────────────

const STEPS = [
  {
    step: 1,
    title: "Log in to myGov and link the ATO",
    detail:
      "Go to my.gov.au and sign in (or create an account). Link the ATO as a government service — you will need your TFN and identity documents for the first-time link. Once linked, navigate to Tax → Super to see every fund that has received a Superannuation Guarantee contribution under your TFN, including old accounts from previous employers and any unclaimed super held directly by the ATO.",
  },
  {
    step: 2,
    title: "Check the insurance held in every account",
    detail:
      "Before closing any account, call each fund and ask: what type of insurance do I hold (life, TPD, income protection), how much is the cover, is it currently active, and can I transfer it to another fund? This is the most important step — rolling over an account cancels its insurance. If your health has changed since the policy was issued, you may not be able to get equivalent cover elsewhere.",
  },
  {
    step: 3,
    title: "Compare fees and long-term performance",
    detail:
      "Use the ATO YourSuper comparison tool at ato.gov.au to compare annual fees and 7-year net returns across all APRA-regulated funds. Focus on total annual fee as a percentage of your balance. A 0.5% difference in fees compounded over 30 years can mean tens of thousands of dollars less at retirement. Also check SuperRatings and Canstar for independent ratings.",
  },
  {
    step: 4,
    title: "Choose which fund to consolidate into",
    detail:
      "Select the fund that best balances low fees, strong investment performance, adequate insurance, and the investment options you want. Consider your current employer's default fund — SG contributions flow there automatically unless you nominate elsewhere. If your employer's fund is poor quality, nominate a better fund using the Standard Choice Form (ATO NAT 13080).",
  },
  {
    step: 5,
    title: "Initiate the transfer via myGov",
    detail:
      "Log in to myGov → ATO → Super → Transfer super. Select the accounts you want to close and nominate the receiving fund using its USI (Unique Superannuation Identifier). Alternatively, contact the receiving fund directly and request a rollover form — provide the fund ABN and your member number(s) for each account you are rolling out. Most electronic transfers complete within 3 business days.",
  },
  {
    step: 6,
    title: "Update your employer and review your settings",
    detail:
      "After the rollover is confirmed, provide your new fund's details to your employer via a Standard Choice Form so future SG contributions go to the right account. Then set your investment strategy within the fund, update your beneficiary nominations, and set a calendar reminder to review your super annually.",
  },
];

const FAQ_ITEMS = [
  {
    q: "Is it safe to consolidate my superannuation?",
    a: "Yes — consolidating into an APRA-regulated fund is safe provided you follow the correct process. The key risk is not financial loss from the transfer itself, but accidentally cancelling valuable insurance you hold in an account you close. Always check what insurance each account holds before initiating any rollover. The transfer of funds between complying super funds is a regulated process and rollovers are not a taxable event.",
  },
  {
    q: "Will I lose insurance if I consolidate super?",
    a: "You will lose the insurance in any account you close. When you roll over a super account, that account is closed and its associated insurance — life, TPD, and income protection — is cancelled. Before consolidating, call each fund to find out what cover you hold, how much it is, and whether the receiving fund can port or match that cover. Some funds offer insurance transfer (portability) so you can move cover without fresh medical underwriting. If your health has deteriorated since the original policy was issued, losing grandfathered insurance may be impossible to reverse.",
  },
  {
    q: "How long does it take to transfer super between funds?",
    a: "Transfers initiated through myGov using the ATO's electronic transfer system typically complete within 3 business days, and most finalise within 24 hours. Manual rollovers via paper forms submitted directly to the fund can take 10 to 28 days. The old fund is legally required to process the rollover within 3 business days of receiving a valid request. If your transfer is taking longer, contact the old fund directly to follow up.",
  },
  {
    q: "Can I consolidate an SMSF with a retail or industry fund?",
    a: "Yes — you can roll a balance from an SMSF into an APRA-regulated fund (retail or industry). To do so, you request a rollover from the SMSF to the receiving fund in the same way as any super transfer. The SMSF must process the rollover correctly and update its accounting records and annual return to the ATO. If you are winding up the SMSF entirely, you also need to finalise the fund's tax obligations and arrange a final audit before lodging the wind-up return with the ATO.",
  },
  {
    q: "Does consolidating super trigger capital gains tax?",
    a: "No. Rolling over your superannuation balance between complying funds is not a CGT event and is not a taxable transaction for the fund member. You do not pay income tax, capital gains tax, or any exit fee on a standard rollover. The only nuance involves untaxed elements found in some older public sector funds — when these roll into a taxed fund, the standard 15% contributions tax is applied at that point. For the vast majority of Australians with standard accumulation accounts in APRA-regulated funds, rollovers are completely tax-free.",
  },
];

const CASE_STUDY = {
  name: "Sarah",
  situation:
    "Three super accounts from three different employers — one retail fund, one industry default, and one she forgot about from a casual job in her 20s.",
  annualFeeDuplication: "$600",
  saving: "$400 per year",
  compounded:
    "At 7% annual growth over 20 years, that $400 per year saving compounds to approximately $16,400 in additional retirement savings.",
};

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SuperConsolidationPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: SITE_URL },
    { name: "Super", url: `${SITE_URL}/super` },
    { name: "Consolidate Super" },
  ]);

  const faqSchema = faqJsonLd(FAQ_ITEMS);

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

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="relative bg-white border-b border-slate-100 overflow-hidden py-8 md:py-12">
        <div className="container-custom">
          {/* Breadcrumb */}
          <nav
            aria-label="Breadcrumb"
            className="text-xs text-slate-500 mb-5 flex items-center gap-1.5 flex-wrap"
          >
            <Link href="/" className="hover:text-slate-900">
              Home
            </Link>
            <span>/</span>
            <Link href="/super" className="hover:text-slate-900">
              Super
            </Link>
            <span>/</span>
            <span className="text-slate-900 font-medium">Consolidate Super</span>
          </nav>

          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 border border-slate-200 rounded-full text-xs font-semibold text-slate-600 mb-4">
              <span className="w-1.5 h-1.5 bg-amber-500 rounded-full" aria-hidden="true" />
              Super Consolidation &middot; {UPDATED_LABEL}
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold leading-[1.1] mb-3 tracking-tight text-slate-900">
              Consolidate Your Super:{" "}
              <span className="text-amber-600">
                How to Find &amp; Merge Multiple Accounts
              </span>
            </h1>
            <p className="text-sm md:text-base text-slate-600 leading-relaxed mb-4">
              Australians hold an estimated{" "}
              <strong className="text-slate-800">$17.8 billion</strong> in lost or unclaimed
              super. The average person has{" "}
              <strong className="text-slate-800">2.7 super accounts</strong>, paying duplicate
              fees on every one of them. Consolidating into a single fund can save hundreds of
              dollars a year — and tens of thousands over a working lifetime.
            </p>
            <p className="text-sm text-slate-500 leading-relaxed">
              This guide covers how to find all your accounts through myGov, the insurance check
              you must do first, the step-by-step transfer process, and what changes after you
              consolidate.
            </p>
          </div>
        </div>
      </section>

      {/* ── Key stats ─────────────────────────────────────────────────────── */}
      <section className="py-8 bg-slate-50 border-b border-slate-100">
        <div className="container-custom">
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl border border-amber-200 p-5">
              <p className="text-xs font-bold text-amber-800 uppercase tracking-wide mb-1">
                Lost &amp; Unclaimed Super
              </p>
              <p className="text-2xl font-black text-amber-700">$17.8B</p>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Estimated total in lost or unclaimed superannuation across Australia — money that
                is quietly eroding via admin fees.
              </p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">
                Average Accounts Per Person
              </p>
              <p className="text-2xl font-black text-slate-700">2.7 accounts</p>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Most opened automatically by employers when a new worker didn&apos;t nominate a fund.
                Each one charges its own set of fees.
              </p>
            </div>
            <div className="bg-white rounded-2xl border border-green-200 p-5">
              <p className="text-xs font-bold text-green-800 uppercase tracking-wide mb-1">
                Typical Annual Fee Saving
              </p>
              <p className="text-2xl font-black text-green-700">$200–$800/yr</p>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Compounded over 20 to 30 years, eliminating duplicate admin and investment fees
                adds up to a substantial retirement balance difference.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Why consolidate ───────────────────────────────────────────────── */}
      <section className="py-12 md:py-14">
        <div className="container-custom max-w-3xl">
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 mb-2">
            Why multiple super accounts cost you money
          </h2>
          <p className="text-sm text-slate-500 mb-6 leading-relaxed">
            Having multiple super accounts is not just inconvenient — it actively reduces your
            retirement balance in four distinct ways.
          </p>

          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="text-sm font-bold text-slate-900 mb-1.5">
                1. Duplicate fees on every account
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Each super fund charges its own administration fee, investment management fee,
                and often an account-keeping fee. Two accounts means two sets of each. A second
                account with $15,000 in it paying $200 per year in fees is losing more than 1%
                annually before any investment return is considered.
              </p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="text-sm font-bold text-slate-900 mb-1.5">
                2. Multiple competing investment strategies
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Each fund&apos;s default investment option may have a different risk profile, asset
                allocation, and return objective. Without intentionally coordinating them, you may
                be running investment strategies that work against each other — or simply be in
                the default &quot;balanced&quot; option in every fund without considering whether that
                matches your age and goals.
              </p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="text-sm font-bold text-slate-900 mb-1.5">
                3. Harder to track performance and make decisions
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Managing multiple fund portals, member statements, and contribution schedules
                makes it easy to miss underperformance, insurance issues, or incorrect contribution
                allocations. A single account is far easier to monitor and act on.
              </p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="text-sm font-bold text-slate-900 mb-1.5">
                4. Lost accounts erode to zero via fees
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                A forgotten account with a small balance will be gradually consumed by admin
                fees. Once a balance falls below a threshold, funds may transfer it to the ATO as
                lost super. Reclaiming it is possible but takes time, and any interest earned while
                held by the ATO is only CPI-linked — significantly below market returns.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Insurance warning ─────────────────────────────────────────────── */}
      <section className="py-10 md:py-12 bg-amber-50 border-y border-amber-100">
        <div className="container-custom max-w-3xl">
          <div className="flex items-start gap-4">
            <div
              className="shrink-0 w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center text-white font-black text-base"
              aria-hidden="true"
            >
              !
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-amber-900 mb-2">
                Before you consolidate: check your insurance first
              </h2>
              <p className="text-sm text-amber-800 leading-relaxed mb-4">
                This is the single most important step — and the one most people skip. Many
                Australians hold valuable group insurance inside older super accounts without
                realising it. When you roll over (close) a super account, the insurance held
                inside it is <strong>automatically cancelled</strong> — often permanently.
              </p>
              <p className="text-sm text-amber-800 leading-relaxed mb-4">
                The three types of insurance commonly held inside super funds are:
              </p>
              <ul className="text-sm text-amber-800 leading-relaxed space-y-2 mb-4 list-none">
                <li>
                  <span className="font-semibold">Life (death) cover</span> — pays a lump sum
                  to your dependants if you die
                </li>
                <li>
                  <span className="font-semibold">
                    Total and Permanent Disability (TPD) cover
                  </span>{" "}
                  — pays if you become permanently unable to work
                </li>
                <li>
                  <span className="font-semibold">Income protection</span> — replaces a portion
                  of your income if you are temporarily disabled and unable to work
                </li>
              </ul>
              <p className="text-sm text-amber-800 leading-relaxed mb-4">
                The risk: if your health has changed since the original insurance policy was
                issued — for example, you have been diagnosed with a medical condition — you may
                not be able to obtain equivalent cover in a new fund at the same premium. Insurers
                assess new applications based on your <em>current</em> health status.
              </p>
              <p className="text-sm font-semibold text-amber-900 leading-relaxed">
                What to do: call each fund before rolling it over. Ask: &quot;What insurance do I hold in
                this account, what is the cover amount, is it currently active, and can I transfer
                the cover to another fund?&quot; A 10-minute phone call can save you from
                permanently losing cover that protects your family.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── How to find lost super ────────────────────────────────────────── */}
      <section className="py-12 md:py-14">
        <div className="container-custom max-w-3xl">
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 mb-2">
            How to find your lost super
          </h2>
          <p className="text-sm text-slate-500 mb-6 leading-relaxed">
            The ATO holds records of every super fund contribution ever made under your Tax File
            Number. There are three ways to access that information.
          </p>

          <div className="space-y-5">
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="text-sm font-bold text-slate-900 mb-2">
                Option 1: myGov → ATO (recommended)
              </h3>
              <ol className="text-sm text-slate-600 leading-relaxed space-y-1.5 list-decimal list-inside">
                <li>
                  Go to{" "}
                  <span className="font-mono text-slate-700 text-xs">my.gov.au</span> and sign in
                  or create an account
                </li>
                <li>
                  Link the ATO as a service under &quot;Linked services&quot; (requires your TFN and
                  identity verification)
                </li>
                <li>
                  Navigate to <strong>Tax → Super</strong> — the ATO tab shows all funds linked to
                  your TFN
                </li>
                <li>
                  Also check the &quot;Manage my super&quot; section for any ATO-held unclaimed super
                </li>
              </ol>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="text-sm font-bold text-slate-900 mb-2">
                Option 2: ATO SuperSeeker tool
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                If you do not have a myGov account, the ATO&apos;s SuperSeeker tool at{" "}
                <span className="font-mono text-slate-700 text-xs">ato.gov.au/super</span> lets
                you search for all accounts linked to your TFN using your date of birth and name.
                No myGov login is required.
              </p>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="text-sm font-bold text-slate-900 mb-2">
                Option 3: ATO Unclaimed Super register
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                When a fund cannot locate you — for example, because you changed address without
                updating the fund — your balance may be transferred to the ATO as unclaimed super.
                The ATO holds this money indefinitely and it earns a low CPI-linked return while
                held. You can claim unclaimed super at any time through myGov with no time limit.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Step-by-step process ──────────────────────────────────────────── */}
      <section className="py-12 md:py-14 bg-slate-50 border-y border-slate-100">
        <div className="container-custom max-w-3xl">
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 mb-1">
            Step-by-step consolidation process
          </h2>
          <p className="text-sm text-slate-500 mb-7 leading-relaxed">
            Follow these steps in order. Skipping step 2 is the most common and costly mistake.
          </p>

          <div className="space-y-4">
            {STEPS.map((s) => (
              <div
                key={s.step}
                className="bg-white rounded-2xl border border-slate-200 p-5 flex gap-5"
              >
                <div
                  className="shrink-0 w-9 h-9 rounded-full bg-amber-500 text-white font-black text-sm flex items-center justify-center"
                  aria-hidden="true"
                >
                  {s.step}
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 mb-1.5">{s.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{s.detail}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
            <p className="text-xs font-semibold text-blue-800 mb-1">
              Timing consideration
            </p>
            <p className="text-sm text-slate-600 leading-relaxed">
              Avoid rolling over mid-payroll-cycle. There is often a lag between your employer
              sending an SG contribution and it landing in your super fund. Contributions in
              transit will arrive at the old fund after you have rolled over — contact the old
              fund once the rollover completes to ensure any trailing contributions are forwarded
              or redirect your employer to the new fund before the next pay cycle.
            </p>
          </div>
        </div>
      </section>

      {/* ── Which fund to keep ────────────────────────────────────────────── */}
      <section className="py-12 md:py-14">
        <div className="container-custom max-w-3xl">
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 mb-2">
            How to choose which fund to keep
          </h2>
          <p className="text-sm text-slate-500 mb-6 leading-relaxed">
            The right fund depends on your balance, employment situation, insurance needs, and
            investment goals. Evaluate each candidate on these five dimensions.
          </p>

          <div className="grid sm:grid-cols-2 gap-4 mb-6">
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
                Fees
              </p>
              <p className="text-sm text-slate-700 leading-relaxed">
                Compare total annual fees as a percentage of your balance — administration fee
                plus investment management fee. Use the ATO YourSuper tool or Canstar for a
                standardised comparison across APRA funds. Larger industry funds typically charge
                lower percentage fees on larger balances.
              </p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
                Performance
              </p>
              <p className="text-sm text-slate-700 leading-relaxed">
                Compare 5-year and 7-year net returns (after fees and tax) in comparable
                investment options — such as &quot;Balanced&quot; vs &quot;Balanced&quot;. SuperRatings and the ATO
                YourSuper tool flag funds that have consistently underperformed their benchmark.
                Avoid making a decision on 1-year returns alone.
              </p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
                Insurance offering
              </p>
              <p className="text-sm text-slate-700 leading-relaxed">
                After checking what insurance you currently hold across all accounts, confirm the
                receiving fund can provide adequate life, TPD, and income protection cover going
                forward. Group insurance through super is typically cheaper than retail insurance.
                Some funds offer insurance portability — ask before you roll over.
              </p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
                Investment options
              </p>
              <p className="text-sm text-slate-700 leading-relaxed">
                If you want to direct your super into specific sectors, individual ETFs, or a
                direct investment option (sometimes called a &quot;member direct&quot; option), check which
                funds offer this. Most large industry funds provide a broad range of pre-mixed and
                sector options, with some also offering direct ASX share access.
              </p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
                Service quality
              </p>
              <p className="text-sm text-slate-700 leading-relaxed">
                Online portal quality, investment switching ease, responsiveness of member
                services, and access to financial advice all matter more as your balance grows.
                Read recent member reviews and check the fund&apos;s complaints record with AFCA.
              </p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
                Employer arrangement
              </p>
              <p className="text-sm text-slate-700 leading-relaxed">
                There is a practical convenience to consolidating into the fund your current
                employer uses — SG contributions arrive automatically without needing to provide
                new details each pay cycle. If that fund is strong on other criteria, it is a
                natural choice. If it is poor quality, you have the right to nominate a different
                fund and your employer must comply.
              </p>
            </div>
          </div>

          <p className="text-sm text-slate-600 leading-relaxed">
            You can compare super funds side-by-side at{" "}
            <Link
              href="/compare/super"
              className="text-amber-700 font-semibold hover:underline"
            >
              invest.com.au/compare/super
            </Link>
            .
          </p>
        </div>
      </section>

      {/* ── Tax on consolidation ──────────────────────────────────────────── */}
      <section className="py-10 md:py-12 bg-green-50 border-y border-green-100">
        <div className="container-custom max-w-3xl">
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 mb-2">
            Tax on consolidation: rollovers are tax-free
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed mb-5">
            Many people delay consolidating because they assume there is a tax cost. There is not.
            Transferring super between complying funds is{" "}
            <strong className="text-slate-800">not a CGT event</strong> and triggers no income
            tax. You do not pay:
          </p>

          <div className="grid sm:grid-cols-3 gap-3 mb-5">
            {["Income tax on the rollover amount", "Capital gains tax on the transfer", "Exit fees or stamp duty"].map(
              (item) => (
                <div
                  key={item}
                  className="bg-white rounded-xl border border-green-200 p-4 flex items-start gap-2"
                >
                  <span className="text-green-600 font-bold text-base leading-none mt-0.5" aria-hidden="true">
                    &#10003;
                  </span>
                  <p className="text-sm text-slate-700 leading-relaxed">{item} — not applicable</p>
                </div>
              )
            )}
          </div>

          <div className="bg-white rounded-xl border border-amber-200 p-4">
            <p className="text-xs font-bold text-amber-800 mb-1">
              The one exception: untaxed elements in older public sector funds
            </p>
            <p className="text-sm text-slate-600 leading-relaxed">
              Some older state and federal public sector funds hold &quot;untaxed&quot; super — meaning the
              standard 15% contributions tax has not yet been applied to employer contributions. When
              this balance rolls into a standard taxed fund, the 15% tax is applied at that point.
              This is not a reason to avoid rolling over — it reflects tax that was always owed —
              but it is worth understanding if you hold a public sector super entitlement. For the
              vast majority of Australians in standard accumulation accounts, the rollover is
              entirely tax-free.
            </p>
          </div>
        </div>
      </section>

      {/* ── Case study ────────────────────────────────────────────────────── */}
      <section className="py-12 md:py-14">
        <div className="container-custom max-w-3xl">
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 mb-6">
            Real-world example: what consolidation is worth
          </h2>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 bg-slate-800">
              <p className="text-sm font-bold text-white">
                {CASE_STUDY.name}&apos;s situation
              </p>
              <p className="text-xs text-slate-500 mt-0.5">{CASE_STUDY.situation}</p>
            </div>
            <div className="grid sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
              <div className="p-5">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
                  Annual duplicate fees
                </p>
                <p className="text-xl font-black text-red-600">{CASE_STUDY.annualFeeDuplication}</p>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Admin and investment fees across three accounts — two of them unnecessarily
                  duplicated.
                </p>
              </div>
              <div className="p-5">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
                  Annual fee saving
                </p>
                <p className="text-xl font-black text-green-600">{CASE_STUDY.saving}</p>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Achieved by consolidating into the best-performing, lowest-fee fund among the
                  three.
                </p>
              </div>
              <div className="p-5">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
                  20-year compounding impact
                </p>
                <p className="text-xl font-black text-amber-600">~$16,400 more</p>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  {CASE_STUDY.compounded}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Employer stapling ─────────────────────────────────────────────── */}
      <section className="py-10 md:py-12 bg-slate-50 border-y border-slate-100">
        <div className="container-custom max-w-3xl">
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 mb-2">
            Employer stapling — how the rules changed in November 2021
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed mb-4">
            Before November 2021, starting a new job typically meant your employer defaulted
            you into their chosen super fund — creating yet another account. From{" "}
            <strong className="text-slate-800">1 November 2021</strong>, the stapling rules{/* // dated-ok — super stapling commencement date, fixed by statute */}
            changed this.
          </p>
          <p className="text-sm text-slate-600 leading-relaxed mb-4">
            Under the stapled fund rules, when you start a new job and do not nominate a super
            fund, your employer must check with the ATO for your &quot;stapled&quot; fund — your existing
            default fund — and contribute there instead of opening a new default account. This
            significantly reduces account proliferation for new workers.
          </p>
          <p className="text-sm text-slate-600 leading-relaxed mb-4">
            If you have already consolidated into a single fund, that fund becomes your stapled
            fund for all future employers where you do not actively nominate a fund. This is one
            of the key reasons to consolidate now rather than deferring — a single consolidated
            account will be treated as your stapled fund automatically.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <p className="text-xs font-semibold text-blue-800 mb-1">What to do after consolidating</p>
            <p className="text-sm text-slate-600 leading-relaxed">
              Even with stapling, always provide your new employer with a completed Standard
              Choice Form (ATO form NAT 13080) nominating your consolidated fund. Stapling only
              applies when you do <em>not</em> nominate a fund — the best outcome is always to
              actively direct contributions to the fund you have chosen.
            </p>
          </div>
        </div>
      </section>

      {/* ── After consolidation ───────────────────────────────────────────── */}
      <section className="py-12 md:py-14">
        <div className="container-custom max-w-3xl">
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 mb-2">
            After consolidation: what to do next
          </h2>
          <p className="text-sm text-slate-500 mb-6 leading-relaxed">
            Once the rollover is confirmed complete, take these four steps to make the most of
            your consolidated account.
          </p>

          <div className="space-y-4">
            <div className="flex gap-4 bg-white rounded-xl border border-slate-200 p-5">
              <div
                className="shrink-0 w-8 h-8 rounded-full bg-slate-100 text-slate-600 font-black text-xs flex items-center justify-center"
                aria-hidden="true"
              >
                A
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 mb-1">
                  Notify your employer
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Submit a Standard Choice Form to your employer nominating your consolidated fund.
                  Provide the fund&apos;s USI, ABN, and your member number. Your employer is required to
                  redirect SG contributions to your nominated fund within 2 months of receiving the
                  form.
                </p>
              </div>
            </div>
            <div className="flex gap-4 bg-white rounded-xl border border-slate-200 p-5">
              <div
                className="shrink-0 w-8 h-8 rounded-full bg-slate-100 text-slate-600 font-black text-xs flex items-center justify-center"
                aria-hidden="true"
              >
                B
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 mb-1">
                  Review and set your investment strategy
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Log in to your consolidated fund and select the investment option (or combination
                  of options) that matches your age, risk tolerance, and retirement timeline. Most
                  funds default new balances into a &quot;balanced&quot; or &quot;lifecycle&quot; option — check
                  whether that is appropriate for your situation.
                </p>
              </div>
            </div>
            <div className="flex gap-4 bg-white rounded-xl border border-slate-200 p-5">
              <div
                className="shrink-0 w-8 h-8 rounded-full bg-slate-100 text-slate-600 font-black text-xs flex items-center justify-center"
                aria-hidden="true"
              >
                C
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 mb-1">
                  Update your beneficiary nominations
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Superannuation does not automatically form part of your estate — it is paid at
                  the fund&apos;s discretion unless you have a binding death benefit nomination (BDBN).
                  Lodge a valid BDBN naming your preferred beneficiaries. Most BDBNs expire after 3
                  years unless the fund offers non-lapsing nominations — set a calendar reminder to
                  renew before expiry.
                </p>
              </div>
            </div>
            <div className="flex gap-4 bg-white rounded-xl border border-slate-200 p-5">
              <div
                className="shrink-0 w-8 h-8 rounded-full bg-slate-100 text-slate-600 font-black text-xs flex items-center justify-center"
                aria-hidden="true"
              >
                D
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 mb-1">
                  Check your insurance cover is adequate
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Confirm the level of life, TPD, and income protection cover now held in your
                  consolidated fund. If you reduced cover by closing accounts, consider whether you
                  need to top up within the fund or supplement with a retail policy. Review your
                  insurance annually as your income, debts, and dependants change.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQs ──────────────────────────────────────────────────────────── */}
      <section className="py-12 md:py-14 bg-slate-50 border-y border-slate-100">
        <div className="container-custom max-w-3xl">
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 mb-6">
            Frequently asked questions
          </h2>
          <div className="space-y-3">
            {FAQ_ITEMS.map((faq) => (
              <details
                key={faq.q}
                className="group bg-white rounded-xl border border-slate-200"
              >
                <summary className="px-5 py-4 text-sm font-bold text-slate-900 cursor-pointer list-none flex items-center justify-between hover:bg-slate-50 rounded-xl transition-colors">
                  {faq.q}
                  <span
                    className="text-slate-500 group-open:rotate-180 transition-transform text-base ml-3 shrink-0"
                    aria-hidden="true"
                  >
                    &#8964;
                  </span>
                </summary>
                <div className="px-5 pb-5 pt-3 text-sm text-slate-600 leading-relaxed border-t border-slate-100">
                  {faq.a}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────────────── */}
      <section className="py-10 bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="container-custom flex flex-col sm:flex-row items-center gap-6 justify-between">
          <div>
            <h2 className="text-lg font-extrabold text-white mb-1">
              Ready to choose a better super fund?
            </h2>
            <p className="text-slate-500 text-sm">
              Compare fees, performance, and insurance across Australia&apos;s top super funds.
            </p>
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

      {/* ── Compliance footer ─────────────────────────────────────────────── */}
      <section className="py-6 bg-slate-50 border-t border-slate-200">
        <div className="container-custom">
          <p className="text-xs text-slate-500 leading-relaxed">{GENERAL_ADVICE_WARNING}</p>
        </div>
      </section>
    </div>
  );
}
