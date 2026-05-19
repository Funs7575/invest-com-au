import type { Metadata } from "next";
import Link from "next/link";
import { enforcePortalKind } from "@/lib/portal-gate";
import { createClient } from "@/lib/supabase/server";
import { getInvestorProfile } from "@/lib/investor-profiles";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";
import { CURRENT_YEAR } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Financial Calendar — My Account",
  robots: "noindex, nofollow",
};

interface Deadline {
  date: string;
  label: string;
  description: string;
  link?: { text: string; href: string };
  tag: "Tax" | "Super" | "ASIC" | "ATO" | "Review" | "FY";
  highlight?: boolean;
}

const FY26_DEADLINES: Deadline[] = [
  {
    date: "30 Jun 2026",
    label: "End of financial year",
    description:
      "Last day to make concessional and non-concessional super contributions for FY2025–26. Also last day to crystallise capital gains or losses before the new financial year.",
    tag: "FY",
    highlight: true,
  },
  {
    date: "30 Jun 2026",
    label: "Super concessional contributions cap deadline",
    description:
      `Concessional cap: $30,000 for FY2025–26. Includes employer SG + salary sacrifice + personal deductible contributions. Unused cap amounts from FY2019–20 onward may be carried forward if your total super balance was below $500,000 on 30 June of the prior year.`,
    tag: "Super",
    link: { text: "Super contributions calculator", href: "/super-contributions-calculator" },
  },
  {
    date: "1 Jul 2026",
    label: "New financial year begins",
    description:
      "Contribution caps reset. Division 293 threshold remains at $250,000. Superannuation guarantee rate holds at 11.5% (legislated rise to 12% from 1 July 2025 applies in some contexts — verify with your employer).", // dated-ok
    tag: "FY",
  },
  {
    date: "31 Oct 2026",
    label: "Individual tax return lodgement deadline",
    description:
      "For individuals lodging directly. Tax agents with registered lists may have an extended deadline — check with your accountant. ATO online myTax opens from 1 July.",
    tag: "Tax",
    highlight: true,
    link: { text: "Find a tax accountant", href: "/find/tax-accountant" },
  },
  {
    date: "21 Jul 2026",
    label: "June quarter PAYG instalment due",
    description:
      "Quarterly PAYG instalments are due 28 days after the quarter ends. The June quarter instalment is due 21 July for most business payers.",
    tag: "ATO",
  },
  {
    date: "28 Oct 2026",
    label: "September quarter BAS / PAYG due",
    description:
      "Q1 FY2026–27 business activity statement due for quarterly BAS reporters. Includes GST and PAYG withholding.",
    tag: "ATO",
  },
  {
    date: "28 Feb 2027",
    label: "December quarter BAS due",
    description: "Q2 FY2026–27 business activity statement for quarterly reporters.",
    tag: "ATO",
  },
  {
    date: "28 Apr 2027",
    label: "March quarter BAS / PAYG due",
    description: "Q3 FY2026–27 business activity statement for quarterly reporters.",
    tag: "ATO",
  },
];

const ONGOING: Deadline[] = [
  {
    date: "Quarterly",
    label: "Investment property review",
    description:
      "Review rental income, deductible expenses (interest, depreciation, maintenance, agent fees), and whether an updated depreciation schedule is warranted after any improvements.",
    tag: "Review",
  },
  {
    date: "Annual",
    label: "Insurance policy review",
    description:
      "Check that life, TPD, income protection, building and contents cover is still adequate. Life events (new mortgage, children, salary change) often require coverage adjustments.",
    tag: "Review",
    link: { text: "Insurance hub", href: "/insurance" },
  },
  {
    date: "Annual",
    label: "Super fund performance review",
    description:
      "Compare your fund's net return (after fees and tax) against the APRA YourSuper benchmarking tool. Consider consolidating to one fund to avoid duplicate fees.",
    tag: "Super",
    link: { text: "Super hub", href: "/super" },
  },
  {
    date: "Annual",
    label: "Estate planning review",
    description:
      "Update beneficiary nominations on super accounts (binding vs non-binding). Review will and power of attorney currency especially after major life events.",
    tag: "Review",
  },
];

const TAG_COLORS: Record<Deadline["tag"], string> = {
  Tax: "bg-purple-100 text-purple-700",
  Super: "bg-teal-100 text-teal-700",
  ASIC: "bg-blue-100 text-blue-700",
  ATO: "bg-amber-100 text-amber-700",
  Review: "bg-slate-100 text-slate-600",
  FY: "bg-emerald-100 text-emerald-700",
};

function DeadlineCard({ d }: { d: Deadline }) {
  return (
    <div
      className={`rounded-lg border p-4 ${d.highlight ? "border-emerald-300 bg-emerald-50" : "border-slate-200 bg-white"}`}
    >
      <div className="flex items-start justify-between gap-3 mb-1">
        <span className="font-semibold text-slate-900 text-sm">{d.label}</span>
        <span
          className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${TAG_COLORS[d.tag]}`}
        >
          {d.tag}
        </span>
      </div>
      <p className="text-xs text-slate-500 mb-2 font-medium">{d.date}</p>
      <p className="text-sm text-slate-700">{d.description}</p>
      {d.link && (
        <Link
          href={d.link.href}
          className="mt-2 inline-block text-xs font-medium text-blue-600 hover:underline"
        >
          {d.link.text} →
        </Link>
      )}
    </div>
  );
}

export default async function CalendarPage() {
  await enforcePortalKind("investor");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const profile = user ? await getInvestorProfile(user.id).catch(() => null) : null;

  const isFhb = profile?.isFhb ?? false;
  const isPreRetiree = profile?.isPreRetiree ?? false;
  const isBusinessOwner = profile?.isBusinessOwner ?? false;
  const isCrossBorder = profile?.isCrossBorder ?? false;

  const extraDeadlines: Deadline[] = [
    ...(isFhb
      ? [
          {
            date: "30 Jun 2026",
            label: "FHSS maximum withdrawal request",
            description:
              "If you've saved via FHSS and are ready to buy, request your release amount by 30 June for the FY2025–26 concessional contributions to count. Max $15,000 per year, $50,000 total. ATO releases within 20 business days.",
            tag: "Super" as const,
            link: { text: "FHSS calculator", href: "/tools/fhss-calculator" },
          },
        ]
      : []),
    ...(isPreRetiree
      ? [
          {
            date: "30 Jun 2026",
            label: "Non-concessional contributions — last day",
            description:
              "Non-concessional cap: $120,000 pa (or $360,000 in a 3-year bring-forward). Total super balance must be below $1.9 million on 30 June prior year to contribute. Consider a TTR income stream to supplement working income.",
            tag: "Super" as const,
            link: { text: "Super hub", href: "/super" },
          },
        ]
      : []),
    ...(isBusinessOwner
      ? [
          {
            date: "31 Oct 2026",
            label: "Company tax return deadline",
            description:
              "Company and trust tax returns are due 31 October for self-preparers. Tax agent lodgements may extend to May. Includes STP payroll finalisation by 14 July.",
            tag: "Tax" as const,
          },
        ]
      : []),
    ...(isCrossBorder
      ? [
          {
            date: "31 Oct 2026",
            label: "Foreign income disclosure deadline",
            description:
              "Australian residents must declare worldwide income including overseas rental, dividends, and employment income. Foreign tax credits can offset Australian tax on already-taxed foreign income. DASP applications for departed super can be lodged any time.",
            tag: "ATO" as const,
            link: { text: "Foreign investment hub", href: "/foreign-investment" },
          },
        ]
      : []),
  ];

  const allDeadlines = [...FY26_DEADLINES, ...extraDeadlines];

  return (
    <main className="min-h-screen bg-slate-50 pb-16">
      {/* Header */}
      <section className="bg-white border-b border-slate-200 py-8">
        <div className="container-custom">
          <nav className="text-xs text-slate-500 mb-3 flex gap-1">
            <Link href="/account" className="hover:underline">
              My Account
            </Link>
            <span>/</span>
            <span>Financial Calendar</span>
          </nav>
          <h1 className="text-2xl font-bold text-slate-900 mb-1">
            📅 Financial Calendar {CURRENT_YEAR}
          </h1>
          <p className="text-slate-600 text-sm max-w-xl">
            Key Australian financial dates, tax deadlines, and super contribution windows for
            FY{CURRENT_YEAR}–{CURRENT_YEAR - 1999}.
            {(isFhb || isPreRetiree || isBusinessOwner || isCrossBorder) && (
              <span className="ml-1 text-blue-600">Personalised for your investor profile.</span>
            )}
          </p>
        </div>
      </section>

      <div className="container-custom py-8 grid gap-10 lg:grid-cols-[1fr_280px]">
        {/* Main column */}
        <div className="space-y-8">
          {/* Key FY2025-26 dates */}
          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              Key dates — FY{CURRENT_YEAR - 1}–{CURRENT_YEAR - 2000}
            </h2>
            <div className="space-y-3">
              {allDeadlines.map((d, i) => (
                <DeadlineCard key={i} d={d} />
              ))}
            </div>
          </section>

          {/* Ongoing reviews */}
          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Ongoing reviews</h2>
            <div className="space-y-3">
              {ONGOING.map((d, i) => (
                <DeadlineCard key={i} d={d} />
              ))}
            </div>
          </section>
        </div>

        {/* Sidebar */}
        <aside className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <h3 className="font-semibold text-slate-900 mb-3 text-sm">Key numbers FY25–26</h3>
            <dl className="space-y-2 text-sm">
              {[
                ["Concessional cap", "$30,000"],
                ["Non-concessional cap", "$120,000"],
                ["Bring-forward (3yr)", "$360,000"],
                ["Total super balance limit", "$1.9 million"],
                ["SG rate", "11.5%"],
                ["Division 293 threshold", "$250,000"],
                ["Tax-free threshold", "$18,200"],
                ["LMITO", "Removed (FY23)"],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-2">
                  <dt className="text-slate-600">{label}</dt>
                  <dd className="font-medium text-slate-900">{value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="bg-blue-50 rounded-xl border border-blue-200 p-4">
            <h3 className="font-semibold text-blue-900 text-sm mb-2">Find a tax accountant</h3>
            <p className="text-xs text-blue-700 mb-3">
              A good accountant typically saves 3–5× their fee by catching deductions you&rsquo;d miss.
            </p>
            <Link
              href="/find/tax-accountant"
              className="block w-full text-center bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium py-2 px-3 rounded-lg"
            >
              Browse tax accountants
            </Link>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <h3 className="font-semibold text-slate-900 text-sm mb-2">Useful tools</h3>
            <div className="space-y-2">
              {[
                { label: "Super contributions", href: "/super-contributions-calculator" },
                { label: "CGT calculator", href: "/cgt-calculator" },
                { label: "Annual check-up", href: "/account/annual-check" },
              ].map(({ label, href }) => (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center justify-between text-sm text-blue-600 hover:underline"
                >
                  {label}
                  <span className="text-slate-400">→</span>
                </Link>
              ))}
            </div>
          </div>
        </aside>
      </div>

      {/* Disclaimer */}
      <div className="container-custom">
        <p className="text-xs text-slate-500 border-t border-slate-200 pt-4">
          {GENERAL_ADVICE_WARNING} Deadlines shown are for the 2025–26 financial year. Tax and super
          rules change annually — verify with the ATO or a registered tax agent before acting.
        </p>
      </div>
    </main>
  );
}
