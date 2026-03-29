import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";
import Link from "next/link";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, UPDATED_LABEL } from "@/lib/seo";
import SectionHeading from "@/components/SectionHeading";
import { GENERAL_ADVICE_WARNING, ADVERTISER_DISCLOSURE_SHORT } from "@/lib/compliance";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: `Australian Broker Fee Tracker — Every Fee Change, Tracked (${CURRENT_YEAR}) — Invest.com.au`,
  description: `The only site that tracks every Australian broker fee change. Brokerage, FX, and platform fee changes across 20+ brokers — verified and recorded with dates. ${UPDATED_LABEL}.`,
  openGraph: {
    title: "Australian Broker Fee Tracker — Every Fee Change, Tracked",
    description:
      "Track every brokerage, FX, and platform fee change across 20+ Australian brokers. We verify and record every price movement so you never miss a change.",
    url: `${SITE_URL}/fee-tracker`,
    images: [
      {
        url: `/api/og?title=${encodeURIComponent("Australian Broker Fee Tracker")}&sub=${encodeURIComponent("20+ Brokers · Every Fee Change · Verified")}`,
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: `${SITE_URL}/fee-tracker` },
};

type FeeChangeItem = {
  date: string;
  change: string;
  direction: "decrease" | "increase" | "neutral";
};

type BrokerRow = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  asx_fee_display: string | null;
  fee_changelog: FeeChangeItem[] | null;
};

type TimelineEntry = {
  broker: BrokerRow;
  entry: FeeChangeItem;
};

function DirectionBadge({ direction }: { direction: FeeChangeItem["direction"] }) {
  if (direction === "decrease") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 font-bold rounded-full text-xs">
        <span>↓</span> Fee Down
      </span>
    );
  }
  if (direction === "increase") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 font-bold rounded-full text-xs">
        <span>↑</span> Fee Up
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-500 font-semibold rounded-full text-xs">
      <span>→</span> Change
    </span>
  );
}

function formatMonth(dateStr: string): string {
  try {
    const [year, month] = dateStr.split("-");
    const date = new Date(Number(year), Number(month) - 1, 1);
    return date.toLocaleDateString("en-AU", { year: "numeric", month: "long" });
  } catch {
    return dateStr;
  }
}

const FEE_TRACKER_FAQS = [
  {
    question: "How often do you update fee changes?",
    answer:
      `We monitor broker websites weekly and process community-reported changes within 24 hours. Subscribe to fee alerts at /fee-alerts to get notified when a broker you use changes its fees.`,
  },
  {
    question: "How do I report a fee change?",
    answer:
      "Email us at fees@invest.com.au with the broker name, old fee, new fee, and effective date. We verify all changes before publishing.",
  },
  {
    question: "Do brokers notify customers of fee changes?",
    answer:
      "They're legally required to give notice for certain fee changes under their FSG obligations. In practice, notice periods vary — some brokers give 30 days, others simply update their website. That's why we track them.",
  },
];

export default async function FeeTrackerPage() {
  const supabase = await createClient();
  const { data: brokers } = await supabase
    .from("brokers")
    .select("id, name, slug, logo_url, asx_fee_display, fee_changelog")
    .eq("status", "active")
    .not("fee_changelog", "is", null)
    .order("name");

  const safebrokers: BrokerRow[] = (brokers ?? []) as unknown as BrokerRow[];

  // Build a flat timeline of all fee changes across all brokers, sorted by date descending
  const timeline: TimelineEntry[] = [];
  for (const broker of safebrokers) {
    const changelog = broker.fee_changelog ?? [];
    for (const entry of changelog) {
      timeline.push({ broker, entry });
    }
  }
  timeline.sort((a, b) => {
    const aDate = a.entry.date ?? "";
    const bDate = b.entry.date ?? "";
    return bDate.localeCompare(aDate);
  });

  const totalBrokers = safebrokers.length;
  const totalChanges = timeline.length;
  const lastUpdated =
    timeline.length > 0
      ? formatMonth(timeline[0].entry.date)
      : "—";

  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: SITE_URL },
    { name: "Fee Tracker" },
  ]);

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FEE_TRACKER_FAQS.map((f) => ({
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
      <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white py-10 md:py-14">
        <div className="container-custom">
          <nav className="text-xs text-slate-400 mb-5 flex items-center gap-1.5 flex-wrap">
            <Link href="/" className="hover:text-slate-200">Home</Link>
            <span>/</span>
            <span className="text-slate-300">Fee Tracker</span>
          </nav>
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/20 border border-amber-500/30 rounded-full text-xs font-semibold text-amber-300 mb-4">
              <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse" />
              Live Fee Tracking · {UPDATED_LABEL}
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold leading-[1.1] mb-3 tracking-tight">
              Fee Tracker —{" "}
              <span className="text-amber-400">Every Broker Fee Change in Australia</span>
            </h1>
            <p className="text-sm md:text-base text-slate-300 leading-relaxed">
              We track when brokers raise or lower their fees. Updated when changes occur.
            </p>
          </div>
        </div>
      </section>

      {/* ── Key Callouts ─────────────────────────────────────────────── */}
      <section className="py-8 bg-slate-50">
        <div className="container-custom">
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl border border-amber-200 p-5">
              <p className="text-xs font-bold text-amber-800 uppercase tracking-wide mb-1">Brokers Tracked</p>
              <p className="text-xl font-black text-amber-700">{totalBrokers > 0 ? `${totalBrokers}` : "20+"}
              </p>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">Active Australian brokers with fee tracking across shares, ETFs, US markets, and crypto.</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">Last Updated</p>
              <p className="text-xl font-black text-slate-700">{lastUpdated}</p>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">Most recent fee change recorded in our database. We monitor weekly and publish verified changes promptly.</p>
            </div>
            <div className="bg-white rounded-2xl border border-green-200 p-5">
              <p className="text-xs font-bold text-green-800 uppercase tracking-wide mb-1">Fee Changes Logged</p>
              <p className="text-xl font-black text-green-700">{totalChanges > 0 ? totalChanges : "—"}</p>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">Total fee change events recorded across all tracked brokers since launch.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Timeline ─────────────────────────────────────────────────── */}
      <section className="py-12 md:py-16">
        <div className="container-custom max-w-3xl">
          <SectionHeading
            eyebrow="Fee history"
            title="Fee change timeline"
            sub="All fee changes across all tracked brokers, most recent first. Green = fee decreased (good for you). Red = fee increased."
          />

          {timeline.length > 0 ? (
            <div className="space-y-3">
              {timeline.map(({ broker, entry }, i) => (
                <div
                  key={`${broker.id}-${entry.date}-${i}`}
                  className={`flex items-start gap-4 p-4 rounded-xl border text-sm ${
                    entry.direction === "decrease"
                      ? "bg-green-50 border-green-100"
                      : entry.direction === "increase"
                      ? "bg-red-50 border-red-100"
                      : "bg-slate-50 border-slate-200"
                  }`}
                >
                  {/* Broker logo / initials */}
                  <div className="shrink-0 w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center text-white text-xs font-black overflow-hidden">
                    {broker.logo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={broker.logo_url} alt={broker.name} width={32} height={32} className="w-full h-full object-contain" />
                    ) : (
                      broker.name.charAt(0)
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <Link
                        href={`/compare/${broker.slug}`}
                        className="font-extrabold text-slate-900 hover:text-amber-600 transition-colors text-sm"
                      >
                        {broker.name}
                      </Link>
                      <span className="px-2 py-0.5 bg-slate-200 text-slate-600 rounded-full text-xs font-semibold">
                        {formatMonth(entry.date)}
                      </span>
                    </div>
                    <p className="text-slate-700 leading-snug">{entry.change}</p>
                  </div>

                  {/* Direction badge */}
                  <div className="shrink-0">
                    <DirectionBadge direction={entry.direction} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center bg-slate-50 rounded-2xl border border-slate-200">
              <p className="text-sm font-bold text-slate-600 mb-1">Building our fee change database</p>
              <p className="text-sm text-slate-400 leading-relaxed max-w-sm mx-auto">
                We&apos;re building our fee change database. Check back soon — or email us a fee change tip at{" "}
                <a href="mailto:fees@invest.com.au" className="text-amber-600 hover:underline">
                  fees@invest.com.au
                </a>
                .
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ── Current fees table ───────────────────────────────────────── */}
      {safebrokers.length > 0 && (
        <section className="py-12 md:py-16 bg-slate-50">
          <div className="container-custom">
            <SectionHeading
              eyebrow="Current fees"
              title="Current ASX brokerage fees — all tracked brokers"
              sub="Standard ASX brokerage fee as currently published by each broker. Verify directly with the broker before trading."
            />
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-900 text-left">
                    <th className="px-5 py-3 text-xs font-bold text-slate-300 uppercase tracking-wide">Broker</th>
                    <th className="px-5 py-3 text-xs font-bold text-slate-300 uppercase tracking-wide">ASX Brokerage</th>
                    <th className="px-5 py-3 text-xs font-bold text-slate-300 uppercase tracking-wide">Fee Changes</th>
                    <th className="px-5 py-3 text-xs font-bold text-slate-300 uppercase tracking-wide"></th>
                  </tr>
                </thead>
                <tbody>
                  {safebrokers.map((broker, i) => (
                    <tr key={broker.id} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-lg bg-slate-700 flex items-center justify-center text-white text-xs font-black shrink-0 overflow-hidden">
                            {broker.logo_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={broker.logo_url} alt={broker.name} width={28} height={28} className="w-full h-full object-contain" />
                            ) : (
                              broker.name.charAt(0)
                            )}
                          </div>
                          <span className="font-bold text-slate-900">{broker.name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 font-bold text-slate-700">
                        {broker.asx_fee_display ?? "—"}
                      </td>
                      <td className="px-5 py-3 text-slate-500">
                        {(broker.fee_changelog?.length ?? 0) > 0 ? (
                          <span className="font-semibold text-slate-700">
                            {broker.fee_changelog!.length} recorded
                          </span>
                        ) : (
                          <span className="text-slate-400">None yet</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <Link
                          href={`/compare/${broker.slug}`}
                          className="text-xs text-amber-600 hover:text-amber-700 font-semibold"
                        >
                          Full review →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* ── How we track fee changes ──────────────────────────────────── */}
      <section className="py-12 md:py-16">
        <div className="container-custom max-w-3xl">
          <SectionHeading eyebrow="Editorial" title="How We Track Fee Changes" />
          <div className="space-y-5 text-sm text-slate-600 leading-relaxed">
            <p>
              Australian broker fees change more often than most investors realise — and changes are rarely
              announced loudly. A broker might update their ASX brokerage from $9.50 to $11.00, bury it in a
              Product Disclosure Statement update, and move on. Unless you&apos;re monitoring the change, you&apos;ll
              miss it and start paying more without knowing.
            </p>
            <p>
              We monitor broker websites and official announcements weekly. When we detect a change, we verify
              it against the broker&apos;s own published pricing or PDS before recording it. We never record a fee
              change we haven&apos;t directly verified — this keeps the database clean and trustworthy.
            </p>
            <p>
              We also accept community-reported fee changes via email at{" "}
              <a href="mailto:fees@invest.com.au" className="text-amber-600 hover:underline font-medium">
                fees@invest.com.au
              </a>
              . If you notice a broker has changed their fees — up or down — send us the broker name, the old
              fee, the new fee, and the effective date. We&apos;ll verify and publish within 24 hours if confirmed.
            </p>
            <p>
              This creates a permanent historical record — useful not just for knowing what fees are today,
              but for understanding how a broker&apos;s pricing has evolved over time. A broker that has raised
              fees repeatedly tells you something about their direction. One that consistently lowers fees
              tells you something else.
            </p>
          </div>
        </div>
      </section>

      {/* ── FAQs ─────────────────────────────────────────────────────── */}
      <section className="py-12 md:py-16 bg-slate-50">
        <div className="container-custom max-w-3xl">
          <SectionHeading eyebrow="Questions" title="Frequently asked questions" />
          <div className="space-y-4">
            {FEE_TRACKER_FAQS.map((faq) => (
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
            <h2 className="text-lg font-extrabold text-white mb-1">Get Fee Change Alerts</h2>
            <p className="text-slate-400 text-sm">Sign up to be notified when any tracked broker changes their fees — so you can act before your trading costs change.</p>
          </div>
          <div className="flex gap-3 shrink-0 flex-wrap">
            <Link
              href="/fee-alerts"
              className="px-5 py-3 bg-amber-500 hover:bg-amber-400 text-white font-bold rounded-xl text-sm transition-colors whitespace-nowrap"
            >
              Get Fee Alerts
            </Link>
            <Link
              href="/compare/brokers"
              className="px-5 py-3 border border-slate-600 hover:border-slate-400 text-slate-300 font-semibold rounded-xl text-sm transition-colors whitespace-nowrap"
            >
              Compare All Brokers
            </Link>
          </div>
        </div>
      </section>

      {/* ── Compliance footer ────────────────────────────────────────── */}
      <section className="py-6 bg-slate-50 border-t border-slate-200">
        <div className="container-custom">
          <div className="space-y-2">
            <p className="text-xs text-slate-500 leading-relaxed font-semibold">
              All fee changes are verified against official broker pricing pages before being recorded.
            </p>
            <p className="text-xs text-slate-400 leading-relaxed">
              Fee data is checked weekly. There may be a lag between a broker publishing a fee change and our
              system recording it. Always verify current fees directly with the broker before executing trades.{" "}
              {ADVERTISER_DISCLOSURE_SHORT}
            </p>
            <p className="text-xs text-slate-400 leading-relaxed">{GENERAL_ADVICE_WARNING}</p>
          </div>
        </div>
      </section>
    </div>
  );
}
