import type { Metadata } from "next";
import Link from "next/link";
import { breadcrumbJsonLd, absoluteUrl, SITE_URL } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import {
  getUpcomingMarketEvents,
  groupEventsByMonth,
  MARKET_EVENT_TYPE_LABELS,
} from "@/lib/market-events";

export const revalidate = 3600; // 1 h ISR

export const metadata: Metadata = {
  title: "Australian Market Events Calendar 2026",
  description:
    "Upcoming RBA cash rate decisions, ASX rebalances, economic data releases, and key investing dates for Australian investors.",
  alternates: {
    types: {
      "text/calendar": `${SITE_URL}/api/market-events/ical`,
    },
  },
};

const CALENDAR_FAQS = [
  {
    q: "What events does the Australian Market Events Calendar track?",
    a: "The calendar tracks five categories of events relevant to Australian investors: (1) RBA cash rate decisions — all scheduled Reserve Bank of Australia board meetings with decision dates and times; (2) ASX events — S&P/ASX index rebalances, quarterly futures expiry dates, and ASX trading halts for major corporates; (3) Economic releases — ABS data releases (CPI, employment, GDP, retail sales), federal budget dates, and major government policy announcements; (4) Dividend events — ex-dividend and payment dates for major ASX-listed companies; and (5) IPOs — scheduled ASX listing dates for upcoming IPOs.",
  },
  {
    q: "How can I add the calendar to my own calendar app?",
    a: "Click the 'Download .ics' link at the bottom of the page to download a standard iCalendar file. This can be imported into Apple Calendar, Google Calendar, Microsoft Outlook, or any other calendar app that supports the .ics format. The calendar is also available as a subscribable URL — in Google Calendar, choose 'From URL' and paste the /api/market-events/ical link to get automatic updates as new events are added.",
  },
  {
    q: "How accurate are the event dates shown?",
    a: "Dates for scheduled events (RBA meetings, ABS release schedule, ASX rebalances) are sourced directly from the relevant authority's published annual schedule and are accurate at the time of publication. However, dates can change — the ABS occasionally adjusts release times, the RBA can hold unscheduled meetings, and ASX trading halts are announced with short notice. Always verify timing directly with the RBA, ABS, or ASX before making time-sensitive trading decisions. The footer of this page links to each authority's website.",
  },
  {
    q: "How often is the calendar updated?",
    a: "The calendar page refreshes via ISR every hour. New events are added as they are announced — typically within 24 hours of an official release date confirmation. If you notice a missing or incorrect event, email hello@invest.com.au and we will verify and add it within one business day.",
  },
];

const calendarFaqLd = faqJsonLd(CALENDAR_FAQS);

const TYPE_COLOR: Record<string, string> = {
  rba: "bg-violet-100 text-violet-700 border-violet-200",
  asx: "bg-blue-100 text-blue-700 border-blue-200",
  earnings: "bg-amber-100 text-amber-700 border-amber-200",
  economic: "bg-emerald-100 text-emerald-700 border-emerald-200",
  dividend: "bg-teal-100 text-teal-700 border-teal-200",
  ipo: "bg-orange-100 text-orange-700 border-orange-200",
  other: "bg-slate-100 text-slate-600 border-slate-200",
};

function formatDate(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-AU", {
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function monthLabel(yyyyMM: string): string {
  const [y, m] = yyyyMM.split("-");
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleDateString("en-AU", { month: "long", year: "numeric" });
}

export default async function CalendarPage() {
  const events = await getUpcomingMarketEvents();
  const grouped = groupEventsByMonth(events);

  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Market Events Calendar" },
  ]);

  const icalUrl = `${SITE_URL}/api/market-events/ical`;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      {calendarFaqLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(calendarFaqLd) }}
        />
      )}

      <header className="mb-8">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 mb-2">
              Market Events Calendar
            </h1>
            <p className="text-slate-600 max-w-2xl">
              Upcoming RBA decisions, ASX rebalances, and key economic dates for Australian investors.
              Subscribe to never miss a market-moving event.
            </p>
          </div>
          <a
            href={`webcal://${icalUrl.replace(/^https?:\/\//, "")}`}
            className="shrink-0 flex items-center gap-2 bg-slate-900 hover:bg-slate-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
            title="Subscribe in your calendar app"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Subscribe (.ics)
          </a>
        </div>

        {/* Type legend */}
        <div className="flex flex-wrap gap-2 mt-4">
          {Object.entries(MARKET_EVENT_TYPE_LABELS).map(([type, label]) => (
            <span
              key={type}
              className={`text-xs font-medium px-2 py-0.5 rounded-full border ${TYPE_COLOR[type] ?? ""}`}
            >
              {label}
            </span>
          ))}
        </div>
      </header>

      {events.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <p className="text-4xl mb-3" aria-hidden>📅</p>
          <p className="font-semibold text-slate-700 mb-1">No upcoming events</p>
          <p className="text-sm text-slate-500 mb-5">Check back soon — we add new events regularly.</p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/advisors" className="text-sm font-semibold text-teal-700 hover:underline">Find an advisor →</Link>
            <Link href="/office-hours" className="text-sm font-semibold text-teal-700 hover:underline">Attend office hours →</Link>
            <Link href="/community" className="text-sm font-semibold text-teal-700 hover:underline">Join the community →</Link>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {[...grouped.entries()].map(([month, monthEvents]) => (
            <section key={month}>
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-widest mb-3">
                {monthLabel(month)}
              </h2>
              <div className="space-y-2">
                {monthEvents.map((ev) => (
                  <article
                    key={ev.id}
                    className="bg-white border border-slate-200 rounded-xl p-4 flex items-start gap-4"
                  >
                    <div className="shrink-0 text-center w-12">
                      <p className="text-2xl font-extrabold text-slate-900 leading-none">
                        {new Date(ev.event_date + "T00:00:00").getDate()}
                      </p>
                      <p className="text-xs text-slate-400 uppercase tracking-wide">
                        {new Date(ev.event_date + "T00:00:00").toLocaleDateString("en-AU", { month: "short" })}
                      </p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span
                          className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
                            TYPE_COLOR[ev.event_type] ?? TYPE_COLOR.other
                          }`}
                        >
                          {MARKET_EVENT_TYPE_LABELS[ev.event_type] ?? "Other"}
                        </span>
                        <span className="text-xs text-slate-400">
                          {formatDate(ev.event_date)}
                          {ev.start_time && !ev.is_all_day && (
                            <> · {ev.start_time.slice(0, 5)} {ev.timezone.replace("Australia/", "")}</>
                          )}
                        </span>
                      </div>
                      <h3 className="text-sm font-semibold text-slate-900">{ev.title}</h3>
                      {ev.description && (
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{ev.description}</p>
                      )}
                      {ev.source_url && (
                        <Link
                          href={ev.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-violet-600 hover:underline mt-1 inline-block"
                        >
                          Source →
                        </Link>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <section className="mt-10">
        <h2 className="text-lg font-extrabold text-slate-900 mb-5">Frequently asked questions</h2>
        <div className="space-y-3">
          {CALENDAR_FAQS.map((faq) => (
            <details key={faq.q} className="group rounded-xl border border-slate-200 bg-slate-50">
              <summary className="flex cursor-pointer items-center justify-between gap-4 px-5 py-4 font-semibold text-slate-900 list-none">
                {faq.q}
                <span className="shrink-0 text-slate-400 group-open:rotate-180 transition-transform" aria-hidden="true">▾</span>
              </summary>
              <p className="px-5 pb-5 text-sm text-slate-600 leading-relaxed">{faq.a}</p>
            </details>
          ))}
        </div>
      </section>

      <footer className="mt-8 pt-4 border-t border-slate-200">
        <p className="text-xs text-slate-400">
          Dates are approximate for published economic releases. Always verify timing directly with
          the relevant authority (
          <a href="https://www.rba.gov.au" className="hover:underline" target="_blank" rel="noopener noreferrer">RBA</a>,{" "}
          <a href="https://www.abs.gov.au" className="hover:underline" target="_blank" rel="noopener noreferrer">ABS</a>,{" "}
          <a href="https://www.asx.com.au" className="hover:underline" target="_blank" rel="noopener noreferrer">ASX</a>
          ).
          <span className="ml-2">
            <a href={icalUrl} className="text-violet-600 hover:underline">
              Download .ics →
            </a>
          </span>
          <span className="ml-2">
            <Link href="/today" className="text-violet-600 hover:underline">
              Today&apos;s data →
            </Link>
          </span>
        </p>
      </footer>
    </div>
  );
}
