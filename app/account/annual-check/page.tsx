import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { enforcePortalKind } from "@/lib/portal-gate";
import { getInvestorProfile } from "@/lib/investor-profiles";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Annual Financial Check-up — My Account",
  robots: "noindex, nofollow",
};

// ── Key AU financial dates ────────────────────────────────────────────────────

const CURRENT_FY = "2025–26";
const FY_END = "30 June 2026";
const TAX_RETURN_DUE = "31 October 2026";
const CONCESSIONAL_CAP = "$30,000";
const NON_CONCESSIONAL_CAP = "$120,000";

type CheckItem = { label: string; detail: string; href?: string };
type Section = { id: string; title: string; icon: string; items: CheckItem[] };

function buildSections(flags: {
  isFhb: boolean;
  isPreRetiree: boolean;
  isHnw: boolean;
  isBusinessOwner: boolean;
  isCrossBorder: boolean;
}): Section[] {
  const sections: Section[] = [
    {
      id: "super",
      title: "Superannuation",
      icon: "🏦",
      items: [
        {
          label: `Check concessional contributions (cap ${CONCESSIONAL_CAP})`,
          detail: "Salary sacrifice + employer SG + personal deductible contributions. Any unused cap from prior 3 years may be carried forward if your TSB < $500K.",
          href: "/super/contributions-calculator",
        },
        {
          label: `Review non-concessional contributions (cap ${NON_CONCESSIONAL_CAP})`,
          detail: "After-tax contributions. Bring-forward rule lets you contribute up to $360K over 3 years if eligible.",
        },
        {
          label: "Consolidate duplicate super accounts",
          detail: "Check ATO myGov — duplicate accounts eat fees and erode returns. Rollover takes 3 business days.",
          href: "https://my.gov.au",
        },
        {
          label: "Verify beneficiary nominations are current",
          detail: "Binding nominations expire every 3 years in most funds. Non-binding nominations are at fund trustee discretion.",
        },
        ...(flags.isPreRetiree
          ? [
              {
                label: "Model transition-to-retirement income stream",
                detail: "If you've reached preservation age (60 from July 2024 onwards) you can start a TTR pension while still working.",
                href: "/super",
              },
            ]
          : []),
        ...(flags.isFhb
          ? [
              {
                label: "Check FHSS balance and release eligibility",
                detail: "First Home Super Saver Scheme: voluntary contributions inside super can be released (up to $50K) toward your first home deposit.",
                href: "/first-home-buyer",
              },
            ]
          : []),
      ],
    },
    {
      id: "tax",
      title: "Tax & investments",
      icon: "🧾",
      items: [
        {
          label: `Lodge your FY${CURRENT_FY} tax return by ${TAX_RETURN_DUE}`,
          detail: "Or by 31 May 2027 if you use a registered tax agent. Paper returns due 31 October.",
        },
        {
          label: "Harvest capital losses before 30 June",
          detail: `Crystallising a capital loss before ${FY_END} lets you offset capital gains made this year. Loss carry-forward is unlimited.`,
        },
        {
          label: "Check CGT discount eligibility on held assets",
          detail: "Assets held > 12 months attract a 50% CGT discount for individuals. Review whether to realise gains this FY or wait.",
          href: "/tools/cgt-calculator",
        },
        {
          label: "Pre-pay deductible expenses before 30 June",
          detail: "Investment loan interest, income protection premiums, and prepaid subscriptions paid before 30 June are deductible in FY2025–26.",
        },
        ...(flags.isBusinessOwner
          ? [
              {
                label: "Review trust/company year-end distributions",
                detail: "Trust distribution minutes must be resolved by 30 June. Company Div 7A loans need minimum repayments by 30 June.",
              },
            ]
          : []),
        ...(flags.isCrossBorder
          ? [
              {
                label: "Check foreign income and offset requirements",
                detail: "Australian tax residents declare worldwide income. Foreign tax offset rules apply — see DASP claim if leaving AU.",
                href: "/foreign-investment",
              },
            ]
          : []),
        ...(flags.isHnw
          ? [
              {
                label: "Review Division 293 tax exposure",
                detail: "Div 293 applies 15% extra tax on concessional contributions for incomes ≥ $250K. Check if salary sacrifice restructure helps.",
              },
            ]
          : []),
      ],
    },
    {
      id: "insurance",
      title: "Insurance review",
      icon: "🛡️",
      items: [
        {
          label: "Review life & TPD cover inside super",
          detail: "Default cover shrinks at age 25 steps. Compare your super fund's premium schedule with retail alternatives.",
        },
        {
          label: "Check income protection is 'own occupation' and to age 65",
          detail: "Stepped premiums get expensive at 55+. Consider locking in level premiums if you're under 45.",
        },
        {
          label: "Verify building & contents sums insured for underinsurance",
          detail: "Rebuild costs have risen ~30% since 2021. Use CoreLogic's building cost estimator — market value ≠ rebuild cost.",
        },
        {
          label: "Review health insurance tier vs Medicare Levy Surcharge threshold",
          detail: `Singles ≥ $93,000 income face the MLS (1–1.5%) without private hospital cover. Rebate means cover often costs less than the surcharge.`,
        },
      ],
    },
    {
      id: "goals",
      title: "Goals & planning",
      icon: "🎯",
      items: [
        {
          label: "Update financial goals with current balances",
          detail: "Goal tracking needs a current balance to project on-track status. Update quarterly.",
          href: "/account/goals",
        },
        {
          label: "Review emergency fund (3–6 months expenses)",
          detail: "High-yield savings or offset account. Replenish if drawn down over the year.",
        },
        {
          label: "Check estate planning documents are current",
          detail: "Will, enduring power of attorney, healthcare directive. Major life events (marriage, divorce, children) invalidate prior wills in some states.",
        },
        {
          label: "Review advisor relationship — is it still the right match?",
          detail: "Fee disclosure statements arrive annually. Benchmark against alternatives.",
          href: "/find-advisor",
        },
      ],
    },
  ];

  return sections;
}

type CheckRowProps = { item: CheckItem };

function CheckRow({ item }: CheckRowProps) {
  return (
    <li className="flex gap-3 py-3 border-b border-slate-100 last:border-0">
      <span className="mt-0.5 w-5 h-5 flex-shrink-0 rounded border-2 border-slate-300" aria-hidden="true" />
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <p className="text-sm font-medium text-slate-900">{item.label}</p>
          {item.href && (
            <Link
              href={item.href}
              className="text-xs font-medium text-violet-700 hover:text-violet-900 whitespace-nowrap"
            >
              Review →
            </Link>
          )}
        </div>
        <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{item.detail}</p>
      </div>
    </li>
  );
}

export default async function AnnualCheckPage() {
  await enforcePortalKind("investor");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/account/login?redirect=/account/annual-check");
  }

  const investorProfile = await getInvestorProfile(user.id).catch(() => null);

  const flags = {
    isFhb: investorProfile?.isFhb ?? false,
    isPreRetiree: investorProfile?.isPreRetiree ?? false,
    isHnw: investorProfile?.isHnw ?? false,
    isBusinessOwner: investorProfile?.isBusinessOwner ?? false,
    isCrossBorder: investorProfile?.isCrossBorder ?? false,
  };

  const sections = buildSections(flags);
  const totalItems = sections.reduce((acc, s) => acc + s.items.length, 0);

  return (
    <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      <header className="mb-8">
        <nav className="text-xs text-slate-500 mb-2">
          <Link href="/account" className="hover:underline">
            My Account
          </Link>{" "}
          / Annual Check-up
        </nav>
        <h1 className="text-2xl font-bold text-slate-900">Annual Financial Check-up</h1>
        <p className="text-sm text-slate-500 mt-1">
          FY{CURRENT_FY} · {totalItems} items across {sections.length} areas · General information only — not financial advice.
        </p>
      </header>

      {/* Key dates banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-8">
        <h2 className="text-sm font-semibold text-amber-900 mb-2">Key FY{CURRENT_FY} dates</h2>
        <ul className="space-y-1.5 text-xs text-amber-800">
          <li className="flex gap-2">
            <span className="font-mono font-bold w-28 flex-shrink-0">30 June 2026</span>
            <span>End of financial year — super contributions, CGT harvesting, expense pre-payment</span>
          </li>
          <li className="flex gap-2">
            <span className="font-mono font-bold w-28 flex-shrink-0">1 July 2026</span>
            <span>New FY starts — contribution caps reset to {CONCESSIONAL_CAP} concessional</span>
          </li>
          <li className="flex gap-2">
            <span className="font-mono font-bold w-28 flex-shrink-0">31 Oct 2026</span>
            <span>Tax return due for self-lodgers · May 2027 if using a registered tax agent</span>
          </li>
        </ul>
      </div>

      {/* Checklist sections */}
      <div className="space-y-6">
        {sections.map((section) => (
          <section key={section.id} aria-labelledby={`${section.id}-heading`}>
            <h2
              id={`${section.id}-heading`}
              className="flex items-center gap-2 text-sm font-semibold text-slate-700 uppercase tracking-wide mb-2"
            >
              <span aria-hidden="true">{section.icon}</span>
              {section.title}
            </h2>
            <div className="bg-white border border-slate-200 rounded-xl px-4">
              <ul aria-label={`${section.title} checklist`}>
                {section.items.map((item) => (
                  <CheckRow key={item.label} item={item} />
                ))}
              </ul>
            </div>
          </section>
        ))}
      </div>

      {/* Footer CTA */}
      <div className="mt-8 bg-slate-50 border border-slate-200 rounded-xl p-5 text-center">
        <p className="text-sm text-slate-700 font-medium mb-3">
          Want personalised guidance on these items?
        </p>
        <Link
          href="/find-advisor"
          className="inline-block bg-violet-700 text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-violet-800 transition-colors"
        >
          Find a financial advisor
        </Link>
        <p className="text-xs text-slate-400 mt-3">
          This checklist is general information. It does not account for your personal circumstances.
          Always seek advice from a licensed financial adviser before making investment decisions.
        </p>
      </div>
    </main>
  );
}
