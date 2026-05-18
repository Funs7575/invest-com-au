import type { Metadata } from "next";
import Link from "next/link";
import { absoluteUrl, breadcrumbJsonLd, CURRENT_YEAR } from "@/lib/seo";
import { calculatorJsonLd, faqJsonLd } from "@/lib/schema-markup";
import ComplianceFooter from "@/components/ComplianceFooter";
import {
  FINANCIAL_EVENTS,
  FINANCIAL_THRESHOLDS,
  CATEGORY_LABELS,
  CATEGORY_COLORS,
  FY,
  type EventCategory,
} from "@/lib/financial-calendar-data";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `Australian Financial Calendar ${CURRENT_YEAR} — Key Tax & Super Deadlines`,
  description:
    "Key Australian financial dates for FY2025–26: tax return deadlines, BAS lodgement, super contribution cut-offs, SMSF annual return, FHSS, CGT harvest window, and more.",
  alternates: { canonical: "/tools/financial-calendar" },
  openGraph: {
    title: `Australian Financial Calendar ${CURRENT_YEAR}`,
    description:
      "Never miss a tax or super deadline. Key ATO dates for individuals, investors, SMSFs, and small business.",
    url: absoluteUrl("/tools/financial-calendar"),
    images: [
      {
        url: `/api/og?title=Australian+Financial+Calendar&subtitle=${encodeURIComponent("Tax & Super Deadlines " + CURRENT_YEAR)}&type=default`,
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: { card: "summary_large_image" as const },
};

const breadcrumbLd = breadcrumbJsonLd([
  { name: "Home", url: absoluteUrl("/") },
  { name: "Tools", url: absoluteUrl("/tools") },
  { name: "Financial Calendar", url: absoluteUrl("/tools/financial-calendar") },
]);

const calcLd = calculatorJsonLd({
  name: "Australian Financial Calendar",
  description:
    "Key tax, super, BAS, SMSF, FHSS and CGT deadlines for Australian individuals, investors, and businesses.",
  path: "/tools/financial-calendar",
});

const FAQ_ITEMS = [
  {
    q: "When does the Australian financial year end?",
    a: "The Australian financial year runs from 1 July to 30 June. Contributions, deductions, and income are assessed for the period ending 30 June.",
  },
  {
    q: "When is the individual tax return due?",
    a: "If you lodge your own return, the deadline is 31 October following the end of the financial year. Using a registered tax agent extends this to May of the following year — but you must be on the agent's books by 31 October.",
  },
  {
    q: "What is the concessional super contributions cap?",
    a: "For FY2025–26 the cap is $30,000 per year. This includes employer super guarantee, salary sacrifice, and personal deductible contributions. Unused cap can be carried forward up to 5 years if your total super balance is under $500,000.",
  },
  {
    q: "What is the super guarantee rate for FY2025–26?",
    a: "The super guarantee (SG) rate is 11.5% of ordinary time earnings. Employers must pay quarterly, with the Q4 payment (April–June) due 28 July.",
  },
  {
    q: "When do I need to lodge my BAS?",
    a: "Quarterly reporters must lodge within 28 days of each quarter end: 28 October (Q1 July–Sept), 28 February (Q2 Oct–Dec), 28 April (Q3 Jan–Mar), and 28 July (Q4 Apr–Jun). Monthly reporters have a 21-day rolling deadline.",
  },
  {
    q: "What is the FHSS scheme contribution deadline?",
    a: "Voluntary super contributions must be made before 30 June to count toward the FHSS cap for that financial year. The per-year cap is $15,000, and you can release a lifetime total of $50,000. Allow 20+ business days for the ATO to process a release request.",
  },
];

const faqLd = faqJsonLd(FAQ_ITEMS.map((f) => ({ q: f.q, a: f.a })));

const URGENCY_STYLES: Record<string, string> = {
  critical: "bg-red-100 text-red-700 border-red-200",
  high: "bg-amber-100 text-amber-700 border-amber-200",
  medium: "bg-blue-100 text-blue-700 border-blue-200",
};

const URGENCY_LABELS: Record<string, string> = {
  critical: "Critical",
  high: "High priority",
  medium: "Medium",
};

const CATEGORY_ORDER: EventCategory[] = [
  "tax",
  "super",
  "smsf",
  "investment",
  "fhss",
  "business",
];

export default function FinancialCalendarPage() {
  const grouped = CATEGORY_ORDER.reduce<Record<EventCategory, typeof FINANCIAL_EVENTS>>(
    (acc, cat) => {
      acc[cat] = FINANCIAL_EVENTS.filter((e) => e.category === cat);
      return acc;
    },
    {} as Record<EventCategory, typeof FINANCIAL_EVENTS>,
  );

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(calcLd) }}
      />
      {faqLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
        />
      )}

      {/* Hero */}
      <section className="bg-gradient-to-r from-violet-600 to-violet-800 text-white py-10 md:py-16">
        <div className="container-custom">
          <nav className="text-xs text-violet-200 mb-3">
            <Link href="/" className="hover:text-white">Home</Link>
            <span className="mx-1.5">/</span>
            <Link href="/tools" className="hover:text-white">Tools</Link>
            <span className="mx-1.5">/</span>
            <span className="text-white">Financial Calendar</span>
          </nav>
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl md:text-4xl font-extrabold mb-2">
                Australian Financial Calendar
              </h1>
              <p className="text-sm md:text-lg text-violet-100 max-w-2xl">
                Key tax, super, and business deadlines for {FY}. Bookmark this page so you never
                miss an ATO cut-off.
              </p>
            </div>
            <span className="text-xs font-semibold bg-violet-500/50 border border-violet-400 text-white px-3 py-1 rounded-full self-start">
              {FY}
            </span>
          </div>
        </div>
      </section>

      <div className="container-custom py-8 md:py-12 space-y-12">

        {/* Events by category */}
        {CATEGORY_ORDER.map((cat) => {
          const events = grouped[cat];
          if (!events || events.length === 0) return null;
          return (
            <section key={cat} aria-labelledby={`cat-${cat}`}>
              <h2
                id={`cat-${cat}`}
                className="text-lg md:text-xl font-extrabold text-slate-900 mb-4 flex items-center gap-2"
              >
                <span
                  className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${CATEGORY_COLORS[cat]}`}
                >
                  {CATEGORY_LABELS[cat]}
                </span>
              </h2>

              <div className="space-y-3">
                {events.map((event) => (
                  <div
                    key={event.id}
                    className="border border-slate-200 rounded-xl bg-white p-4 md:p-5 flex flex-col sm:flex-row sm:items-start gap-4"
                  >
                    {/* Date pill */}
                    <div className="shrink-0 text-center sm:text-left min-w-[100px]">
                      <div className="text-sm font-bold text-slate-900">{event.date}</div>
                      <div className="text-xs text-slate-500">{event.isoDate}</div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h3 className="text-sm md:text-base font-semibold text-slate-900">
                          {event.title}
                        </h3>
                        <span
                          className={`text-[0.65rem] font-semibold px-2 py-0.5 rounded-full border ${URGENCY_STYLES[event.urgency]}`}
                        >
                          {URGENCY_LABELS[event.urgency]}
                        </span>
                      </div>
                      <p className="text-xs md:text-sm text-slate-600 mb-2">{event.description}</p>
                      {event.notes && (
                        <p className="text-xs text-slate-500 italic border-l-2 border-slate-200 pl-2">
                          {event.notes}
                        </p>
                      )}
                      {event.href && event.hrefLabel && (
                        <Link
                          href={event.href}
                          className="inline-flex items-center gap-1 text-xs font-medium text-violet-700 hover:text-violet-900 mt-2"
                        >
                          {event.hrefLabel} →
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          );
        })}

        {/* Key thresholds */}
        <section aria-labelledby="thresholds-heading">
          <h2 id="thresholds-heading" className="text-lg md:text-2xl font-extrabold text-slate-900 mb-4">
            Key {FY} Thresholds &amp; Caps
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FINANCIAL_THRESHOLDS.map((t) => (
              <div
                key={t.label}
                className="border border-slate-200 rounded-xl bg-white p-4"
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <span className="text-xs font-medium text-slate-600">{t.label}</span>
                  <span
                    className={`text-[0.65rem] font-semibold px-2 py-0.5 rounded-full border shrink-0 ${CATEGORY_COLORS[t.category]}`}
                  >
                    {CATEGORY_LABELS[t.category]}
                  </span>
                </div>
                <div className="text-xl font-extrabold text-slate-900 mb-1">{t.value}</div>
                <p className="text-xs text-slate-500">{t.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section aria-labelledby="faq-heading">
          <h2 id="faq-heading" className="text-lg md:text-2xl font-extrabold text-slate-900 mb-4">
            Frequently Asked Questions
          </h2>
          <div className="space-y-4">
            {FAQ_ITEMS.map((item) => (
              <details key={item.q} className="border border-slate-200 rounded-xl bg-white">
                <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-slate-900 list-none flex justify-between items-center">
                  {item.q}
                  <span className="text-slate-400 text-lg leading-none ml-2">＋</span>
                </summary>
                <div className="px-4 pb-4 text-sm text-slate-600">{item.a}</div>
              </details>
            ))}
          </div>
        </section>

        {/* Related tools */}
        <section aria-labelledby="related-heading">
          <h2 id="related-heading" className="text-base font-bold text-slate-900 mb-3">Related Tools</h2>
          <div className="flex flex-wrap gap-3">
            {[
              { href: "/tools/fhss-calculator", label: "FHSS Calculator" },
              { href: "/cgt-calculator", label: "CGT Calculator" },
              { href: "/tools/smsf-checker", label: "SMSF Eligibility Checker" },
              { href: "/super", label: "Super Guide" },
              { href: "/tax", label: "Tax Return Guide" },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </section>

        <ComplianceFooter variant="calculator" />
      </div>
    </>
  );
}
