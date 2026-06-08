import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { breadcrumbJsonLd, absoluteUrl, SITE_URL, SITE_NAME } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";

export const revalidate = 300; // 5 min ISR

export const metadata: Metadata = {
  title: "Ask an Advisor — Live Q&A Office Hours",
  description:
    "Upcoming and past live Q&A sessions with Australian financial advisors. Submit questions, upvote what matters, and read published transcripts.",
  alternates: { canonical: `${SITE_URL}/office-hours` },
};

interface Session {
  id: number;
  title: string;
  description: string | null;
  scheduled_at: string;
  ends_at: string | null;
  status: string;
  rsvp_count: number;
  professionals: { name: string; slug: string; type: string; headshot_url: string | null } | null;
}

const OFFICE_HOURS_FAQS = [
  {
    q: "What is Advisor Office Hours?",
    a: "Office Hours is a live Q&A format where verified Australian financial advisers host public sessions — typically 30–60 minutes — during which the audience can submit questions, upvote what matters most, and read the adviser's answers in real time. Sessions are announced in advance and free to attend. Published transcripts remain accessible after the session ends. It is a way to hear general-information responses from real licensed professionals at scale, without a one-on-one consultation.",
  },
  {
    q: "Are answers in Office Hours sessions personal financial advice?",
    a: "No. Answers given during Office Hours sessions are general information — the adviser answers in the context of a broad audience and cannot take into account your individual financial situation, tax position, or objectives. Do not treat any Office Hours answer as advice tailored to your situation. If an adviser's response resonates, book a private consultation with them directly from their profile to discuss your specific circumstances. Their AFSL number and registration details are shown on their profile page.",
  },
  {
    q: "How do I submit a question for an upcoming session?",
    a: "Click on an upcoming session to open its page. You can submit your question in the question box and upvote questions already submitted by other attendees. The adviser typically answers the highest-voted questions during the session. You don't need to be logged in to upvote, but you do need a free Invest.com.au account to submit a new question. Questions are reviewed to ensure they are general in nature before the session goes live.",
  },
  {
    q: "I'm an adviser — how do I host an Office Hours session?",
    a: "Verified advisers with an approved profile on Invest.com.au can schedule Office Hours sessions from the Advisor Portal (/advisor-portal). Sessions must comply with ASIC's guidance on adviser-hosted educational content — answers must be clearly framed as general information, not personal advice. If you don't have a profile yet, apply at /advisor-apply. We review all session applications before publishing them to the calendar.",
  },
];

const officeHoursFaqLd = faqJsonLd(OFFICE_HOURS_FAQS);

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  upcoming:   { label: "Upcoming",   cls: "bg-indigo-100 text-indigo-700 border-indigo-200" },
  live:       { label: "Live now",   cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  ended:      { label: "Ended",      cls: "bg-slate-100 text-slate-600 border-slate-200" },
  transcript: { label: "Transcript", cls: "bg-blue-100 text-blue-700 border-blue-200" },
};

function fmtScheduled(iso: string): string {
  return new Date(iso).toLocaleString("en-AU", {
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Australia/Sydney",
    timeZoneName: "short",
  });
}

export default async function OfficeHoursPage() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("advisor_office_hours")
    .select("id, title, description, scheduled_at, ends_at, status, rsvp_count, professionals(name, slug, type, headshot_url)")
    .eq("is_published", true)
    .in("status", ["upcoming", "live", "transcript"])
    .order("scheduled_at", { ascending: false })
    .limit(50);

  const sessions = ((data ?? []) as unknown) as Session[];
  const live = sessions.filter((s) => s.status === "live");
  const upcoming = sessions.filter((s) => s.status === "upcoming");
  const transcripts = sessions.filter((s) => s.status === "transcript");

  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Advisor Office Hours" },
  ]);

  const eventJsonLd = [...live, ...upcoming].map((s) => ({
    "@context": "https://schema.org",
    "@type": "Event",
    name: s.title,
    description: s.description ?? undefined,
    startDate: s.scheduled_at,
    endDate: s.ends_at ?? undefined,
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OnlineEventAttendanceMode",
    location: { "@type": "VirtualLocation", url: `${SITE_URL}/office-hours` },
    organizer: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
    url: `${SITE_URL}/office-hours`,
  }));

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      {eventJsonLd.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(eventJsonLd) }}
        />
      )}
      {officeHoursFaqLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(officeHoursFaqLd) }}
        />
      )}

      <header className="mb-8">
        <h1 className="text-3xl font-extrabold text-slate-900 mb-2">Advisor Office Hours</h1>
        <p className="text-slate-600 max-w-2xl">
          Live Q&amp;A sessions with verified Australian financial advisors. Submit questions
          before or during a session, upvote what matters most, and read published transcripts.
        </p>
      </header>

      {live.length > 0 && (
        <section className="mb-8">
          <h2 className="text-sm font-bold uppercase tracking-widest text-emerald-700 mb-3">Live now</h2>
          <div className="space-y-3">
            {live.map((s) => <SessionCard key={s.id} session={s} />)}
          </div>
        </section>
      )}

      {upcoming.length > 0 && (
        <section className="mb-8">
          <h2 className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-3">Upcoming sessions</h2>
          <div className="space-y-3">
            {upcoming.map((s) => <SessionCard key={s.id} session={s} />)}
          </div>
        </section>
      )}

      {transcripts.length > 0 && (
        <section>
          <h2 className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-3">Published transcripts</h2>
          <div className="space-y-3">
            {transcripts.map((s) => <SessionCard key={s.id} session={s} />)}
          </div>
        </section>
      )}

      {sessions.length === 0 && (
        <div className="text-center py-16 text-slate-500">
          <p className="text-4xl mb-3" aria-hidden>🎙️</p>
          <p className="font-semibold text-slate-700 mb-1">No sessions scheduled yet</p>
          <p className="text-sm text-slate-500 mb-5">Advisors will be scheduling sessions regularly — check back soon.</p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/advisors" className="text-sm font-semibold text-teal-700 hover:underline">Find an advisor →</Link>
            <Link href="/get-matched" className="text-sm font-semibold text-teal-700 hover:underline">Get matched →</Link>
          </div>
        </div>
      )}

      <footer className="mt-12 pt-4 border-t border-slate-200">
        <p className="text-xs text-slate-400">
          Sessions cover general financial topics — not personal financial advice. Always consider
          your own circumstances before making investment decisions.
        </p>
      </footer>

      <section className="mt-10 border-t border-slate-200 pt-8">
        <h2 className="text-lg font-extrabold text-slate-900 mb-5">Frequently asked questions</h2>
        <div className="space-y-3">
          {OFFICE_HOURS_FAQS.map((faq) => (
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
    </div>
  );
}

function SessionCard({ session }: { session: Session }) {
  const badge = STATUS_BADGE[session.status];
  const advisor = session.professionals;

  return (
    <Link
      href={`/office-hours/${session.id}`}
      className="block bg-white border border-slate-200 hover:border-indigo-300 rounded-xl p-5 transition-colors"
    >
      <div className="flex items-start gap-4">
        {advisor?.headshot_url ? (
          <Image
            src={advisor.headshot_url}
            alt={advisor.name}
            width={40}
            height={40}
            className="w-10 h-10 rounded-full object-cover shrink-0"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
            <span className="text-indigo-600 font-bold text-sm">{advisor?.name?.[0] ?? "A"}</span>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            {badge && (
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${badge.cls}`}>
                {badge.label}
              </span>
            )}
            {advisor && (
              <span className="text-xs text-slate-500">{advisor.name}</span>
            )}
          </div>
          <h3 className="text-sm font-bold text-slate-900">{session.title}</h3>
          {session.description && (
            <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{session.description}</p>
          )}
          <div className="flex items-center gap-4 mt-1.5 text-xs text-slate-400">
            <span>{fmtScheduled(session.scheduled_at)}</span>
            {session.rsvp_count > 0 && (
              <span>{session.rsvp_count} RSVP{session.rsvp_count !== 1 ? "s" : ""}</span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
