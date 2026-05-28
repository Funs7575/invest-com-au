import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { breadcrumbJsonLd, absoluteUrl, SITE_URL } from "@/lib/seo";

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

interface MarketEvent {
  id: number;
  event_date: string;
  event_type: string;
  title: string;
  description: string;
  source_url: string;
  is_all_day: boolean;
  start_time: string | null;
  timezone: string;
}

const TYPE_LABEL: Record<string, string> = {
  rba: "RBA",
  asx: "ASX",
  earnings: "Earnings",
  economic: "Economic",
  dividend: "Dividend",
  ipo: "IPO",
  other: "Other",
};

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

function groupByMonth(events: MarketEvent[]): Map<string, MarketEvent[]> {
  const map = new Map<string, MarketEvent[]>();
  for (const ev of events) {
    const key = ev.event_date.slice(0, 7); // YYYY-MM
    const arr = map.get(key) ?? [];
    arr.push(ev);
    map.set(key, arr);
  }
  return map;
}

function monthLabel(yyyyMM: string): string {
  const [y, m] = yyyyMM.split("-");
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleDateString("en-AU", { month: "long", year: "numeric" });
}

export default async function CalendarPage() {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);
  const yearOutDate = new Date();
  yearOutDate.setFullYear(yearOutDate.getFullYear() + 1);
  const yearOut = yearOutDate.toISOString().slice(0, 10);

  const { data } = await supabase
    .from("market_events")
    .select("id, event_date, event_type, title, description, source_url, is_all_day, start_time, timezone")
    .eq("is_published", true)
    .gte("event_date", today)
    .lte("event_date", yearOut)
    .order("event_date", { ascending: true })
    .limit(200);

  const events = (data ?? []) as MarketEvent[];
  const grouped = groupByMonth(events);

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
          {Object.entries(TYPE_LABEL).map(([type, label]) => (
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
        <div className="text-center py-16 text-slate-400">
          <p className="text-4xl mb-3" aria-hidden>📅</p>
          <p className="font-semibold text-slate-600">No upcoming events</p>
          <p className="text-sm mt-1">Check back soon — we update the calendar regularly.</p>
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
                          {TYPE_LABEL[ev.event_type] ?? "Other"}
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
        </p>
      </footer>
    </div>
  );
}
