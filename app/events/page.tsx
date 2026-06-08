import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { absoluteUrl, breadcrumbJsonLd, SITE_NAME } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Upcoming Financial Events & Webinars | Invest.com.au",
  description:
    "Register for upcoming webinars, seminars and workshops by Australia's top financial advisors and firms.",
  alternates: { canonical: "/events" },
};

const EVENT_TYPE_COLORS: Record<string, string> = {
  webinar: "bg-blue-100 text-blue-700",
  seminar: "bg-purple-100 text-purple-700",
  workshop: "bg-teal-100 text-teal-700",
  conference: "bg-indigo-100 text-indigo-700",
  networking: "bg-orange-100 text-orange-700",
  other: "bg-slate-100 text-slate-600",
};

function formatEventDate(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleString("en-AU", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZoneName: "short",
  });
}

interface Professional {
  id: number;
  name: string;
  firm_name: string | null;
  slug: string;
  profile_image_url: string | null;
  location_state: string | null;
}

interface AdvisorEvent {
  id: number;
  title: string;
  description: string | null;
  event_type: string;
  starts_at: string;
  ends_at: string | null;
  timezone: string | null;
  location: string | null;
  meeting_url: string | null;
  max_attendees: number | null;
  price_cents: number;
  status: string;
  rsvp_count: number;
  professional: Professional | null;
}

const EVENTS_FAQS = [
  {
    q: "What types of events and webinars are listed?",
    a: "The events hub lists upcoming financial education events hosted by verified Australian financial advisors and firms: (1) Webinars — online sessions covering investing strategy, retirement planning, tax, SMSF, and property; (2) Seminars — in-person presentations, often at adviser offices or community venues; (3) Workshops — interactive small-group sessions with hands-on exercises; (4) Conferences — multi-speaker events covering financial planning and wealth management; and (5) Networking events — professional and investor networking sessions. All events are submitted by AFSL-holding advisers or advice firms and are verified before listing.",
  },
  {
    q: "Are events on this page free to attend?",
    a: "Some events are free; others are paid. The price is shown on each event card — free events are labelled 'Free'. For paid events, the fee is set by the hosting adviser or firm, not by Invest.com.au. Invest.com.au does not process payments — you register and pay directly with the event host via the registration link. Invest.com.au may receive a referral fee from adviser registrations generated through this page.",
  },
  {
    q: "How do I register for an event?",
    a: "Click the event card to go to the event detail page, then click the registration button. Registration takes you directly to the adviser's or event host's own booking page (Eventbrite, Zoom, their website, or similar). Invest.com.au does not manage registrations, waitlists, or cancellations — contact the event host directly for those. Check the event's terms for cancellation and refund policies.",
  },
  {
    q: "I'm a financial adviser — how do I list my events?",
    a: "Verified advisers with an active profile on Invest.com.au can create and manage events from the Advisor Portal (/advisor-portal). If you don't have a profile yet, apply at /advisor-apply. Events must comply with ASIC's advice advertising guidelines and Invest.com.au's content policies — events that constitute a financial product promotion require compliant disclosure. We review all events before they go live; most are approved within one business day.",
  },
];

const eventsFaqLd = faqJsonLd(EVENTS_FAQS);

export default async function EventsPage() {
  const supabase = await createClient();

  const { data: events } = await supabase
    .from("advisor_events")
    .select(
      "*, professional:professionals(id, name, firm_name, slug, profile_image_url, location_state)"
    )
    .eq("status", "published")
    .gte("starts_at", new Date().toISOString())
    .order("starts_at", { ascending: true })
    .limit(20);

  const typedEvents = (events ?? []) as unknown as AdvisorEvent[];

  const breadcrumbs = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Events & Webinars" },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }}
      />
      {eventsFaqLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(eventsFaqLd) }}
        />
      )}

      <div className="py-8 md:py-12">
        <div className="max-w-5xl mx-auto px-4">
          {/* Breadcrumb */}
          <div className="text-sm text-slate-500 mb-6">
            <Link href="/" className="hover:text-brand">Home</Link>
            <span className="mx-2">/</span>
            <span className="text-slate-900 font-medium">Events &amp; Webinars</span>
          </div>

          {/* Hero */}
          <div className="mb-8">
            <h1 className="text-2xl md:text-4xl font-extrabold text-slate-900 mb-3">
              Upcoming Financial Events &amp; Webinars
            </h1>
            <p className="text-slate-600 text-base md:text-lg max-w-2xl">
              Register for upcoming webinars, seminars and workshops by {SITE_NAME}&apos;s top
              financial advisors and firms.
            </p>
          </div>

          {typedEvents.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
              <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="text-lg font-bold text-slate-900 mb-2">No upcoming events</h2>
              <p className="text-sm text-slate-500 mb-6">
                Check back soon — advisors and firms regularly add new webinars and workshops.
              </p>
              <Link
                href="/find-advisor"
                className="inline-block px-6 py-2.5 bg-slate-900 text-white font-semibold rounded-lg text-sm hover:bg-slate-800 transition-colors"
              >
                Find a Financial Advisor
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {typedEvents.map((ev) => {
                const typeColor =
                  EVENT_TYPE_COLORS[ev.event_type] ?? "bg-slate-100 text-slate-600";

                return (
                  <div
                    key={ev.id}
                    className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col gap-3 hover:border-slate-300 hover:shadow-sm transition-all"
                  >
                    {/* Type badge + date */}
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[0.6rem] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${typeColor}`}
                      >
                        {ev.event_type}
                      </span>
                      <span className="text-[0.65rem] text-slate-500">
                        {formatEventDate(ev.starts_at)}
                      </span>
                    </div>

                    {/* Title */}
                    <h2 className="text-base font-bold text-slate-900 leading-snug">
                      {ev.title}
                    </h2>

                    {/* Description */}
                    {ev.description && (
                      <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                        {ev.description}
                      </p>
                    )}

                    {/* Advisor */}
                    {ev.professional && (
                      <Link
                        href={`/advisor/${ev.professional.slug}`}
                        className="flex items-center gap-2 text-xs text-slate-600 hover:text-violet-600 transition-colors w-fit"
                      >
                        <span className="font-semibold">{ev.professional.name}</span>
                        {ev.professional.firm_name && (
                          <span className="text-slate-400">·</span>
                        )}
                        {ev.professional.firm_name && (
                          <span className="text-slate-500">{ev.professional.firm_name}</span>
                        )}
                      </Link>
                    )}

                    {/* Meta row */}
                    <div className="flex items-center gap-3 text-[0.65rem] text-slate-500">
                      <span>{ev.location ?? "Online"}</span>
                      {ev.max_attendees != null && (
                        <>
                          <span className="text-slate-300">·</span>
                          <span>{ev.rsvp_count} / {ev.max_attendees} registered</span>
                        </>
                      )}
                      <span className="text-slate-300">·</span>
                      <span>{ev.price_cents === 0 ? "Free" : `$${(ev.price_cents / 100).toFixed(2)}`}</span>
                    </div>

                    {/* CTA */}
                    <div className="mt-auto pt-1">
                      <Link
                        href={`/events/${ev.id}`}
                        className="inline-block w-full text-center px-4 py-2 bg-slate-900 text-white text-sm font-semibold rounded-lg hover:bg-slate-800 transition-colors"
                      >
                        Register
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* CTA to advisor directory */}
          <div className="mt-10 bg-slate-50 border border-slate-200 rounded-xl p-6 text-center">
            <h2 className="text-base font-bold text-slate-900 mb-1">Are you a financial advisor?</h2>
            <p className="text-sm text-slate-500 mb-4">
              Create your own events and webinars to engage with potential clients on {SITE_NAME}.
            </p>
            <Link
              href="/advisor-portal"
              className="inline-block px-6 py-2.5 bg-violet-600 text-white font-semibold rounded-lg text-sm hover:bg-violet-700 transition-colors"
            >
              Manage Events in Advisor Portal
            </Link>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-200 bg-white">
        <div className="container-custom max-w-4xl py-8 md:py-10">
          <h2 className="text-lg font-extrabold text-slate-900 mb-5">Frequently asked questions</h2>
          <div className="space-y-3">
            {EVENTS_FAQS.map((faq) => (
              <details key={faq.q} className="group rounded-xl border border-slate-200 bg-slate-50">
                <summary className="flex cursor-pointer items-center justify-between gap-4 px-5 py-4 font-semibold text-slate-900 list-none">
                  {faq.q}
                  <span className="shrink-0 text-slate-400 group-open:rotate-180 transition-transform">▾</span>
                </summary>
                <p className="px-5 pb-5 text-sm text-slate-600 leading-relaxed">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
